import { describe, expect, it } from "vite-plus/test";
import { parsePath, roundNum, serializePath } from "../src/index.ts";

describe("parse & serialize", () => {
  it("parses packed arc flags, chained decimals, exponents, and implicit lines", () => {
    const { nodes, issues } = parsePath("M0 0 10.5.3a25,25-30 0150-25l1e-2-.5z");
    expect(issues).toHaveLength(0);
    expect(nodes).toHaveLength(5);

    expect(nodes[0]).toEqual({
      code: "M",
      relative: false,
      span: { start: 0, end: 4, implicit: false },
      x: 0,
      y: 0,
    });
    expect(nodes[1]).toEqual({
      code: "L",
      relative: false,
      span: { start: 5, end: 11, implicit: true },
      x: 10.5,
      y: 0.3,
    });
    expect(nodes[2]).toEqual({
      code: "a",
      relative: true,
      span: { start: 11, end: 28, implicit: false },
      rx: 25,
      ry: 25,
      angle: -30,
      largeArc: 0,
      sweep: 1,
      x: 50,
      y: -25,
    });
    expect(serializePath(nodes, { precision: 2, minify: true })).toBe(
      "M0 0 10.5.3a25 25-30 0150-25l.01-.5z",
    );
  });

  it("recovers partial nodes, skips garbage tokens, and parses >15-digit floats", () => {
    const { nodes, issues } = parsePath("@ M 0.12345678901234567 20 Z # L 10 20 M 5");
    expect(nodes).toHaveLength(3);
    expect(nodes[0].code === "M" && nodes[0].x).toBeCloseTo(0.12345678901234567, 15);
    expect(issues).toHaveLength(3);
    expect(issues[0].message).toMatch(/Unexpected token "@"/);
    expect(issues[1].message).toMatch(/Unexpected token "#"/);
    expect(issues[2].message).toMatch(/Incomplete parameters for "M"/);
  });

  it("reports missing initial Move, rolls back bare exponents, and serializes curves", () => {
    const { nodes, issues } = parsePath("L 1 2 C 1 2 3 4 5 6 S 7 8 9 10 Q 1 2 3 4 T 5 6e");
    expect(issues.map((i) => i.message)).toEqual([
      'Path must start with M or m, got "L"',
      'Incomplete parameters for "T"',
    ]);
    expect(serializePath([])).toBe("");
    expect(serializePath([nodes[0]])).toBe("L 1 2");
    expect(serializePath(nodes)).toBe("L 1 2 C 1 2 3 4 5 6 S 7 8 9 10 Q 1 2 3 4 T 5 6");
    expect(serializePath(nodes, { minify: true })).toBe("L1 2C1 2 3 4 5 6S7 8 9 10Q1 2 3 4T5 6");
  });

  it("normalizes -0 to +0", () => {
    expect(Object.is(roundNum(-0.00001, 2), -0)).toBe(false);
    expect(roundNum(-0.00001, 2)).toBe(0);
  });
});
