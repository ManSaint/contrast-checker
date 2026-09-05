export type RGB = {
  r: number;
  g: number;
  b: number;
};

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/;
const RGB_FUNC =
  /^rgba?\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*(?:,\s*[^,]+?\s*)?\)$/;
const HSL_FUNC =
  /^hsla?\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*(?:,\s*[^,]+?\s*)?\)$/;

function isInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function parseHex(input: string): RGB | null {
  const longMatch = input.match(HEX_LONG);
  if (longMatch) {
    return {
      r: Number.parseInt(longMatch[1], 16),
      g: Number.parseInt(longMatch[2], 16),
      b: Number.parseInt(longMatch[3], 16),
    };
  }

  const shortMatch = input.match(HEX_SHORT);
  if (shortMatch) {
    return {
      r: Number.parseInt(shortMatch[1] + shortMatch[1], 16),
      g: Number.parseInt(shortMatch[2] + shortMatch[2], 16),
      b: Number.parseInt(shortMatch[3] + shortMatch[3], 16),
    };
  }

  return null;
}

function parseRgbChannel(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    const pct = Number.parseFloat(trimmed.slice(0, -1));
    if (!isInRange(pct, 0, 100)) return null;
    return Math.round((pct / 100) * 255);
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number.parseFloat(trimmed);
  if (!isInRange(value, 0, 255)) return null;
  return Math.round(value);
}

function parseRgb(input: string): RGB | null {
  const match = input.match(RGB_FUNC);
  if (!match) return null;

  const r = parseRgbChannel(match[1]);
  const g = parseRgbChannel(match[2]);
  const b = parseRgbChannel(match[3]);
  if (r === null || g === null || b === null) return null;

  return { r, g, b };
}

function parseHueDegrees(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+(\.\d+)?(deg)?$/.test(trimmed)) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed.endsWith("%")) return null;
  const value = Number.parseFloat(trimmed.slice(0, -1));
  if (!isInRange(value, 0, 100)) return null;
  return value;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = lFrac - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hPrime >= 0 && hPrime < 1) {
    rPrime = c;
    gPrime = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    rPrime = x;
    gPrime = c;
  } else if (hPrime >= 2 && hPrime < 3) {
    gPrime = c;
    bPrime = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    gPrime = x;
    bPrime = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

function parseHsl(input: string): RGB | null {
  const match = input.match(HSL_FUNC);
  if (!match) return null;

  const h = parseHueDegrees(match[1]);
  const s = parsePercent(match[2]);
  const l = parsePercent(match[3]);
  if (h === null || s === null || l === null) return null;

  return hslToRgb(h, s, l);
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHexChannel = (channel: number): string =>
    channel.toString(16).padStart(2, "0");
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function parseColor(input: string): RGB | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "") return null;

  return parseHex(normalized) ?? parseRgb(normalized) ?? parseHsl(normalized);
}
