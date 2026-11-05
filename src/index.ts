export type {
  ArcNode,
  BBox,
  BaseNode,
  CloseNode,
  CommandCode,
  CubicNode,
  HorizontalNode,
  LineNode,
  Matrix2D,
  MoveNode,
  NormalizeOptions,
  NormalizedArcNode,
  NormalizedCloseNode,
  NormalizedCubicNode,
  NormalizedLineNode,
  NormalizedMoveNode,
  NormalizedPathNode,
  ParseIssue,
  ParseResult,
  PathNode,
  QuadNode,
  SerializeOptions,
  SmoothCubicNode,
  SmoothQuadNode,
  Span,
  SvgShapeInput,
  VerticalNode,
} from "./types.ts";

export {
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
  createSpan,
  createVertical,
} from "./nodes.ts";

export { parsePath } from "./parse.ts";
export { roundNum, serializePath } from "./serialize.ts";
export {
  arcToCubicCurves,
  normalizePath,
  scalePath,
  toAbsolute,
  toRelative,
  transformMatrix,
} from "./transform.ts";
export {
  getPathBBox,
  resizeWithPins,
  reversePath,
  roundCorners,
  splitCubicAt,
} from "./geometry.ts";
export { shapeToPath } from "./shapes.ts";

import { getPathBBox, resizeWithPins, reversePath, roundCorners } from "./geometry.ts";
import { parsePath } from "./parse.ts";
import { serializePath } from "./serialize.ts";
import { shapeToPath } from "./shapes.ts";
import { normalizePath, scalePath, toAbsolute, toRelative, transformMatrix } from "./transform.ts";
import type {
  BBox,
  Matrix2D,
  NormalizeOptions,
  PathNode,
  SerializeOptions,
  SvgShapeInput,
} from "./types.ts";

export class UnpathChain {
  readonly nodes: readonly PathNode[];

  constructor(input: string | readonly PathNode[] | SvgShapeInput) {
    if (typeof input === "string") {
      this.nodes = parsePath(input).nodes;
    } else if (Array.isArray(input)) {
      this.nodes = input;
    } else {
      this.nodes = shapeToPath(input as SvgShapeInput);
    }
  }

  toAbsolute(): UnpathChain {
    return new UnpathChain(toAbsolute(this.nodes));
  }

  toRelative(): UnpathChain {
    return new UnpathChain(toRelative(this.nodes));
  }

  normalize(options?: NormalizeOptions): UnpathChain {
    return new UnpathChain(normalizePath(this.nodes, options));
  }

  scale(sx: number, sy = sx, tx = 0, ty = 0): UnpathChain {
    return new UnpathChain(scalePath(this.nodes, sx, sy, tx, ty));
  }

  matrix(m: Matrix2D): UnpathChain {
    return new UnpathChain(transformMatrix(this.nodes, m));
  }

  roundCorners(radius: number): UnpathChain {
    return new UnpathChain(roundCorners(this.nodes, radius));
  }

  resizeWithPins(
    origW: number,
    origH: number,
    targetW: number,
    targetH: number,
    splitX?: number,
    splitY?: number,
  ): UnpathChain {
    return new UnpathChain(
      resizeWithPins(this.nodes, origW, origH, targetW, targetH, splitX, splitY),
    );
  }

  reverse(): UnpathChain {
    return new UnpathChain(reversePath(this.nodes));
  }

  bbox(): BBox {
    return getPathBBox(this.nodes);
  }

  toString(options?: SerializeOptions): string {
    return serializePath(this.nodes, options);
  }
}

export function unpath(input: string | readonly PathNode[] | SvgShapeInput): UnpathChain {
  return new UnpathChain(input);
}
