import { describe, expect, it } from "vite-plus/test";
import {
  getPathBBox,
  normalizePath,
  parsePath,
  resizeWithPins,
  reversePath,
  roundCorners,
  roundNum,
  scalePath,
  serializePath,
  shapeToPath,
  splitCubicAt,
  toAbsolute,
  toRelative,
  transformMatrix,
  unpath,
} from "../src/index.ts";

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

  it("normalizes -0 to +0", () => {
    expect(Object.is(roundNum(-0.00001, 2), -0)).toBe(false);
    expect(roundNum(-0.00001, 2)).toBe(0);
  });
});

describe("transform & normalize", () => {
  it("round-trips toRelative and toAbsolute", () => {
    const { nodes } = parsePath("M 10 10 L 30 40 H 50 V 60 Z");
    const rel = toRelative(nodes);
    expect(serializePath(rel, { minify: true })).toBe("m10 10 20 30h20v20z");
    expect(serializePath(toAbsolute(rel))).toBe("M 10 10 L 30 40 H 50 V 60 Z");
  });

  it("expands H, V, S, Q, T and converts arcs to cubics", () => {
    const { nodes } = parsePath("M 0 0 H 10 V 10 Q 20 20 30 10 T 50 10 A 10 10 0 0 1 60 20 Z");
    const norm = normalizePath(nodes, { convertArcs: true });
    expect(
      norm.every((n) => n.code === "M" || n.code === "L" || n.code === "C" || n.code === "Z"),
    ).toBe(true);
  });

  it("reflects S control points after C and resets after non-cubic commands", () => {
    const { nodes } = parsePath("M 0 0 C 0 10 10 20 20 20 S 40 0 40 0 L 50 0 S 60 10 70 10");
    const norm = normalizePath(nodes);
    expect(norm[2]).toMatchObject({ code: "C", x1: 30, y1: 20 });
    expect(norm[4]).toMatchObject({ code: "C", x1: 50, y1: 0 });
  });

  it("flips arc sweep flag on negative axis scaling or reflection matrix", () => {
    const { nodes } = parsePath("M 0 0 A 10 10 0 0 1 10 10");
    const scaled = scalePath(nodes, -1, 1);
    expect(scaled[1].code === "A" && scaled[1].sweep).toBe(0);

    const mirrored = transformMatrix(nodes, [-1, 0, 0, 1, 0, 0]);
    expect(mirrored[1].code === "A" && mirrored[1].sweep).toBe(0);
  });
});

describe("geometry", () => {
  it("computes cubic Bezier extrema and scales undersized arc radii in getPathBBox", () => {
    const { nodes } = parsePath("M 0 0 C 0 100 100 100 100 0 A 1 1 0 0 1 200 0");
    const bbox = getPathBBox(nodes);
    expect(bbox.minX).toBe(0);
    expect(bbox.maxX).toBe(200);
    expect(bbox.minY).toBeCloseTo(-50, 2);
    expect(bbox.maxY).toBeCloseTo(75, 5);
  });

  it("clamps roundCorners radius to avoid self-intersection", () => {
    const { nodes } = parsePath("M 0 0 L 10 0 L 10 10 L 0 10 Z");
    const filleted = roundCorners(nodes, 999);
    const arcs = filleted.filter((n) => n.code === "A");
    expect(arcs).toHaveLength(4);
    expect(arcs[0].rx).toBeCloseTo(4.99, 2);
  });

  it("keeps arc radii intact during 9-slice resizeWithPins", () => {
    const { nodes } = parsePath(
      "M 4 0 L 16 0 A 4 4 0 0 1 20 4 L 20 20 L 0 20 L 0 4 A 4 4 0 0 1 4 0 Z",
    );
    const resized = resizeWithPins(nodes, 20, 20, 120, 60);
    const bbox = getPathBBox(resized);
    expect(bbox.width).toBeCloseTo(120, 2);
    expect(bbox.height).toBeCloseTo(60, 2);

    const firstArc = resized.find((n) => n.code === "A");
    expect(firstArc?.rx).toBe(4);
    expect(firstArc?.ry).toBe(4);
  });

  it("reverses closed, open, and compound subpaths losslessly", () => {
    const { nodes } = parsePath(
      "M 0 0 L 20 0 A 10 10 0 0 1 30 10 L 0 20 Z M 2 2 L 8 2 L 8 8 M 50 50",
    );
    const rev = reversePath(nodes);
    expect(getPathBBox(rev)).toEqual(getPathBBox(nodes));
    expect(serializePath(reversePath(rev))).toBe(serializePath(normalizePath(nodes)));
  });

  it("subdivides a cubic curve at midpoint", () => {
    const [left, right] = splitCubicAt(0, 0, 0, 100, 100, 100, 100, 0, 0.5);
    expect(left).toMatchObject({ code: "C", x: 50, y: 75 });
    expect(right).toMatchObject({ code: "C", x: 100, y: 0 });
  });
});

describe("shapes & chain", () => {
  it("converts rect, circle, and polygon and chains operations", () => {
    const rect = shapeToPath({ type: "rect", width: 20, height: 10, rx: 99 });
    const rectArc = rect.find((n) => n.code === "A");
    expect(rectArc?.rx).toBe(10);
    expect(rectArc?.ry).toBe(5);

    const circle = shapeToPath({ type: "circle", cx: 10, cy: 10, r: 5 });
    expect(getPathBBox(circle)).toEqual({
      minX: 5,
      minY: 5,
      maxX: 15,
      maxY: 15,
      width: 10,
      height: 10,
      cx: 10,
      cy: 10,
    });

    const d = unpath({ type: "polygon", points: "0,0 20,0 20,20 0,20" })
      .roundCorners(4)
      .scale(2)
      .toRelative()
      .toString({ minify: true });

    expect(d).toBe("m0 8a8 8 0 018-8l24 0a8 8 0 018 8l0 24a8 8 0 01-8 8l-24 0a8 8 0 01-8-8z");
  });
});
