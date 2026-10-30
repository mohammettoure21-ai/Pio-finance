import type { Portfolio } from "./model.ts";

export type Activity = {
  id: string;
  at: string;
  companyId: string;
  kind:
    | "created"
    | "completed"
    | "reopened"
    | "updated"
    | "company"
    | "report"
    | "deleted";
  taskId?: string;
  recipient?: string;
};
export type WeeklyReport = {
  week: string;
  end: string;
  generatedAt: string;
  partial: boolean;
  companies: {
    id: string;
    name: string;
    completed: number;
    created: number;
    activity: number;
    open: number;
    late: number;
  }[];
};
export type WorldHistory = {
  startedAt: string;
  events: Activity[];
  reports: WeeklyReport[];
};
const kinds = [
  "created",
  "completed",
  "reopened",
  "updated",
  "company",
  "report",
  "deleted",
];
const stamp = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));
const dayValid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function validateWorld(raw: unknown): void {
  if (raw === undefined) return;
  const w = raw as WorldHistory;
  if (
    !w ||
    !stamp(w.startedAt) ||
    !Array.isArray(w.events) ||
    w.events.length > 20000 ||
    !Array.isArray(w.reports) ||
    w.reports.length > 104
  )
    throw new Error("Historique du monde invalide.");
  const ids = new Set<string>();
  for (const e of w.events) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      !stamp(e.at) ||
      typeof e.companyId !== "string" ||
      !kinds.includes(e.kind) ||
      (e.taskId !== undefined && typeof e.taskId !== "string") ||
      (e.recipient !== undefined && typeof e.recipient !== "string")
    )
      throw new Error("Événement du monde invalide.");
    ids.add(e.id);
  }
  const weeks = new Set<string>();
  for (const r of w.reports) {
    if (
      !r ||
      !dayValid(r.week) ||
      !dayValid(r.end) ||
      r.end < r.week ||
      weeks.has(r.week) ||
      !stamp(r.generatedAt) ||
      typeof r.partial !== "boolean" ||
      !Array.isArray(r.companies) ||
      r.companies.length > 500
    )
      throw new Error("Bilan hebdomadaire invalide.");
    weeks.add(r.week);
    const companyIds = new Set<string>();
    for (const c of r.companies) {
      if (
        !c ||
        typeof c.id !== "string" ||
        companyIds.has(c.id) ||
        typeof c.name !== "string" ||
        [c.completed, c.created, c.activity, c.open, c.late].some(
          (n) => !Number.isSafeInteger(n) || n < 0,
        )
      )
        throw new Error("Chiffres du bilan invalides.");
      companyIds.add(c.id);
    }
  }
}
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function previousWeek(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { week: localDay(start), end: localDay(end) };
}
export function recordChanges(
  before: Portfolio,
  after: Portfolio,
  now = new Date(),
): Portfolio {
  const world = after.world ?? {
    startedAt: now.toISOString(),
    events: [],
    reports: [],
  };
  const added: Activity[] = [];
  const add = (companyId: string, kind: Activity["kind"], taskId?: string) =>
    added.push({
      id: crypto.randomUUID(),
      at: now.toISOString(),
      companyId,
      kind,
      ...(taskId ? { taskId } : {}),
    });
  for (const t of after.tasks) {
    const old = before.tasks.find((v) => v.id === t.id);
    if (!old) {
      add(t.companyId, "created", t.id);
      if (t.done) add(t.companyId, "completed", t.id);
    } else if (JSON.stringify(old) !== JSON.stringify(t))
      add(
        t.companyId,
        old.done !== t.done ? (t.done ? "completed" : "reopened") : "updated",
        t.id,
      );
  }
  for (const t of before.tasks)
    if (!after.tasks.some((v) => v.id === t.id))
      add(t.companyId, "deleted", t.id);
  for (const c of after.companies) {
    if (
      JSON.stringify(before.companies.find((v) => v.id === c.id)) !==
      JSON.stringify(c)
    )
      add(c.id, "company");
  }
  return {
    ...after,
    world: { ...world, events: [...world.events, ...added].slice(-20000) },
  };
}
export function robotState(data: Portfolio, id: string, now = new Date()) {
  const tasks = data.tasks.filter((t) => t.companyId === id && !t.done);
  const late = tasks.filter((t) => t.due && t.due < localDay(now)).length;
  // Sending a report does not manufacture productive activity.
  const activity = (data.world?.events ?? []).filter(
    (e) => e.companyId === id && e.kind !== "report",
  );
  const last = activity.reduce((at, e) => Math.max(at, Date.parse(e.at)), 0);
  if (tasks.length >= 6 || late >= 3)
    return {
      kind: "overloaded",
      label: "Débordé",
      open: tasks.length,
      late,
      reason: `${tasks.length} tâches ouvertes · ${late} en retard`,
    };
  const observedSince =
    last || (data.world ? Date.parse(data.world.startedAt) : now.getTime());
  if (now.getTime() - observedSince >= 3 * 86400000)
    return {
      kind: "sleeping",
      label: "En veille",
      open: tasks.length,
      late,
      reason: "Aucune activité enregistrée depuis 3 jours",
    };
  if (tasks.length)
    return {
      kind: "working",
      label: "Au travail",
      open: tasks.length,
      late,
      reason: `${tasks.length} tâches à faire · ${late} en retard`,
    };
  if (last && now.getTime() - last < 3 * 86400000)
    return {
      kind: "ready",
      label: "À jour",
      open: 0,
      late: 0,
      reason: "Activité récente, aucune tâche ouverte",
    };
  return {
    kind: "sleeping",
    label: "En veille",
    open: 0,
    late: 0,
    reason: "Aucune tâche ouverte ni activité récente enregistrée",
  };
}
export function makeWeeklyReport(
  data: Portfolio,
  now = new Date(),
): WeeklyReport {
  const { week, end } = previousWeek(now);
  const events = (data.world?.events ?? []).filter((e) => {
    const day = localDay(new Date(e.at));
    return day >= week && day <= end;
  });
  const weekStart = new Date(`${week}T00:00:00`).getTime();
  const trackingStart = data.world ? Date.parse(data.world.startedAt) : now.getTime();
  const oldestRetained =
    data.world?.events.length === 20000
      ? Date.parse(data.world.events[0].at)
      : 0;
  return {
    week,
    end,
    generatedAt: now.toISOString(),
    partial: trackingStart > weekStart || oldestRetained > weekStart,
    companies: data.companies.map((c) => {
      const own = events.filter(
        (e) => e.companyId === c.id && e.kind !== "report",
      );
      return {
        id: c.id,
        name: c.name,
        completed: new Set(
          own.filter((e) => e.kind === "completed").map((e) => e.taskId),
        ).size,
        created: own.filter((e) => e.kind === "created").length,
        activity: own.length,
        open: data.tasks.filter((t) => t.companyId === c.id && !t.done).length,
        late: data.tasks.filter(
          (t) =>
            t.companyId === c.id && !t.done && t.due && t.due < localDay(now),
        ).length,
      };
    }),
  };
}
export function ensureWeeklyReport(
  data: Portfolio,
  now = new Date(),
): Portfolio {
  if (!data.world)
    return {
      ...data,
      world: { startedAt: now.toISOString(), events: [], reports: [] },
    };
  const { week, end } = previousWeek(now);
  if (
    localDay(new Date(data.world.startedAt)) > end ||
    data.world.reports.some((r) => r.week === week)
  )
    return data;
  return {
    ...data,
    world: {
      ...data.world,
      reports: [...data.world.reports, makeWeeklyReport(data, now)].slice(-104),
    },
  };
}
