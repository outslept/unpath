import { describe, expect, it } from "vite-plus/test";
import { getPathBBox, shapeToPath, unpath } from "../src/index.ts";

describe("shapes & chain", () => {
  it("converts rect, circle, ellipse, line, polyline, and polygon", () => {
    expect(shapeToPath({ type: "rect", width: 0, height: 10 })).toEqual([]);
    expect(shapeToPath({ type: "rect", width: 10, height: 10 })).toHaveLength(5);

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

    expect(shapeToPath({ type: "ellipse", rx: 4, ry: 2 })).toHaveLength(4);
    expect(shapeToPath({ type: "line", x2: 10, y2: 5 })).toHaveLength(2);
    expect(
      shapeToPath({
        type: "polyline",
        points: [
          [0, 0],
          [5, 5],
        ],
      }),
    ).toHaveLength(2);
  });

  it("chains all UnpathChain operations", () => {
    const d = unpath({ type: "polygon", points: "0,0 20,0 20,20 0,20" })
      .roundCorners(4)
      .scale(2)
      .toRelative()
      .toString({ minify: true });

    expect(d).toBe("m0 8a8 8 0 018-8l24 0a8 8 0 018 8l0 24a8 8 0 01-8 8l-24 0a8 8 0 01-8-8z");

    const chain = unpath("m 0 0 l 10 0 l 0 10 z")
      .toAbsolute()
      .normalize()
      .matrix([1, 0, 0, 1, 0, 0])
      .resizeWithPins(10, 10, 20, 20)
      .reverse();

    expect(chain.bbox().width).toBe(20);
  });
});
