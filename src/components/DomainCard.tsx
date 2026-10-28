import { ArrowUpRight } from "lucide-react";
import type { Domain } from "../data/domains";
import Character from "./Character";
export default function DomainCard({
  domain: d,
  onOpen,
}: {
  domain: Domain;
  onOpen: () => void;
}) {
  return (
    <button
      className={"domain-card " + d.id}
      onClick={onOpen}
      style={{ "--accent": d.color } as React.CSSProperties}
    >
      <span className="domain-index">
        0
        {[
          "sport",
          "finances",
          "business",
          "etudes",
          "religion",
          "lecture",
          "focus",
        ].indexOf(d.id) + 1}{" "}
        / {d.eyebrow}
      </span>
      <ArrowUpRight size={15} className="card-arrow" />
      <h3>{d.name}</h3>
      <span className="domain-title">{d.title}</span>
      <Character domain={d.id} color={d.color} />
      <div className="card-bottom">
        <span>{d.metric}</span>
        <div className="track">
          <i style={{ width: d.progress + "%" }} />
        </div>
      </div>
    </button>
  );
}
