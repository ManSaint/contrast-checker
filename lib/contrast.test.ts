import { describe, expect, it } from "vitest";
import { contrastRatio, evaluate, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("black on white is 21:1", () => {
    expect(
      contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }),
    ).toBeCloseTo(21, 2);
  });
  it("identical colours are 1:1", () => {
    expect(
      contrastRatio({ r: 18, g: 52, b: 86 }, { r: 18, g: 52, b: 86 }),
    ).toBeCloseTo(1, 5);
  });
  it("is order-independent", () => {
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
  it("#767676 on white is ~4.54:1", () => {
    expect(
      contrastRatio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 }),
    ).toBeCloseTo(4.54, 2);
  });
});

describe("evaluate", () => {
  it("21:1 passes everything", () => {
    expect(evaluate(21)).toEqual({
      aaNormal: true,
      aaaNormal: true,
      aaLarge: true,
      aaaLarge: true,
    });
  });
  it("4.54 passes AA normal + both large, fails AAA normal", () => {
    expect(evaluate(4.54)).toEqual({
      aaNormal: true,
      aaaNormal: false,
      aaLarge: true,
      aaaLarge: true,
    });
  });
  it("uses raw ratio at the boundary, not rounded", () => {
    expect(evaluate(4.499).aaNormal).toBe(false);
    expect(evaluate(4.5).aaNormal).toBe(true);
    expect(evaluate(2.99).aaLarge).toBe(false);
    expect(evaluate(3).aaLarge).toBe(true);
  });
});
