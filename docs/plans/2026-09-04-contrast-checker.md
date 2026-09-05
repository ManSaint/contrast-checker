# Contrast Checker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** A single-page web app where you enter two colours and instantly see their WCAG 2.x contrast ratio and whether it passes AA/AAA for normal and large text.

**Architecture:** Two dependency-free, React-free TypeScript modules do all the work — `lib/parseColor.ts` (parse hex/rgb/hsl → `{r,g,b}` or `null`) and `lib/contrast.ts` (relative luminance → contrast ratio → four pass/fail verdicts). A single client component `app/ContrastChecker.tsx` on route `/` owns two controlled inputs and re-derives everything on each keystroke. Invalid input shows an inline note and holds the last valid result. Dark-mode-only, matching `docs/plans/contrast-checker-mockup.html`.

**Tech Stack:** Bun, Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, Vitest (unit), Playwright + axe-core (E2E + a11y).

**Reference material:**
- Design: `docs/plans/2026-09-04-contrast-checker-design.md`
- Screen mockup (exact palette, focus ring, DOM/ARIA): `docs/plans/contrast-checker-mockup.html`

**WCAG thresholds** (evaluate against the RAW ratio, never the rounded display value):

| Verdict | Min ratio |
|---|---|
| AA Normal | 4.5 |
| AAA Normal | 7 |
| AA Large | 3 |
| AAA Large | 4.5 |

