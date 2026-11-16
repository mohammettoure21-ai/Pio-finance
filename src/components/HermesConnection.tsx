import { useState } from "react";
import type { Portfolio } from "../finance/model";
import { checkConnectionService } from "../finance/connection";
import SecureConnection from "./SecureConnection";
import "./secure.css";

export default function HermesConnection({ data, onReplace }: { data: Portfolio; onReplace: (p: Portfolio) => void }) {
  const [state, setState] = useState<"idle" | "checking" | "ready" | "unavailable">("idle");
  async function check() {
    setState("checking");
    try { await checkConnectionService(); setState("ready"); }
    catch { setState("unavailable"); }
  }
  return <section className="hermes-setup" aria-label="Connexion guidée à Hermès">
    <p>Connectez votre portefeuille à votre espace sécurisé, puis choisissez ce que vous partagez avec Holding.</p>
    <ol>
      <li><strong>Vérifier le service</strong><p>Nous vérifions uniquement sa disponibilité. Vos sociétés, notes et finances ne sont pas envoyées.</p></li>
      <li><strong>Vous identifier</strong><p>Utilisez votre accès personnel. Aucun mot de passe ni clé ne doit être collé dans une conversation.</p></li>
      <li><strong>Vérifier et autoriser le partage</strong><p>Une sauvegarde et votre accord précèdent tout remplacement. Les missions proposées restent à confirmer.</p></li>
    </ol>
    {state !== "ready" && <button className="primary" disabled={state === "checking"} onClick={() => void check()}>{state === "checking" ? "Vérification…" : state === "unavailable" ? "Réessayer la vérification" : "Vérifier le service"}</button>}
    <div role="status" aria-live="polite">
      {state === "unavailable" && <p>Le service sécurisé PIO n’est pas joignable depuis ce site. Son installation doit être terminée sur le serveur Hermès. Aucune connexion au portefeuille n’est établie et vos données restent sur cet appareil.</p>}
      {state === "ready" && <p>Le service répond. Vous pouvez maintenant vous identifier. Cela ne prouve pas encore que les agents Hermès ont accès au portefeuille.</p>}
    </div>
    {state === "ready" && <SecureConnection data={data} onReplace={onReplace} />}
  </section>;
}
