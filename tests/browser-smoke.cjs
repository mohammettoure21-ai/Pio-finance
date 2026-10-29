const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const output = fs.mkdtempSync(
  path.join(require("node:os").tmpdir(), "pio-finance-test-"),
);
const out = (name) => path.join(output, name);
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    timeout: 20000,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Une vision d’ensemble." }).waitFor();
  assert.equal(await page.locator(".entity").count(), 5);
  await page
    .getByRole("button", { name: "Portefeuille actuel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter une entreprise", exact: true })
    .click();
  await page
    .getByLabel("Nom de l’entreprise", { exact: true })
    .fill("Atelier test");
  await page.getByLabel("Devise (ex. EUR, XOF)").fill("EUR");
  await page.getByRole("tab", { name: "Participation", exact: true }).click();
  let owner = page.getByLabel("Entreprise détentrice actuelle");
  await owner.selectOption({ label: "FABI Immobilier" });
  await page.getByLabel("Participation du détenteur (%)").fill("35");
  await page.getByLabel("Détenteur envisagé").selectOption("holding");
  await page.getByLabel("Participation envisagée (%)").fill("40");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.locator(".entity").filter({ hasText: "Atelier test" }).waitFor();
  assert.equal(await page.locator(".graph>svg > path").count(), 1);
  console.log("PASS add, edit, status, actual ownership");
  await page.locator(".entity").filter({ hasText: "FABI Immobilier" }).click();
  await page.getByRole("tab", { name: "Participation", exact: true }).click();
  await page
    .getByLabel("Entreprise détentrice actuelle")
    .selectOption({ label: "Atelier test" });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Lien circulaire interdit" })
    .waitFor();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  console.log("PASS circular relationship rejected in UI");
  await page
    .getByRole("button", { name: "Structure cible", exact: true })
    .click();
  assert.ok(
    (await page.locator(".map-caption").textContent()).includes(
      "Structure cible — holding en préparation",
    ),
  );
  assert.equal(await page.locator(".graph>svg > path").count(), 5);
  assert.equal(await page.locator(".entity.holding").count(), 1);
  await page.locator(".entity.holding").click();
  await page.getByLabel("Nom envisagé").fill("Holding test");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  console.log("PASS target view and holding configuration");
  await page
    .getByRole("button", { name: "Tâches des entreprises", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Préparer les statuts");
  await page
    .getByLabel("Entreprise liée")
    .selectOption({ label: "Atelier test" });
  await page.getByLabel("Échéance", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Responsable").fill("Moi");
  await page
    .getByRole("button", { name: "Enregistrer la tâche", exact: true })
    .click();
  assert.ok((await page.locator(".late-count").textContent()).includes("1"));
  await page
    .getByLabel("Terminer Préparer les statuts", { exact: true })
    .click();
  assert.ok((await page.locator(".late-count").textContent()).includes("0"));
  assert.equal(await page.locator(".task-row").count(), 0);
  await page.getByLabel("État des tâches").selectOption("all");
  await page
    .locator(".task-title")
    .filter({ hasText: "Préparer les statuts" })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Statuts prêts");
  await page
    .getByRole("button", { name: "Enregistrer la tâche", exact: true })
    .click();
  console.log("PASS task creation, overdue, completion and editing");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Tâches des entreprises", exact: true })
    .click();
  await page.getByLabel("État des tâches").selectOption("all");
  await page.getByLabel("Terminer Statuts prêts", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("Terminer Statuts prêts", { exact: true })
      .isChecked(),
    true,
  );
  console.log("PASS persistence across reload");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter la sauvegarde JSON", exact: true })
    .click();
  const dl = await download;
  await dl.saveAs(out("export.json"));
  const exported = JSON.parse(
    require("fs").readFileSync(out("export.json"), "utf8"),
  );
  assert.equal(exported.companies.length, 5);
  assert.equal(exported.tasks.length, 1);
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await page.getByRole("status").filter({ hasText: "Import refusé" }).waitFor();
  await page.locator("input[type=file]").setInputFiles(out("export.json"));
  await page
    .getByRole("status")
    .filter({ hasText: "Sauvegarde importée" })
    .waitFor();
  console.log("PASS export, import, invalid file rejection");
  await page
    .getByRole("button", {
      name: "Supprimer la tâche Statuts prêts",
      exact: true,
    })
    .click();
  assert.equal(await page.locator(".task-row").count(), 0);
  await page
    .getByRole("button", { name: "Carte des participations", exact: true })
    .click();
  await page.locator(".entity").filter({ hasText: "Atelier test" }).click();
  await page
    .getByRole("button", { name: "Supprimer l’entreprise", exact: true })
    .click();
  assert.equal(await page.locator(".entity").count(), 5);
  console.log("PASS confirmed task and company deletion");
  await page.getByRole("button", { name: "Hermès", exact: true }).click();
  await page.getByText("IA non connectée", { exact: true }).waitFor();
  await page
    .getByLabel("Entreprise de la note")
    .selectOption({ label: "Afrodemy" });
  await page.getByLabel("Note pour Hermès").fill("Note de test Hermès");
  await page
    .getByRole("button", { name: "Vérifier la note", exact: true })
    .click();
  assert.ok(
    !(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pio-finance-v1")).companies.find(
            (c) => c.name === "Afrodemy",
          ).notes,
      )
    ).includes("Note de test Hermès"),
  );
  await page
    .getByRole("button", { name: "Confirmer l’ajout", exact: true })
    .click();
  assert.ok(
    (
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pio-finance-v1")).companies.find(
            (c) => c.name === "Afrodemy",
          ).notes,
      )
    ).includes("Note de test Hermès"),
  );
  console.log("PASS Hermes note preview, confirmation and persistence");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("button", { name: "Recentrer la carte", exact: true })
    .click();
  await page.screenshot({ path: out("mobile.png"), fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator(".map-viewport").scrollIntoViewIfNeeded();
  const box = await page.locator(".map-viewport").boundingBox();
  const before = await page.locator(".graph").getAttribute("style");
  await page.mouse.move(box.x + box.width - 30, box.y + box.height - 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 150, box.y + box.height - 50, {
    steps: 8,
  });
  await page.mouse.up();
  assert.notEqual(await page.locator(".graph").getAttribute("style"), before);
  await page
    .getByRole("textbox", { name: "Rechercher une entreprise" })
    .fill("Afrodemy");
  await page
    .locator(".search-results button")
    .filter({ hasText: "Afrodemy" })
    .click();
  await page.getByRole("heading", { name: "Afrodemy", exact: true }).waitFor();
  await page.screenshot({ path: out("mobile-sheet.png"), fullPage: true });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  console.log("PASS mobile map, sheet, no overflow and Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Structure cible", exact: true })
    .click();
  await page.screenshot({ path: out("target.png"), fullPage: true });
  await page
    .getByRole("button", { name: "Tâches des entreprises", exact: true })
    .click();
  for (const title of ["Urgent MBTG 1", "Urgent MBTG 2"]) {
    await page
      .getByRole("button", { name: "Nouvelle tâche", exact: true })
      .click();
    await page.getByLabel("Titre", { exact: true }).fill(title);
    await page.getByLabel("Entreprise liée").selectOption({ label: "MBTG" });
    await page.getByLabel("Urgence").selectOption("Haute");
    await page
      .getByRole("button", { name: "Enregistrer la tâche", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Carte des participations", exact: true })
      .click();
    const node = page.locator(".entity").filter({ hasText: "MBTG" });
    assert.ok(
      (await node.getAttribute("class")).includes(
        title.endsWith("1") ? "orange" : "red",
      ),
    );
    await page
      .getByRole("button", { name: "Tâches des entreprises", exact: true })
      .click();
  }
  await page.getByLabel("Terminer Urgent MBTG 1", { exact: true }).click();
  await page.getByLabel("Terminer Urgent MBTG 2", { exact: true }).click();
  await page
    .getByRole("button", { name: "Carte des participations", exact: true })
    .click();
  assert.ok(
    (
      await page
        .locator(".entity")
        .filter({ hasText: "MBTG" })
        .getAttribute("class")
    ).includes("green"),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.ok(
    (
      await page
        .locator(".entity")
        .filter({ hasText: "MBTG" })
        .getAttribute("class")
    ).includes("green"),
  );
  assert.equal(await page.locator(".business-link").count(), 1);
  await page.locator(".entity").filter({ hasText: "Afrodemy" }).click();
  assert.equal(await page.getByRole("tab").count(), 8);
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  assert.ok(
    (await page.getByLabel("Notes privées").inputValue()).includes(
      "Note de test Hermès",
    ),
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  console.log(
    "PASS orange/red urgency alerts, clearing on completion, reload, eight detailed company tabs",
  );
  assert.equal(
    await page.locator(".business-link path").getAttribute("stroke-dasharray"),
    "5 6",
  );
  await page.locator(".entity").filter({ hasText: "Afrodemy" }).click();
  await page.getByRole("tab", { name: "Finances", exact: true }).click();
  await page.getByLabel("Exercice / nom de la période").fill("Exercice 2025");
  await page.getByLabel("Devise de cette période").fill("EUR");
  await page.getByLabel("Début de période").fill("2025-01-01");
  await page.getByLabel("Fin de période").fill("2025-12-31");
  await page.getByLabel("Chiffre d’affaires", { exact: true }).fill("12000");
  await page
    .getByRole("button", { name: "Ajouter une période", exact: true })
    .click();
  await page.getByLabel("Exercice / nom de la période").fill("Exercice 2026");
  await page.getByLabel("Devise de cette période").fill("EUR");
  await page.getByLabel("Chiffre d’affaires", { exact: true }).fill("18000");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".entity").filter({ hasText: "Afrodemy" }).click();
  await page.getByRole("tab", { name: "Finances", exact: true }).click();
  await page
    .getByLabel("Période à consulter")
    .selectOption({ label: "Exercice 2025" });
  assert.equal(
    await page.getByLabel("Chiffre d’affaires", { exact: true }).inputValue(),
    "12000",
  );
  await page
    .getByLabel("Période à consulter")
    .selectOption({ label: "Exercice 2026" });
  assert.equal(
    await page.getByLabel("Chiffre d’affaires", { exact: true }).inputValue(),
    "18000",
  );
  await page
    .getByRole("button", { name: "Supprimer cette période", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Chiffre d’affaires", { exact: true }).inputValue(),
    "12000",
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  console.log(
    "PASS independent financial years, reload, deletion preserving prior year and dashed business link",
  );
  await page
    .getByRole("button", { name: "Tâches des entreprises", exact: true })
    .click();
  for (const [company, title] of [
    ["Afrodemy", "Préparer le programme"],
    ["FABI Immobilier", "Préparer le dossier immobilier"],
  ]) {
    await page
      .getByRole("button", { name: "Nouvelle tâche", exact: true })
      .click();
    await page.getByLabel("Titre", { exact: true }).fill(title);
    await page.getByLabel("Entreprise liée").selectOption({ label: company });
    await page
      .getByRole("button", { name: "Enregistrer la tâche", exact: true })
      .click();
  }
  await page.getByLabel("Entreprise à afficher").selectOption("");
  await page.getByLabel("État des tâches").selectOption("open");
  assert.equal(await page.locator(".task-company-heading").count(), 2);
  await page
    .getByLabel("Entreprise à afficher")
    .selectOption({ label: "Afrodemy" });
  assert.equal(await page.locator(".task-row").count(), 1);
  await page
    .getByLabel("Terminer Préparer le programme", { exact: true })
    .click();
  assert.equal(await page.locator(".task-row").count(), 0);
  await page.getByLabel("État des tâches").selectOption("done");
  assert.equal(await page.locator(".task-row").count(), 1);
  console.log(
    "PASS tasks grouped by company, company filter, to-do and completed filters",
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser exceptions");
  console.log("Test artifacts:", output);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