**Reference contrast values used in tests** (compute, don't guess):
- `#000000` on `#ffffff` → **21:1** (exact)
- identical colours → **1:1** (exact)
- `#767676` on `#ffffff` → **≈ 4.54:1** (the canonical "smallest AA-passing grey on white")

---

### Task 1: Colour parsing module (`lib/parseColor.ts`)

**Files:**
- Create: `lib/parseColor.ts`
- Test: `lib/parseColor.test.ts`

Parse `#RGB`, `#RRGGBB`, `rgb()/rgba()`, and `hsl()/hsla()` into `{ r, g, b }` with 0–255 integer channels. Anything unparseable returns `null`. Input is trimmed and case-insensitive. Alpha, if present, is accepted and ignored (contrast is computed on the opaque colour). Out-of-range channels (e.g. `rgb(300,0,0)`) return `null`.

**Step 1: Write the failing tests**

```ts
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
    for (const bad of ["", "notacolor", "#12", "#gggggg", "rgb(300,0,0)", "rgb(0,0)", "hsl(0,0,0)", "#1234567"]) {
      expect(parseColor(bad)).toBeNull();
    }
  });
});
```

**Step 2: Run to verify failure** — `bun run test` → FAIL (`parseColor` not defined).

**Step 3: Implement `lib/parseColor.ts`.** Pure functions, no dependencies. Suggested shape:

```ts
export type RGB = { r: number; g: number; b: number };

const clampByte = (n: number): number | null =>
  Number.isFinite(n) && n >= 0 && n <= 255 ? Math.round(n) : null;

function parseHex(s: string): RGB | null { /* #RGB and #RRGGBB */ }
function parseRgb(s: string): RGB | null { /* rgb()/rgba(), reject out-of-range */ }
function parseHsl(s: string): RGB | null { /* hsl()/hsla() → rgb via standard conversion */ }

export function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  return parseHex(s) ?? parseRgb(s) ?? parseHsl(s);
}
```

Notes for the implementer:
- 3-digit hex expands each nibble (`f` → `ff`).
- `rgb()` accepts integers or percentages per channel; reject values outside range → `null`.
- HSL→RGB: standard algorithm; H in degrees (0–360, wrap), S/L as percentages.

**Step 4: Run to verify pass** — `bun run test` → PASS. Then `bun run lint` and `bun run typecheck` → 0.

**Step 5: Commit**

```bash
git add lib/parseColor.ts lib/parseColor.test.ts
git commit -m "feat: colour string parser for hex, rgb, hsl"
```

---

### Task 2: Contrast module (`lib/contrast.ts`)

**Files:**
- Create: `lib/contrast.ts`
- Test: `lib/contrast.test.ts`

`relativeLuminance(rgb)`, `contrastRatio(a, b)` (order-independent), and `evaluate(ratio)` returning the four booleans.

**Step 1: Write the failing tests**

```ts
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
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2);
  });
  it("identical colours are 1:1", () => {
    expect(contrastRatio({ r: 18, g: 52, b: 86 }, { r: 18, g: 52, b: 86 })).toBeCloseTo(1, 5);
  });
  it("is order-independent", () => {
    const a = { r: 0, g: 0, b: 0 }, b = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
  it("#767676 on white is ~4.54:1", () => {
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(4.54, 2);
  });
});

describe("evaluate", () => {
  it("21:1 passes everything", () => {
    expect(evaluate(21)).toEqual({ aaNormal: true, aaaNormal: true, aaLarge: true, aaaLarge: true });
  });
  it("4.54 passes AA normal + both large, fails AAA normal", () => {
    expect(evaluate(4.54)).toEqual({ aaNormal: true, aaaNormal: false, aaLarge: true, aaaLarge: true });
  });
  it("uses raw ratio at the boundary, not rounded", () => {
    expect(evaluate(4.499).aaNormal).toBe(false); // displays as "4.5" but must fail
    expect(evaluate(4.5).aaNormal).toBe(true);
    expect(evaluate(2.99).aaLarge).toBe(false);
    expect(evaluate(3).aaLarge).toBe(true);
  });
});
```

**Step 2: Run to verify failure** — `bun run test` → FAIL.

**Step 3: Implement `lib/contrast.ts`.**

```ts
import type { RGB } from "./parseColor";

const linear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type Verdicts = { aaNormal: boolean; aaaNormal: boolean; aaLarge: boolean; aaaLarge: boolean };

export function evaluate(ratio: number): Verdicts {
  return {
    aaNormal: ratio >= 4.5,
    aaaNormal: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5,
  };
}
```

**Step 4: Run to verify pass** — `bun run test` → PASS. `bun run lint` + `bun run typecheck` → 0.

**Step 5: Commit**

```bash
git add lib/contrast.ts lib/contrast.test.ts
git commit -m "feat: WCAG relative luminance, contrast ratio, and verdicts"
```

---

### Task 3: `ContrastChecker` component and page

**Files:**
- Create: `app/ContrastChecker.tsx` (client component)
- Modify: `app/page.tsx` (render `<ContrastChecker />`, remove the starter template)
- Modify: `app/layout.tsx` (set page title/description; ensure dark background) — read it first
- Possibly modify: `app/globals.css` (dark ground colour) — read it first

Build the screen from the mockup. Requirements the reviewers will check against `docs/plans/contrast-checker-mockup.html`:

**Behaviour**
- Two controlled text inputs, default `#1a1a1a` (Text/foreground) and `#ffffff` (Background).
- On every change, `parseColor` both fields. When both valid: compute `contrastRatio`, `evaluate`, update preview, and remember them as the last valid state.
- Ratio display: one decimal place, e.g. `21.0:1` (`ratio.toFixed(1)`). The four verdict rows show the raw threshold labels (≥4.5, ≥7, ≥3, ≥4.5).
- Each verdict badge shows **text + icon** (check for Pass, cross for Fail) — never colour alone. Include an `.sr-only` word ("Pass"/"Fail") so it is unambiguous to screen readers.
- Invalid field: add `aria-invalid="true"`, link an inline `<span id=… role/note>` via `aria-describedby`, show "Not a valid colour. Try a hex code (#ffffff), rgb(), or hsl() value." The ratio, verdicts, and preview keep showing the **last valid** result.
- Preview swatch: normal (16px/400) and large (24px/700) sample text in foreground colour on background colour.

**Accessibility (from the mockup — verified in Task 5)**
- Real `<form>`, `<label htmlFor>` + `<input id>` pairs.
- Results container: `role="status" aria-live="polite"`.
- Focus ring: `2px solid #5eead4`, `outline-offset: 2px`, on every focusable element (`:focus-visible`).
- Interactive targets ≥ 24×24 px (inputs are 44px tall in the mockup — keep that).
- Palette (exact, from mockup): ground `#0f1115`, surface `#171a20`, input fill `#1c2028`, decorative border `#2a2f3a`, primary text `#e8eaed`, secondary text `#9aa1ad`, accent `#5eead4`, pass `#4ade80`, fail `#f87171`, error text `#fca5a5`. Body-text pairs clear ≥4.5:1 and the accent/focus ring clears ≥3:1 on the dark ground.
- **Required correction to the mockup:** use input/swatch border **`#5b6478`**, NOT the mockup's `#3a4150`. `#3a4150` only reaches ~1.7–1.85:1 against the fill/ground and fails WCAG 1.4.11 (3:1 non-text contrast) for the input's resting boundary; `#5b6478` gives ≥3.05:1. The Tailwind classes in the design spec already use `border-[#5b6478]`.
- Use system font stacks (`ui-sans-serif`, `ui-monospace`) — no external fonts, keeps the build self-contained.

Give inputs stable hooks for the E2E test: `id="fg"` and `id="bg"` (label text "Text (foreground)" / "Background"), the ratio readout reachable via a test-friendly selector (e.g. a `data-testid="ratio"` on the readout), and each verdict row identifiable (e.g. `data-testid="verdict-aa-normal"` etc. with an accessible name). Prefer semantic/role queries; add `data-testid` only where a role query is ambiguous.

**Steps:** No unit test for the component (behaviour is covered by the E2E in Task 4). Build it, then run `bun run lint`, `bun run typecheck`, and `bun run dev` briefly to eyeball it. Then commit.

**Commit**

```bash
git add app/
git commit -m "feat: contrast checker screen with live ratio, verdicts, preview"
```

---

### Task 4: Playwright E2E for the checker

**Files:**
- Create: `e2e/contrast.spec.ts`

Cover the real user paths against deterministic reference pairs.

**Step 1: Write the tests**

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("black on white computes 21:1 and passes all four levels", async ({ page }) => {
  await page.getByLabel("Text (foreground)").fill("#000000");
  await page.getByLabel("Background").fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
  for (const id of ["verdict-aa-normal", "verdict-aaa-normal", "verdict-aa-large", "verdict-aaa-large"]) {
    await expect(page.getByTestId(id)).toContainText("Pass");
  }
});

test("#767676 on white passes AA normal but fails AAA normal", async ({ page }) => {
  await page.getByLabel("Text (foreground)").fill("#767676");
  await page.getByLabel("Background").fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/4\.5:1/);
  await expect(page.getByTestId("verdict-aa-normal")).toContainText("Pass");
  await expect(page.getByTestId("verdict-aaa-normal")).toContainText("Fail");
  await expect(page.getByTestId("verdict-aa-large")).toContainText("Pass");
});

