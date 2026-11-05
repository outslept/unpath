// todo: refactor to get rid of
// enum value duplicate
export const enum CharCode {
  Tab = 9,
  LineFeed = 10,
  FormFeed = 12,
  CarriageReturn = 13,
  Plus = 43,
  Space = 32,
  Comma = 44,
  Minus = 45,
  Dot = 46,
  Digit0 = 48,
  Digit1 = 49,
  Digit9 = 57,
  UpperA = 65,
  UpperC = 67,
  UpperE = 69,
  UpperH = 72,
  UpperL = 76,
  UpperM = 77,
  UpperQ = 81,
  UpperS = 83,
  UpperT = 84,
  UpperV = 86,
  UpperZ = 90,
  // ASCII bit 5 flips uppercase to loweracse ('A' | 32 === 'a')
  LowerCaseBit = 32,
  LowerA = 97,
  LowerC = 99,
  LowerE = 101,
  LowerH = 104,
  LowerL = 108,
  LowerM = 109,
  LowerQ = 113,
  LowerS = 115,
  LowerT = 116,
  LowerV = 118,
  LowerZ = 122,
}

export const enum CharMask {
  None = 0,
  Separator = 1 << 0,
  Digit = 1 << 1,
  Sign = 1 << 2,
  Command = 1 << 3,
  NumberStart = (1 << 1) | (1 << 2) | (1 << 4),
  Dot = 1 << 4,
}

const CHAR_TABLE = new Uint8Array(128);

CHAR_TABLE[CharCode.Tab] |= CharMask.Separator;
CHAR_TABLE[CharCode.LineFeed] |= CharMask.Separator;
CHAR_TABLE[CharCode.FormFeed] |= CharMask.Separator;
CHAR_TABLE[CharCode.CarriageReturn] |= CharMask.Separator;
CHAR_TABLE[CharCode.Space] |= CharMask.Separator;
CHAR_TABLE[CharCode.Comma] |= CharMask.Separator;

CHAR_TABLE[CharCode.Plus] |= CharMask.Sign;
CHAR_TABLE[CharCode.Minus] |= CharMask.Sign;
CHAR_TABLE[CharCode.Dot] |= CharMask.Dot;

for (let c = CharCode.Digit0; c <= CharCode.Digit9; c++) {
  CHAR_TABLE[c] |= CharMask.Digit;
}

const COMMAND_CHARS: readonly number[] = [
  CharCode.UpperM,
  CharCode.LowerM,
  CharCode.UpperL,
  CharCode.LowerL,
  CharCode.UpperH,
  CharCode.LowerH,
  CharCode.UpperV,
  CharCode.LowerV,
  CharCode.UpperC,
  CharCode.LowerC,
  CharCode.UpperS,
  CharCode.LowerS,
  CharCode.UpperQ,
  CharCode.LowerQ,
  CharCode.UpperT,
  CharCode.LowerT,
  CharCode.UpperA,
  CharCode.LowerA,
  CharCode.UpperZ,
  CharCode.LowerZ,
];

for (let i = 0; i < COMMAND_CHARS.length; i++) {
  CHAR_TABLE[COMMAND_CHARS[i]] |= CharMask.Command;
}

export function isSeparatorCode(code: number): boolean {
  return code < 128 && (CHAR_TABLE[code] & CharMask.Separator) !== 0;
}

export function isDigitCode(code: number): boolean {
  return code >= CharCode.Digit0 && code <= CharCode.Digit9;
}

export function isCommandCode(code: number): boolean {
  return code < 128 && (CHAR_TABLE[code] & CharMask.Command) !== 0;
}

export function isRelativeCommandCode(code: number): boolean {
  return (code & CharCode.LowerCaseBit) !== 0;
}
