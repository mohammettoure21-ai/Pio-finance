import { initialPortfolio, migratePortfolio, STORAGE_KEY, validatePortfolio } from "./model.ts";
import type { Portfolio } from "./model.ts";
import { applyAzqarProfile } from "./azqar.ts";
import { ensureWeeklyReport } from "./world.ts";

export const AZQAR_BACKUP_KEY = `${STORAGE_KEY}-before-azqar`;
export function loadPortfolio(storage: Pick<Storage, "getItem" | "setItem">): { data: Portfolio | null; error: string; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { data: ensureWeeklyReport(applyAzqarProfile(initialPortfolio())), error: "", raw };
    const original = validatePortfolio(JSON.parse(raw));
    const next = applyAzqarProfile(migratePortfolio(original));
    if (original.azqarRevision !== 1 && storage.getItem(AZQAR_BACKUP_KEY) === null) {
      storage.setItem(AZQAR_BACKUP_KEY, raw);
      if (storage.getItem(AZQAR_BACKUP_KEY) !== raw) throw new Error("Backup verification failed");
    }
    return { data: ensureWeeklyReport(next), error: "", raw };
  } catch {
    return { data: null, raw, error: "La sauvegarde est illisible, inaccessible ou sa copie de sécurité n’a pas pu être créée. Aucune donnée n’a été remplacée. Rétablissez l’accès à la sauvegarde avant de continuer." };
  }
}
