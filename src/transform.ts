import {
  createAbsArc,
  createAbsClose,
  createAbsCubic,
  createAbsLine,
  createAbsMove,
  createArc,
  createClose,
  createCubic,
  createHorizontal,
  createLine,
  createMove,
  createQuad,
  createSmoothCubic,
  createSmoothQuad,
  createVertical,
} from "./nodes.ts";
import type {
  Matrix2D,
  NormalizedCubicNode,
  NormalizedPathNode,
  NormalizeOptions,
  PathNode,
} from "./types.ts";

export function toAbsolute(nodes: readonly PathNode[]): PathNode[] {
  const len = nodes.length;
  const out: PathNode[] = [];

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  for (let i = 0; i < len; i++) {
    const node = nodes[i];
    const rel = node.relative;

    switch (node.code) {
      case "M":
      case "m":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        startX = curX;
        startY = curY;
        out.push(createAbsMove(curX, curY));
        break;

      case "L":
      case "l":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createAbsLine(curX, curY));
        break;

      case "H":
      case "h":
        curX = rel ? curX + node.x : node.x;
        out.push(createHorizontal(false, curX, null));
        break;

      case "V":
      case "v":
        curY = rel ? curY + node.y : node.y;
        out.push(createVertical(false, curY, null));
        break;

      case "C":
      case "c": {
        const x1 = rel ? curX + node.x1 : node.x1;
        const y1 = rel ? curY + node.y1 : node.y1;
        const x2 = rel ? curX + node.x2 : node.x2;
        const y2 = rel ? curY + node.y2 : node.y2;
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createAbsCubic(x1, y1, x2, y2, curX, curY));
        break;
      }

      case "S":
      case "s": {
        const x2 = rel ? curX + node.x2 : node.x2;
        const y2 = rel ? curY + node.y2 : node.y2;
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createSmoothCubic(false, x2, y2, curX, curY, null));
        break;
      }

      case "Q":
      case "q": {
        const x1 = rel ? curX + node.x1 : node.x1;
        const y1 = rel ? curY + node.y1 : node.y1;
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createQuad(false, x1, y1, curX, curY, null));
        break;
      }

      case "T":
      case "t":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createSmoothQuad(false, curX, curY, null));
        break;

      case "A":
      case "a":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        out.push(createAbsArc(node.rx, node.ry, node.angle, node.largeArc, node.sweep, curX, curY));
        break;

      case "Z":
      case "z":
        curX = startX;
        curY = startY;
        out.push(createAbsClose());
        break;
    }
  }

  return out;
}

export function toRelative(nodes: readonly PathNode[]): PathNode[] {
  const abs = toAbsolute(nodes);
  const len = abs.length;
  const out: PathNode[] = [];

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  for (let i = 0; i < len; i++) {
    const node = abs[i];
    switch (node.code) {
      case "M": {
        const dx = node.x - curX;
        const dy = node.y - curY;
        curX = node.x;
        curY = node.y;
        startX = curX;
        startY = curY;
        out.push(createMove(true, dx, dy, null));
        break;
      }
      case "L": {
        const dx = node.x - curX;
        const dy = node.y - curY;
        curX = node.x;
        curY = node.y;
        out.push(createLine(true, dx, dy, null));
        break;
      }
      case "H": {
        const dx = node.x - curX;
        curX = node.x;
        out.push(createHorizontal(true, dx, null));
        break;
      }
      case "V": {
        const dy = node.y - curY;
        curY = node.y;
        out.push(createVertical(true, dy, null));
        break;
      }
      case "C": {
        out.push(
          createCubic(
            true,
            node.x1 - curX,
            node.y1 - curY,
            node.x2 - curX,
            node.y2 - curY,
            node.x - curX,
            node.y - curY,
            null,
          ),
        );
        curX = node.x;
        curY = node.y;
        break;
      }
      case "S": {
        out.push(
          createSmoothCubic(
            true,
            node.x2 - curX,
            node.y2 - curY,
            node.x - curX,
            node.y - curY,
            null,
          ),
        );
        curX = node.x;
        curY = node.y;
        break;
      }
      case "Q": {
        out.push(
          createQuad(true, node.x1 - curX, node.y1 - curY, node.x - curX, node.y - curY, null),
        );
        curX = node.x;
        curY = node.y;
        break;
      }
      case "T": {
        const dx = node.x - curX;
        const dy = node.y - curY;
        curX = node.x;
        curY = node.y;
        out.push(createSmoothQuad(true, dx, dy, null));
        break;
      }
      case "A": {
        const dx = node.x - curX;
        const dy = node.y - curY;
        curX = node.x;
        curY = node.y;
        out.push(
          createArc(true, node.rx, node.ry, node.angle, node.largeArc, node.sweep, dx, dy, null),
        );
        break;
      }
      case "Z": {
        curX = startX;
        curY = startY;
        out.push(createClose(true, null));
        break;
      }
    }
  }

  return out;
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  const cos = Math.min(1, Math.max(-1, dot / (len || 1)));
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  return sign * Math.acos(cos);
}

