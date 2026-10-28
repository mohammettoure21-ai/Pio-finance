import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blankCompany,
  initialPortfolio,
  validatePortfolio,
  participation,
  layout,
} from "../src/finance/model.ts";
test("initial portfolio has no invented owners, amounts or target links", () => {
  const d = initialPortfolio();
  assert.equal(d.companies.length, 3);
  assert.equal(validatePortfolio(d), d);
  assert.ok(
    d.companies.every(
      (c) => !c.percent && !c.parentId && !c.targetParentId && !c.equity,
    ),
  );
  assert.ok(layout(d, false).nodes.every((n) => !n.parent));
  assert.equal(layout(d, true).nodes.filter((n) => n.parent).length, 0);
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
  assert.equal(target.nodes.find((n) => n.id === b.id).parent, "");
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
