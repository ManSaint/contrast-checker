# Colour Picker Implementation Plan

> **For Claude:** execute with subagent-driven-development; each task ends in a commit.

**Goal:** Let people pick each colour visually — clicking the swatch beside a field opens a native colour picker, two-way bound with the text input.

**Approach:** Replace the decorative `<span>` swatch in `ColourField` (app/ContrastChecker.tsx:147-151) with a native `<input type="color">`. Zero dependencies, OS-native UX, keyboard-accessible, works on mobile. Native colour inputs are hex-only — fine for this tool. Add a pure `rgbToHex` helper so the picker (which needs a 6-digit hex value) can reflect whatever the user typed, including `rgb()`/`hsl()`.

**Tech stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, Bun, Vitest, Playwright + axe.

---

## Task 1: `rgbToHex` helper + wire the native colour picker

**Files:**
- Modify: `lib/parseColor.ts` (add `rgbToHex`)
- Test: `lib/parseColor.test.ts` (add `rgbToHex` cases)
- Modify: `app/ContrastChecker.tsx` (swap the span for `<input type="color">`)
- Modify: `app/globals.css` (style the native swatch so it fills the box cleanly)

**`rgbToHex`:** `export function rgbToHex({ r, g, b }: RGB): string` → `#rrggbb`, lowercase, each channel zero-padded to two hex digits. Assumes 0–255 integer channels (that is what `parseColor` produces). Add unit tests: `{0,0,0}`→`#000000`, `{255,255,255}`→`#ffffff`, `{26,26,26}`→`#1a1a1a`, `{5,0,16}`→`#050010` (zero-padding), and a round-trip `parseColor(rgbToHex(x))` deep-equals `x` for a few values.

**Component wiring (`ColourField`):**
- Add a native `<input type="color">` in place of the decorative swatch.
- Its `value` must always be a valid 6-digit hex. Derive it: `rgbToHex(currentParsed ?? lastValidColour)`. So pass `ColourField` a non-null `pickerColour: RGB` (the value the picker shows) — when the field currently parses, that is the current colour; when invalid, it holds the last valid colour (matching the rest of the UI). The current `swatchColour: RGB | null` prop can be replaced by this always-present `pickerColour`.
- `onChange` of the picker emits a hex string; call the existing `onChange(hex)` so it flows into the text input and the live recompute — no separate state.
- Two-way binding falls out for free: typing a valid `rgb()`/`hsl()` re-derives `pickerColour` each render, so the picker swatch updates to match.

**Accessibility:**
- The visible `<label htmlFor={id}>` already labels the *text* input. The colour input needs its own accessible name — add `aria-label={`Colour picker for ${label}`}` (e.g. "Colour picker for Text (foreground)").
- Keep it 44×44 (`w-11 h-11`, well over the 24px min). Keep the visible focus ring (`focus-visible:outline-2 outline-offset-2 outline-[#5eead4]`).
- Real `<input>` — no div-with-handler.

**Swatch styling (globals.css):** native colour inputs render the swatch with inner padding/border. Add:
```css
input[type="color"] { -webkit-appearance: none; appearance: none; padding: 0; }
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0.5rem; }
input[type="color"]::-moz-color-swatch { border: none; border-radius: 0.5rem; }
```
Keep the `border border-[#5b6478]` and `rounded-lg` on the element itself so it matches the old swatch.

**Verify:** `bun run lint`, `bun run typecheck`, `bun run test` all exit 0 (read output). Start `bun run dev`, confirm the page renders and the picker appears. `bunx biome check --write` if CRLF flagged. Restore `CLAUDE.md` if `next dev` touched it.

**Commit:** `feat: native colour picker on each field, two-way bound with the text input`

---

## Task 2: E2E + a11y coverage

**Files:**
- Create: `e2e/color-picker.spec.ts`
- `e2e/a11y.spec.ts` already covers `/` — no route change; just confirm axe stays green.

**E2E tests (find the picker by its accessible name / a data-testid the component exposes):**
1. Picking a colour updates the text field and the ratio: set the foreground colour input to `#000000` and the background to `#ffffff`, assert the fg text field shows `#000000` and `data-testid="ratio"` shows `21.0:1`. (Playwright: set an `input[type=color]` via `fill()`; if `fill` is unsupported for colour inputs, set `.value` and dispatch an `input` event via `evaluate` — use whichever actually works, and read the result.)
2. Typing a non-hex form updates the picker: type `rgb(0,0,0)` into the fg text field, assert the fg colour input's value is `#000000`.
3. Invalid text leaves the picker on the last valid colour: after setting `#000000`, type `notacolor`, assert the picker value is still `#000000` and the "not a valid colour" note shows.

**a11y:** run `bun run test:a11y`; must stay green (2/2). If axe flags the colour inputs for a missing name, that means the `aria-label` is missing — fix the component, don't suppress.

**Verify + Commit:** run `bun run test:e2e` and `bun run test:a11y`, read output, all green. Commit: `test: e2e + a11y coverage for the colour picker`.

---

## Definition of done
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run test:e2e`, `bun run test:a11y` all exit 0.
- Native picker on both fields, two-way bound, accessible name present, last-valid behaviour preserved.
- Each task committed; PR opened (do not merge).