function emitArcAsCubicCurves(
  x1: number,
  y1: number,
  rxInput: number,
  ryInput: number,
  angleDeg: number,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  x2: number,
  y2: number,
  target: NormalizedCubicNode[],
): void {
  if (x1 === x2 && y1 === y2) return;
  if (rxInput === 0 || ryInput === 0) {
    target.push(createAbsCubic(x1, y1, x2, y2, x2, y2));
    return;
  }

  let rx = Math.abs(rxInput);
  let ry = Math.abs(ryInput);
  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const radicand = Math.max(
    0,
    (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq),
  );

  const factor = (largeArc === sweep ? -1 : 1) * Math.sqrt(radicand);
  const cxp = factor * ((rx * y1p) / ry);
  const cyp = factor * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );

  if (sweep === 0 && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI;
  } else if (sweep === 1 && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI;
  }

  const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2 + 1e-6)));
  const delta = deltaTheta / segments;
  const alpha = (4 / 3) * Math.tan(delta / 4);

  const cosPhiRx = cosPhi * rx;
  const sinPhiRy = sinPhi * ry;
  const sinPhiRx = sinPhi * rx;
  const cosPhiRy = cosPhi * ry;

  for (let i = 0; i < segments; i++) {
    const t1 = theta1 + i * delta;
    const t2 = t1 + delta;

    const cos1 = Math.cos(t1);
    const sin1 = Math.sin(t1);
    const cos2 = Math.cos(t2);
    const sin2 = Math.sin(t2);

    const p1x = cos1 - alpha * sin1;
    const p1y = sin1 + alpha * cos1;
    const p2x = cos2 + alpha * sin2;
    const p2y = sin2 - alpha * cos2;

    const cp1x = cosPhiRx * p1x - sinPhiRy * p1y + cx;
    const cp1y = sinPhiRx * p1x + cosPhiRy * p1y + cy;
    const cp2x = cosPhiRx * p2x - sinPhiRy * p2y + cx;
    const cp2y = sinPhiRx * p2x + cosPhiRy * p2y + cy;

    const isLast = i === segments - 1;
    const ex = isLast ? x2 : cosPhiRx * cos2 - sinPhiRy * sin2 + cx;
    const ey = isLast ? y2 : sinPhiRx * cos2 + cosPhiRy * sin2 + cy;

    target.push(createAbsCubic(cp1x, cp1y, cp2x, cp2y, ex, ey));
  }
}

export function arcToCubicCurves(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angleDeg: number,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  x2: number,
  y2: number,
): NormalizedCubicNode[] {
  const curves: NormalizedCubicNode[] = [];
  emitArcAsCubicCurves(x1, y1, rx, ry, angleDeg, largeArc, sweep, x2, y2, curves);
  return curves;
}

