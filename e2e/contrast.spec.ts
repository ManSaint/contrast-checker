import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("black on white computes 21:1 and passes all four levels", async ({
  page,
}) => {
  await page.getByLabel("Text (foreground)", { exact: true }).fill("#000000");
  await page.getByLabel("Background", { exact: true }).fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
  for (const id of [
    "verdict-aa-normal",
    "verdict-aaa-normal",
    "verdict-aa-large",
    "verdict-aaa-large",
  ]) {
    await expect(page.getByTestId(id)).toContainText("Pass");
  }
});

test("#767676 on white passes AA normal but fails AAA normal", async ({
  page,
}) => {
  await page.getByLabel("Text (foreground)", { exact: true }).fill("#767676");
  await page.getByLabel("Background", { exact: true }).fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/4\.5:1/);
  await expect(page.getByTestId("verdict-aa-normal")).toContainText("Pass");
  await expect(page.getByTestId("verdict-aaa-normal")).toContainText("Fail");
  await expect(page.getByTestId("verdict-aa-large")).toContainText("Pass");
});

test("invalid input shows a note and holds the last valid result", async ({
  page,
}) => {
  await page.getByLabel("Text (foreground)", { exact: true }).fill("#000000");
  await page.getByLabel("Background", { exact: true }).fill("#ffffff");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
  await page.getByLabel("Background", { exact: true }).fill("notacolor");
  await expect(page.getByText(/not a valid colour/i)).toBeVisible();
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});

test("accepts rgb() and hsl() forms", async ({ page }) => {
  await page
    .getByLabel("Text (foreground)", { exact: true })
    .fill("rgb(0,0,0)");
  await page.getByLabel("Background", { exact: true }).fill("hsl(0, 0%, 100%)");
  await expect(page.getByTestId("ratio")).toHaveText(/21\.0:1/);
});
