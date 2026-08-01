/**
 * Node version pin (issue #126).
 *
 * DMXr declares its Node major in four independent places. This module holds the
 * pure comparison logic that asserts they all agree; `scripts/check-node-pin.ts`
 * supplies the file I/O and the exit code.
 *
 * Two of those declarations are semver *ranges*, and a range is where a pin
 * quietly rots: `">=24 <26"` looks bounded and `">=24"` starts with the right
 * number, yet both admit Node 25. So ranges are checked semantically -- the whole
 * range must be contained in the pinned major -- rather than by reading their
 * first number or looking for a `<`. Adversarial review of PR #127 caught the
 * earlier syntactic version accepting exactly those two shapes.
 */
import { subset } from "semver";

/** One place the Node major is declared. */
export interface NodePinDeclaration {
  /** Human-readable location, used verbatim in failure messages. */
  readonly source: string;
  /** The declaration exactly as written. */
  readonly raw: string;
  /** Major version, or null when `raw` names no parseable major. */
  readonly major: number | null;
}

/** The four declarations, read from disk and the running process. */
export interface NodePinInputs {
  /** Contents of `.nvmrc` — the source of truth. A bare major, e.g. `24`. */
  readonly nvmrc: string;
  /** `engines.node` from `server/package.json`. A semver range. */
  readonly enginesNode: string;
  /** `devDependencies["@types/node"]` from `server/package.json`. A semver range. */
  readonly typesNode: string;
  /** `process.version` of the interpreter running the check. */
  readonly runtimeVersion: string;
}

export interface NodePinCheckResult {
  readonly consistent: boolean;
  /** The pinned major, or null when anything disagrees. */
  readonly major: number | null;
  readonly declarations: readonly NodePinDeclaration[];
  /** Empty when consistent; otherwise one actionable sentence per problem. */
  readonly problems: readonly string[];
}

/** Matches the first version number in a version string. */
const FIRST_MAJOR = /(\d+)/;

/**
 * Extracts the major version from a concrete version (`24`, `v24.18.1`) or, for
 * display purposes, from a range.
 *
 * Returns null when no digit is present (`lts/*`, `latest`, `""`), so callers can
 * fail loudly instead of treating an unreadable declaration as agreement.
 *
 * Do **not** use this to validate a range — `">=24 <26"` yields 24 while still
 * admitting 25. Use {@link isRangeConfinedToMajor}.
 */
export function parseMajor(raw: string): number | null {
  const match = FIRST_MAJOR.exec(raw.trim());
  if (match === null) return null;

  const major = Number.parseInt(match[1], 10);
  return Number.isNaN(major) ? null : major;
}

/**
 * True when *every* version satisfying `range` falls inside `major`.
 *
 * This is the check that actually holds the pin. `^24.13.3`, `~24.13.0`,
 * `24.13.3` and `">=24 <25"` pass; `">=24"`, `">=24 <26"`, `"^24 || ^25"` and
 * `"*"` all fail, because each admits a major we never validated.
 *
 * Returns false for a malformed range rather than throwing — an unreadable
 * declaration is a failure, not a crash.
 */
export function isRangeConfinedToMajor(range: string, major: number): boolean {
  try {
    return subset(range, `>=${major}.0.0 <${major + 1}.0.0`);
  } catch {
    return false;
  }
}

function declare(source: string, raw: string): NodePinDeclaration {
  return { source, raw, major: parseMajor(raw) };
}

function rangeProblems(
  source: string,
  range: string,
  pinned: number,
): readonly string[] {
  if (isRangeConfinedToMajor(range, pinned)) return [];

  return [
    `${source} is "${range.trim()}", which is not bounded to Node ${pinned} — ` +
      `it admits at least one other major. Use a range wholly inside the pin, ` +
      `such as ">=${pinned} <${pinned + 1}" or "^${pinned}.0.0".`,
  ];
}

function runtimeProblems(version: string, pinned: number): readonly string[] {
  const major = parseMajor(version);
  if (major === pinned) return [];

  const named = major === null ? "no readable major" : `Node ${major}`;
  return [
    `running interpreter reports ${named} but the pin is Node ${pinned} ` +
      `(declared "${version.trim()}"). Switch runtimes with fnm/nvm/mise — ` +
      `they read .nvmrc.`,
  ];
}

/**
 * Asserts every declaration agrees on one Node major.
 *
 * `.nvmrc` is the reference, because it is the file both version managers and
 * `setup-node` read — it is what actually selects the runtime. The other three
 * are measured against it.
 */
export function checkNodePin(inputs: NodePinInputs): NodePinCheckResult {
  const declarations: readonly NodePinDeclaration[] = [
    declare(".nvmrc", inputs.nvmrc),
    declare("server/package.json → engines.node", inputs.enginesNode),
    declare("server/package.json → @types/node", inputs.typesNode),
    declare("running interpreter", inputs.runtimeVersion),
  ];

  const pinned = parseMajor(inputs.nvmrc);
  if (pinned === null) {
    return {
      consistent: false,
      major: null,
      declarations,
      problems: [
        `.nvmrc declares "${inputs.nvmrc.trim()}", which names no Node major. ` +
          `It must be a bare major, e.g. "24".`,
      ],
    };
  }

  const problems = [
    ...rangeProblems(
      "server/package.json → engines.node",
      inputs.enginesNode,
      pinned,
    ),
    ...rangeProblems(
      "server/package.json → @types/node",
      inputs.typesNode,
      pinned,
    ),
    ...runtimeProblems(inputs.runtimeVersion, pinned),
  ];

  return {
    consistent: problems.length === 0,
    major: problems.length === 0 ? pinned : null,
    declarations,
    problems,
  };
}
