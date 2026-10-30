import { useState } from "react";
import type { Portfolio } from "../finance/model";
import { today } from "../finance/model";
import { suggestTasks } from "../finance/suggestions";
import type { TaskSuggestion } from "../finance/suggestions";

type Props = {
  data: Portfolio;
  onUpdate: (data: Portfolio) => void;
  onPrepare: (suggestion: TaskSuggestion) => void;
  onEdit: (id: string) => void;
};
export default function HermesSuggestions({
  data,
  onUpdate,
  onPrepare,
  onEdit,
}: Props) {
  const [id, setId] = useState(data.companies[0]?.id ?? "");
  const [vision, setVision] = useState(data.vision ?? "");
  const [message, setMessage] = useState("");
  const company = data.companies.find((c) => c.id === id) ?? data.companies[0];
  const suggestions = company ? suggestTasks(data, company.id, today()) : [];
  return (
    <section
      className="hermes-suggestions"
      aria-label="Suggestions de missions par Hermès"
    >
      <span className="world-kicker">HERMÈS / VISION & MISSIONS</span>
      <h3>La bonne mission, pour la bonne société.</h3>
      <p className="hint">
        Suggestions locales fondées sur les fiches et les tâches existantes. Les
        pistes métier restent à adapter ; aucune tâche n’est créée sans votre
        validation.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpdate({ ...data, vision: vision.trim() });
          setMessage(
            "Vision du groupe enregistrée. Les suggestions ont été actualisées.",
          );
        }}
      >
        <label className="field">
          Vision du groupe
          <textarea
            aria-label="Vision du groupe"
            value={vision}
            maxLength={10000}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Où voulez-vous emmener le groupe ? Objectifs, ambitions, priorités…"
          />
        </label>
        <button className="secondary" type="submit">
          Enregistrer la vision
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <label className="field">
        Société à accompagner
        <select
          aria-label="Société à accompagner"
          value={company?.id ?? ""}
          onChange={(e) => setId(e.target.value)}
        >
          {!data.companies.length && <option value="">Aucune société</option>}
          {data.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {company && (
        <>
          <div className="hermes-context">
            <strong>Ce qu’Hermès prend en compte</strong>
            <p>
              <b>Activité :</b> {company.activity || "À préciser dans la fiche"}
            </p>
            <p>
              <b>Objectifs :</b> {company.goals || "À renseigner"}
            </p>
            <p>
              <b>Vision :</b> {data.vision || "À renseigner ci-dessus"}
            </p>
            <p>
              {
                data.tasks.filter((t) => t.companyId === company.id && !t.done)
                  .length
              }{" "}
              missions ouvertes · Les titres déjà enregistrés pour cette société
              sont exclus des propositions.
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => onEdit(company.id)}
            >
              Préciser les missions de {company.name}
            </button>
          </div>
          <div className="hermes-proposals">
            {suggestions.map((s, i) => (
              <article key={s.task.title}>
                <small>{s.source}</small>
                <h4>{s.task.title}</h4>
                <p>{s.reason}</p>
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Examiner la suggestion ${i + 1} pour ${company.name}`}
                  onClick={() => onPrepare(s)}
                >
                  Examiner cette tâche →
                </button>
              </article>
            ))}
          </div>
          {!suggestions.length && (
            <p>
              Toutes les pistes actuelles sont déjà enregistrées. Précisez les
              objectifs ou les jalons dans la fiche pour obtenir d’autres
              propositions.
            </p>
          )}
        </>
      )}
    </section>
  );
}
