import {
  createAbsArc,
  createAbsClose,
  createAbsCubic,
  createAbsLine,
  createAbsMove,
} from "./nodes.ts";
import { normalizePath } from "./transform.ts";
import type { BBox, NormalizedPathNode, PathNode } from "./types.ts";

interface MutableBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function includeAxis(b: MutableBounds, val: number, isX: boolean): void {
  if (isX) {
    if (val < b.minX) b.minX = val;
    if (val > b.maxX) b.maxX = val;
  } else {
    if (val < b.minY) b.minY = val;
    if (val > b.maxY) b.maxY = val;
  }
}

function includePoint(b: MutableBounds, x: number, y: number): void {
  includeAxis(b, x, true);
  includeAxis(b, y, false);
}

function evalCubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function includeCubicAxisExtrema(
  b: MutableBounds,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  isX: boolean,
): void {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const coefB = 2 * (p0 - 2 * p1 + p2);
  const c = -p0 + p1;

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(coefB) > 1e-9) {
      const t = -c / coefB;
      if (t > 0 && t < 1) includeAxis(b, evalCubic(p0, p1, p2, p3, t), isX);
    }
    return;
  }

  const disc = coefB * coefB - 4 * a * c;
  if (disc < 0) return;

  const sqrtDisc = Math.sqrt(disc);
  const inv2a = 1 / (2 * a);
  const t1 = (-coefB + sqrtDisc) * inv2a;
  const t2 = (-coefB - sqrtDisc) * inv2a;

  if (t1 > 0 && t1 < 1) includeAxis(b, evalCubic(p0, p1, p2, p3, t1), isX);
  if (t2 > 0 && t2 < 1) includeAxis(b, evalCubic(p0, p1, p2, p3, t2), isX);
}

export function getPathBBox(nodes: readonly PathNode[]): BBox {
  // arcs are converted to cubics so rotated ellipse extrema use the same solver
  const norm = normalizePath(nodes, { convertArcs: true });
  const len = norm.length;
  if (len === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
  }

  const bounds: MutableBounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  for (let i = 0; i < len; i++) {
    const node = norm[i];
    switch (node.code) {
      case "M":
        curX = startX = node.x;
        curY = startY = node.y;
        includePoint(bounds, curX, curY);
        break;
      case "L":
        curX = node.x;
        curY = node.y;
        includePoint(bounds, curX, curY);
        break;
      case "C":
        includePoint(bounds, node.x, node.y);
        includeCubicAxisExtrema(bounds, curX, node.x1, node.x2, node.x, true);
        includeCubicAxisExtrema(bounds, curY, node.y1, node.y2, node.y, false);
        curX = node.x;
        curY = node.y;
        break;
      case "Z":
        curX = startX;
        curY = startY;
        break;
    }
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
    width,
    height,
    cx: bounds.minX + width * 0.5,
    cy: bounds.minY + height * 0.5,
  };
}

export function splitCubicAt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t = 0.5,
): [NormalizedPathNode, NormalizedPathNode] {
  const x01 = x0 + (x1 - x0) * t;
  const y01 = y0 + (y1 - y0) * t;
  const x12 = x1 + (x2 - x1) * t;
  const y12 = y1 + (y2 - y1) * t;
  const x23 = x2 + (x3 - x2) * t;
  const y23 = y2 + (y3 - y2) * t;

  const x012 = x01 + (x12 - x01) * t;
  const y012 = y01 + (y12 - y01) * t;
  const x123 = x12 + (x23 - x12) * t;
  const y123 = y12 + (y23 - y12) * t;

  const x0123 = x012 + (x123 - x012) * t;
  const y0123 = y012 + (y123 - y012) * t;

  return [
    createAbsCubic(x01, y01, x012, y012, x0123, y0123),
    createAbsCubic(x123, y123, x23, y23, x3, y3),
  ];
}

