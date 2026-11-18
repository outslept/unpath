import { describe, expect, it } from "vite-plus/test";
import {
  getPathBBox,
  normalizePath,
  parsePath,
  resizeWithPins,
  reversePath,
  roundCorners,
  serializePath,
  splitCubicAt,
} from "../src/index.ts";

describe("geometry", () => {
  it("computes cubic, quadratic, arc, and empty bounding boxes", () => {
    expect(getPathBBox([])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      cx: 0,
      cy: 0,
    });
    expect(getPathBBox(parsePath("M 0 0 Q 50 100 100 0").nodes).maxY).toBeCloseTo(50, 5);

    const { nodes } = parsePath("M 0 0 C 0 100 100 100 100 0 A 1 1 0 0 1 200 0");
    const bbox = getPathBBox(nodes);
    expect(bbox.minX).toBe(0);
    expect(bbox.maxX).toBe(200);
    expect(bbox.minY).toBeCloseTo(-50, 2);
    expect(bbox.maxY).toBeCloseTo(75, 5);
  });

  it("clamps roundCorners radius and handles open and collinear paths", () => {
    const { nodes } = parsePath("M 0 0 L 10 0 L 10 10 L 0 10 Z");
    const filleted = roundCorners(nodes, 999);
    const arcs = filleted.filter((n) => n.code === "A");
    expect(arcs).toHaveLength(4);
    expect(arcs[0].rx).toBeCloseTo(4.99, 2);

    const openFillet = roundCorners(parsePath("M 0 0 L 10 0 L 20 0 L 20 10").nodes, 2);
    expect(openFillet.filter((n) => n.code === "A")).toHaveLength(1);
  });

  it("keeps arc radii intact and stretches cubics during 9-slice resizeWithPins", () => {
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

    const cubic = parsePath("M 0 0 C 10 20 30 20 40 0").nodes;
    expect(getPathBBox(resizeWithPins(cubic, 40, 20, 80, 40)).width).toBe(80);
  });

  it("reverses closed, open, cubic, and compound subpaths losslessly", () => {
    const { nodes } = parsePath(
      "M 0 0 L 20 0 A 10 10 0 0 1 30 10 C 30 20 10 20 0 20 Z M 2 2 L 8 2 L 8 8 M 50 50",
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
