// Thin Playwright wrapper: HTML string -> A4 PDF buffer. Kept separate from the
// orchestration so the rest of the PDF pipeline stays unit-testable with an
// injected fake renderer. Playwright is imported lazily so importing this module
// never spins up Chromium until a real render is requested.
//
// PDF generation is a Chromium-only, headless-only Playwright feature — the same
// constraint Puppeteer had — which is fine: every document is rendered through
// Chromium. The pinned browser is provisioned by `playwright install chromium`
// (see the postinstall script) into PLAYWRIGHT_BROWSERS_PATH.
import type { HtmlRenderer } from "@/lib/pdf-generator";

export const renderHtmlToPdf: HtmlRenderer = async (html) => {
  const { chromium } = await import("playwright");
  // --no-sandbox is required to run Chromium as root inside the Docker image.
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