export function roundCorners(nodes: readonly PathNode[], radius: number): NormalizedPathNode[] {
  const norm = normalizePath(nodes);
  const normLen = norm.length;
  if (radius <= 0 || normLen < 3) return norm;

  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < normLen; i++) {
    const n = norm[i];
    if (n.code === "M" || n.code === "L") {
      xs.push(n.x);
      ys.push(n.y);
    } else if (n.code !== "Z") {
      return norm;
    }
  }

  const isClosed = norm[normLen - 1].code === "Z";
  let ptCount = xs.length;

  if (
    isClosed &&
    ptCount > 2 &&
    Math.hypot(xs[0] - xs[ptCount - 1], ys[0] - ys[ptCount - 1]) < 1e-5
  ) {
    xs.pop();
    ys.pop();
    ptCount--;
  }

  if (ptCount < 3) return norm;

  const out: NormalizedPathNode[] = [];

  for (let i = 0; i < ptCount; i++) {
    const currX = xs[i];
    const currY = ys[i];

    if (!isClosed && (i === 0 || i === ptCount - 1)) {
      out.push(i === 0 ? createAbsMove(currX, currY) : createAbsLine(currX, currY));
      continue;
    }

    const prevIdx = i === 0 ? ptCount - 1 : i - 1;
    const nextIdx = i === ptCount - 1 ? 0 : i + 1;

    const v1x = xs[prevIdx] - currX;
    const v1y = ys[prevIdx] - currY;
    const v2x = xs[nextIdx] - currX;
    const v2y = ys[nextIdx] - currY;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 1e-6 || len2 < 1e-6) continue;

    const u1x = v1x / len1;
    const u1y = v1y / len1;
    const u2x = v2x / len2;
    const u2y = v2y / len2;

    const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
    const angle = Math.acos(dot);

    if (Math.abs(angle) < 1e-4 || Math.abs(Math.PI - angle) < 1e-4) {
      out.push(out.length === 0 ? createAbsMove(currX, currY) : createAbsLine(currX, currY));
      continue;
    }

    const halfTan = Math.tan(angle * 0.5);
    const idealOffset = radius / halfTan;
    const maxOffset = Math.min(len1, len2) * 0.499;
    const offset = idealOffset < maxOffset ? idealOffset : maxOffset;
    const actualRadius = offset * halfTan;

    const startX = currX + u1x * offset;
    const startY = currY + u1y * offset;
    const endX = currX + u2x * offset;
    const endY = currY + u2y * offset;

    const sweep: 0 | 1 = u1x * u2y - u1y * u2x < 0 ? 1 : 0;

    out.push(out.length === 0 ? createAbsMove(startX, startY) : createAbsLine(startX, startY));
    out.push(createAbsArc(actualRadius, actualRadius, 0, 0, sweep, endX, endY));
  }

  if (isClosed) out.push(createAbsClose());
  return out;
}

export function resizeWithPins(
  nodes: readonly PathNode[],
  origWidth: number,
  origHeight: number,
  targetWidth: number,
  targetHeight: number,
  splitX = origWidth * 0.5,
  splitY = origHeight * 0.5,
): NormalizedPathNode[] {
  const norm = normalizePath(nodes);
  const len = norm.length;
  const out: NormalizedPathNode[] = [];

  const dx = targetWidth - origWidth;
  const dy = targetHeight - origHeight;

  const mapX = (x: number): number => (x > splitX ? (x + dx > splitX ? x + dx : splitX) : x);
  const mapY = (y: number): number => (y > splitY ? (y + dy > splitY ? y + dy : splitY) : y);

  for (let i = 0; i < len; i++) {
    const n = norm[i];
    switch (n.code) {
      case "M":
        out.push(createAbsMove(mapX(n.x), mapY(n.y)));
        break;
      case "L":
        out.push(createAbsLine(mapX(n.x), mapY(n.y)));
        break;
      case "C":
        out.push(
          createAbsCubic(mapX(n.x1), mapY(n.y1), mapX(n.x2), mapY(n.y2), mapX(n.x), mapY(n.y)),
        );
        break;
      case "A":
        // radii stay untouched so corner fillets do not stretch into ovals
        out.push(createAbsArc(n.rx, n.ry, n.angle, n.largeArc, n.sweep, mapX(n.x), mapY(n.y)));
        break;
      case "Z":
        out.push(createAbsClose());
        break;
    }
  }

  return out;
}

type DrawNode = Exclude<NormalizedPathNode, { code: "Z" }>;

// reverses each subpath by walking normalized index ranges backwards
export function reversePath(nodes: readonly PathNode[]): NormalizedPathNode[] {
  const norm = normalizePath(nodes);
  const len = norm.length;
  if (len === 0) return [];

  const out: NormalizedPathNode[] = [];
  let subStart = 0;

  while (subStart < len) {
    if (norm[subStart].code !== "M") {
      subStart++;
      continue;
    }

    const startNode = norm[subStart] as DrawNode;
    let subEnd = subStart + 1;
    while (subEnd < len && norm[subEnd].code !== "M" && norm[subEnd].code !== "Z") {
      subEnd++;
    }

    const closed = subEnd < len && norm[subEnd].code === "Z";
    const lastDrawIdx = subEnd - 1;

    if (lastDrawIdx === subStart) {
      out.push(createAbsMove(startNode.x, startNode.y));
      if (closed) out.push(createAbsClose());
      subStart = closed ? subEnd + 1 : subEnd;
      continue;
    }

    const lastDraw = norm[lastDrawIdx] as DrawNode;
    out.push(createAbsMove(lastDraw.x, lastDraw.y));

    for (let i = lastDrawIdx; i > subStart; i--) {
      const seg = norm[i];
      const prev = norm[i - 1] as DrawNode;

      if (seg.code === "L") {
        out.push(createAbsLine(prev.x, prev.y));
      } else if (seg.code === "C") {
        out.push(createAbsCubic(seg.x2, seg.y2, seg.x1, seg.y1, prev.x, prev.y));
      } else if (seg.code === "A") {
        out.push(
          createAbsArc(
            seg.rx,
            seg.ry,
            seg.angle,
            seg.largeArc,
            (1 - seg.sweep) as 0 | 1,
            prev.x,
            prev.y,
          ),
        );
      }
    }

    if (closed) out.push(createAbsClose());
    subStart = closed ? subEnd + 1 : subEnd;
  }

  return out;
}
