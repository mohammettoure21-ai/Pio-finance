import { test } from "node:test";
import assert from "node:assert/strict";
import { initialPortfolio, validatePortfolio } from "../src/finance/model.ts";
import { suggestTasks } from "../src/finance/suggestions.ts";
const day = "2026-10-30";
test("Hermes adapts proposals to each company without pretending its activity is known", () => {
  const d = initialPortfolio();
  const titles = d.companies.map((c) =>
    suggestTasks(d, c.id, day)
      .map((s) => s.task.title)
      .join(" "),
  );
  assert.match(titles[0], /immobiliers|biens/);
  assert.match(titles[1], /prestations|interventions/);
  assert.match(titles[2], /formation|pédagogique/);
  assert.match(titles[3], /techniques|automatisations/);
  assert.ok(
    suggestTasks(d, d.companies[0].id, day).every(
      (s) => s.source === "Métier à confirmer",
    ),
  );
});
test("goals, milestones, activity and group vision provide explicit proposal context", () => {
  const d = initialPortfolio();
  const c = d.companies[2];
  c.activity = "Formation en ligne";
  c.goals = "Lancer une formation en novembre";
  c.milestones.push({
    id: "m",
    label: "Pilote pédagogique",
    amount: "2026-11-15",
    kind: "À faire",
  });
  d.vision = "Améliorer la rentabilité et la qualité des formations";
  const list = suggestTasks(d, c.id, day);
  assert.ok(list.some((s) => s.task.title.includes(c.goals)));
  assert.ok(list.some((s) => s.task.due === "2026-11-15"));
  assert.ok(
    list.some(
      (s) =>
        s.source === "Vision du groupe" &&
        s.task.title.includes("financier") &&
        s.reason.includes(d.vision),
    ),
  );
  assert.ok(list.some((s) => s.reason.includes(c.activity)));
  assert.equal(
    validatePortfolio(JSON.parse(JSON.stringify(d))).vision,
    d.vision,
  );
  assert.equal(d.tasks.length, 0);
});
test("proposals exclude duplicates for this company and prioritize real overdue work", () => {
  const d = initialPortfolio();
  const c = d.companies[0];
  const existing = suggestTasks(d, c.id, day)[0].task;
  d.tasks.push({ ...existing, id: "existing", done: false, due: "2000-01-01" });
  const list = suggestTasks(d, c.id, day);
  assert.equal(list[0].source, "Échéances");
  assert.equal(list[0].task.priority, "Haute");
  assert.ok(!list.some((s) => s.task.title === existing.title));
  d.tasks[0].companyId = d.companies[1].id;
  assert.ok(
    suggestTasks(d, c.id, day).some((s) => s.task.title === existing.title),
  );
  assert.deepEqual(suggestTasks(d, "absent", day), []);
});
test("invalid vision imports are rejected without changing existing portfolio data", () => {
  const d = initialPortfolio();
  d.vision = { malicious: true };
  assert.throws(() => validatePortfolio(d), /Vision/);
});
