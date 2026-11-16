import { chromium } from "playwright";
import assert from "node:assert/strict";
import { initialPortfolio } from "../src/finance/model.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const output = mkdtempSync(join(tmpdir(), "azqar-browser-"));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("heading", { name: "AZQAR Holdings", exact: true }).waitFor();
  assert.equal(await page.locator(".group-columns > section").count(), 3);
  assert.equal(await page.locator(".group-column .group-company").count(), 5);
  assert.equal(await page.locator(".group-investments li").count(), 5);
  assert.equal(await page.locator(".group-column .group-company").filter({ hasText: "AFRODEMY" }).count(), 0);
  assert.equal(await page.locator(".group-product").count(), 1);
  const channels = await page.locator(".group-intro").evaluate(el => getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
  assert.equal(channels[0], channels[1]);
  assert.equal(channels[1], channels[2]);
  await page.screenshot({ path: join(output, "desktop.png"), fullPage: true });
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
  }
  await page.screenshot({ path: join(output, "mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Mon monde", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir PROCOLORE", exact: true }).waitFor();
  await page.getByRole("button", { name: "Ouvrir AZQAR Holdings", exact: true }).waitFor();
  const proRobot = page.getByRole("button", { name: /^Robot PROCOLORE :/ });
  assert.equal(await proRobot.locator("[data-color]").getAttribute("data-color"), "#4285f4");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.screenshot({ path: join(output, "world.png"), fullPage: true });

  const old = initialPortfolio();
  old.companies[2].notes = "Synthetic preserved note";
  const raw = JSON.stringify(old);
  await page.evaluate(raw => { localStorage.clear(); localStorage.setItem("pio-finance-v1", raw); }, raw);
  await page.reload();
  await page.getByRole("heading", { name: "AZQAR Holdings", exact: true }).waitFor();
  const migrated = await page.evaluate(() => ({ current: JSON.parse(localStorage.getItem("pio-finance-v1")), backup: localStorage.getItem("pio-finance-v1-before-azqar") }));
  assert.equal(migrated.backup, raw);
  assert.equal(migrated.current.companies.find(c => c.id === old.companies[2].id).notes, "Synthetic preserved note");
  await page.getByRole("button", { name: "Sauvegarde avant AZQAR", exact: true }).click();
  // A corrupt save must never be replaced or displayed as a default portfolio.
  await page.evaluate(() => localStorage.setItem("pio-finance-v1", "{broken"));
  await page.reload();
  await page.getByRole("heading", { name: "Portefeuille inaccessible" }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("pio-finance-v1")), "{broken");
  assert.equal(await page.getByRole("button").count(), 2);
  assert.deepEqual(errors, []);
  console.log(`PASS AZQAR structure, monochrome theme, mobile, blue Procolore, original backup, preservation and blocked corrupt save. Screenshots: ${output}`);
} finally { await browser.close(); }
