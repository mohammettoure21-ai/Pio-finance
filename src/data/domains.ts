export type Domain = {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  metric: string;
  progress: number;
  color: string;
  action: string;
  block: string;
  tasks: string[];
};
export const domains: Domain[] = [
  {
    id: "sport",
    name: "Sport",
    eyebrow: "CORPS & ÉNERGIE",
    title: "Construire la constance.",
    metric: "2 / 3 séances cette semaine",
    progress: 67,
    color: "#8fbaa7",
    action: "Préparer la séance haut du corps",
    block: "Une dernière séance pour atteindre votre objectif hebdomadaire.",
    tasks: [
      "Préparer la séance haut du corps",
      "Faire la séance",
      "Noter mon ressenti",
    ],
  },
  {
    id: "finances",
    name: "Finances",
    eyebrow: "LIBERTÉ & SÉCURITÉ",
    title: "Chaque euro a un cap.",
    metric: "3 450 € / 5 000 € épargnés",
    progress: 69,
    color: "#ceba82",
    action: "Vérifier les paiements à recevoir",
    block: "Un paiement de 180 € reste à vérifier dans les données d’exemple.",
    tasks: [
      "Vérifier les paiements à recevoir",
      "Revoir les dépenses de la semaine",
      "Planifier le prochain virement",
    ],
  },
  {
    id: "business",
    name: "Business",
    eyebrow: "CRÉATION & IMPACT",
    title: "Faire avancer FABI.",
    metric: "1 / 3 actions du jour",
    progress: 33,
    color: "#9eabe1",
    action: "Publier le contenu FABI",
    block: "Le contenu du jour attend sa publication.",
    tasks: [
      "Publier le contenu FABI",
      "Vérifier les paiements",
      "Préparer le contenu de demain",
    ],
  },
  {
    id: "etudes",
    name: "Études",
    eyebrow: "SAVOIR & MAÎTRISE",
    title: "Investir dans votre futur.",
    metric: "45 / 90 min · CFA",
    progress: 50,
    color: "#82bbcc",
    action: "Étudier 45 minutes de finance",
    block: "Il reste 45 minutes pour atteindre le temps prévu.",
    tasks: [
      "Relire les notes CFA",
      "Étudier 45 minutes de finance",
      "Résoudre 5 questions",
    ],
  },
  {
    id: "religion",
    name: "Religion",
    eyebrow: "SENS & ÉQUILIBRE",
    title: "Un moment pour l’essentiel.",
    metric: "Routine personnelle · 3 / 5",
    progress: 60,
    color: "#b0a3cf",
    action: "Prendre un moment de lecture",
    block: "Votre suivi est personnel ; aucun score spirituel n’est attribué.",
    tasks: [
      "Prendre un moment de lecture",
      "Temps de recueillement",
      "Noter une intention",
    ],
  },
  {
    id: "lecture",
    name: "Lecture",
    eyebrow: "CURIOSITÉ & RECUL",
    title: "Une page après l’autre.",
    metric: "Atomic Habits · page 124 / 320",
    progress: 39,
    color: "#c59c83",
    action: "Lire 15 pages",
    block: "Gardez un créneau de 20 minutes pour votre lecture.",
    tasks: [
      "Lire 15 pages",
      "Noter une idée à appliquer",
      "Choisir le prochain créneau",
    ],
  },
  {
    id: "focus",
    name: "Focus",
    eyebrow: "ATTENTION & CLARTÉ",
    title: "Votre attention est précieuse.",
    metric: "Une session à la fois",
    progress: 0,
    color: "#75b6c6",
    action: "Démarrer une session de 25 minutes",
    block: "Coupez les notifications avant de commencer.",
    tasks: [],
  },
];
