const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const output = fs.mkdtempSync(
  path.join(require("node:os").tmpdir(), "pio-world-test-"),
);
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5173/");
    await page
      .getByRole("heading", { name: "Un monde. Une vision." })
      .waitFor();
    assert.equal(await page.locator(".world-robot").count(), 5);
    assert.ok((await page.locator(".campus").boundingBox()).width <= 960);
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.world-robot [data-renderer="3d"]')
          .length === 5,
    );
    assert.equal(
      await page.locator('.world-robot [data-mood="sleeping"]').count(),
      0,
    );
    const commandCanvas = page.locator(".world-robot.command canvas");
    const motionBefore = await commandCanvas.screenshot();
    await page.waitForTimeout(400);
    assert.notDeepEqual(await commandCanvas.screenshot(), motionBefore);
    const actorSize = await page
      .locator(".world-robot .campus-robot-actor")
      .first()
      .boundingBox();
    assert.ok(actorSize.width < 80 && actorSize.height < 100);

    for (const asset of ["/world/campus.png"]) {
      const response = await page.request.get("http://127.0.0.1:5173" + asset);
      assert.equal(response.status(), 200);
      assert.ok((await response.body()).length > 10000);
    }
    assert.equal(await page.locator(".art-station .station-label").count(), 5);

    assert.equal(await page.locator(".world-robot.sleeping").count(), 0);
    assert.equal(await page.locator(".world-robot.ready").count(), 4);
    assert.equal(
      await page
        .locator(".campus-route")
        .first()
        .evaluate((el) => getComputedStyle(el).strokeWidth),
      "6px",
    );
    await page.screenshot({
      path: path.join(output, "campus.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Ouvrir FABI Conciergerie", exact: true })
      .click();
    await page.getByRole("button", { name: "Donner une mission" }).click();
    await page.getByLabel("Titre", { exact: true }).fill("Préparer le séjour");
    await page
      .getByRole("button", { name: "Enregistrer la tâche", exact: true })
      .click();
    assert.equal(await page.locator(".world-robot.working").count(), 1);
    await page
      .getByRole("button", {
        name: "Terminer la mission Préparer le séjour",
        exact: true,
      })
      .click();
    await page.locator(".report-courier").waitFor();
    const route = await page
      .locator(".report-courier animateMotion")
      .getAttribute("path");
    assert.equal((route.match(/L/g) || []).length, 2);
    await page.screenshot({
      path: path.join(output, "delivery.png"),
      fullPage: true,
    });
    await page
      .getByText("Rapport de FABI Conciergerie reçu par FABI Holding.", {
        exact: true,
      })
      .waitFor();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pio-finance-v1")),
    );
    assert.equal(saved.tasks[0].done, true);
    const deliveryEvents = saved.world.events.filter(
      (e) => e.kind === "report",
    );
    assert.equal(deliveryEvents.length, 2);
    assert.equal(
      deliveryEvents[0].recipient,
      saved.companies.find((c) => c.name === "FABI Immobilier").id,
    );
    assert.equal(deliveryEvents[1].recipient, "holding");
    page.on("dialog", (d) => d.accept());
    const importedEvents = saved.world.events.length;
    await page.locator("input[type=file]").setInputFiles({
      name: "world-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await page.getByText("Sauvegarde importée.", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pio-finance-v1")).world.events
            .length,
      ),
      importedEvents,
    );
    assert.equal(await page.locator(".report-courier").count(), 0);
    await page.reload();
    await page
      .getByRole("button", { name: "Ouvrir FABI Conciergerie", exact: true })
      .click();
    await page.getByText(/Dernier passage/).waitFor();
    await page
      .getByRole("button", { name: "Hermès Ouvrir le poste de pilotage" })
      .click();
    await page
      .getByRole("heading", { name: "Le poste de pilotage de votre monde" })
      .waitFor();
    await page.getByText("IA non connectée", { exact: true }).waitFor();
    await page
      .getByLabel("Vision du groupe", { exact: true })
      .fill("Développer les formations et améliorer leur rentabilité");
    await page
      .getByRole("button", { name: "Enregistrer la vision", exact: true })
      .click();
    await page
      .getByLabel("Société à accompagner", { exact: true })
      .selectOption({ label: "Afrodemy" });
    await page
      .getByRole("heading", {
        name: "Préparer le suivi financier de Afrodemy",
        exact: true,
      })
      .waitFor();
    const beforeSuggestion = await page.evaluate(
      () => JSON.parse(localStorage.getItem("pio-finance-v1")).tasks.length,
    );
    await page
      .getByRole("button", {
        name: "Examiner la suggestion 1 pour Afrodemy",
        exact: true,
      })
      .click();
    assert.equal(
      await page.getByLabel("Titre", { exact: true }).inputValue(),
      "Préparer le suivi financier de Afrodemy",
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("pio-finance-v1")).tasks.length,
      ),
      beforeSuggestion,
    );
    await page
      .getByRole("button", { name: "Enregistrer la tâche", exact: true })
      .click();
    const afterSuggestion = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pio-finance-v1")),
    );
    assert.equal(afterSuggestion.tasks.length, beforeSuggestion + 1);
    assert.equal(
      afterSuggestion.tasks.at(-1).companyId,
      afterSuggestion.companies.find((c) => c.name === "Afrodemy").id,
    );
    assert.equal(
      afterSuggestion.vision,
      "Développer les formations et améliorer leur rentabilité",
    );
    await page
      .getByRole("button", { name: "Hermès Ouvrir le poste de pilotage" })
      .click();
    await page
      .getByLabel("Société à accompagner", { exact: true })
      .selectOption({ label: "Afrodemy" });
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Préparer le suivi financier de Afrodemy",
          exact: true,
        })
        .count(),
      0,
    );
    console.log(
      "PASS company-specific suggestions, saved vision, explicit task confirmation and no duplicates",
    );

    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    console.log(
      "PASS interactive campus, mission, automatic paper delivery via parent, persistence and Hermes",
    );
    // Seed dated existing data to verify weekly generation, backlog and overload on reopen.
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("pio-finance-v1"));
      const now = new Date();
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7);
      d.world.startedAt = monday.toISOString();
      d.world.reports = [];
      d.world.events.push({
        id: "historic-completion",
        at: monday.toISOString(),
        companyId: d.companies[0].id,
        taskId: "historical",
        kind: "completed",
      });
      d.tasks.push(
        ...Array.from({ length: 6 }, (_, i) => ({
          id: "load-" + i,
          title: "Charge " + i,
          companyId: d.companies[0].id,
          priority: "Normale",
          due: "",
          done: false,
          assignee: "",
        })),
      );
      localStorage.setItem("pio-finance-v1", JSON.stringify(d));
    });
    await page.reload();
    assert.equal(await page.locator(".world-robot.overloaded").count(), 1);
    await page.getByRole("button", { name: /Bilans de Holding/ }).click();
    await page
      .getByRole("heading", {
        name: "Ce qui avance. Ce qui demande de l’aide.",
      })
      .waitFor();
    const row = page.getByRole("row").filter({ hasText: "FABI Immobilier" });
    assert.equal(await row.locator("td").first().textContent(), "1");
    assert.equal(await row.locator("td").nth(3).textContent(), "6");
    await page.reload();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pio-finance-v1")).world.reports
            .length,
      ),
      1,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(150);
    const reducedBefore = await commandCanvas.screenshot();
    await page.waitForTimeout(250);
    assert.deepEqual(await commandCanvas.screenshot(), reducedBefore);

    await page
      .getByRole("button", { name: "Ouvrir FABI Conciergerie", exact: true })
      .click();
    await page.getByRole("button", { name: "Porter un rapport" }).click();
    await page
      .getByText("Rapport de FABI Conciergerie reçu par FABI Holding.", {
        exact: true,
      })
      .waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(output, "mobile.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page
      .getByRole("button", { name: "Ouvrir FABI Immobilier", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ouvrir la fiche", exact: true })
      .click();
    await page
      .getByLabel("Nom de l’entreprise", { exact: true })
      .fill("FABI Immobilier Groupe");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    assert.equal(
      await page
        .locator(".art-station .station-label")
        .filter({ hasText: "FABI Immobilier Groupe" })
        .count(),
      1,
    );
    await page.reload();
    assert.equal(
      await page
        .locator(".art-station .station-label")
        .filter({ hasText: "FABI Immobilier Groupe" })
        .count(),
      1,
    );
    console.log(
      "PASS live facade names follow company edits and remain on the original campus",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS overload, weekly archive, deduplication, reduced motion, mobile and no browser exceptions",
    );
    console.log("World test artifacts:", output);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
