/**
 * Node version pin (issue #126).
 *
 * DMXr declares its Node major in four independent places. This module holds the
 * pure comparison logic that asserts they all agree; `scripts/check-node-pin.ts`
 * supplies the file I/O and the exit code.
 *
 * Two distinct failures are checked, because catching only the first still lets a
 * wrong runtime through:
 *   1. Drift  — the declarations name different majors.
 *   2. Slack  — `engines.node` is an open-ended floor, so a newer major satisfies
 *               it and `npm install` stays happy even with `engine-strict=true`.
 *               Measured: `">=24"` on Node 26 exits 0; `">=24 <25"` exits 1.
 */

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
  /** Contents of `.nvmrc`. */
  readonly nvmrc: string;
  /** `engines.node` from `server/package.json`. */
  readonly enginesNode: string;
  /** `devDependencies["@types/node"]` from `server/package.json`. */
  readonly typesNode: string;
  /** `process.version` of the interpreter running the check. */
  readonly runtimeVersion: string;
}

export interface NodePinCheckResult {
  readonly consistent: boolean;
  /** The agreed major, or null when the declarations disagree. */
  readonly major: number | null;
  readonly declarations: readonly NodePinDeclaration[];
  /** Empty when consistent; otherwise one actionable sentence per problem. */
  readonly problems: readonly string[];
}

/** Matches the first major version number in a version string or semver range. */
const FIRST_MAJOR = /(\d+)/;

/**
 * Extracts the major version from any of the shapes DMXr declares:
 * `24`, `v24.18.1`, `^24.13.3`, `>=24 <25`, `>=18.0.0`.
 *
 * Returns null when no digit is present (`latest`, `lts/*`, `""`), so callers can
 * fail loudly instead of treating an unreadable declaration as agreement.
 */
export function parseMajor(raw: string): number | null {
  const match = FIRST_MAJOR.exec(raw.trim());
  if (match === null) return null;

  const major = Number.parseInt(match[1], 10);
  return Number.isNaN(major) ? null : major;
}

/**
 * True when a range cannot be satisfied by an arbitrarily newer major.
 *
 * A caret range is bounded by definition (`^24.13.3` excludes 25). An explicit
 * upper bound (`<25`, `<=24`) is bounded. A bare floor is not.
 */
export function isBoundedRange(range: string): boolean {
  const trimmed = range.trim();
  if (trimmed === "") return false;
  if (trimmed.startsWith("^") || trimmed.startsWith("~")) return true;
  return trimmed.includes("<");
}

function declare(source: string, raw: string): NodePinDeclaration {
  return { source, raw, major: parseMajor(raw) };
}

function unreadableProblems(
  declarations: readonly NodePinDeclaration[],
): readonly string[] {
  return declarations
    .filter((d) => d.major === null)
    .map((d) => `${d.source} declares "${d.raw}", which names no Node major.`);
}

function driftProblems(
  declarations: readonly NodePinDeclaration[],
  expected: number,
): readonly string[] {
  return declarations
    .filter((d) => d.major !== null && d.major !== expected)
    .map(
      (d) =>
        `${d.source} names Node ${d.major} but the pin is Node ${expected} ` +
        `(declared "${d.raw}").`,
    );
}

/**
 * Asserts every declaration names the same Node major, and that `engines.node`
 * is bounded. `.nvmrc` is the reference: it is the file version managers and
 * `setup-node` both read, so it is what actually selects the runtime.
 */
export function checkNodePin(inputs: NodePinInputs): NodePinCheckResult {
  const declarations: readonly NodePinDeclaration[] = [
    declare(".nvmrc", inputs.nvmrc),
    declare("server/package.json → engines.node", inputs.enginesNode),
    declare("server/package.json → @types/node", inputs.typesNode),
    declare("running interpreter", inputs.runtimeVersion),
  ];

  const unreadable = unreadableProblems(declarations);
  const expected = declarations[0].major;

  if (expected === null || unreadable.length > 0) {
    return { consistent: false, major: null, declarations, problems: unreadable };
  }

  const drift = driftProblems(declarations, expected);
  const slack = isBoundedRange(inputs.enginesNode)
    ? []
    : [
        `server/package.json → engines.node is "${inputs.enginesNode}", an ` +
          `open-ended floor. A newer major satisfies it, so engine-strict cannot ` +
          `reject one. Use a bounded range such as ">=${expected} <${expected + 1}".`,
      ];

  const problems = [...drift, ...slack];
  return {
    consistent: problems.length === 0,
    major: problems.length === 0 ? expected : null,
    declarations,
    problems,
  };
}
