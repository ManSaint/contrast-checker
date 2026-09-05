import { describe, expect, it } from "vitest";
import { parseColor } from "./parseColor";

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
