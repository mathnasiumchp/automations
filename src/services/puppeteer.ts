import puppeteer, { Browser, Page, type KeyInput } from "puppeteer";

export async function launchPuppeteer(headless = true) {
  const browser: Browser = await puppeteer.launch({
    headless,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  const page: Page = await browser.newPage();
  return { browser, page };
}

export async function pressKeyNTimes(
  page: Page,
  button: KeyInput,
  n: number = 1,
) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(button);
    await new Promise((r) => setTimeout(r, 10));
  }
}

export function delay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
