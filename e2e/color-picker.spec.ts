import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/**
 * Native <input type="color"> only accepts #rrggbb values. `fill` works in
 * Chromium/Firefox for this input type; if it ever doesn't, fall back to
 * setting `.value` and dispatching an `input` event so React's onChange fires.
 */
async function setColour(locator: Locator, hex: string): Promise<void> {
  try {
    await locator.fill(hex);
  } catch {
    await locator.evaluate((el, value) => {
      (el as HTMLInputElement).value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, hex);
  }
  await expect(locator).toHaveValue(hex);
}

test("picking a colour updates the text field and ratio", async ({ page }) => {
  await setColour(page.getByTestId("picker-fg-color"), "#000000");
  await setColour(page.getByTestId("picker-bg-color"), "#ffffff");

  await expect(page.getByTestId("input-fg-color")).toHaveValue("#000000");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});

test("typing a non-hex form updates the picker", async ({ page }) => {
  // NOTE: page.getByLabel("Text (foreground)") is ambiguous here — it now
  // matches both the text <input> (via its <label>) and the colour picker
  // (via aria-label="Colour picker for Text (foreground)", which contains
  // the same substring). Using data-testid to disambiguate; see report.
  await page.getByTestId("input-fg-color").fill("rgb(0,0,0)");
  await page.getByTestId("input-bg-color").fill("#ffffff");

  await expect(page.getByTestId("picker-fg-color")).toHaveValue("#000000");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});

test("invalid text holds the picker on the last valid colour", async ({
  page,
}) => {
  await setColour(page.getByTestId("picker-fg-color"), "#000000");
  await setColour(page.getByTestId("picker-bg-color"), "#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);

  await page.getByTestId("input-fg-color").fill("notacolor");

  await expect(page.getByText(/not a valid colour/i)).toBeVisible();
  await expect(page.getByTestId("picker-fg-color")).toHaveValue("#000000");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});
