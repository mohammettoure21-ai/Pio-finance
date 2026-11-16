import { blankCompany, validatePortfolio } from "./model.ts";
import type { Portfolio } from "./model.ts";

export const azqarVision = "Construire un groupe d’investissement africain de référence par la détention d’actifs productifs, la discipline financière et une vision à long terme. Développer les entreprises, diversifier les participations, préserver la liquidité et maîtriser l’endettement.";
export const azqarCompanies = [
  { name: "FABI IMMO", aliases: ["fabi immobilier", "fabi immo"], activity: "Société familiale dédiée au développement, à la valorisation et à la gestion du patrimoine immobilier." },
  { name: "FABI CONCIERGERIE", aliases: ["fabi conciergerie"], activity: "Entreprise spécialisée dans les services de conciergerie et l’hospitalité." },
  { name: "AFROGROUP SAS", aliases: ["afrodemy", "afrodémy", "afrogroup", "afrogroup sas"], activity: "Entreprise développant notamment Afrodemy, une application d’éducation financière, et des partenariats institutionnels et stratégiques." },
  { name: "MBTG", aliases: ["mbtg"], activity: "Modern Business Tech Group — entreprise à gouvernance partagée entre deux associés." },
  { name: "PROCOLORE", aliases: ["procolor", "procolore"], activity: "Industrie de la peinture — fabrication et commercialisation. Entreprise familiale." },
];

// Preserve IDs, financial histories and current ownership; update the planned structure only.
export function applyAzqarProfile(data: Portfolio): Portfolio {
  if (data.azqarRevision === 1) return data;
  const companies = data.companies.map((c) => ({ ...c }));
  for (const profile of azqarCompanies) {
    const company = companies.find((c) => c.name.trim().toUpperCase() === profile.name) ?? companies.find((c) => (profile.aliases as readonly string[]).includes(c.name.trim().toLowerCase()));
    if (company) {
      company.name = profile.name;
      if (!company.activity.trim() || company.activity === "Modern Business Tech Group") company.activity = profile.activity;
    } else {
      companies.push({ ...blankCompany(profile.name), activity: profile.activity, targetParentId: "holding" });
    }
  }
  return validatePortfolio({ ...data, azqarRevision: 1,
    holdingName: ["fabi holding", "ma future holding", ""].includes(data.holdingName.trim().toLowerCase()) ? "AZQAR Holdings" : data.holdingName,
    vision: data.vision?.trim() ? data.vision : azqarVision,
    companies,
  });
}