test("invalid input shows a note and holds the last valid result", async ({ page }) => {
  await page.getByLabel("Text (foreground)").fill("#000000");
  await page.getByLabel("Background").fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
  await page.getByLabel("Background").fill("notacolor");
  await expect(page.getByText(/not a valid colour/i)).toBeVisible();
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/); // unchanged
});

test("accepts rgb() and hsl() forms", async ({ page }) => {
  await page.getByLabel("Text (foreground)").fill("rgb(0,0,0)");
  await page.getByLabel("Background").fill("hsl(0, 0%, 100%)");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});
```

**Step 2: Run** — `bun run test:e2e`. Expected: PASS. If a selector is wrong, fix Task 3's markup or the selector (align on real accessible names), don't loosen the assertion. Use the `playwright-tester` agent if a test needs real debugging.

**Step 3: Commit**

```bash
git add e2e/contrast.spec.ts
git commit -m "test: e2e coverage for ratio, verdicts, invalid input, rgb/hsl"
```

---

### Task 5: Accessibility coverage

**Files:**
- Modify: `e2e/a11y.spec.ts` — confirm `ROUTES` contains `"/"` (it already does; the checker lives at `/`, so no new route to add). Leave `ROUTES` as `["/"]`.

**Step 1: Run the a11y suite** — `bun run test:a11y`.
Expected: PASS — `/` has no WCAG 2.2 AA violations, and the "first interactive element is keyboard reachable with a visible focus ring" test passes (the first input/swatch shows the `#5eead4` ring).

**Step 2:** If axe reports violations, fix the component (contrast, labels, roles) — never suppress a rule. Re-run until green.

**Step 3: Commit** (only if `a11y.spec.ts` changed; if unchanged, note that `/` was already covered and skip an empty commit).

```bash
git add e2e/a11y.spec.ts
git commit -m "test: confirm a11y coverage for the contrast checker route"
```

---

### Task 6: README + screenshot

**Files:**
- Modify: `README.md` (remove the `README-STUB` marker entirely)
- Create: `docs/screenshot.png` (or `public/` — wherever the README references it)

**Step 1:** Take a real screenshot of the running app. Start `bun run dev`, then use the `playwright-tester` agent or Playwright directly to navigate to `http://localhost:3000` and capture `docs/screenshot.png` at the default state.

**Step 2:** Rewrite `README.md`: one-paragraph description of what it does, the supported input formats, how to run it (`bun install`, `bun run dev`), how to test (`bun run test`, `bun run test:e2e`, `bun run test:a11y`), and embed the screenshot. Ensure the string `README-STUB` no longer appears.

**Step 3: Verify** — `grep -c "README-STUB" README.md` → `0`.

**Step 4: Full green gate before the final commit:**
```
bun run lint && bun run typecheck && bun run test && bun run test:e2e && bun run test:a11y
```
All must exit 0.

**Step 5: Commit**

```bash
git add README.md docs/screenshot.png
git commit -m "docs: real README with screenshot for the contrast checker"
```

---

## Definition of done (whole plan)
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run test:e2e`, `bun run test:a11y` all exit 0.
- `README-STUB` no longer present in `README.md`.
- Every task committed.
