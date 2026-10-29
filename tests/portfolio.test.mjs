import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blankCompany,
  financialRecords,
  blankFinancialRecord,
  initialPortfolio,
  validatePortfolio,
  participation,
  layout,
  migratePortfolio,
  attention,
} from "../src/finance/model.ts";
test("target pyramid has four companies without invented current ownership or amounts", () => {
  const d = initialPortfolio();
  assert.equal(d.companies.length, 4);
  assert.equal(validatePortfolio(d), d);
  assert.ok(
    d.companies.every(
      (c) =>
        !c.percent &&
        !c.parentId &&
        c.targetParentId === "holding" &&
        !c.equity,
    ),
  );
  assert.ok(layout(d, false).nodes.every((n) => !n.parent));
  assert.equal(layout(d, true).nodes.filter((n) => n.parent).length, 4);
});
test("both ownership graphs reject circular links independently", () => {
  for (const key of ["parentId", "targetParentId"]) {
    const d = initialPortfolio();
    const [a, b, c] = d.companies;
    a[key] = b.id;
    b[key] = c.id;
    c[key] = a.id;
    assert.throws(() => validatePortfolio(d), /circulaire/);
  }
});
test("unknown owners, invalid percentages and dangling tasks cannot enter storage", () => {
  const d = initialPortfolio();
  d.companies[0].parentId = "absent";
  assert.throws(() => validatePortfolio(d), /introuvable/);
  d.companies[0].parentId = "";
  d.companies[0].percent = "101";
  assert.throws(() => validatePortfolio(d), /Pourcentage/);
  d.companies[0].percent = "";
  d.tasks.push({
    id: "t",
    title: "Action",
    companyId: "absent",
    priority: "Haute",
    assignee: "",
    due: "",
    done: false,
  });
  assert.throws(() => validatePortfolio(d), /Tâche/);
});
test("manual tracking requires an explanation and update date", () => {
  const d = initialPortfolio();
  d.companies[0].status = "red";
  assert.throws(() => validatePortfolio(d), /justification/);
  d.companies[0].justification = "Dossier à examiner";
  d.companies[0].updated = "2026-10-28";
  assert.equal(validatePortfolio(d), d);
});
test("valuation uses effective personal equity interest and never turnover", () => {
  const c = blankCompany();
  c.percent = "80";
  c.revenue = "1000000";
  assert.equal(participation(c).value, undefined);
  Object.assign(c, {
    equity: "20000",
    personalPercent: "25",
    currency: "EUR",
    valuationDate: "2026-10-28",
    method: "Estimation documentée",
  });
  assert.equal(participation(c).value, 5000);
  c.personalPercent = "0";
  assert.equal(participation(c).value, 0);
});
test("a multi-level tree keeps children below their actual parent, target separate", () => {
  const d = initialPortfolio();
  const [a, b, c] = d.companies;
  a.owner = "Détenteur explicite";
  b.parentId = a.id;
  c.parentId = b.id;
  a.targetParentId = "holding";
  validatePortfolio(d);
  const g = layout(d, false);
  for (const n of g.nodes.filter((n) => n.parent)) {
    assert.ok(n.y > g.nodes.find((p) => p.id === n.parent).y);
  }
  const target = layout(d, true);
  assert.equal(target.nodes.find((n) => n.id === b.id).parent, "holding");
  assert.equal(target.nodes.find((n) => n.id === a.id).parent, "holding");
});
test("JSON round trip restores tasks, assets and configured preferences", () => {
  const d = initialPortfolio();
  d.companies[0].assets.push({
    id: "asset",
    label: "Bien client",
    amount: "",
    kind: "Géré pour un client",
  });
  d.companies[0].rules.lateTasks = true;
  d.tasks.push({
    id: "task",
    title: "Compléter le dossier",
    companyId: d.companies[0].id,
    priority: "Haute",
    assignee: "Moi",
    due: "2026-10-01",
    done: true,
  });
  assert.deepEqual(validatePortfolio(JSON.parse(JSON.stringify(d))), d);
});
test("malformed and duplicate import records are rejected", () => {
  assert.throws(() => validatePortfolio({ version: 2 }));
  const d = initialPortfolio();
  d.companies[1].id = d.companies[0].id;
  assert.throws(() => validatePortfolio(d), /dupliqués/);
});

