export const STORAGE_KEY = "pio-finance-v1";
export const statuses = {
  unknown: "Aucune tâche",
  green: "À jour",
  orange: "Attention",
  red: "Action requise",
} as const;
export type Status = keyof typeof statuses;
export type Item = { id: string; label: string; amount: string; kind: string };
export type Task = {
  id: string;
  title: string;
  companyId: string;
  priority: string;
  assignee: string;
  due: string;
  done: boolean;
};
export type Company = {
  id: string;
  name: string;
  activity: string;
  country: string;
  currency: string;
  legalStatus: string;
  parentId: string;
  owner: string;
  percent: string;
  invested: string;
  ownership: string;
  targetParentId: string;
  targetPercent: string;
  transfer: string;
  status: Status;
  justification: string;
  updated: string;
  revenue: string;
  expenses: string;
  profit: string;
  cash: string;
  dividends: string;
  period: string;
  equity: string;
  valuationDate: string;
  method: string;
  personalPercent: string;
  assets: Item[];
  debts: Item[];
  goals: string;
  budget: string;
  milestones: Item[];
  deadline: string;
  progress: string;
  notes: string;
  rules: {
    milestones: boolean;
    lateTasks: boolean;
    freshness: boolean;
    indicators: boolean;
    freshnessDays: string;
    revenueGoal: string;
    profitGoal: string;
  };
};
export type Portfolio = {
  version: 1;
  uiRevision?: number;
  relationships?: { from: string; to: string; kind: "operational" }[];
  holdingName: string;
  companies: Company[];
  tasks: Task[];
};
export const uid = () => crypto.randomUUID();
export function blankCompany(name = "Nouvelle entreprise"): Company {
  return {
    id: uid(),
    name,
    activity: "",
    country: "",
    currency: "",
    legalStatus: "",
    parentId: "",
    owner: "",
    percent: "",
    invested: "",
    ownership: "",
    targetParentId: "",
    targetPercent: "",
    transfer: "",
    status: "unknown",
    justification: "",
    updated: "",
    revenue: "",
    expenses: "",
    profit: "",
    cash: "",
    dividends: "",
    period: "",
    equity: "",
    valuationDate: "",
    method: "",
    personalPercent: "",
    assets: [],
    debts: [],
    goals: "",
    budget: "",
    milestones: [],
    deadline: "",
    progress: "",
    notes: "",
    rules: {
      milestones: false,
      lateTasks: false,
      freshness: false,
      indicators: false,
      freshnessDays: "90",
      revenueGoal: "",
      profitGoal: "",
    },
  };
}
export function initialPortfolio(): Portfolio {
  const companies = [
    "FABI Immobilier",
    "FABI Conciergerie",
    "Afrodemy",
    "MBTG",
  ].map((name) => ({ ...blankCompany(name), targetParentId: "holding" }));
  companies[3].activity = "Modern Business Tech Group";
  return {
    version: 1,
    uiRevision: 2,
    holdingName: "FABI Holding",
    companies,
    tasks: [],
    relationships: [
      { from: companies[0].id, to: companies[1].id, kind: "operational" },
    ],
  };
}
// Upgrade the original portfolio once, preserving IDs, tasks, notes and existing links.
export function migratePortfolio(data: Portfolio): Portfolio {
  if ((data.uiRevision ?? 1) >= 2) return data;
  const companies = data.companies.map((c) => ({ ...c }));
  if (!companies.some((c) => c.name.trim().toUpperCase() === "MBTG")) {
    companies.push({
      ...blankCompany("MBTG"),
      activity: "Modern Business Tech Group",
      targetParentId: "holding",
    });
  }
  for (const c of companies)
    if (
      [
        "fabi immobilier",
        "fabi conciergerie",
        "afrodemy",
        "afrodémy",
        "mbtg",
      ].includes(c.name.trim().toLowerCase()) &&
      !c.targetParentId
    )
      c.targetParentId = "holding";
  const a = companies.find((c) => c.name.toLowerCase() === "fabi immobilier");
  const b = companies.find((c) => c.name.toLowerCase() === "fabi conciergerie");
  return {
    ...data,
    uiRevision: 2,
    holdingName: ["Ma future holding", ""].includes(data.holdingName)
      ? "FABI Holding"
      : data.holdingName,
    companies,
    relationships:
      data.relationships ??
      (a && b ? [{ from: a.id, to: b.id, kind: "operational" }] : []),
  };
}
export function attention(
  data: Portfolio,
  companyId: string,
  date = today(),
): { status: Status; label: string; reason: string } {
  const tasks = data.tasks.filter((t) => t.companyId === companyId);
  const pending = tasks.filter((t) => !t.done);
  const urgent = pending.filter((t) => t.priority === "Haute").length;
  const overdue = pending.filter((t) => t.due && t.due < date).length;
  const status =
    urgent >= 2 || overdue >= 3
      ? "red"
      : urgent || overdue
        ? "orange"
        : tasks.length
          ? "green"
          : "unknown";
  return {
    status,
    label: {
      red: "Action requise",
      orange: "À surveiller",
      green: "À jour",
      unknown: "Aucune tâche",
    }[status],
    reason: `${pending.length} tâche(s) à faire · ${urgent} urgente(s) · ${overdue} en retard. Rouge : au moins 2 urgentes ou 3 en retard. Orange : au moins 1 urgente ou en retard.`,
  };
}
export function cycle(
  companies: Company[],
  key: "parentId" | "targetParentId",
): boolean {
  const parents = new Map(companies.map((c) => [c.id, c[key]]));
  return companies.some((c) => {
    const seen = new Set<string>();
    let id = c.id;
    while (parents.has(id)) {
      if (seen.has(id)) return true;
      seen.add(id);
      id = parents.get(id)!;
    }
    return false;
  });
}
export function validatePortfolio(raw: unknown): Portfolio {
  if (!raw || typeof raw !== "object") throw new Error("Format JSON invalide.");
  const data = raw as Portfolio;
  if (
    data.version !== 1 ||
    typeof data.holdingName !== "string" ||
    !Array.isArray(data.companies) ||
    !Array.isArray(data.tasks)
  )
    throw new Error("Ce fichier n’est pas une sauvegarde PIO × Finance v1.");
  if (data.companies.length > 500 || data.tasks.length > 5000)
    throw new Error(
      "Sauvegarde trop volumineuse (500 entreprises, 5 000 tâches maximum).",
    );
  const ids = new Set<string>();
  for (const c of data.companies) {
    if (
      !c ||
      typeof c !== "object" ||
      typeof c.id !== "string" ||
      !c.id ||
      c.id === "holding" ||
      c.id.startsWith("owner:") ||
      ids.has(c.id)
    )
      throw new Error("Identifiants d’entreprises invalides ou dupliqués.");
    ids.add(c.id);
    const template = blankCompany();
    for (const k of Object.keys(template) as (keyof Company)[]) {
      if (typeof template[k] === "string" && typeof c[k] !== "string")
        throw new Error("Champ entreprise invalide : " + k);
    }
    if (
      !c.name.trim() ||
      !Object.hasOwn(statuses, c.status) ||
      (c.status !== "unknown" && (!c.justification.trim() || !c.updated))
    )
      throw new Error("Nom ou justification du statut manquant.");
    for (const key of [
      "percent",
      "targetPercent",
      "personalPercent",
      "progress",
    ] as const)
      if (
        c[key] !== "" &&
        (!Number.isFinite(Number(c[key])) ||
          Number(c[key]) < 0 ||
          Number(c[key]) > 100)
      )
        throw new Error("Pourcentage invalide.");
    for (const key of [
      "invested",
      "revenue",
      "expenses",
      "profit",
      "cash",
      "dividends",
      "equity",
      "budget",
    ] as const)
      if (c[key] !== "" && !Number.isFinite(Number(c[key])))
        throw new Error("Montant invalide.");
    for (const key of ["assets", "debts", "milestones"] as const)
      if (
        !Array.isArray(c[key]) ||
        c[key].some(
          (i) =>
            !i ||
            ["id", "label", "amount", "kind"].some(
              (k) => typeof i[k as keyof Item] !== "string",
            ),
        )
      )
        throw new Error("Liste entreprise invalide.");
    if (
      !c.rules ||
      ["milestones", "lateTasks", "freshness", "indicators"].some(
        (k) => typeof c.rules[k as keyof Company["rules"]] !== "boolean",
      ) ||
      ["freshnessDays", "revenueGoal", "profitGoal"].some(
        (k) => typeof c.rules[k as keyof Company["rules"]] !== "string",
      )
    )
      throw new Error("Règles invalides.");
  }
  for (const c of data.companies) {
    if (c.parentId && !ids.has(c.parentId))
      throw new Error("Détenteur actuel introuvable.");
    if (
      c.targetParentId &&
      c.targetParentId !== "holding" &&
      !ids.has(c.targetParentId)
    )
      throw new Error("Détenteur cible introuvable.");
  }
  if (
    cycle(data.companies, "parentId") ||
    cycle(data.companies, "targetParentId")
  )
    throw new Error(
      "Lien circulaire interdit : une entreprise ne peut pas détenir sa société mère.",
    );
  if (
    data.relationships !== undefined &&
    (!Array.isArray(data.relationships) ||
      data.relationships.some(
        (r) =>
          !r ||
          r.kind !== "operational" ||
          !ids.has(r.from) ||
          !ids.has(r.to) ||
          r.from === r.to,
      ))
  )
    throw new Error("Lien métier invalide.");
  const tasks = new Set<string>();
  for (const t of data.tasks) {
    if (
      !t ||
      ["id", "title", "companyId", "priority", "assignee", "due"].some(
        (k) => typeof t[k as keyof Task] !== "string",
      ) ||
      typeof t.done !== "boolean" ||
      !t.title.trim() ||
      !t.id ||
      tasks.has(t.id) ||
      !ids.has(t.companyId)
    )
      throw new Error("Tâche invalide ou entreprise liée absente.");
    tasks.add(t.id);
  }
  return data;
}
export function participation(c: Company): { value?: number; reason?: string } {
  if (!c.currency.trim()) return { reason: "Devise à renseigner." };
  if (c.equity === "" || c.personalPercent === "")
    return {
      reason:
        "Valeur des capitaux propres et pourcentage personnel effectif requis.",
    };
  if (!c.valuationDate || !c.method.trim())
    return { reason: "Date et méthode de valorisation requises." };
  return { value: (Number(c.equity) * Number(c.personalPercent)) / 100 };
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function layout(data: Portfolio, target: boolean) {
  const key = target ? "targetParentId" : "parentId";
  const nodes = data.companies.map((c) => ({
    id: c.id,
    name: c.name,
    parent: c[key],
    company: c,
  }));
  const external = new Map<string, string>();
  if (!target)
    for (const c of data.companies)
      if (!c.parentId && c.owner.trim())
        external.set("owner:" + c.owner.trim(), c.owner.trim());
  const all: { id: string; name: string; parent: string; company?: Company }[] =
    [
      ...nodes.map((n) => ({
        ...n,
        parent:
          n.parent ||
          (!target && n.company.owner.trim()
            ? "owner:" + n.company.owner.trim()
            : ""),
      })),
      ...Array.from(external, ([id, name]) => ({ id, name, parent: "" })),
    ];
  if (target)
    all.unshift({
      id: "holding",
      name: data.holdingName || "FABI Holding",
      parent: "",
    });
  const positions = new Map<string, { x: number; y: number }>();
  let next = 0;
  function place(id: string, depth: number): number {
    const children = all.filter((n) => n.parent === id);
    const xs = children.map((n) => place(n.id, depth + 1));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : 140 + next++ * 250;
    positions.set(id, { x, y: 130 + depth * 270 });
    return x;
  }
  for (const root of all.filter((n) => !n.parent))
    place(root.id, target && root.id !== "holding" ? 1 : 0);
  return {
    nodes: all.map((n) => ({ ...n, ...positions.get(n.id)! })),
    width: Math.max(800, next * 250 + 30),
    height: Math.max(600, ...Array.from(positions.values(), (p) => p.y + 160)),
  };
}
