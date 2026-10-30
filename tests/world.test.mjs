import { test } from "node:test";
import assert from "node:assert/strict";
import { initialPortfolio, validatePortfolio } from "../src/finance/model.ts";
import {
  recordChanges,
  robotState,
  ensureWeeklyReport,
  makeWeeklyReport,
  previousWeek,
} from "../src/finance/world.ts";
const start = new Date(2026, 9, 26, 10);
function tracked() {
  return ensureWeeklyReport(initialPortfolio(), start);
}
function task(data, id = "t", due = "") {
  return {
    id,
    companyId: data.companies[0].id,
    title: "Mission",
    priority: "Normale",
    assignee: "",
    due,
    done: false,
  };
}
test("robot states reflect actual load and inactivity; reports do not wake sleeping robots", () => {
  let d = tracked(),
    id = d.companies[0].id;
  assert.equal(robotState(d, id, start).kind, "sleeping");
  const legacy = { ...d, tasks: [task(d)] };
  assert.equal(
    robotState(legacy, id, new Date(start.getTime() + 4 * 86400000)).kind,
    "sleeping",
  );
  d = recordChanges(d, { ...d, tasks: [task(d)] }, start);
  assert.equal(robotState(d, id, start).kind, "working");
  const later = new Date(start.getTime() + 3 * 86400000);
  assert.equal(robotState(d, id, later).kind, "sleeping");
  d.world.events.push({
    id: "report",
    at: later.toISOString(),
    companyId: id,
    kind: "report",
    recipient: "holding",
  });
  assert.equal(robotState(d, id, later).kind, "sleeping");
  d.tasks = Array.from({ length: 6 }, (_, i) => task(d, String(i)));
  assert.equal(robotState(d, id, later).kind, "overloaded");
  d.tasks = Array.from({ length: 3 }, (_, i) =>
    task(d, String(i), "2000-01-01"),
  );
  assert.equal(robotState(d, id, later).kind, "overloaded");
  d = recordChanges(
    d,
    { ...d, tasks: d.tasks.map((t) => ({ ...t, done: true })) },
    later,
  );
  assert.equal(robotState(d, id, later).kind, "ready");
});
test("weekly report uses dated events, excludes legacy completions and archives once after Sunday", () => {
  let d = tracked();
  d.tasks = [{ ...task(d, "legacy"), done: true }];
  d = recordChanges(d, { ...d, tasks: [...d.tasks, task(d)] }, start);
  d = recordChanges(
    d,
    { ...d, tasks: d.tasks.map((t) => ({ ...t, done: true })) },
    new Date(2026, 9, 30, 12),
  );
  assert.equal(
    ensureWeeklyReport(d, new Date(2026, 10, 1, 23)).world.reports.length,
    0,
  );
  const monday = new Date(2026, 10, 2, 9);
  const next = ensureWeeklyReport(d, monday);
  const report = next.world.reports[0];
  assert.equal(report.week, "2026-10-26");
  assert.equal(report.end, "2026-11-01");
  assert.equal(report.companies[0].completed, 1);
  assert.equal(report.companies[0].created, 1);
  assert.equal(report.partial, true);
  const full = structuredClone(d);
  full.world.startedAt = new Date(2026, 9, 26).toISOString();
  assert.equal(makeWeeklyReport(full, monday).partial, false);
  assert.equal(ensureWeeklyReport(next, monday), next);
  assert.equal(
    validatePortfolio(JSON.parse(JSON.stringify(next))).world.reports.length,
    1,
  );
  assert.equal(d.world.reports.length, 0);
});
test("partial tracking and year rollover are explicit; old data stays intact", () => {
  assert.deepEqual(previousWeek(new Date(2027, 0, 4)), {
    week: "2026-12-28",
    end: "2027-01-03",
  });
  const old = initialPortfolio();
  old.companies[0].notes = "Private";
  const snapshot = structuredClone(old);
  const d = ensureWeeklyReport(old, new Date(2026, 9, 30));
  assert.deepEqual(old, snapshot);
  assert.equal(d.companies[0].notes, "Private");
  assert.equal(makeWeeklyReport(d, new Date(2026, 10, 2)).partial, true);
});
test("world imports reject malformed events and report data while old exports still work", () => {
  assert.equal(validatePortfolio(initialPortfolio()).version, 1);
  const d = tracked();
  d.world.events.push({
    id: "e",
    at: "bad",
    companyId: "c",
    kind: "completed",
  });
  assert.throws(() => validatePortfolio(d), /Événement/);
  d.world.events = [];
  d.world.reports.push({
    week: "2026-02-30",
    end: "2026-03-01",
    generatedAt: start.toISOString(),
    partial: false,
    companies: [],
  });
  assert.throws(() => validatePortfolio(d), /Bilan/);
});
