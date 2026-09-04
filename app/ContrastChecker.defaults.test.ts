import { describe, expect, it } from "vitest";
import { parseColor } from "@/lib/parseColor";
import { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } from "./ContrastChecker";

describe("ContrastChecker defaults", () => {
  it("DEFAULT_FOREGROUND is a valid, parseable colour", () => {
    expect(parseColor(DEFAULT_FOREGROUND)).not.toBeNull();
  });

  it("DEFAULT_BACKGROUND is a valid, parseable colour", () => {
    expect(parseColor(DEFAULT_BACKGROUND)).not.toBeNull();
  });
});
