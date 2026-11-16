import { ArrowUpRight, Building2, ChartNoAxesCombined, Handshake, Landmark } from "lucide-react";
import type { Company, Portfolio } from "../finance/model";

type Props = { data: Portfolio; onEdit: (id: string) => void; onMap: () => void };

export default function GroupPresentation({ data, onEdit, onMap }: Props) {
  const find = (name: string) => data.companies.find((c) => c.name.toUpperCase() === name);
  function companyCard(name: string, caption: string, nested = false) {
    const company = find(name);
    if (!company) return null;
    const share = company.personalPercent;
    return (
      <button className={`group-company ${nested ? "group-company-nested" : ""}`} onClick={() => onEdit(company.id)} key={company.id}>
        <span className="group-company-top"><strong>{company.name}</strong><ArrowUpRight size={16} /></span>
        <span>{caption}</span>
        {share && <small>Participation personnelle renseignée : {share} %</small>}
      </button>
    );
  }
  const named = new Set(["FABI IMMO", "FABI CONCIERGERIE", "PROCOLORE", "MBTG", "AFROGROUP SAS"]);
  const other = data.companies.filter((c) => !named.has(c.name.toUpperCase()));
  return (
    <div className="group-presentation">
      <section className="group-intro" aria-label="Projet AZQAR">
        <div>
          <span className="group-kicker">PRÉSENTATION INSTITUTIONNELLE · PROJET DE STRUCTURATION</span>
          <h2>Investir avec conviction.<br /><span>Construire pour durer.</span></h2>
          <p>Acquérir, détenir, accompagner et développer des entreprises à fort potentiel. Allier expertise opérationnelle, gestion stratégique et allocation rigoureuse du capital.</p>
          <button className="primary" onClick={onMap}>Explorer la structure cible <ArrowUpRight size={17} /></button>
        </div>
        <dl className="group-facts">
          <div><dt>Siège envisagé</dt><dd>Dakar, Sénégal</dd></div>
          <div><dt>Zone d’investissement cible</dt><dd>Sénégal et Afrique</dd></div>
          <div><dt>Modèle</dt><dd>Holding hybride</dd></div>
          <div><dt>Horizon</dt><dd>Création de valeur à long terme</dd></div>
        </dl>
      </section>

      <section aria-labelledby="ecosystem-heading">
        <div className="group-section-heading"><span className="group-kicker">UN ÉCOSYSTÈME, TROIS AXES</span><h2 id="ecosystem-heading">La structure envisagée</h2><p>Une organisation cible. Les transferts et apports juridiques restent à formaliser.</p></div>
        <div className="group-root"><Landmark size={22} /><strong>{data.holdingName}</strong><span>Stratégie · Gouvernance · Allocation du capital</span></div>
        <div className="group-columns">
          <section className="group-column">
            <header><Building2 size={21} /><h3>Pôle entreprises</h3></header>
            <p className="group-column-description">Développer et renforcer les activités opérationnelles.</p>
            {companyCard("FABI IMMO", "Patrimoine immobilier · Entreprise familiale")}
            {companyCard("FABI CONCIERGERIE", "Exploitation, accueil & services · Sous FABI IMMO dans la structure cible", true)}
            {companyCard("PROCOLORE", "Industrie de la peinture · Fabrication & commercialisation")}
          </section>
          <section className="group-column">
            <header><Handshake size={21} /><h3>Participations stratégiques</h3></header>
            <p className="group-column-description">Accompagner des entreprises et des partenaires à fort potentiel.</p>
            {companyCard("MBTG", "Modern Business Tech Group · Gouvernance partagée entre deux associés")}
            {companyCard("AFROGROUP SAS", "Éducation financière · Partenariats institutionnels & relations stratégiques")}
            {find("AFROGROUP SAS") && <div className="group-product"><strong>Afrodemy</strong><span>Application d’éducation financière développée par AFROGROUP SAS. Ce produit n’est pas une participation distincte.</span></div>}
          </section>
          <section className="group-column">
            <header><ChartNoAxesCombined size={21} /><h3>Portefeuille d’investissement</h3></header>
            <p className="group-column-description">Classes d’actifs envisagées, sans position ni montant présumé.</p>
            <ul className="group-investments">{["BRVM", "Actions", "Crypto", "Épargne", "Placements & liquidités"].map((label) => <li key={label}>{label}<span>À structurer</span></li>)}</ul>
            <p className="group-risk">Diversification, préservation de la liquidité et maîtrise des risques selon chaque instrument.</p>
          </section>
        </div>
        {other.length > 0 && <div className="group-other"><h3>Autres sociétés de votre portefeuille</h3>{other.map((c: Company) => <button key={c.id} onClick={() => onEdit(c.id)}>{c.name} <ArrowUpRight size={15} /></button>)}</div>}
      </section>

      <section className="group-mission"><span className="group-kicker">NOTRE MISSION</span><p>Acquérir, détenir, accompagner et développer des entreprises à fort potentiel, en combinant expertise opérationnelle, gestion stratégique et allocation rigoureuse du capital.</p><p>Une holding hybride : participations, développement opérationnel et investissements financiers.</p></section>
      <section className="group-principles" aria-label="Vision et stratégie">
        <article><span className="group-kicker">NOTRE VISION</span><h2>Un patrimoine productif et transmissible.</h2><p>{data.vision}</p></article>
        <article><span className="group-kicker">NOTRE DISCIPLINE</span><h2>Développer. Investir. Pérenniser.</h2><ul><li>Renforcer la rentabilité et l’organisation des entreprises.</li><li>Développer des actifs productifs et générateurs de revenus.</li><li>Réinvestir dans les entreprises, actions et produits de taux adaptés.</li><li>Préserver la liquidité et maîtriser l’endettement.</li></ul></article>
      </section>
      <p className="group-disclaimer">AZQAR Holdings est une structure envisagée. Le rattachement juridique des entreprises et des participations reste à formaliser. Les participations personnelles renseignées dans les fiches ne sont pas automatiquement détenues par la holding. Cette présentation ne constitue pas une offre d’investissement.</p>
    </div>
  );
}
