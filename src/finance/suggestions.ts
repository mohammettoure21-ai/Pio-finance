import type { Portfolio, Task } from "./model.ts";

export type TaskSuggestion = {
  task: Omit<Task, "id" | "done">;
  reason: string;
  source: string;
};
const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const normalized = (text: string) =>
  clean(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const excerpt = (text: string, max = 110) => clean(text).slice(0, max);
// Explainable local suggestions, not outputs of a connected language model.
export function suggestTasks(
  data: Portfolio,
  companyId: string,
  day: string,
): TaskSuggestion[] {
  const c = data.companies.find((c) => c.id === companyId);
  if (!c) return [];
  const result: TaskSuggestion[] = [];
  const existing = new Set(
    data.tasks
      .filter((t) => t.companyId === c.id)
      .map((t) => normalized(t.title)),
  );
  const add = (
    title: string,
    reason: string,
    source: string,
    due = "",
    priority = "Normale",
  ) => {
    if (existing.has(normalized(title))) return;
    result.push({
      task: { title, companyId: c.id, assignee: "", due, priority },
      reason,
      source,
    });
    existing.add(normalized(title));
  };
  const own = data.tasks.filter((t) => t.companyId === c.id && !t.done);
  const late = own.filter((t) => t.due && t.due < day);
  if (late.length)
    add(
      `Replanifier les échéances dépassées de ${c.name}`,
      `${late.length} tâche(s) en retard. Revoir les tâches existantes avant de lancer de nouveaux projets.`,
      "Échéances",
      "",
      "Haute",
    );
  if (own.length >= 6)
    add(
      `Répartir la charge de travail de ${c.name}`,
      `${own.length} tâches ouvertes : choisir les priorités et déléguer ce qui peut l’être.`,
      "Charge de travail",
    );
  if (c.goals.trim())
    add(
      `Avancer sur l’objectif : ${excerpt(c.goals.split(/\n/).find((s) => s.trim()) ?? c.goals)}`,
      `Objectif renseigné dans la fiche : ${excerpt(c.goals, 200)}`,
      "Objectifs de la société",
    );
  const milestone = c.milestones.find(
    (m) => m.kind !== "Terminé" && m.label.trim(),
  );
  if (milestone)
    add(
      `Préparer le jalon : ${excerpt(milestone.label)}`,
      `Jalon enregistré pour ${c.name}.`,
      "Jalons",
      /^\d{4}-\d{2}-\d{2}$/.test(milestone.amount) ? milestone.amount : "",
    );
  const vision = data.vision?.trim();
  if (vision) {
    const finance = /rentab|tresor|marge|chiffre|financ/.test(
      normalized(vision),
    );
    add(
      finance
        ? `Préparer le suivi financier de ${c.name}`
        : `Définir la contribution de ${c.name} à la vision du groupe`,
      `Vision du groupe : ${excerpt(vision, 200)}${c.activity.trim() ? ` · Activité : ${excerpt(c.activity)}` : ""}`,
      "Vision du groupe",
    );
  }
  const key = normalized(c.name);
  const parent =
    data.companies.find((p) => p.id === c.targetParentId)?.name ??
    data.holdingName;
  const templates = key.includes("conciergerie")
    ? [
        "Vérifier les prestations et demandes clients en cours",
        "Planifier les interventions de la semaine",
        `Préparer le point conciergerie pour ${parent}`,
      ]
    : key.includes("immobilier")
      ? [
          "Faire le point sur les projets et biens à suivre",
          "Mettre à jour les échéances des dossiers immobiliers",
          `Préparer le point immobilier pour ${parent}`,
        ]
      : key.includes("afrodemy")
        ? [
            "Définir le prochain contenu de formation",
            "Faire le point sur les retours des apprenants",
            "Préparer le planning pédagogique de la semaine",
          ]
        : key === "mbtg"
          ? [
              "Prioriser les développements et demandes techniques",
              "Vérifier la stabilité des outils et automatisations",
              "Préparer le suivi des projets technologiques",
            ]
          : c.activity.trim()
            ? [
                `Préparer le plan d’action : ${excerpt(c.activity)}`,
                `Préparer le point d’activité pour ${parent}`,
              ]
            : [`Préciser les missions et services de ${c.name}`];
  for (const title of templates)
    add(
      title,
      c.activity.trim()
        ? `À adapter à l’activité renseignée : ${excerpt(c.activity, 200)}`
        : `Piste liée au nom de ${c.name}. Complétez la fiche pour préciser son travail réel.`,
      c.activity.trim() ? "Activité et métier" : "Métier à confirmer",
    );
  return result.slice(0, 6);
}
