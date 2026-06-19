import type { Page } from "@playwright/test";

export async function waitForAstroHydration(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("astro-island")).every((island) => !island.hasAttribute("ssr")),
  );
}

export async function selectCombobox(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
