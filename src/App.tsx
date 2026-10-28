import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  GitBranch,
  Layers3,
  ListTodo,
  Maximize2,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  blankCompany,
  initialPortfolio,
  layout,
  participation,
  statuses,
  STORAGE_KEY,
  today,
  uid,
  validatePortfolio,
} from "./finance/model";
import type { Company, Item, Portfolio, Task } from "./finance/model";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => old?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "sheet" : ""}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="panel-title"
    >
      <div className="panel-head">
        <div>
          <span className="eyebrow">PIO × FINANCE / ESPACE PERSONNEL</span>
          <h2 id="panel-title">{title}</h2>
        </div>
        <button className="icon" aria-label="Fermer" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function MoneyList({
  title,
  items,
  update,
  milestone = false,
}: {
  title: string;
  items: Item[];
  update: (v: Item[]) => void;
  milestone?: boolean;
}) {
  return (
    <section>
      <div className="section-title">
        <h3>{title}</h3>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            update([
              ...items,
              {
                id: uid(),
                label: "",
                amount: "",
                kind: milestone ? "À faire" : "À renseigner",
              },
            ])
          }
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>
      {items.length === 0 && <p className="hint">Aucun élément renseigné.</p>}
      {items.map((item, i) => (
        <div className="item-row" key={item.id}>
          <Field label={milestone ? "Étape" : "Libellé"}>
            <input
              value={item.label}
              placeholder="À renseigner"
              onChange={(e) =>
                update(
                  items.map((a, j) =>
                    j === i ? { ...a, label: e.target.value } : a,
                  ),
                )
              }
            />
          </Field>
          <Field label={milestone ? "Échéance" : "Montant"}>
            <input
              type={milestone ? "date" : "number"}
              step="any"
              value={item.amount}
              onChange={(e) =>
                update(
                  items.map((a, j) =>
                    j === i ? { ...a, amount: e.target.value } : a,
                  ),
                )
              }
            />
          </Field>
          <Field label={milestone ? "Avancement" : "Nature"}>
            <select
              value={item.kind}
              onChange={(e) =>
                update(
                  items.map((a, j) =>
                    j === i ? { ...a, kind: e.target.value } : a,
                  ),
                )
              }
            >
              {(milestone
                ? ["À faire", "En cours", "Terminé"]
                : [
                    "À renseigner",
                    "Détenu par la société",
                    "Géré pour un client",
                    "Dette de la société",
                  ]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className="icon danger"
            aria-label={"Supprimer " + (item.label || "cet élément")}
            onClick={() => {
              if (confirm("Supprimer cet élément ?"))
                update(items.filter((_, j) => j !== i));
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}
const sections = [
  "Identité",
  "Participation",
  "Finances",
  "Valorisation",
  "Actifs & dettes",
  "Expansion",
  "Tâches",
  "Notes",
];
function CompanyEditor({
  company,
  data,
  save,
  remove,
  close,
  newTask,
}: {
  company: Company;
  data: Portfolio;
  save: (c: Company) => void;
  remove: () => void;
  close: () => void;
  newTask: () => void;
}) {
  const [c, setC] = useState(company);
  const [tab, setTab] = useState("Identité");
  const [error, setError] = useState("");
  const change = (key: keyof Company, value: unknown) =>
    setC((v) => ({ ...v, [key]: value }));
  function input(key: keyof Company, label: string, type = "text") {
    return (
      <Field label={label}>
        <input
          type={type}
          step={type === "number" ? "any" : undefined}
          min={
            [
              "percent",
              "personalPercent",
              "targetPercent",
              "progress",
            ].includes(key)
              ? 0
              : undefined
          }
          max={
            [
              "percent",
              "personalPercent",
              "targetPercent",
              "progress",
            ].includes(key)
              ? 100
              : undefined
          }
          value={String(c[key])}
          onChange={(e) => change(key, e.target.value)}
          placeholder="À renseigner"
          required={key === "name"}
        />
      </Field>
    );
  }
  const result = participation(c);
  return (
    <Modal title={company.name} close={close} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            save(c);
            setError("");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div
          className="editor-tabs"
          role="tablist"
          aria-label="Sections entreprise"
        >
          {sections.map((t) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => setTab(t)}
              className={t === tab ? "selected" : ""}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="editor-body">
          {tab === "Identité" && (
            <>
              <p className="hint">
                Une fiche à votre image. Renseignez uniquement les informations
                connues.
              </p>
              <div className="form-grid">
                {input("name", "Nom de l’entreprise")}
                {input("activity", "Activité")}
                {input("country", "Pays")}
                {input("currency", "Devise (ex. EUR, XOF)")}
                {input("legalStatus", "Statut juridique / projet")}
              </div>
              <h3>Suivi de l’entreprise</h3>
              <Field label="Statut manuel">
                <select
                  value={c.status}
                  onChange={(e) => {
                    change("status", e.target.value);
                    change("updated", today());
                  }}
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Justification du statut">
                <textarea
                  value={c.justification}
                  placeholder="Pourquoi ce statut ?"
                  onChange={(e) => {
                    change("justification", e.target.value);
                    change("updated", today());
                  }}
                />
              </Field>
              {input("updated", "Dernière mise à jour", "date")}
              <div className="notice">
                Le statut reste manuel. Une baisse ponctuelle du chiffre
                d’affaires ne change pas sa couleur.
              </div>
              <details>
                <summary>Préparer mes règles de suivi</summary>
                <p className="hint">
                  Préférences enregistrées pour une future automatisation. Elles
                  ne modifient pas encore le statut.
                </p>
                {(
                  [
                    "milestones",
                    "lateTasks",
                    "freshness",
                    "indicators",
                  ] as const
                ).map((key, i) => (
                  <label className="check-line" key={key}>
                    <input
                      type="checkbox"
                      checked={c.rules[key]}
                      onChange={(e) =>
                        change("rules", { ...c.rules, [key]: e.target.checked })
                      }
                    />
                    {
                      [
                        "Respect des jalons",
                        "Tâches en retard",
                        "Actualité des données financières",
                        "Évolution par rapport aux objectifs",
                      ][i]
                    }
                  </label>
                ))}
                <Field label="Ancienneté maximale des données (jours)">
                  <input
                    type="number"
                    min="1"
                    value={c.rules.freshnessDays}
                    onChange={(e) =>
                      change("rules", {
                        ...c.rules,
                        freshnessDays: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Objectif de chiffre d’affaires">
                  <input
                    type="number"
                    value={c.rules.revenueGoal}
                    onChange={(e) =>
                      change("rules", {
                        ...c.rules,
                        revenueGoal: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Objectif de résultat">
                  <input
                    type="number"
                    value={c.rules.profitGoal}
                    onChange={(e) =>
                      change("rules", {
                        ...c.rules,
                        profitGoal: e.target.value,
                      })
                    }
                  />
                </Field>
              </details>
            </>
          )}
          {tab === "Participation" && (
            <>
              <h3>01 / Détention actuelle</h3>
              <Field label="Entreprise détentrice actuelle">
                <select
                  value={c.parentId}
                  onChange={(e) => change("parentId", e.target.value)}
                >
                  <option value="">
                    Personne / autre détenteur / à renseigner
                  </option>
                  {data.companies
                    .filter((a) => a.id !== c.id)
                    .map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              {!c.parentId && input("owner", "Nom du détenteur actuel")}
              <div className="form-grid">
                {input("percent", "Participation du détenteur (%)", "number")}
                {input("invested", "Montant investi", "number")}
                <Field label="Mode de détention">
                  <select
                    value={c.ownership}
                    onChange={(e) => change("ownership", e.target.value)}
                  >
                    <option value="">À renseigner</option>
                    <option>Directe</option>
                    <option>Indirecte</option>
                  </select>
                </Field>
              </div>
              <h3>02 / Structure cible — holding en préparation</h3>
              <p className="hint">
                Un lien cible exprime une intention. Aucun transfert juridique
                n’est présumé.
              </p>
              <Field label="Détenteur envisagé">
                <select
                  value={c.targetParentId}
                  onChange={(e) => change("targetParentId", e.target.value)}
                >
                  <option value="">Aucun lien envisagé renseigné</option>
                  <option value="holding">
                    {data.holdingName} (en préparation)
                  </option>
                  {data.companies
                    .filter((a) => a.id !== c.id)
                    .map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              {input("targetPercent", "Participation envisagée (%)", "number")}
              <Field label="Transfert envisagé / conditions">
                <textarea
                  value={c.transfer}
                  placeholder="À renseigner"
                  onChange={(e) => change("transfer", e.target.value)}
                />
              </Field>
            </>
          )}
          {tab === "Finances" && (
            <>
              <p className="notice">
                Les chiffres concernent la société. Le chiffre d’affaires n’est
                pas votre revenu personnel. Les montants sont dans la devise
                renseignée : {c.currency || "à renseigner"}.
              </p>
              {input("period", "Période concernée (ex. exercice 2026)")}
              <div className="form-grid">
                {input("revenue", "Chiffre d’affaires", "number")}
                {input("expenses", "Charges", "number")}
                {input("profit", "Résultat", "number")}
                {input("cash", "Trésorerie", "number")}
                {input(
                  "dividends",
                  "Dividendes personnellement reçus",
                  "number",
                )}
              </div>
              <p className="hint">
                Aucune consolidation automatique : les flux entre sociétés et
                les périodes ne sont pas réconciliés.
              </p>
            </>
          )}
          {tab === "Valorisation" && (
            <>
              <div className="form-grid">
                {input(
                  "equity",
                  "Valeur estimée des capitaux propres",
                  "number",
                )}
                {input("valuationDate", "Date de valorisation", "date")}
                {input("method", "Méthode / source")}
                {input(
                  "personalPercent",
                  "Ma participation personnelle effective (%)",
                  "number",
                )}
              </div>
              <div className="valuation">
                <span>Valeur indicative de ma participation</span>
                <strong>
                  {result.value === undefined
                    ? "Calcul indisponible"
                    : new Intl.NumberFormat("fr-FR", {
                        maximumFractionDigits: 2,
                      }).format(result.value) +
                      " " +
                      c.currency}
                </strong>
                <p>
                  {result.reason ||
                    "Capitaux propres × participation personnelle effective. Estimation indicative, sans garantie de liquidité."}
                </p>
              </div>
              <p className="hint">
                Le pourcentage personnel effectif est renseigné séparément de
                celui de la société détentrice. Aucun total mère + filiales
                n’est calculé, afin d’éviter le double comptage.
              </p>
            </>
          )}
          {tab === "Actifs & dettes" && (
            <>
              <p className="notice">
                Un bien géré pour un client n’est pas un actif que vous
                possédez. Indiquez sa nature explicitement.
              </p>
              <MoneyList
                title="Actifs & biens gérés"
                items={c.assets}
                update={(v) => change("assets", v)}
              />
              <MoneyList
                title="Dettes"
                items={c.debts}
                update={(v) => change("debts", v)}
              />
            </>
          )}
          {tab === "Expansion" && (
            <>
              <Field label="Objectifs">
                <textarea
                  value={c.goals}
                  onChange={(e) => change("goals", e.target.value)}
                  placeholder="À renseigner"
                />
              </Field>
              <div className="form-grid">
                {input("budget", "Budget prévu", "number")}
                {input("deadline", "Échéance globale", "date")}
                {input("progress", "Avancement (%)", "number")}
              </div>
              <MoneyList
                title="Étapes & jalons"
                milestone
                items={c.milestones}
                update={(v) => change("milestones", v)}
              />
            </>
          )}
          {tab === "Tâches" && (
            <>
              <p className="hint">
                Les tâches sont gérées dans l’échéancier. Enregistrez la fiche
                avant de le quitter.
              </p>
              {data.tasks
                .filter((t) => t.companyId === c.id)
                .map((t) => (
                  <div className="simple-task" key={t.id}>
                    <span>
                      {t.done ? "✓" : "○"} {t.title}
                    </span>
                    <small>{t.due || "Sans échéance"}</small>
                  </div>
                ))}
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  try {
                    save(c);
                    newTask();
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              >
                <Plus size={16} /> Gérer les tâches
              </button>
            </>
          )}
          {tab === "Notes" && (
            <Field label="Notes privées">
              <textarea
                className="large-text"
                value={c.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder="Décisions, observations, prochaines actions…"
              />
            </Field>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="panel-footer">
          <button
            type="button"
            className="icon danger"
            aria-label="Supprimer l’entreprise"
            onClick={remove}
          >
            <Trash2 size={18} />
          </button>
          <button type="button" className="secondary" onClick={close}>
            Annuler
          </button>
          <button className="primary" type="submit">
            <Check size={16} /> Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TaskEditor({
  task,
  companies,
  save,
  close,
}: {
  task: Task;
  companies: Company[];
  save: (t: Task) => void;
  close: () => void;
}) {
  const [t, setT] = useState(task);
  return (
    <Modal
      title={task.title ? "Modifier la tâche" : "Nouvelle tâche"}
      close={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(t);
        }}
      >
        <Field label="Titre">
          <input
            required
            autoFocus
            value={t.title}
            onChange={(e) => setT({ ...t, title: e.target.value })}
          />
        </Field>
        <Field label="Entreprise liée">
          <select
            required
            value={t.companyId}
            onChange={(e) => setT({ ...t, companyId: e.target.value })}
          >
            <option value="">Choisir une entreprise</option>
            {companies.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Priorité">
            <select
              value={t.priority}
              onChange={(e) => setT({ ...t, priority: e.target.value })}
            >
              <option>Normale</option>
              <option>Haute</option>
              <option>Basse</option>
            </select>
          </Field>
          <Field label="Responsable">
            <input
              value={t.assignee}
              placeholder="À renseigner"
              onChange={(e) => setT({ ...t, assignee: e.target.value })}
            />
          </Field>
          <Field label="Échéance">
            <input
              type="date"
              value={t.due}
              onChange={(e) => setT({ ...t, due: e.target.value })}
            />
          </Field>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={t.done}
            onChange={(e) => setT({ ...t, done: e.target.checked })}
          />
          Tâche terminée
        </label>
        <button className="primary">Enregistrer la tâche</button>
      </form>
    </Modal>
  );
}
export default function App() {
  const [loaded] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return {
        data: raw ? validatePortfolio(JSON.parse(raw)) : initialPortfolio(),
        error: "",
      };
    } catch {
      return {
        data: initialPortfolio(),
        error:
          "La sauvegarde est illisible ou inaccessible. Elle n’a pas été remplacée. Exportez les données affichées avant toute modification.",
      };
    }
  });
  const [data, setData] = useState<Portfolio>(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [target, setTarget] = useState(false);
  const [page, setPage] = useState("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [pio, setPio] = useState(false);
  const [help, setHelp] = useState(false);
  const [holding, setHolding] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const view = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const graph = layout(data, target);
  const current = data.companies.find((c) => c.id === selected);
  const late = data.tasks.filter((t) => !t.done && t.due && t.due < today());
  const pending = data.tasks.filter((t) => !t.done);
  function commit(next: Portfolio) {
    validatePortfolio(next);
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Sauvegarde locale indisponible. Exportez vos données avant de quitter cette page.",
      );
    }
  }
  function center() {
    const w = view.current?.clientWidth || 1000;
    const z = Math.max(
      w < 600 ? 0.7 : 0.4,
      Math.min(1, (w - 60) / graph.width),
    );
    setZoom(z);
    setPan({ x: (w - graph.width * z) / 2, y: 25 });
  }
  useEffect(() => {
    center();
  }, [target, data.companies.length, page]);
  function addCompany() {
    const c = blankCompany();
    commit({ ...data, companies: [...data.companies, c] });
    setSelected(c.id);
  }
  function createTask(companyId = "") {
    setTask({
      id: uid(),
      title: "",
      companyId,
      priority: "Normale",
      assignee: "",
      due: "",
      done: false,
    });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pio-finance-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData(f?: File) {
    if (!f) return;
    try {
      if (f.size > 5_000_000)
        throw new Error("Fichier trop volumineux (5 Mo maximum).");
      const next = validatePortfolio(JSON.parse(await f.text()));
      if (
        confirm(
          `Remplacer vos données locales par ${next.companies.length} entreprises et ${next.tasks.length} tâches ? Exportez d’abord votre sauvegarde si nécessaire.`,
        )
      ) {
        commit(next);
        setSelected(null);
        setMessage("Sauvegarde importée.");
      }
    } catch (err) {
      setMessage("Import refusé : " + (err as Error).message);
    }
    if (file.current) file.current.value = "";
  }
  const tasks = [...data.tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      (a.due || "9999").localeCompare(b.due || "9999"),
  );
  const milestones = data.companies.flatMap((c) =>
    c.milestones
      .filter((m) => m.amount && m.kind !== "Terminé")
      .map((m) => ({ ...m, company: c.name })),
  );
  return (
    <div className="app">
      <aside className="rail">
        <a
          href="#"
          className="brand"
          aria-label="PIO Finance accueil"
          onClick={() => setPage("map")}
        >
          p
          <span>
            <ArrowUpRight size={19} />
          </span>
        </a>
        <div className="rail-nav">
          <button
            className={page === "map" ? "active" : ""}
            aria-label="Carte des participations"
            onClick={() => setPage("map")}
          >
            <GitBranch size={21} />
          </button>
          <button
            className={page === "tasks" ? "active" : ""}
            aria-label="Échéances et tâches"
            onClick={() => setPage("tasks")}
          >
            <ListTodo size={21} />
            {late.length > 0 && <i />}
          </button>
        </div>
        <button
          className="rail-help"
          aria-label="Aide et confidentialité"
          onClick={() => setHelp(true)}
        >
          <CircleHelp size={20} />
        </button>
        <span className="avatar">MO</span>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a className="wordmark" href="#" onClick={() => setPage("map")}>
            PIO <span>×</span> Finance
            <small>VOTRE VISION. VOTRE PATRIMOINE.</small>
          </a>
          <div className="top-actions">
            <span className="private">
              <ShieldCheck size={14} /> Espace privé · local
            </span>
            <button
              className="icon"
              aria-label="Exporter la sauvegarde JSON"
              onClick={exportData}
            >
              <ArrowDownToLine size={18} />
            </button>
            <button
              className="icon"
              aria-label="Importer une sauvegarde JSON"
              onClick={() => file.current?.click()}
            >
              <ArrowUpFromLine size={18} />
            </button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => void importData(e.target.files?.[0])}
            />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">L’AMBITION PREND FORME</span>
              <h1>
                {page === "map"
                  ? "Une vision d’ensemble."
                  : "Chaque action compte."}
              </h1>
              <p>
                {page === "map"
                  ? "Vos entreprises, leurs liens, votre prochaine étape."
                  : "Vos priorités et vos échéances, au même endroit."}
              </p>
            </div>
            <button
              className="primary"
              onClick={page === "map" ? addCompany : () => createTask()}
              disabled={page === "tasks" && !data.companies.length}
            >
              <Plus size={17} />
              {page === "map" ? "Ajouter une entreprise" : "Nouvelle tâche"}
            </button>
          </div>
          {storageError && (
            <p className="error" role="alert">
              {storageError}
            </p>
          )}
          {message && (
            <div className="notice" role="status">
              {message}
              <button
                className="icon"
                aria-label="Fermer le message"
                onClick={() => setMessage("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {page === "map" ? (
            <>
              <div className="map-toolbar">
                <div className="view-tabs" aria-label="Vue du portefeuille">
                  <button
                    aria-pressed={!target}
                    className={!target ? "selected" : ""}
                    onClick={() => setTarget(false)}
                  >
                    <Layers3 size={15} /> Portefeuille actuel
                  </button>
                  <button
                    aria-pressed={target}
                    className={target ? "selected" : ""}
                    onClick={() => setTarget(true)}
                  >
                    <GitBranch size={15} /> Structure cible
                  </button>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Rechercher une entreprise"
                    placeholder="Rechercher une entreprise…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              {search && (
                <div className="search-results">
                  {data.companies
                    .filter((c) =>
                      c.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelected(c.id);
                          setSearch("");
                        }}
                      >
                        {c.name}
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  {!data.companies.some((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()),
                  ) && <p>Aucune entreprise trouvée.</p>}
                </div>
              )}
              <section className="map-card">
                <div className="map-caption">
                  <div>
                    <span className="live-dot" />
                    {target
                      ? "Structure cible — holding en préparation"
                      : "Portefeuille actuel"}
                    <small>
                      {target
                        ? "INTENTIONS DE DÉTENTION · AUCUN TRANSFERT PRÉSUMÉ"
                        : "LIENS DE DÉTENTION RENSEIGNÉS UNIQUEMENT"}
                    </small>
                  </div>
                  <span className="map-count">
                    {data.companies.length} entités <span> / </span>{" "}
                    {target ? "Projection" : "Vue actuelle"}
                  </span>
                </div>
                <div
                  ref={view}
                  className="map-viewport"
                  aria-label="Carte navigable des participations"
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    drag.current = {
                      x: e.clientX,
                      y: e.clientY,
                      px: pan.x,
                      py: pan.y,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (drag.current)
                      setPan({
                        x: drag.current.px + e.clientX - drag.current.x,
                        y: drag.current.py + e.clientY - drag.current.y,
                      });
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onWheel={(e) => {
                    if (e.ctrlKey) {
                      setZoom((z) =>
                        Math.max(
                          0.25,
                          Math.min(2, z + (e.deltaY > 0 ? -0.05 : 0.05)),
                        ),
                      );
                    }
                  }}
                >
                  <div
                    className="graph"
                    style={{
                      width: graph.width,
                      height: graph.height,
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                  >
                    <svg
                      width={graph.width}
                      height={graph.height}
                      aria-hidden="true"
                    >
                      {graph.nodes
                        .filter((n) => n.parent)
                        .map((n) => {
                          const p = graph.nodes.find((a) => a.id === n.parent)!;
                          return (
                            <path
                              key={n.id}
                              d={`M${p.x},${p.y + 88} V${(p.y + n.y) / 2} H${n.x} V${n.y - 88}`}
                              fill="none"
                              stroke="#34534d"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                    </svg>
                    {graph.nodes.map((n) => (
                      <button
                        key={n.id}
                        className={`entity ${n.company?.status || "root"} ${n.id === "holding" ? "holding" : ""}`}
                        style={{ left: n.x - 88, top: n.y - 88 }}
                        onClick={() =>
                          n.company
                            ? setSelected(n.id)
                            : n.id === "holding"
                              ? setHolding(true)
                              : setMessage(
                                  "Détenteur actuel : " +
                                    n.name +
                                    ". Modifiez son nom depuis la participation de l’entreprise liée.",
                                )
                        }
                      >
                        <span className="entity-icon">
                          {n.id === "holding" ? (
                            <Layers3 size={22} />
                          ) : n.company ? (
                            <Building2 size={20} />
                          ) : (
                            <ShieldCheck size={21} />
                          )}
                        </span>
                        <strong>{n.name}</strong>
                        <span className="entity-percent">
                          {n.company
                            ? target
                              ? n.company.targetPercent
                                ? `${n.company.targetPercent} % envisagés`
                                : "Participation à renseigner"
                              : n.company.percent
                                ? `${n.company.percent} %`
                                : "Participation à renseigner"
                            : n.id === "holding"
                              ? "Non constituée juridiquement"
                              : "Détenteur renseigné"}
                        </span>
                        <span className="entity-status">
                          <i />
                          {n.company
                            ? statuses[n.company.status]
                            : n.id === "holding"
                              ? "En préparation"
                              : "Détention actuelle"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!data.companies.length && (
                    <div className="empty-map">
                      <Building2 />
                      <h3>Votre portefeuille commence ici.</h3>
                      <p>Ajoutez une entreprise pour construire votre carte.</p>
                      <button className="primary" onClick={addCompany}>
                        Ajouter une entreprise
                      </button>
                    </div>
                  )}
                </div>
                <div className="map-bottom">
                  <span>
                    <span className="mouse-symbol">↔</span> Glissez pour
                    explorer{" "}
                    <span className="desktop-only">
                      · Cliquez sur une entité pour ouvrir sa fiche
                    </span>
                  </span>
                  <div className="zoom-controls">
                    <button
                      aria-label="Dézoomer"
                      onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
                    >
                      <Minus size={15} />
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      aria-label="Zoomer"
                      onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                    >
                      <Plus size={15} />
                    </button>
                    <button aria-label="Recentrer la carte" onClick={center}>
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="under-map">
                <div className="legend">
                  {Object.entries(statuses).map(([k, v]) => (
                    <span key={k} className={k}>
                      <i />
                      {v}
                    </span>
                  ))}
                </div>
                <span className="subtle">
                  Suivi manuel · aucune donnée financière inventée
                </span>
              </div>
              <div className="next-step">
                <div className="next-icon">
                  <ListTodo size={21} />
                </div>
                <div>
                  <span className="eyebrow">VOTRE PROCHAINE ÉTAPE</span>
                  <p>
                    {late.length
                      ? `${late.length} tâche(s) en retard à examiner.`
                      : pending.length
                        ? `${pending.length} tâche(s) à faire. Gardez le cap.`
                        : "Complétez vos participations pour dessiner votre structure."}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("tasks")}
                >
                  Voir l’échéancier <ChevronRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <section className="tasks-card">
              <div className="section-title">
                <h2>
                  Échéancier{" "}
                  <span className="count">{pending.length} à faire</span>
                </h2>
                <span className="late-count">{late.length} en retard</span>
              </div>
              <p className="hint">
                Les dates sont vérifiées à l’ouverture de la page. Aucun rappel
                externe n’est envoyé.
              </p>
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <ListTodo size={34} />
                  <h3>De la vision à l’action.</h3>
                  <p>Créez votre première tâche liée à une entreprise.</p>
                </div>
              ) : (
                tasks.map((t) => (
                  <article
                    className={`task-row ${t.done ? "completed" : ""}`}
                    key={t.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={"Terminer " + t.title}
                      checked={t.done}
                      onChange={() =>
                        commit({
                          ...data,
                          tasks: data.tasks.map((v) =>
                            v.id === t.id ? { ...v, done: !v.done } : v,
                          ),
                        })
                      }
                    />
                    <button className="task-title" onClick={() => setTask(t)}>
                      <strong>{t.title}</strong>
                      <span>
                        {data.companies.find((c) => c.id === t.companyId)?.name}{" "}
                        · {t.assignee || "Responsable à renseigner"}
                      </span>
                    </button>
                    <span className="priority">{t.priority}</span>
                    <span
                      className={
                        !t.done && t.due && t.due < today() ? "overdue" : ""
                      }
                    >
                      {t.due
                        ? new Date(t.due + "T12:00:00").toLocaleDateString(
                            "fr-FR",
                          )
                        : "Sans échéance"}
                      {!t.done && t.due && t.due < today() && (
                        <small>En retard</small>
                      )}
                    </span>
                    <button
                      className="icon danger"
                      aria-label={"Supprimer la tâche " + t.title}
                      onClick={() => {
                        if (confirm("Supprimer cette tâche ?"))
                          commit({
                            ...data,
                            tasks: data.tasks.filter((v) => v.id !== t.id),
                          });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))
              )}
              <h3 className="milestone-title">Jalons d’expansion</h3>
              {!milestones.length ? (
                <p className="hint">
                  Aucun jalon daté en attente. Ajoutez-les dans la section
                  Expansion d’une entreprise.
                </p>
              ) : (
                milestones
                  .sort((a, b) => a.amount.localeCompare(b.amount))
                  .map((m) => (
                    <div className="simple-task" key={m.id}>
                      <span>
                        {m.label || "Étape à renseigner"}
                        <small>
                          {m.company} · {m.kind}
                        </small>
                      </span>
                      <span className={m.amount < today() ? "overdue" : ""}>
                        {m.amount}
                        {m.amount < today() ? " · En retard" : ""}
                      </span>
                    </div>
                  ))
              )}
            </section>
          )}
          <footer>
            <span>
              <ShieldCheck size={13} />
              {storageError
                ? "Sauvegarde à vérifier"
                : "Sauvegardé sur cet appareil"}
            </span>
            <span>Données locales · Exportez régulièrement une sauvegarde</span>
            <span>
              PIO × Finance <b>V1.0</b>
            </span>
          </footer>
        </main>
      </div>
      <button className="pio-launch" onClick={() => setPio(true)}>
        <Sparkles size={18} /> PIO <span />
      </button>
      {current && (
        <CompanyEditor
          key={current.id}
          company={current}
          data={data}
          close={() => setSelected(null)}
          save={(c) => {
            commit({
              ...data,
              companies: data.companies.map((v) => (v.id === c.id ? c : v)),
            });
            setSelected(null);
            setMessage("Fiche enregistrée.");
          }}
          remove={() => {
            if (
              confirm(
                `Supprimer « ${current.name} » et ses tâches ? Les liens de ses filiales seront retirés, les filiales seront conservées.`,
              )
            ) {
              commit({
                ...data,
                companies: data.companies
                  .filter((v) => v.id !== current.id)
                  .map((v) => ({
                    ...v,
                    parentId: v.parentId === current.id ? "" : v.parentId,
                    targetParentId:
                      v.targetParentId === current.id ? "" : v.targetParentId,
                  })),
                tasks: data.tasks.filter((t) => t.companyId !== current.id),
              });
              setSelected(null);
            }
          }}
          newTask={() => {
            setSelected(null);
            setPage("tasks");
            createTask(current.id);
          }}
        />
      )}
      {task && (
        <TaskEditor
          task={task}
          companies={data.companies}
          close={() => setTask(null)}
          save={(t) => {
            commit({
              ...data,
              tasks: data.tasks.some((v) => v.id === t.id)
                ? data.tasks.map((v) => (v.id === t.id ? t : v))
                : [...data.tasks, t],
            });
            setTask(null);
          }}
        />
      )}
      {holding && (
        <Modal title="Votre future holding" close={() => setHolding(false)}>
          <p className="notice">
            Structure cible uniquement. La holding n’existe pas encore
            juridiquement.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              commit({ ...data, holdingName: String(f.get("name")).trim() });
              setHolding(false);
            }}
          >
            <Field label="Nom envisagé">
              <input name="name" required defaultValue={data.holdingName} />
            </Field>
            <button className="primary">Enregistrer</button>
          </form>
        </Modal>
      )}
      {pio && (
        <Modal
          title="Un peu de recul. Une direction claire."
          close={() => setPio(false)}
        >
          <div className="pio-identity">
            <Sparkles size={28} />
            <span>
              PIO <small>VOTRE FUTUR COPILOTE</small>
            </span>
            <b>IA non connectée</b>
          </div>
          <p>
            Votre espace de conversation est prêt pour une future connexion à
            une IA. Aucune réponse artificielle n’est simulée.
          </p>
          <div className="notice">
            <strong>Avant toute modification</strong>
            <p>
              Les propositions de PIO devront être récapitulées puis confirmées
              par vous. Aucune action ne sera appliquée silencieusement.
            </p>
          </div>
          <div className="integration-row">
            <span>Rappels automatiques</span>
            <small>Non connectés</small>
          </div>
          <div className="integration-row">
            <span>WhatsApp</span>
            <small>Non connecté</small>
          </div>
          <button
            className="secondary"
            onClick={() => {
              setPio(false);
              setPage("tasks");
            }}
          >
            Consulter mes priorités <ArrowUpRight size={16} />
          </button>
          <Field label="Conversation">
            <textarea
              disabled
              placeholder="Connectez une IA pour démarrer la conversation."
            />
          </Field>
          <button className="primary" disabled>
            Envoyer — IA non connectée
          </button>
        </Modal>
      )}
      {help && (
        <Modal
          title="Vos données restent chez vous."
          close={() => setHelp(false)}
        >
          <p>
            Ce prototype conserve vos données dans le stockage local de ce
            navigateur. Elles ne sont envoyées à aucun serveur. Le site public
            ne contient que trois noms d’entreprises et des champs vides.
          </p>
          <p>
            Ce stockage n’est ni chiffré ni synchronisé. Sur un appareil
            partagé, les autres utilisateurs du navigateur peuvent y accéder.
            Utilisez un profil personnel et conservez vos exports JSON dans un
            endroit sûr.
          </p>
          <h3>Deux cartes, deux réalités</h3>
          <p>
            Le portefeuille actuel représente uniquement les détenteurs
            renseignés. La structure cible montre vos intentions pour une
            holding en préparation. Les cercles non reliés n’ont pas de
            détenteur renseigné dans cette vue.
          </p>
          <h3>Des calculs prudents</h3>
          <p>
            La valorisation indicative exige une devise, une date, une méthode
            et votre pourcentage personnel effectif. Aucun total consolidé
            n’additionne sociétés mères et filiales. Les revenus des sociétés ne
            sont jamais présentés comme vos revenus personnels.
          </p>
          <button className="secondary" onClick={exportData}>
            <ArrowDownToLine size={16} /> Exporter mes données
          </button>
        </Modal>
      )}
    </div>
  );
}
