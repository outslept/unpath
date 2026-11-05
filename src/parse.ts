import {
  CharCode,
  isCommandCode,
  isDigitCode,
  isRelativeCommandCode,
  isSeparatorCode,
} from "./chars.ts";
import {
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
import type { ParseIssue, ParseResult, PathNode } from "./types.ts";

const FRAC_DIVISORS = new Float64Array([1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]);

function pushIssue(issues: ParseIssue[], message: string, index: number): void {
  issues.push({ message, index });
}

function failIncomplete(
  nodes: PathNode[],
  issues: ParseIssue[],
  cmdCode: number,
  index: number,
): ParseResult {
  pushIssue(issues, `Incomplete parameters for "${String.fromCharCode(cmdCode)}"`, index);
  return { nodes, issues };
}

export function parsePath(d: string): ParseResult {
  const nodes: PathNode[] = [];
  const issues: ParseIssue[] = [];
  const len = d.length;
  let cursor = 0;

  function skipSeparators(): void {
    while (cursor < len && isSeparatorCode(d.charCodeAt(cursor))) {
      cursor++;
    }
  }

  function readNumber(): number {
    skipSeparators();
    if (cursor >= len) return Number.NaN;

    const start = cursor;
    let code = d.charCodeAt(cursor);

    let sign = 1;
    if (code === CharCode.Minus) {
      sign = -1;
      cursor++;
    } else if (code === CharCode.Plus) {
      cursor++;
    }

    let intPart = 0;
    let intDigits = 0;
    while (cursor < len && isDigitCode((code = d.charCodeAt(cursor)))) {
      intPart = intPart * 10 + (code - CharCode.Digit0);
      intDigits++;
      cursor++;
    }

    let fracPart = 0;
    let fracDigits = 0;
    if (cursor < len && d.charCodeAt(cursor) === CharCode.Dot) {
      cursor++;
      while (cursor < len && isDigitCode((code = d.charCodeAt(cursor)))) {
        fracPart = fracPart * 10 + (code - CharCode.Digit0);
        fracDigits++;
        cursor++;
      }
    }

    const totalDigits = intDigits + fracDigits;
    if (totalDigits === 0) {
      cursor = start;
      return Number.NaN;
    }

    let hasExponent = false;
    if (cursor < len) {
      code = d.charCodeAt(cursor);
      if (code === CharCode.LowerE || code === CharCode.UpperE) {
        const expRollback = cursor++;
        if (cursor < len) {
          const signCode = d.charCodeAt(cursor);
          if (signCode === CharCode.Plus || signCode === CharCode.Minus) {
            cursor++;
          }
        }
        let expDigits = 0;
        while (cursor < len && isDigitCode(d.charCodeAt(cursor))) {
          expDigits++;
          cursor++;
        }
        if (expDigits > 0) hasExponent = true;
        else cursor = expRollback;
      }
    }

    if (!hasExponent && totalDigits <= 15 && fracDigits <= 9) {
      const value = fracDigits === 0 ? intPart : intPart + fracPart / FRAC_DIVISORS[fracDigits];
      const signed = sign < 0 ? -value : value;
      return signed === 0 ? 0 : signed;
    }

    return Number.parseFloat(d.substring(start, cursor));
  }

  function readArcFlag(): -1 | 0 | 1 {
    skipSeparators();
    if (cursor >= len) return -1;
    const code = d.charCodeAt(cursor);
    if (code === CharCode.Digit0) {
      cursor++;
      return 0;
    }
    if (code === CharCode.Digit1) {
      cursor++;
      return 1;
    }
    return -1;
  }

  let activeCmd = 0;

  while (cursor < len) {
    skipSeparators();
    if (cursor >= len) break;

    const code = d.charCodeAt(cursor);
    let implicit = false;
    const cmdStart = cursor;

    if (isCommandCode(code)) {
      activeCmd = code;
      cursor++;
    } else if (activeCmd !== 0 && activeCmd !== CharCode.UpperZ && activeCmd !== CharCode.LowerZ) {
      // subsequent coordinate pairs after M/m are implicit L/l commands
      if (activeCmd === CharCode.UpperM) activeCmd = CharCode.UpperL;
      else if (activeCmd === CharCode.LowerM) activeCmd = CharCode.LowerL;
      implicit = true;
    } else {
      pushIssue(issues, `Unexpected token "${d[cursor]}"`, cursor);
      cursor++;
      continue;
    }

    if (nodes.length === 0 && activeCmd !== CharCode.UpperM && activeCmd !== CharCode.LowerM) {
      pushIssue(
        issues,
        `Path must start with M or m, got "${String.fromCharCode(activeCmd)}"`,
        cmdStart,
      );
    }

    const relative = isRelativeCommandCode(activeCmd);
    const upperCmd = activeCmd & ~CharCode.LowerCaseBit;

    switch (upperCmd) {
      case CharCode.UpperZ:
        nodes.push(createClose(relative, createSpan(cmdStart, cursor, false)));
        break;

      case CharCode.UpperH: {
        const x = readNumber();
        if (Number.isNaN(x)) return failIncomplete(nodes, issues, activeCmd, cmdStart);
        nodes.push(createHorizontal(relative, x, createSpan(cmdStart, cursor, implicit)));
        break;
      }

      case CharCode.UpperV: {
        const y = readNumber();
        if (Number.isNaN(y)) return failIncomplete(nodes, issues, activeCmd, cmdStart);
        nodes.push(createVertical(relative, y, createSpan(cmdStart, cursor, implicit)));
        break;
      }

      case CharCode.UpperM:
      case CharCode.UpperL:
      case CharCode.UpperT: {
        const x = readNumber();
        const y = readNumber();
        if (Number.isNaN(x + y)) return failIncomplete(nodes, issues, activeCmd, cmdStart);
        const span = createSpan(cmdStart, cursor, implicit);
        nodes.push(
          upperCmd === CharCode.UpperM
            ? createMove(relative, x, y, span)
            : upperCmd === CharCode.UpperL
              ? createLine(relative, x, y, span)
              : createSmoothQuad(relative, x, y, span),
        );
        break;
      }

      case CharCode.UpperS:
      case CharCode.UpperQ: {
        const a = readNumber();
        const b = readNumber();
        const x = readNumber();
        const y = readNumber();
        if (Number.isNaN(a + b + x + y)) {
          return failIncomplete(nodes, issues, activeCmd, cmdStart);
        }
        const span = createSpan(cmdStart, cursor, implicit);
        nodes.push(
          upperCmd === CharCode.UpperS
            ? createSmoothCubic(relative, a, b, x, y, span)
            : createQuad(relative, a, b, x, y, span),
        );
        break;
      }

      case CharCode.UpperC: {
        const x1 = readNumber();
        const y1 = readNumber();
        const x2 = readNumber();
        const y2 = readNumber();
        const x = readNumber();
        const y = readNumber();
        if (Number.isNaN(x1 + y1 + x2 + y2 + x + y)) {
          return failIncomplete(nodes, issues, activeCmd, cmdStart);
        }
        nodes.push(
          createCubic(relative, x1, y1, x2, y2, x, y, createSpan(cmdStart, cursor, implicit)),
        );
        break;
      }

      case CharCode.UpperA: {
        const rx = readNumber();
        const ry = readNumber();
        const angle = readNumber();
        const largeArc = readArcFlag();
        const sweep = readArcFlag();
        const x = readNumber();
        const y = readNumber();

        if (largeArc === -1 || sweep === -1 || Number.isNaN(rx + ry + angle + x + y)) {
          return failIncomplete(nodes, issues, activeCmd, cmdStart);
        }

        nodes.push(
          createArc(
            relative,
            Math.abs(rx),
            Math.abs(ry),
            angle,
            largeArc,
            sweep,
            x,
            y,
            createSpan(cmdStart, cursor, implicit),
          ),
        );
        break;
      }
    }
  }

  return { nodes, issues };
}
