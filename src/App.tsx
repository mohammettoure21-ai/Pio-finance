import SecureConnection from "./components/SecureConnection";
import HermesSuggestions from "./components/HermesSuggestions";
import World from "./components/World";
import { ensureWeeklyReport, recordChanges, robotState } from "./finance/world";
import FinanceRobot from "./components/FinanceRobot";
import { Fragment, useEffect, useRef, useState } from "react";
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
  blankFinancialRecord,
  financialRecords,
  initialPortfolio,
  migratePortfolio,
  attention,
  layout,
  participation,
  statuses,
  STORAGE_KEY,
  today,
  uid,
  validatePortfolio,
} from "./finance/model";
import type {
  Company,
  FinancialRecord,
  Item,
  Portfolio,
  Task,
} from "./finance/model";

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
  const [recordId, setRecordId] = useState(
    financialRecords(company)[0]?.id ?? "",
  );
  const records = financialRecords(c);
  const record = records.find((r) => r.id === recordId) ?? records[0];
  const updateRecord = (key: keyof FinancialRecord, value: string) =>
    setC((v) => ({
      ...v,
      financialRecords: financialRecords(v).map((r) =>
        r.id === record?.id ? { ...r, [key]: value, updatedAt: today() } : r,
      ),
    }));
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
              <div className={"notice " + attention(data, c.id).status}>
                <strong>{attention(data, c.id).label}</strong>
                <p>{attention(data, c.id).reason}</p>
                <p>
                  Le chiffre d’affaires ne déclenche aucune alerte. La couleur
                  dépend des tâches liées à cette entreprise.
                </p>
              </div>
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
              <h3>Historique financier de l’entreprise</h3>
              <p className="hint">
                Les chiffres évoluent. Conservez une période pour chaque
                exercice, trimestre ou mois ; ajouter une période ne remplace
                pas les précédentes.
              </p>
              <div className="period-toolbar">
                <Field label="Période à consulter">
                  <select
                    value={record?.id ?? ""}
                    onChange={(e) => setRecordId(e.target.value)}
                  >
                    {!records.length && (
                      <option value="">Aucune période</option>
                    )}
                    {records.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        {r.period || `Période ${i + 1} — à renseigner`}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const r = blankFinancialRecord(c.currency);
                    change("financialRecords", [...records, r]);
                    setRecordId(r.id);
                  }}
                >
                  <Plus size={15} /> Ajouter une période
                </button>
              </div>
              {record && (
                <>
                  <div className="form-grid">
                    <Field label="Exercice / nom de la période">
                      <input
                        value={record.period}
                        placeholder="Exercice 2025, T1 2026, octobre 2026…"
                        onChange={(e) => updateRecord("period", e.target.value)}
                      />
                    </Field>
                    <Field label="Devise de cette période">
                      <input
                        value={record.currency}
                        placeholder="EUR, XOF…"
                        onChange={(e) =>
                          updateRecord("currency", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Début de période">
                      <input
                        type="date"
                        value={record.startDate}
                        onChange={(e) =>
                          updateRecord("startDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Fin de période">
                      <input
                        type="date"
                        value={record.endDate}
                        onChange={(e) =>
                          updateRecord("endDate", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <div className="financial-fields">
                    {(
                      [
                        [
                          "revenue",
                          "Chiffre d’affaires",
                          "Ventes et prestations réalisées par la société sur cette période. Ce montant n’est pas votre revenu personnel.",
                        ],
                        [
                          "expenses",
                          "Charges",
                          "Dépenses et charges comptables de la période, selon le même périmètre que le chiffre d’affaires.",
                        ],
                        [
                          "profit",
                          "Résultat",
                          "Bénéfice ou perte de la période. À renseigner d’après vos comptes ; aucun résultat n’est déduit automatiquement.",
                        ],
                        [
                          "cash",
                          "Trésorerie",
                          "Solde de trésorerie à la fin de la période. Ce stock ne s’additionne pas à ceux des exercices précédents.",
                        ],
                        [
                          "dividends",
                          "Dividendes personnellement reçus",
                          "Sommes effectivement reçues par vous pendant cette période, distinctes du chiffre d’affaires de l’entreprise.",
                        ],
                      ] as const
                    ).map(([key, label, description]) => (
                      <div className="metric-field" key={key}>
                        <Field label={label}>
                          <input
                            type="number"
                            step="any"
                            value={record[key]}
                            placeholder="À renseigner"
                            onChange={(e) => updateRecord(key, e.target.value)}
                          />
                        </Field>
                        <p className="hint">{description}</p>
                      </div>
                    ))}
                  </div>
                  <p className="hint">
                    Dernière mise à jour : {record.updatedAt || "à renseigner"}.
                    Montants en {record.currency || "devise à renseigner"}.
                    Enregistrez la fiche pour conserver vos modifications.
                  </p>
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Supprimer cette période financière ? Les autres périodes seront conservées.",
                        )
                      ) {
                        const next = records.filter((r) => r.id !== record.id);
                        change("financialRecords", next);
                        setRecordId(next[0]?.id ?? "");
                      }
                    }}
                  >
                    <Trash2 size={14} /> Supprimer cette période
                  </button>
                </>
              )}
              <p className="notice">
                Les périodes restent indépendantes. Aucun total ne mélange
                plusieurs devises, exercices ou sociétés mères et filiales.
              </p>
            </>
          )}
          {tab === "Valorisation" && (
            <>
              <h3>Estimer la valeur de votre participation</h3>
              <p className="hint">
                La valeur des capitaux propres représente la valeur estimée
                revenant aux associés. Elle est différente du chiffre d’affaires
                et de la valeur brute des actifs.
              </p>
              <Field label="Devise de la valorisation">
                <input
                  value={c.currency}
                  placeholder="EUR, XOF…"
                  onChange={(e) => change("currency", e.target.value)}
                />
              </Field>
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
              <p className="hint">
                Méthode / source : précisez par exemple une évaluation
                indépendante, une transaction comparable, un multiple de
                résultat ou un actif net réévalué. Indiquez vos hypothèses et la
                source dans les notes.
              </p>
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
                Les tâches ci-dessous sont liées à cette entreprise. Ajoutez une
                action, son urgence, son responsable et son échéance.
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
                <Plus size={16} /> Ajouter une tâche
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
          <Field label="Urgence">
            <select
              value={t.priority}
              onChange={(e) => setT({ ...t, priority: e.target.value })}
            >
              <option value="Normale">Normale</option>
              <option value="Haute">Haute — urgente</option>
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
        data: ensureWeeklyReport(
          raw
            ? migratePortfolio(validatePortfolio(JSON.parse(raw)))
            : initialPortfolio(),
        ),
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
  const [target, setTarget] = useState(true);
  const [page, setPage] = useState("world");
  const [worldEpoch, setWorldEpoch] = useState(0);
  const [taskCompany, setTaskCompany] = useState("");
  const [taskState, setTaskState] = useState("open");
  const [selected, setSelected] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [pio, setPio] = useState(false);
  const [noteCompany, setNoteCompany] = useState(
    loaded.data.companies[0]?.id ?? "",
  );
  const [noteText, setNoteText] = useState("");
  const [notePreview, setNotePreview] = useState(false);
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
  useEffect(() => {
    if (loaded.error) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded.data));
    } catch {
      setStorageError(
        "Sauvegarde locale indisponible. Exportez vos données avant de quitter.",
      );
    }
  }, [loaded]);
  const current = data.companies.find((c) => c.id === selected);
  const late = data.tasks.filter((t) => !t.done && t.due && t.due < today());
  const pending = data.tasks.filter((t) => !t.done);
  function commit(next: Portfolio, track = true) {
    next = track ? recordChanges(data, next) : ensureWeeklyReport(next);
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
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = ensureWeeklyReport(data);
      if (next !== data && !loaded.error) commit(next);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [data, loaded.error]);
  function center() {
    const w = view.current?.clientWidth || 1000;
    const z = Math.max(
      w < 600 ? 0.7 : 0.4,
      Math.min(
        1,
        (w - 60) / graph.width,
        ((view.current?.clientHeight || 470) - 40) / graph.height,
      ),
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
      const next = migratePortfolio(
        validatePortfolio(JSON.parse(await f.text())),
      );
      if (
        confirm(
          `Remplacer vos données locales par ${next.companies.length} entreprises et ${next.tasks.length} tâches ? Exportez d’abord votre sauvegarde si nécessaire.`,
        )
      ) {
        commit(next, false);
        setWorldEpoch((epoch) => epoch + 1);
        setSelected(null);
        setMessage("Sauvegarde importée.");
      }
    } catch (err) {
      setMessage("Import refusé : " + (err as Error).message);
    }
    if (file.current) file.current.value = "";
  }
  const tasks = data.tasks
    .filter(
      (t) =>
        (!taskCompany || t.companyId === taskCompany) &&
        (taskState === "all" || (taskState === "done" ? t.done : !t.done)),
    )
    .sort(
      (a, b) =>
        (
          data.companies.find((c) => c.id === a.companyId)?.name ?? ""
        ).localeCompare(
          data.companies.find((c) => c.id === b.companyId)?.name ?? "",
        ) ||
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
          onClick={() => setPage("world")}
        >
          p
          <span>
            <ArrowUpRight size={19} />
          </span>
        </a>
        <div className="rail-nav">
          <button
            className={page === "world" ? "active" : ""}
            aria-label="Mon monde"
            onClick={() => setPage("world")}
          >
            <Building2 size={21} />
          </button>
          <button
            className={page === "map" ? "active" : ""}
            aria-label="Carte des participations"
            onClick={() => setPage("map")}
          >
            <GitBranch size={21} />
          </button>
          <button
            className={page === "tasks" ? "active" : ""}
            aria-label="Tâches des entreprises"
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
          <a className="wordmark" href="#" onClick={() => setPage("world")}>
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
          <SecureConnection data={data} onReplace={(next) => {
            validatePortfolio(next);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            setData(next);
            setStorageError("");
          }} />
          <div className="page-heading">
            <div>
              <span className="eyebrow">L’AMBITION PREND FORME</span>
              <h1>
                {page === "world"
                  ? "Bienvenue dans votre monde."
                  : page === "map"
                    ? "Une vision d’ensemble."
                    : "Tâches des entreprises"}
              </h1>
              <p>
                {page === "world"
                  ? "Vos sociétés vivent au rythme de vos actions."
                  : page === "map"
                    ? "Vos entreprises, leurs liens, votre prochaine étape."
                    : "Les actions à faire, entreprise par entreprise."}
              </p>
            </div>
            <button
              className="primary"
              onClick={
                page !== "tasks" ? addCompany : () => createTask(taskCompany)
              }
              disabled={page === "tasks" && !data.companies.length}
            >
              <Plus size={17} />
              {page !== "tasks" ? "Ajouter une entreprise" : "Nouvelle tâche"}
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
          {page === "world" ? (
            <World
              key={worldEpoch}
              data={data}
              onUpdate={commit}
              onEdit={setSelected}
              onTask={createTask}
              onTasks={(id) => {
                setTaskCompany(id);
                setTaskState("open");
                setPage("tasks");
              }}
              onHermes={() => setPio(true)}
            />
          ) : page === "map" ? (
            <>
              <div className="overview">
                <div>
                  <span>Pôles</span>
                  <strong>
                    {
                      data.companies.filter(
                        (c) => c.targetParentId === "holding",
                      ).length
                    }
                  </strong>
                  <small>{data.companies.length} entreprises</small>
                </div>
                <div>
                  <span>Tâches à faire</span>
                  <strong>{pending.length}</strong>
                </div>
                <div>
                  <span>Urgentes</span>
                  <strong>
                    {pending.filter((t) => t.priority === "Haute").length}
                  </strong>
                </div>
                <div>
                  <span>En retard</span>
                  <strong>{late.length}</strong>
                </div>
                <div>
                  <span>Valeur consolidée</span>
                  <strong className="unavailable">Calcul indisponible</strong>
                  <small>Évite le double comptage mère / filiales</small>
                </div>
              </div>
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
                              className="ownership-link"
                              strokeDasharray="5 6"
                              d={`M${p.x},${p.y + 88} V${(p.y + n.y) / 2} H${n.x} V${n.y - 88}`}
                              fill="none"
                              stroke="#777"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                      {(data.relationships ?? []).map((r, i) => {
                        const a = graph.nodes.find((n) => n.id === r.from),
                          b = graph.nodes.find((n) => n.id === r.to);
                        if (!a || !b) return null;
                        const distance = Math.hypot(b.x - a.x, b.y - a.y);
                        if (distance <= 190) return null;
                        const dx = ((b.x - a.x) / distance) * 94,
                          dy = ((b.y - a.y) / distance) * 94;
                        return (
                          <g key={i} className="business-link">
                            <path
                              d={`M${a.x + dx},${a.y + dy} L${b.x - dx},${b.y - dy}`}
                              fill="none"
                              stroke="#999"
                              strokeWidth="1.3"
                              strokeDasharray="5 6"
                            />
                            <text
                              x={(a.x + b.x) / 2}
                              y={(a.y + b.y) / 2 + 18}
                              textAnchor="middle"
                              fill="#aaa"
                              fontSize="9"
                            >
                              Lien métier
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    {graph.nodes.map((n) => (
                      <button
                        key={n.id}
                        className={`entity ${n.company ? attention(data, n.id).status : "root"} ${n.id === "holding" ? "holding" : ""}`}
                        title={
                          n.company ? attention(data, n.id).reason : undefined
                        }
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
                          {n.id === "holding" || n.company ? (
                            <FinanceRobot
                              name={
                                n.id === "holding" ? "FABI Holding" : n.name
                              }
                            />
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
                            ? attention(data, n.id).label
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
                  Alertes : 1 tâche urgente = orange · 2 urgentes ou 3 en retard
                  = rouge
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
                  Voir les tâches <ChevronRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <section className="tasks-card">
              <div className="section-title">
                <h2>
                  Liste des tâches{" "}
                  <span className="count">{tasks.length} affichée(s)</span>
                </h2>
                <span className="late-count">{late.length} en retard</span>
              </div>
              <p className="hint">
                Cochez une tâche quand elle est terminée. Cliquez sur son titre
                pour modifier les détails.
              </p>
              <div className="task-filters">
                <Field label="Entreprise à afficher">
                  <select
                    value={taskCompany}
                    onChange={(e) => setTaskCompany(e.target.value)}
                  >
                    <option value="">Toutes les entreprises</option>
                    {data.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="État des tâches">
                  <select
                    value={taskState}
                    onChange={(e) => setTaskState(e.target.value)}
                  >
                    <option value="open">À faire</option>
                    <option value="done">Terminées</option>
                    <option value="all">Toutes</option>
                  </select>
                </Field>
              </div>
              <details className="task-rules">
                <summary>Comprendre les alertes de la carte</summary>
                <p>
                  Une tâche urgente ou en retard : orange. Deux tâches urgentes
                  ou trois en retard : rouge. Une tâche terminée ne contribue
                  plus à l’alerte.
                </p>
              </details>
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <ListTodo size={34} />
                  <h3>Aucune tâche dans cette sélection.</h3>
                  <p>Ajoutez une tâche ou choisissez un autre filtre.</p>
                </div>
              ) : (
                tasks.map((t, index) => (
                  <Fragment key={t.id}>
                    {(index === 0 ||
                      tasks[index - 1].companyId !== t.companyId) && (
                      <h3 className="task-company-heading">
                        <Building2 size={16} />
                        {data.companies.find((c) => c.id === t.companyId)?.name}
                        <button
                          className="text-button"
                          onClick={() => createTask(t.companyId)}
                          aria-label={
                            "Ajouter une tâche pour " +
                            data.companies.find((c) => c.id === t.companyId)
                              ?.name
                          }
                        >
                          <Plus size={14} /> Ajouter
                        </button>
                      </h3>
                    )}
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
                          {
                            data.companies.find((c) => c.id === t.companyId)
                              ?.name
                          }{" "}
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
                  </Fragment>
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
              PIO × Finance <b>V2.0</b>
            </span>
          </footer>
        </main>
      </div>
      <button className="pio-launch" onClick={() => setPio(true)}>
        <Sparkles size={18} /> Hermès <span />
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
                relationships: data.relationships?.filter(
                  (r) => r.from !== current.id && r.to !== current.id,
                ),
              });
              if (taskCompany === current.id) setTaskCompany("");
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
            setTaskCompany(t.companyId);
            setTaskState(t.done ? "done" : "open");
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
        <Modal title="Hermès — tâches et notes" close={() => setPio(false)}>
          <div className="pio-identity">
            <Sparkles size={28} />
            <span>
              Hermès <small>VOTRE ASSISTANT</small>
            </span>
            <b>IA non connectée</b>
          </div>
          <div className="hermes-facts">
            <h3>Le poste de pilotage de votre monde</h3>
            <p>
              Synthèse locale des données enregistrées. Hermès ne contacte aucun
              service externe.
            </p>
            <p>
              <strong>
                {pending.length} tâches ouvertes · {late.length} en retard
              </strong>
            </p>
            {data.companies.map((c) => {
              const state = robotState(data, c.id);
              return (
                <p key={c.id}>
                  <strong>{c.name}</strong> — {state.label} : {state.reason}.
                </p>
              );
            })}
            {late.length > 0 ? (
              <p>
                Priorité : reprendre les échéances dépassées, puis répartir la
                charge des robots débordés.
              </p>
            ) : (
              <p>
                Aucun retard renseigné. Choisissez la prochaine mission pour
                chaque société.
              </p>
            )}
            <p>
              {data.world?.reports.length
                ? `${data.world.reports.length} bilan(s) hebdomadaire(s) disponible(s) dans Mon monde → Bilans de Holding.`
                : "Le premier bilan sera préparé après la fin de la semaine de suivi."}
            </p>
            <button
              className="secondary"
              onClick={() => {
                setPio(false);
                setPage("world");
              }}
            >
              Rejoindre le campus
            </button>
          </div>
          <HermesSuggestions
            data={data}
            onUpdate={commit}
            onPrepare={(s) => {
              setPio(false);
              setTask({ ...s.task, id: uid(), done: false });
            }}
            onEdit={(id) => {
              setPio(false);
              setSelected(id);
            }}
          />
          <div className="notice">
            <strong>Avant toute modification</strong>
            <p>
              Les propositions d’Hermès devront être récapitulées puis
              confirmées par vous. Aucune action ne sera appliquée
              silencieusement.
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
          <button
            className="secondary"
            onClick={() => {
              setPio(false);
              createTask();
            }}
          >
            Nouvelle tâche avec Hermès
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNotePreview(true);
            }}
          >
            <h3>Ajouter une note</h3>
            <p className="hint">
              Saisie directe dans Hermès, sans IA. La note est enregistrée dans
              la fiche de l’entreprise après confirmation.
            </p>
            <Field label="Entreprise de la note">
              <select
                required
                value={noteCompany}
                onChange={(e) => {
                  setNoteCompany(e.target.value);
                  setNotePreview(false);
                }}
              >
                <option value="">Choisir une entreprise</option>
                {data.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note pour Hermès">
              <textarea
                required
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setNotePreview(false);
                }}
                placeholder="Décision, idée ou information à conserver…"
              />
            </Field>
            {!notePreview ? (
              <button
                className="primary"
                disabled={
                  !noteText.trim() ||
                  !data.companies.some((c) => c.id === noteCompany)
                }
              >
                Vérifier la note
              </button>
            ) : (
              <div className="notice">
                <strong>
                  Ajouter à{" "}
                  {data.companies.find((c) => c.id === noteCompany)?.name}
                </strong>
                <p style={{ whiteSpace: "pre-wrap" }}>{noteText}</p>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    commit({
                      ...data,
                      companies: data.companies.map((c) =>
                        c.id === noteCompany
                          ? {
                              ...c,
                              notes: [c.notes, noteText.trim()]
                                .filter(Boolean)
                                .join("\n\n"),
                            }
                          : c,
                      ),
                    });
                    setNoteText("");
                    setNotePreview(false);
                    setMessage("Note ajoutée par Hermès.");
                  }}
                >
                  Confirmer l’ajout
                </button>
              </div>
            )}
          </form>
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
            navigateur. Aucun envoi automatique : la connexion et chaque partage
            exigent une action explicite dans « Connexion sécurisée ». Le site public
            ne contient que quatre noms d’entreprises et des champs vides.
          </p>
          <p>
            Ce stockage n’est pas chiffré ; les synchronisations sont uniquement
            volontaires. Sur un appareil
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
