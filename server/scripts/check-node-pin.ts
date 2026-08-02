/**
 * Fails the build when DMXr's Node version declarations drift apart (issue #126).
 *
 * This is the I/O shell only — the comparison logic lives in
 * `src/config/node-pin.ts`, where tsconfig typechecks it and vitest covers it.
 *
 * Run with `npm run check:node-pin`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkNodePin } from "../src/config/node-pin.js";
import type { NodePinInputs } from "../src/config/node-pin.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(SERVER_DIR, "..");

/** Reads a UTF-8 file, naming the path in the error so a bad checkout is obvious. */
function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${path}: ${reason}`);
  }
}

/** The slice of `server/package.json` the pin cares about. */
interface ServerManifest {
  readonly engines?: { readonly node?: string };
  readonly devDependencies?: Readonly<Record<string, string>>;
}

/** Parses a package manifest, distinguishing "unreadable" from "not valid JSON". */
function readManifest(path: string): ServerManifest {
  try {
    return JSON.parse(read(path)) as ServerManifest;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse ${path} as JSON: ${reason}`);
  }
}

/**
 * Gathers the four declarations from disk and the current process.
 *
 * A missing `engines.node` or `@types/node` throws rather than defaulting: the pin
 * cannot be satisfied by a declaration that is not there, and silently passing would
 * defeat the gate.
 */
function collectInputs(): NodePinInputs {
  const manifestPath = join(SERVER_DIR, "package.json");
  const manifest = readManifest(manifestPath);

  const enginesNode = manifest.engines?.node;
  if (enginesNode === undefined) {
    throw new Error(`${manifestPath} declares no engines.node — the pin needs one.`);
  }

  const typesNode = manifest.devDependencies?.["@types/node"];
  if (typesNode === undefined) {
    throw new Error(
      `${manifestPath} declares no devDependencies["@types/node"] — the pin needs one.`,
    );
  }

  return {
    nvmrc: read(join(REPO_ROOT, ".nvmrc")),
    enginesNode,
    typesNode,
    runtimeVersion: process.version,
  };
}

/** Runs the check and prints either a one-line pass or a full declaration table. */
function main(): void {
  const result = checkNodePin(collectInputs());

  if (result.consistent) {
    console.log(
      `node-pin: consistent — Node ${result.major} across ` +
        `${result.declarations.length} declarations and the running runtime.`,
    );
    return;
  }

  console.error("node-pin: FAILED — Node version declarations disagree.\n");
  for (const declaration of result.declarations) {
    console.error(
      `  ${declaration.source.padEnd(38)} ${declaration.raw.trim()}` +
        `${declaration.major === null ? "  (unparseable)" : ""}`,
    );
  }
  console.error("");
  for (const problem of result.problems) {
    console.error(`  - ${problem}`);
  }
  console.error(
    "\nSee issue #126. `.nvmrc` is the source of truth; bring the others to match it.",
  );
  process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(
    `node-pin: could not run — ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
