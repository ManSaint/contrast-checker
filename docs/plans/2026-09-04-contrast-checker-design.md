# Contrast Checker — Design

## Purpose
Paste or enter two colours and see the WCAG contrast ratio between them, plus
whether that ratio passes AA and AAA for normal and large text. WCAG 2.x
algorithm only.

## Decisions
- **Input formats:** hex (`#RGB`, `#RRGGBB`), `rgb()/rgba()`, `hsl()/hsla()`.
- **Interaction:** live — recompute on every keystroke, no button.
- **Roles:** the two inputs are labelled **Text (foreground)** and **Background**.
  The ratio is symmetric, but the roles drive the preview.
- **Result detail:** ratio readout, four pass/fail verdicts, and a live preview
  swatch (foreground text on background).
- **Invalid input:** show an inline "not a valid colour" note under the offending
  field and **keep the last valid result** visible.
- **No dependencies:** the colour math is small and well-specified; build it as
  pure TypeScript so it unit-tests to the WCAG reference values.

## Architecture
Single Next.js App Router route `/`. A client component `ContrastChecker` owns
two controlled inputs and renders the result. All logic lives in pure modules
with no React imports:

- `lib/parseColor.ts` — `parseColor(input: string): { r: number; g: number; b: number } | null`.
  Accepts hex / rgb() / hsl(); trims and normalises; returns `null` on anything
  invalid. Channels are 0–255 integers.
- `lib/contrast.ts`
  - `relativeLuminance({ r, g, b }): number` — per WCAG (sRGB linearisation).
  - `contrastRatio(fg, bg): number` — `(L1 + 0.05) / (L2 + 0.05)`, lighter over darker.
  - `evaluate(ratio): { aaNormal, aaaNormal, aaLarge, aaaLarge }` booleans per the
    thresholds below.

### WCAG thresholds
| Level | Text size | Min ratio |
|-------|-----------|-----------|
| AA    | Normal    | 4.5 |
| AA    | Large     | 3.0 |
| AAA   | Normal    | 7.0 |
| AAA   | Large     | 4.5 |

Large text = ≥18pt, or ≥14pt bold (per WCAG); relevant to the labels shown, not
to any measurement the tool performs.

## Data flow
1. Inputs default to a valid pair: `#1a1a1a` (text) on `#ffffff` (background).
2. On every change: `parseColor` both fields.
3. Both valid → compute ratio, four verdicts, and update the preview.
4. Either invalid → show the inline note under that field; the previous valid
   ratio, verdicts, and preview stay on screen.

## Result area
- **Ratio readout** — large, e.g. `12.6:1` (one decimal place).
- **Verdict grid** — four rows: AA Normal, AAA Normal, AA Large, AAA Large. Each
  shows **Pass / Fail** as text **plus an icon** — never colour alone.
- **Preview swatch** — foreground-on-background, showing "normal" (16px) and
  "large" (24px bold) sample text.

## Accessibility (WCAG 2.2 AA — decided now, verified by tests)
- Real `<label>` + `<input>` pairs.
- Inline errors linked via `aria-describedby`; result region is `role="status"`
  with `aria-live="polite"` so screen readers announce updates.
- The tool's own chrome (labels, badges, readout) meets ≥4.5:1 body / ≥3:1 UI.
- Focus rings visible and ≥3:1 against their background.
- All interactive targets ≥24×24 CSS px.
- Pass/fail never relies on colour alone (text + icon).

## Testing
- **Vitest** — `parseColor`: each accepted format + malformed inputs → `null`.
  `contrast`: reference values (black/white = 21:1, identical colours = 1:1, and
  a known mid pair), plus `evaluate` boundaries at each threshold.
- **Playwright E2E** — type a pair, assert ratio text and the four verdicts;
  type garbage into a field, assert the note appears and the prior result persists.
- **axe a11y** — add `/` to `ROUTES` in `e2e/a11y.spec.ts`; WCAG 2.2 AA clean.
- **README** — rewritten with description, run instructions, and a screenshot;
  the `README-STUB` marker removed.

## Out of scope (possible follow-up runs)
- Alpha compositing of translucent colours over a backdrop.
- Palette / history / shareable URLs.
- APCA (the newer WCAG 3 contrast algorithm).
