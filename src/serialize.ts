import { CharCode } from "./chars.ts";
import type { CommandCode, PathNode, SerializeOptions } from "./types.ts";

const POW10 = new Float64Array([1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10]);

export function roundNum(value: number, precision = 2): number {
  const factor = precision >= 0 && precision <= 10 ? POW10[precision] : 10 ** precision;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function formatMinifiedNum(value: number, precision: number): string {
  const str = String(roundNum(value, precision));
  if (str.startsWith("0.")) return str.substring(1);
  if (str.startsWith("-0.")) return "-" + str.substring(2);
  return str;
}

function appendToken(acc: string, prevHadDot: boolean, token: string): string {
  const firstCode = token.charCodeAt(0);
  if (
    acc.length === 0 ||
    firstCode === CharCode.Minus ||
    (prevHadDot && firstCode === CharCode.Dot)
  ) {
    return acc + token;
  }
  return acc + " " + token;
}

function formatNodeParamsMinified(node: PathNode, precision: number) {
  switch (node.code) {
    case "H":
    case "h":
      return formatMinifiedNum(node.x, precision);

    case "V":
    case "v":
      return formatMinifiedNum(node.y, precision);

    case "M":
    case "m":
    case "L":
    case "l":
    case "T":
    case "t": {
      const sx = formatMinifiedNum(node.x, precision);
      const sy = formatMinifiedNum(node.y, precision);
      return appendToken(sx, sx.indexOf(".") !== -1, sy);
    }

    case "S":
    case "s": {
      const s0 = formatMinifiedNum(node.x2, precision);
      const s1 = formatMinifiedNum(node.y2, precision);
      const s2 = formatMinifiedNum(node.x, precision);
      const s3 = formatMinifiedNum(node.y, precision);
      let out = appendToken(s0, s0.indexOf(".") !== -1, s1);
      out = appendToken(out, s1.indexOf(".") !== -1, s2);
      return appendToken(out, s2.indexOf(".") !== -1, s3);
    }

    case "Q":
    case "q": {
      const s0 = formatMinifiedNum(node.x1, precision);
      const s1 = formatMinifiedNum(node.y1, precision);
      const s2 = formatMinifiedNum(node.x, precision);
      const s3 = formatMinifiedNum(node.y, precision);
      let out = appendToken(s0, s0.indexOf(".") !== -1, s1);
      out = appendToken(out, s1.indexOf(".") !== -1, s2);
      return appendToken(out, s2.indexOf(".") !== -1, s3);
    }

    case "C":
    case "c": {
      const s0 = formatMinifiedNum(node.x1, precision);
      const s1 = formatMinifiedNum(node.y1, precision);
      const s2 = formatMinifiedNum(node.x2, precision);
      const s3 = formatMinifiedNum(node.y2, precision);
      const s4 = formatMinifiedNum(node.x, precision);
      const s5 = formatMinifiedNum(node.y, precision);
      let out = appendToken(s0, s0.indexOf(".") !== -1, s1);
      out = appendToken(out, s1.indexOf(".") !== -1, s2);
      out = appendToken(out, s2.indexOf(".") !== -1, s3);
      out = appendToken(out, s3.indexOf(".") !== -1, s4);
      return appendToken(out, s4.indexOf(".") !== -1, s5);
    }

    case "A":
    case "a": {
      const sRx = formatMinifiedNum(node.rx, precision);
      const sRy = formatMinifiedNum(node.ry, precision);
      const sAngle = formatMinifiedNum(node.angle, precision);
      const sX = formatMinifiedNum(node.x, precision);
      const sY = formatMinifiedNum(node.y, precision);

      let out = appendToken(sRx, sRx.indexOf(".") !== -1, sRy);
      out = appendToken(out, sRy.indexOf(".") !== -1, sAngle);
      out += " " + node.largeArc + node.sweep + sX;
      return appendToken(out, sX.indexOf(".") !== -1, sY);
    }

    case "Z":
    case "z":
      return "";
  }
}

function formatNodeReadable(node: PathNode, precision: number): string {
  const r = roundNum;
  switch (node.code) {
    case "M":
    case "m":
    case "L":
    case "l":
    case "T":
    case "t":
      return `${node.code} ${r(node.x, precision)} ${r(node.y, precision)}`;
    case "H":
    case "h":
      return `${node.code} ${r(node.x, precision)}`;
    case "V":
    case "v":
      return `${node.code} ${r(node.y, precision)}`;
    case "C":
    case "c":
      return `${node.code} ${r(node.x1, precision)} ${r(node.y1, precision)} ${r(node.x2, precision)} ${r(node.y2, precision)} ${r(node.x, precision)} ${r(node.y, precision)}`;
    case "S":
    case "s":
      return `${node.code} ${r(node.x2, precision)} ${r(node.y2, precision)} ${r(node.x, precision)} ${r(node.y, precision)}`;
    case "Q":
    case "q":
      return `${node.code} ${r(node.x1, precision)} ${r(node.y1, precision)} ${r(node.x, precision)} ${r(node.y, precision)}`;
    case "A":
    case "a":
      return `${node.code} ${r(node.rx, precision)} ${r(node.ry, precision)} ${r(node.angle, precision)} ${node.largeArc} ${node.sweep} ${r(node.x, precision)} ${r(node.y, precision)}`;
    case "Z":
    case "z":
      return "Z";
  }
}

export function serializePath(nodes: readonly PathNode[], options: SerializeOptions = {}): string {
  const len = nodes.length;
  if (len === 0) return "";

  const precision = options.precision ?? 2;
  const minify = options.minify ?? false;

  if (!minify) {
    if (len === 1) return formatNodeReadable(nodes[0], precision);
    const parts: string[] = [];
    for (let i = 0; i < len; i++) {
      parts.push(formatNodeReadable(nodes[i], precision));
    }
    return parts.join(" ");
  }

  let out = "";
  let prevCode: CommandCode | null = null;

  for (let i = 0; i < len; i++) {
    const node = nodes[i];
    if (node.code === "Z" || node.code === "z") {
      out += "z";
      prevCode = node.code;
      continue;
    }

    const paramsStr = formatNodeParamsMinified(node, precision);
    const canOmitCommand =
      (node.code === prevCode && node.code !== "M" && node.code !== "m") ||
      (prevCode === "M" && node.code === "L") ||
      (prevCode === "m" && node.code === "l");

    if (canOmitCommand) {
      const startsWithMinus = paramsStr.charCodeAt(0) === CharCode.Minus;
      out += (startsWithMinus ? "" : " ") + paramsStr;
    } else {
      out += node.code + paramsStr;
    }

    prevCode = node.code;
  }

  return out;
}
