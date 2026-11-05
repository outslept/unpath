# unpath

Zero-dependency, SVG `<path d="...">` parser, normalizer, and geometry engine

## Usage

### Chain API

```ts
import { unpath } from "unpath";

const path = unpath({ type: "polygon", points: "0,0 20,0 20,20 0,20" })
  .roundCorners(4)
  .scale(1.5)
  .reverse();

console.log(path.bbox());
// { minX: 0, minY: 0, maxX: 30, maxY: 30, width: 30, height: 30, cx: 15, cy: 15 }

console.log(path.toRelative().toString({ precision: 2, minify: true }));
// "m0 6a6 6 0 006 6l18 0a6 6 0 006-6l0-18a6 6 0 00-6-6l-18 0a6 6 0 00-6 6z"
```

### Functional API

```ts
import { parsePath, roundCorners, resizeWithPins, getPathBBox, serializePath } from "unpath";

// 1. Parse compressed SVGO paths (packed arc flags, chained decimals, implicit L)
const { nodes, issues } = parsePath("M0 0 20 0 20 20 0 20z");

// 2. Fillet sharp polygon vertices with tangent arcs
const rounded = roundCorners(nodes, 4);

// 3. 9-slice resize from 20x20 to 120x60 without stretching corner radii into ovals
const resized = resizeWithPins(rounded, 20, 20, 120, 60);

// 4. Analytical bounding box (no DOM / getBBox() required)
const bbox = getPathBBox(resized);

// 5. Serialize back to d="..."
const d = serializePath(resized, { precision: 2, minify: true });
```

## API

| Function                                                                  | Description                                                                                                                 |
| :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- |
| `parsePath(d)`                                                            | Fault-tolerant scanner returning `{ nodes, issues }`. Each node includes `span: { start, end, implicit }`.                  |
| `serializePath(nodes, options?)`                                          | Formats nodes back to `d` string (`{ precision?: 2, minify?: false }`).                                                     |
| `roundNum(value, precision?)`                                             | Rounds numbers via a precomputed `POW10` table and normalizes `-0` to `0`.                                                  |
| `toAbsolute(nodes)`                                                       | Converts all relative commands (`m`, `l`, `c`, ...) to absolute (`M`, `L`, `C`, ...).                                       |
| `toRelative(nodes)`                                                       | Converts all commands to relative coordinates for smaller minified output.                                                  |
| `normalizePath(nodes, options?)`                                          | Expands `H`, `V`, `S`, `Q`, `T` into canonical `M`, `L`, `C`, `A`, `Z`. Pass `{ convertArcs: true }` to convert `A` to `C`. |
| `arcToCubicCurves(x1, y1, rx, ry, angle, largeArc, sweep, x2, y2)`        | Approximates an SVG elliptical arc with 1–4 cubic Bézier segments (W3C SVG 1.1 F.6.5).                                      |
| `scalePath(nodes, sx, sy?, tx?, ty?)`                                     | Scales and translates a path, flipping arc `sweep` flags on negative reflections.                                           |
| `transformMatrix(nodes, [a, b, c, d, e, f])`                              | Bakes a 2D affine matrix into path coordinates (auto-converts arcs under rotation/skew).                                    |
| `getPathBBox(nodes)`                                                      | Computes `{ minX, minY, maxX, maxY, width, height, cx, cy }` analytically from cubic derivative roots.                      |
| `roundCorners(nodes, radius)`                                             | Replaces sharp polygon corners with tangent `A` arcs, clamped to `49.9%` of the shortest adjacent edge.                     |
| `resizeWithPins(nodes, origW, origH, targetW, targetH, splitX?, splitY?)` | 9-slice path scaling across `splitX`/`splitY` planes without distorting corner radii.                                       |
| `reversePath(nodes)`                                                      | Reverses subpath winding order and flips arc `sweep` flags for `stroke-dashoffset` and `evenodd` fills.                     |
| `splitCubicAt(x0, y0, x1, y1, x2, y2, x3, y3, t?)`                        | Subdivides a cubic Bézier curve at `t` (`0..1`) via De Casteljau's algorithm.                                               |
| `shapeToPath(shape)`                                                      | Converts `rect`, `circle`, `ellipse`, `line`, `polyline`, and `polygon` primitives to `NormalizedPathNode[]`.               |
| `unpath(input)`                                                           | Wrapper accepting a `d` string, `PathNode[]`, or `SvgShapeInput`.                                                           |