export function normalizePath(
  nodes: readonly PathNode[],
  options: NormalizeOptions = {},
): NormalizedPathNode[] {
  const convertArcs = options.convertArcs ?? false;
  const len = nodes.length;
  const out: NormalizedPathNode[] = [];

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  let hasCubicCtrl = false;
  let lastCubicCtrlX = 0;
  let lastCubicCtrlY = 0;

  let hasQuadCtrl = false;
  let lastQuadCtrlX = 0;
  let lastQuadCtrlY = 0;

  for (let i = 0; i < len; i++) {
    const node = nodes[i];
    const rel = node.relative;

    switch (node.code) {
      case "M":
      case "m":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        startX = curX;
        startY = curY;
        hasCubicCtrl = false;
        hasQuadCtrl = false;
        out.push(createAbsMove(curX, curY));
        break;

      case "L":
      case "l":
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        hasCubicCtrl = false;
        hasQuadCtrl = false;
        out.push(createAbsLine(curX, curY));
        break;

      case "H":
      case "h":
        curX = rel ? curX + node.x : node.x;
        hasCubicCtrl = false;
        hasQuadCtrl = false;
        out.push(createAbsLine(curX, curY));
        break;

      case "V":
      case "v":
        curY = rel ? curY + node.y : node.y;
        hasCubicCtrl = false;
        hasQuadCtrl = false;
        out.push(createAbsLine(curX, curY));
        break;

      case "C":
      case "c": {
        const x1 = rel ? curX + node.x1 : node.x1;
        const y1 = rel ? curY + node.y1 : node.y1;
        const x2 = rel ? curX + node.x2 : node.x2;
        const y2 = rel ? curY + node.y2 : node.y2;
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        hasCubicCtrl = true;
        lastCubicCtrlX = x2;
        lastCubicCtrlY = y2;
        hasQuadCtrl = false;
        out.push(createAbsCubic(x1, y1, x2, y2, curX, curY));
        break;
      }

      case "S":
      case "s": {
        const x1 = hasCubicCtrl ? 2 * curX - lastCubicCtrlX : curX;
        const y1 = hasCubicCtrl ? 2 * curY - lastCubicCtrlY : curY;
        const x2 = rel ? curX + node.x2 : node.x2;
        const y2 = rel ? curY + node.y2 : node.y2;
        curX = rel ? curX + node.x : node.x;
        curY = rel ? curY + node.y : node.y;
        hasCubicCtrl = true;
        lastCubicCtrlX = x2;
        lastCubicCtrlY = y2;
        hasQuadCtrl = false;
        out.push(createAbsCubic(x1, y1, x2, y2, curX, curY));
        break;
      }

      case "Q":
      case "q": {
        const qx1 = rel ? curX + node.x1 : node.x1;
        const qy1 = rel ? curY + node.y1 : node.y1;
        const ex = rel ? curX + node.x : node.x;
        const ey = rel ? curY + node.y : node.y;

        const c1x = curX + (2 / 3) * (qx1 - curX);
        const c1y = curY + (2 / 3) * (qy1 - curY);
        const c2x = ex + (2 / 3) * (qx1 - ex);
        const c2y = ey + (2 / 3) * (qy1 - ey);

        hasQuadCtrl = true;
        lastQuadCtrlX = qx1;
        lastQuadCtrlY = qy1;
        hasCubicCtrl = false;
        curX = ex;
        curY = ey;
        out.push(createAbsCubic(c1x, c1y, c2x, c2y, curX, curY));
        break;
      }

      case "T":
      case "t": {
        const qx1 = hasQuadCtrl ? 2 * curX - lastQuadCtrlX : curX;
        const qy1 = hasQuadCtrl ? 2 * curY - lastQuadCtrlY : curY;
        const ex = rel ? curX + node.x : node.x;
        const ey = rel ? curY + node.y : node.y;

        const c1x = curX + (2 / 3) * (qx1 - curX);
        const c1y = curY + (2 / 3) * (qy1 - curY);
        const c2x = ex + (2 / 3) * (qx1 - ex);
        const c2y = ey + (2 / 3) * (qy1 - ey);

        hasQuadCtrl = true;
        lastQuadCtrlX = qx1;
        lastQuadCtrlY = qy1;
        hasCubicCtrl = false;
        curX = ex;
        curY = ey;
        out.push(createAbsCubic(c1x, c1y, c2x, c2y, curX, curY));
        break;
      }

      case "A":
      case "a": {
        const ex = rel ? curX + node.x : node.x;
        const ey = rel ? curY + node.y : node.y;
        hasCubicCtrl = false;
        hasQuadCtrl = false;

        if (convertArcs) {
          emitArcAsCubicCurves(
            curX,
            curY,
            node.rx,
            node.ry,
            node.angle,
            node.largeArc,
            node.sweep,
            ex,
            ey,
            out as NormalizedCubicNode[],
          );
        } else {
          out.push(createAbsArc(node.rx, node.ry, node.angle, node.largeArc, node.sweep, ex, ey));
        }
        curX = ex;
        curY = ey;
        break;
      }

      case "Z":
      case "z":
        curX = startX;
        curY = startY;
        hasCubicCtrl = false;
        hasQuadCtrl = false;
        out.push(createAbsClose());
        break;
    }
  }

  return out;
}

