import type {
  ArcNode,
  CloseNode,
  CubicNode,
  HorizontalNode,
  LineNode,
  MoveNode,
  NormalizedArcNode,
  NormalizedCloseNode,
  NormalizedCubicNode,
  NormalizedLineNode,
  NormalizedMoveNode,
  QuadNode,
  SmoothCubicNode,
  SmoothQuadNode,
  Span,
  VerticalNode,
} from "./types.ts";

export function createSpan(start: number, end: number, implicit: boolean): Span {
  return { start, end, implicit };
}

export function createMove(relative: boolean, x: number, y: number, span: Span | null): MoveNode {
  return { code: relative ? "m" : "M", relative, span, x, y };
}

export function createAbsMove(x: number, y: number): NormalizedMoveNode {
  return { code: "M", relative: false, span: null, x, y };
}

export function createLine(relative: boolean, x: number, y: number, span: Span | null): LineNode {
  return { code: relative ? "l" : "L", relative, span, x, y };
}

export function createAbsLine(x: number, y: number): NormalizedLineNode {
  return { code: "L", relative: false, span: null, x, y };
}

export function createHorizontal(relative: boolean, x: number, span: Span | null): HorizontalNode {
  return { code: relative ? "h" : "H", relative, span, x };
}

export function createVertical(relative: boolean, y: number, span: Span | null): VerticalNode {
  return { code: relative ? "v" : "V", relative, span, y };
}

export function createCubic(
  relative: boolean,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
  span: Span | null,
): CubicNode {
  return { code: relative ? "c" : "C", relative, span, x1, y1, x2, y2, x, y };
}

export function createAbsCubic(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
): NormalizedCubicNode {
  return { code: "C", relative: false, span: null, x1, y1, x2, y2, x, y };
}

export function createSmoothCubic(
  relative: boolean,
  x2: number,
  y2: number,
  x: number,
  y: number,
  span: Span | null,
): SmoothCubicNode {
  return { code: relative ? "s" : "S", relative, span, x2, y2, x, y };
}

export function createQuad(
  relative: boolean,
  x1: number,
  y1: number,
  x: number,
  y: number,
  span: Span | null,
): QuadNode {
  return { code: relative ? "q" : "Q", relative, span, x1, y1, x, y };
}

export function createSmoothQuad(
  relative: boolean,
  x: number,
  y: number,
  span: Span | null,
): SmoothQuadNode {
  return { code: relative ? "t" : "T", relative, span, x, y };
}

export function createArc(
  relative: boolean,
  rx: number,
  ry: number,
  angle: number,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  x: number,
  y: number,
  span: Span | null,
): ArcNode {
  return { code: relative ? "a" : "A", relative, span, rx, ry, angle, largeArc, sweep, x, y };
}

export function createAbsArc(
  rx: number,
  ry: number,
  angle: number,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  x: number,
  y: number,
): NormalizedArcNode {
  return { code: "A", relative: false, span: null, rx, ry, angle, largeArc, sweep, x, y };
}

export function createClose(relative: boolean, span: Span | null): CloseNode {
  return { code: relative ? "z" : "Z", relative, span };
}

export function createAbsClose(): NormalizedCloseNode {
  return { code: "Z", relative: false, span: null };
}
