import { describe, expect, it } from "vite-plus/test";
import {
  arcToCubicCurves,
  normalizePath,
  parsePath,
  scalePath,
  serializePath,
  toAbsolute,
  toRelative,
  transformMatrix,
} from "../src/index.ts";

describe("transform & normalize", () => {
  it("round-trips toRelative and toAbsolute across all command types", () => {
    const { nodes } = parsePath("M 10 10 L 30 40 H 50 V 60 Z");
    const rel = toRelative(nodes);
    expect(serializePath(rel, { minify: true })).toBe("m10 10 20 30h20v20z");
    expect(serializePath(toAbsolute(rel))).toBe("M 10 10 L 30 40 H 50 V 60 Z");

    const curves = parsePath(
      "M 10 10 C 20 10 20 20 30 20 S 40 30 50 30 Q 60 30 70 40 T 90 50 A 5 5 0 0 1 100 50",
    ).nodes;
    expect(toAbsolute(toRelative(curves))).toEqual(toAbsolute(curves));
  });

  it("expands H, V, S, Q, T and converts arcs to cubics", () => {
    const { nodes } = parsePath("M 0 0 H 10 V 10 Q 20 20 30 10 T 50 10 A 10 10 0 0 1 60 20 Z");
    const norm = normalizePath(nodes, { convertArcs: true });
    expect(
      norm.every((n) => n.code === "M" || n.code === "L" || n.code === "C" || n.code === "Z"),
    ).toBe(true);
    expect(arcToCubicCurves(0, 0, 10, 10, 0, 0, 1, 0, 0)).toEqual([]);
    expect(arcToCubicCurves(0, 0, 0, 10, 0, 0, 1, 10, 10)).toHaveLength(1);
  });

  it("reflects S control points after C and resets after non-cubic commands", () => {
    const { nodes } = parsePath("M 0 0 C 0 10 10 20 20 20 S 40 0 40 0 L 50 0 S 60 10 70 10");
    const norm = normalizePath(nodes);
    expect(norm[2]).toMatchObject({ code: "C", x1: 30, y1: 20 });
    expect(norm[4]).toMatchObject({ code: "C", x1: 50, y1: 0 });
  });

  it("handles negative scaling, reflection, identity, and rotation matrices", () => {
    const { nodes } = parsePath("M 0 0 A 10 10 0 0 1 10 10");
    const scaled = scalePath(nodes, -1, 1);
    expect(scaled[1].code === "A" && scaled[1].sweep).toBe(0);

    const mirrored = transformMatrix(nodes, [-1, 0, 0, 1, 0, 0]);
    expect(mirrored[1].code === "A" && mirrored[1].sweep).toBe(0);

    expect(transformMatrix(nodes, [1, 0, 0, 1, 0, 0])).toEqual(normalizePath(nodes));

    const rotated = transformMatrix(nodes, [0, 1, -1, 0, 0, 0]);
    expect(rotated.every((n) => n.code !== "A")).toBe(true);
  });
});
