import { describe, it, expect } from "vitest";
import { parseMajor, isBoundedRange, checkNodePin } from "./node-pin.js";
import type { NodePinInputs } from "./node-pin.js";

const consistentInputs: NodePinInputs = {
  nvmrc: "24",
  enginesNode: ">=24 <25",
  typesNode: "^24.13.3",
  runtimeVersion: "v24.18.1",
};

describe("parseMajor", () => {
  it("reads a bare major", () => {
    expect(parseMajor("24")).toBe(24);
  });

  it("reads a v-prefixed runtime version", () => {
    expect(parseMajor("v24.18.1")).toBe(24);
  });

  it("reads a caret range", () => {
    expect(parseMajor("^24.13.3")).toBe(24);
  });

  it("reads the lower bound of a bounded range", () => {
    expect(parseMajor(">=24 <25")).toBe(24);
  });

  it("reads a floor range", () => {
    expect(parseMajor(">=18.0.0")).toBe(18);
  });

  it("tolerates surrounding whitespace and newlines", () => {
    expect(parseMajor("  24\n")).toBe(24);
  });

  it("returns null when no major is present", () => {
    expect(parseMajor("latest")).toBeNull();
    expect(parseMajor("")).toBeNull();
  });
});

describe("isBoundedRange", () => {
  it("accepts a range with an upper bound", () => {
    expect(isBoundedRange(">=24 <25")).toBe(true);
  });

  it("accepts a caret range, which is implicitly bounded", () => {
    expect(isBoundedRange("^24.13.3")).toBe(true);
  });

  it("rejects an open-ended floor", () => {
    expect(isBoundedRange(">=24")).toBe(false);
    expect(isBoundedRange(">=18.0.0")).toBe(false);
  });

  it("rejects a wildcard", () => {
    expect(isBoundedRange("*")).toBe(false);
  });
});

describe("checkNodePin", () => {
  it("passes when every declaration names the same major", () => {
    const result = checkNodePin(consistentInputs);

    expect(result.consistent).toBe(true);
    expect(result.major).toBe(24);
    expect(result.problems).toEqual([]);
  });

  it("reports every declaration it inspected", () => {
    const result = checkNodePin(consistentInputs);

    expect(result.declarations).toHaveLength(4);
    expect(result.declarations.map((d) => d.source)).toEqual([
      ".nvmrc",
      "server/package.json → engines.node",
      "server/package.json → @types/node",
      "running interpreter",
    ]);
  });

  it("fails when @types/node runs ahead of the runtime", () => {
    const result = checkNodePin({ ...consistentInputs, typesNode: "^25.7.0" });

    expect(result.consistent).toBe(false);
    expect(result.problems.join(" ")).toContain("@types/node");
  });

  it("fails when the running interpreter is a different major", () => {
    const result = checkNodePin({ ...consistentInputs, runtimeVersion: "v26.4.0" });

    expect(result.consistent).toBe(false);
    expect(result.problems.join(" ")).toContain("running interpreter");
  });

  it("fails when .nvmrc disagrees with the engines range", () => {
    const result = checkNodePin({ ...consistentInputs, nvmrc: "22" });

    expect(result.consistent).toBe(false);
  });

  it("fails an open-ended engines range even when every major agrees", () => {
    const result = checkNodePin({ ...consistentInputs, enginesNode: ">=24" });

    expect(result.consistent).toBe(false);
    expect(result.problems.join(" ")).toContain("bounded");
  });

  it("fails an unparseable declaration rather than silently skipping it", () => {
    const result = checkNodePin({ ...consistentInputs, nvmrc: "lts/*" });

    expect(result.consistent).toBe(false);
    expect(result.problems.join(" ")).toContain(".nvmrc");
  });

  it("names the offending majors so the failure is actionable", () => {
    const result = checkNodePin({ ...consistentInputs, typesNode: "^25.7.0" });

    expect(result.problems.join(" ")).toContain("25");
    expect(result.problems.join(" ")).toContain("24");
  });

  it("does not mutate its input", () => {
    const inputs: NodePinInputs = { ...consistentInputs };
    const snapshot = JSON.stringify(inputs);

    checkNodePin(inputs);

    expect(JSON.stringify(inputs)).toBe(snapshot);
  });
});
