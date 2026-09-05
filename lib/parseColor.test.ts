import { describe, expect, it } from "vitest";
import { parseColor, rgbToHex } from "./parseColor";

describe("parseColor", () => {
  it("parses 6-digit hex", () => {
    expect(parseColor("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#1a1a1a")).toEqual({ r: 26, g: 26, b: 26 });
  });
  it("parses 3-digit shorthand hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("is case-insensitive and trims whitespace", () => {
    expect(parseColor("  #FFF  ")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("parses rgb() and rgba() (alpha ignored)", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("rgba(0,128,255,0.5)")).toEqual({ r: 0, g: 128, b: 255 });
  });
  it("parses hsl() and hsla() (alpha ignored)", () => {
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("hsl(120, 100%, 50%)")).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseColor("hsl(0, 0%, 100%)")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("returns null for malformed input", () => {
    for (const bad of [
      "",
      "notacolor",
      "#12",
      "#gggggg",
      "rgb(300,0,0)",
      "rgb(0,0)",
      "hsl(0,0,0)",
      "#1234567",
    ]) {
      expect(parseColor(bad)).toBeNull();
    }
  });
});

describe("rgbToHex", () => {
  it("converts black", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });
  it("converts white", () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
  });
  it("converts an arbitrary colour to lowercase hex", () => {
    expect(rgbToHex({ r: 26, g: 26, b: 26 })).toBe("#1a1a1a");
  });
  it("zero-pads single-digit hex channels", () => {
    expect(rgbToHex({ r: 5, g: 0, b: 16 })).toBe("#050010");
  });
  it("round-trips through parseColor", () => {
    expect(parseColor(rgbToHex({ r: 26, g: 26, b: 26 }))).toEqual({
      r: 26,
      g: 26,
      b: 26,
    });
    expect(parseColor(rgbToHex({ r: 0, g: 128, b: 255 }))).toEqual({
      r: 0,
      g: 128,
      b: 255,
    });
  });
});
