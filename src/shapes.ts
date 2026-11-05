import { createAbsArc, createAbsClose, createAbsLine, createAbsMove } from "./nodes.ts";
import { parsePath } from "./parse.ts";
import type { NormalizedPathNode, SvgShapeInput } from "./types.ts";

export function shapeToPath(shape: SvgShapeInput): NormalizedPathNode[] {
  switch (shape.type) {
    case "rect": {
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const w = shape.width;
      const h = shape.height;
      if (w <= 0 || h <= 0) return [];

      const rx = Math.min(shape.rx ?? shape.ry ?? 0, w * 0.5);
      const ry = Math.min(shape.ry ?? shape.rx ?? 0, h * 0.5);

      if (rx <= 0 || ry <= 0) {
        return [
          createAbsMove(x, y),
          createAbsLine(x + w, y),
          createAbsLine(x + w, y + h),
          createAbsLine(x, y + h),
          createAbsClose(),
        ];
      }

      return [
        createAbsMove(x + rx, y),
        createAbsLine(x + w - rx, y),
        createAbsArc(rx, ry, 0, 0, 1, x + w, y + ry),
        createAbsLine(x + w, y + h - ry),
        createAbsArc(rx, ry, 0, 0, 1, x + w - rx, y + h),
        createAbsLine(x + rx, y + h),
        createAbsArc(rx, ry, 0, 0, 1, x, y + h - ry),
        createAbsLine(x, y + ry),
        createAbsArc(rx, ry, 0, 0, 1, x + rx, y),
        createAbsClose(),
      ];
    }

    case "circle":
    case "ellipse": {
      const cx = shape.cx ?? 0;
      const cy = shape.cy ?? 0;
      const rx = shape.type === "circle" ? shape.r : shape.rx;
      const ry = shape.type === "circle" ? shape.r : shape.ry;
      if (rx <= 0 || ry <= 0) return [];

      return [
        createAbsMove(cx - rx, cy),
        createAbsArc(rx, ry, 0, 1, 0, cx + rx, cy),
        createAbsArc(rx, ry, 0, 1, 0, cx - rx, cy),
        createAbsClose(),
      ];
    }

    case "line":
      return [
        createAbsMove(shape.x1 ?? 0, shape.y1 ?? 0),
        createAbsLine(shape.x2 ?? 0, shape.y2 ?? 0),
      ];

    case "polyline":
    case "polygon": {
      const pts = shape.points;
      let out: NormalizedPathNode[];

      if (typeof pts === "string") {
        out = parsePath("M" + pts).nodes as NormalizedPathNode[];
      } else {
        out = [];
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = pts[i];
          out.push(i === 0 ? createAbsMove(x, y) : createAbsLine(x, y));
        }
      }

      if (out.length > 0 && shape.type === "polygon") {
        out.push(createAbsClose());
      }
      return out;
    }
  }
}