test("alerts depend on unfinished urgency and lateness, and clear on completion", () => {
  const d = initialPortfolio(),
    id = d.companies[0].id;
  const add = (priority, due = "") =>
    d.tasks.push({
      id: crypto.randomUUID(),
      title: "Action",
      companyId: id,
      priority,
      assignee: "",
      due,
      done: false,
    });
  assert.equal(attention(d, id).status, "unknown");
  add("Normale");
  assert.equal(attention(d, id).status, "green");
  add("Haute");
  assert.equal(attention(d, id).status, "orange");
  add("Haute");
  assert.equal(attention(d, id).status, "red");
  d.tasks.forEach((t) => (t.done = true));
  assert.equal(attention(d, id).status, "green");
  add("Basse", "2000-01-01");
  assert.equal(attention(d, id).status, "orange");
  add("Normale", "2000-01-01");
  assert.equal(attention(d, id).status, "orange");
  add("Normale", "2000-01-01");
  assert.equal(attention(d, id).status, "red");
  assert.equal(attention(d, d.companies[1].id).status, "unknown");
});
test("migration preserves user data and applies the requested target only once", () => {
  const d = initialPortfolio();
  delete d.uiRevision;
  delete d.relationships;
  d.companies = d.companies.slice(0, 3);
  d.companies.forEach((c) => (c.targetParentId = ""));
  d.holdingName = "Ma future holding";
  d.companies[0].notes = "Private notes";
  const oldId = d.companies[0].id;
  const m = migratePortfolio(d);
  validatePortfolio(m);
  assert.equal(m.companies.length, 4);
  assert.equal(m.holdingName, "FABI Holding");
  assert.equal(m.companies[0].notes, "Private notes");
  assert.equal(m.companies[0].id, oldId);
  assert.equal(m.relationships.length, 1);
  assert.ok(m.companies.every((c) => c.targetParentId === "holding"));
  assert.ok(m.companies.every((c) => !c.parentId));
  m.companies = m.companies.filter((c) => c.name !== "MBTG");
  assert.equal(migratePortfolio(m).companies.length, 3);
});
test("holding is above its four target companies, and business link is not ownership", () => {
  const d = initialPortfolio(),
    g = layout(d, true),
    h = g.nodes.find((n) => n.id === "holding");
  assert.ok(g.nodes.filter((n) => n.company).every((n) => n.y > h.y));
  assert.equal(d.relationships[0].kind, "operational");
  assert.ok(d.companies.every((c) => !c.parentId));
});

test("financial periods preserve legacy amounts and independent years", () => {
  const d = initialPortfolio(),
    c = d.companies[0];
  Object.assign(c, {
    period: "Exercice 2025",
    revenue: "12000",
    cash: "500",
    currency: "EUR",
  });
  const legacy = financialRecords(c);
  assert.equal(legacy[0].revenue, "12000");
  assert.equal(legacy[0].period, "Exercice 2025");
  assert.equal(c.financialRecords, undefined);
  c.financialRecords = [
    ...legacy,
    {
      ...blankFinancialRecord("EUR"),
      period: "Exercice 2026",
      revenue: "18000",
    },
  ];
  validatePortfolio(d);
  const restored = validatePortfolio(JSON.parse(JSON.stringify(d)));
  assert.equal(financialRecords(restored.companies[0])[0].revenue, "12000");
  assert.equal(financialRecords(restored.companies[0])[1].revenue, "18000");
  c.financialRecords = [];
  assert.deepEqual(financialRecords(c), []);
});
test("financial import rejects duplicate records, invalid amounts and inverted dates", () => {
  const d = initialPortfolio(),
    c = d.companies[0],
    r = blankFinancialRecord("EUR");
  c.financialRecords = [r, { ...r }];
  assert.throws(() => validatePortfolio(d), /dupliquée/);
  c.financialRecords = [{ ...r, revenue: "Infinity" }];
  assert.throws(() => validatePortfolio(d), /Montant/);
  c.financialRecords = [
    { ...r, startDate: "2025-12-31", endDate: "2025-01-01" },
  ];
  assert.throws(() => validatePortfolio(d), /fin de période/);
  c.financialRecords = [{ ...r, startDate: "2025-02-30" }];
  assert.throws(() => validatePortfolio(d), /Date de période/);
});
