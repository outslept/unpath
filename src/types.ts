export type CommandCode =
  | "M"
  | "m"
  | "L"
  | "l"
  | "H"
  | "h"
  | "V"
  | "v"
  | "C"
  | "c"
  | "S"
  | "s"
  | "Q"
  | "q"
  | "T"
  | "t"
  | "A"
  | "a"
  | "Z"
  | "z";

export interface Span {
  readonly start: number;
  readonly end: number;
  readonly implicit: boolean;
}

export interface BaseNode<T extends CommandCode> {
  readonly code: T;
  readonly relative: boolean;
  readonly span: Span | null;
}

export interface MoveNode extends BaseNode<"M" | "m"> {
  readonly x: number;
  readonly y: number;
}

export interface LineNode extends BaseNode<"L" | "l"> {
  readonly x: number;
  readonly y: number;
}

export interface HorizontalNode extends BaseNode<"H" | "h"> {
  readonly x: number;
}

export interface VerticalNode extends BaseNode<"V" | "v"> {
  readonly y: number;
}

export interface CubicNode extends BaseNode<"C" | "c"> {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
}

export interface SmoothCubicNode extends BaseNode<"S" | "s"> {
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
}

export interface QuadNode extends BaseNode<"Q" | "q"> {
  readonly x1: number;
  readonly y1: number;
  readonly x: number;
  readonly y: number;
}

export interface SmoothQuadNode extends BaseNode<"T" | "t"> {
  readonly x: number;
  readonly y: number;
}

export interface ArcNode extends BaseNode<"A" | "a"> {
  readonly rx: number;
  readonly ry: number;
  readonly angle: number;
  readonly largeArc: 0 | 1;
  readonly sweep: 0 | 1;
  readonly x: number;
  readonly y: number;
}

export interface CloseNode extends BaseNode<"Z" | "z"> {}

export type PathNode =
  | MoveNode
  | LineNode
  | HorizontalNode
  | VerticalNode
  | CubicNode
  | SmoothCubicNode
  | QuadNode
  | SmoothQuadNode
  | ArcNode
  | CloseNode;

export type NormalizedMoveNode = MoveNode & { readonly code: "M"; readonly relative: false };
export type NormalizedLineNode = LineNode & { readonly code: "L"; readonly relative: false };
export type NormalizedCubicNode = CubicNode & { readonly code: "C"; readonly relative: false };
export type NormalizedArcNode = ArcNode & { readonly code: "A"; readonly relative: false };
export type NormalizedCloseNode = CloseNode & { readonly code: "Z"; readonly relative: false };

export type NormalizedPathNode =
  | NormalizedMoveNode
  | NormalizedLineNode
  | NormalizedCubicNode
  | NormalizedArcNode
  | NormalizedCloseNode;

export interface ParseIssue {
  readonly message: string;
  readonly index: number;
}

export interface ParseResult {
  readonly nodes: PathNode[];
  readonly issues: ParseIssue[];
}

export interface SerializeOptions {
  readonly precision?: number;
  readonly minify?: boolean;
}

export interface NormalizeOptions {
  readonly convertArcs?: boolean;
}

export interface BBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
}

export type Matrix2D = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export type SvgShapeInput =
  | {
      readonly type: "rect";
      readonly x?: number;
      readonly y?: number;
      readonly width: number;
      readonly height: number;
      readonly rx?: number;
      readonly ry?: number;
    }
  | {
      readonly type: "circle";
      readonly cx?: number;
      readonly cy?: number;
      readonly r: number;
    }
  | {
      readonly type: "ellipse";
      readonly cx?: number;
      readonly cy?: number;
      readonly rx: number;
      readonly ry: number;
    }
  | {
      readonly type: "line";
      readonly x1?: number;
      readonly y1?: number;
      readonly x2?: number;
      readonly y2?: number;
    }
  | {
      readonly type: "polyline" | "polygon";
      readonly points: string | ReadonlyArray<readonly [number, number]>;
    };