export function scalePath(
  nodes: readonly PathNode[],
  sx: number,
  sy = sx,
  tx = 0,
  ty = 0,
): NormalizedPathNode[] {
  const norm = normalizePath(nodes);
  const len = norm.length;
  const out: NormalizedPathNode[] = [];
  const flipSweep = sx * sy < 0;

  for (let i = 0; i < len; i++) {
    const n = norm[i];
    switch (n.code) {
      case "M":
        out.push(createAbsMove(n.x * sx + tx, n.y * sy + ty));
        break;
      case "L":
        out.push(createAbsLine(n.x * sx + tx, n.y * sy + ty));
        break;
      case "C":
        out.push(
          createAbsCubic(
            n.x1 * sx + tx,
            n.y1 * sy + ty,
            n.x2 * sx + tx,
            n.y2 * sy + ty,
            n.x * sx + tx,
            n.y * sy + ty,
          ),
        );
        break;
      case "A":
        out.push(
          createAbsArc(
            Math.abs(n.rx * sx),
            Math.abs(n.ry * sy),
            n.angle,
            n.largeArc,
            flipSweep ? ((1 - n.sweep) as 0 | 1) : n.sweep,
            n.x * sx + tx,
            n.y * sy + ty,
          ),
        );
        break;
      case "Z":
        out.push(createAbsClose());
        break;
    }
  }

  return out;
}

export function transformMatrix(
  nodes: readonly PathNode[],
  matrix: Matrix2D,
): NormalizedPathNode[] {
  const [a, b, c, d, e, f] = matrix;
  if (a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0) {
    return normalizePath(nodes);
  }

  const hasRotationOrSkew = b !== 0 || c !== 0;
  const norm = normalizePath(nodes, { convertArcs: hasRotationOrSkew });
  const len = norm.length;
  const out: NormalizedPathNode[] = [];
  const flipSweep = a * d - b * c < 0;

  for (let i = 0; i < len; i++) {
    const n = norm[i];
    switch (n.code) {
      case "M":
        out.push(createAbsMove(a * n.x + c * n.y + e, b * n.x + d * n.y + f));
        break;
      case "L":
        out.push(createAbsLine(a * n.x + c * n.y + e, b * n.x + d * n.y + f));
        break;
      case "C":
        out.push(
          createAbsCubic(
            a * n.x1 + c * n.y1 + e,
            b * n.x1 + d * n.y1 + f,
            a * n.x2 + c * n.y2 + e,
            b * n.x2 + d * n.y2 + f,
            a * n.x + c * n.y + e,
            b * n.x + d * n.y + f,
          ),
        );
        break;
      case "A":
        out.push(
          createAbsArc(
            Math.abs(n.rx * a),
            Math.abs(n.ry * d),
            n.angle,
            n.largeArc,
            flipSweep ? ((1 - n.sweep) as 0 | 1) : n.sweep,
            a * n.x + c * n.y + e,
            b * n.x + d * n.y + f,
          ),
        );
        break;
      case "Z":
        out.push(createAbsClose());
        break;
    }
  }

  return out;
}
