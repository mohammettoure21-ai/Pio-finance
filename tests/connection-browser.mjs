import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const requests = [];
  let serviceReady = false;
  await page.route("**/api/pio/**", route => {
    const request = route.request();
    requests.push({ path: new URL(request.url()).pathname, method: request.method(), body: request.postData() });
    return route.fulfill(serviceReady
      ? { status: 401, contentType: "application/json", body: '{"error":"Login required"}' }
      : { status: 404, contentType: "text/html", body: "Not configured" });
  });
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "Connecter Hermès", exact: true }).click();
  await page.getByRole("dialog", { name: "Connecter Hermès" }).waitFor();
  assert.equal(requests.length, 0);
  await page.getByRole("button", { name: "Vérifier le service", exact: true }).click();
  await page.getByText(/Le service sécurisé PIO n’est pas joignable/).waitFor();
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  assert.deepEqual(requests, [{ path: "/api/pio/session/me", method: "GET", body: null }]);
  serviceReady = true;
  await page.getByRole("button", { name: "Réessayer la vérification" }).click();
  await page.getByLabel("Mot de passe personnel").waitFor();
  assert.equal(requests.length, 2);
  assert.ok(requests.every(r => r.method === "GET"));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
  }
  console.log("PASS connection button, no automatic calls or uploads, unavailable-service gate, explicit readiness, password gate and mobile.");
} finally { await browser.close(); }
