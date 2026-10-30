import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Portfolio } from "../finance/model";
import { localDay, makeWeeklyReport, robotState } from "../finance/world";
import FinanceRobot from "./FinanceRobot";
import "./world.css";

type Props = {
  data: Portfolio;
  onUpdate: (next: Portfolio) => void;
  onEdit: (id: string) => void;
  onTask: (id: string) => void;
  onTasks: (id: string) => void;
  onHermes: () => void;
};
type Place = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  role: string;
};
function places(data: Portfolio): Place[] {
  const fixed: Record<string, [number, number, string, string]> = {
    "fabi immobilier": [225, 230, "#f5c43f", "ARCHITECTURE & PATRIMOINE"],
    "fabi conciergerie": [225, 600, "#f68bb5", "ACCUEIL & SERVICES"],
    afrodemy: [945, 230, "#5bd6a3", "CAMPUS DES SAVOIRS"],
    afrodémy: [945, 230, "#5bd6a3", "CAMPUS DES SAVOIRS"],
    mbtg: [945, 600, "#e2e9f7", "LABORATOIRE TECH"],
  };
  let extra = 0;
  const occupied = new Set<string>();
  return [
    {
      id: "holding",
      name: data.holdingName,
      x: 585,
      y: 325,
      color: "#8c9db7",
      role: "CENTRE DE COMMANDEMENT",
    },
    ...data.companies.map((c) => {
      let p = fixed[c.name.trim().toLowerCase()];
      if (!p || occupied.has(`${p[0]},${p[1]}`)) {
        const i = extra++;
        p = [
          225 + (i % 3) * 360,
          850 + Math.floor(i / 3) * 310,
          "#8da9e5",
          "ATELIER INDÉPENDANT",
        ];
      }
      occupied.add(`${p[0]},${p[1]}`);
      return {
        id: c.id,
        name: c.name,
        x: p[0],
        y: p[1],
        color: p[2],
        role: p[3],
      };
    }),
  ];
}
function Building({ p, holding }: { p: Place; holding: boolean }) {
  return (
    <g
      transform={`translate(${p.x - 133} ${p.y - 130})`}
      className="world-building"
    >
      <ellipse
        cx="133"
        cy="208"
        rx="145"
        ry="28"
        fill="#070c17"
        opacity=".55"
      />
      <path
        d="M-8 66 133 14 276 66 276 201 133 244-8 201Z"
        fill="#222e40"
        stroke="#4b6079"
      />
      <path d="M-8 201 133 244 276 201 276 216 133 260-8 216Z" fill="#182333" />
      <path
        d="M5 63 133 21 263 63 133 107Z"
        fill={holding ? "#364151" : "#566679"}
        stroke="#8291a4"
      />
      <path
        d="M5 63 133 107 263 63 263 86 133 130 5 86Z"
        fill="#253346"
        stroke={p.color}
        strokeWidth="3"
      />
      <path
        d="M12 94 42 104 42 201 12 191ZM226 104 254 94 254 191 226 201Z"
        fill="#344459"
      />
      <path
        d="M45 112 133 140 222 112 222 204 133 231 45 204Z"
        fill="#111c2d"
      />
      <path
        d="M58 124 112 141 112 188 58 172Z M153 141 207 124 207 172 153 188Z"
        fill="#234459"
        stroke={p.color}
        strokeWidth="2"
        opacity=".8"
      />
      <path
        d="M61 151 105 165 M159 156 199 144 M159 164 187 155"
        stroke={p.color}
        opacity=".6"
        strokeWidth="3"
      />
      {holding ? (
        <>
          <path
            d="M81 47V-10L133-29 185-10V47L133 64Z"
            fill="#182231"
            stroke="#687b92"
          />
          <path
            d="M95 34V1L133-12 171 1V34L133 47Z"
            fill="#090f1b"
            stroke={p.color}
          />
          <path
            d="M112 18 128 23 152 8"
            stroke="#b8d1ee"
            strokeWidth="4"
            fill="none"
          />
        </>
      ) : (
        <>
          <path
            d="M85 49 132 34 180 49 132 65Z"
            fill="#1a2739"
            stroke={p.color}
          />
          <path d="M105 50 132 42 159 50 132 58Z" fill={p.color} opacity=".7" />
        </>
      )}
      <path
        d="M56 200 133 223 210 200 210 213 133 238 56 213Z"
        fill="#596b81"
      />
      <path d="M67 217 133 238 199 217" stroke={p.color} strokeWidth="3" />
    </g>
  );
}
function Equipment({ p }: { p: Place }) {
  const type = p.role;
  return (
    <g transform={`translate(${p.x} ${p.y})`} strokeLinejoin="round">
      {type.includes("ARCHITECTURE") ? (
        <>
          <path
            d="M91 23V-57H53M84-57 103-40M55-57V-22"
            stroke="#c9a239"
            strokeWidth="7"
            fill="none"
          />
          <path
            d="M42-21 55-26 69-21 69-7 55-2 42-7Z"
            fill="#e6cc7a"
            stroke="#827345"
          />
          <path
            d="M-108 49-47 33-19 44-79 63Z"
            fill="#d7e4e4"
            stroke="#8fa3af"
          />
          <path d="M-100 52V73M-29 48V67" stroke="#7d94a7" strokeWidth="4" />
          <path
            d="M-86 40V17L-72 12-57 17V42L-72 47Z"
            fill="#d6d1b3"
            stroke="#917e46"
          />
          <path d="M-85 17-72 12-58 17-72 22Z" fill="#fcdf90" />
        </>
      ) : type.includes("SAVOIRS") ? (
        <>
          <path
            d="M44-43 114-65 114-6 44 16Z"
            fill="#172d37"
            stroke="#67c9a9"
            strokeWidth="3"
          />
          <path
            d="M56-29 103-43M56-17 86-26M56-5 96-17"
            stroke="#84e4c0"
            strokeWidth="3"
          />
          <path d="M-108 48-66 36-30 48-71 61Z" fill="#a6c5bb" />
          <path
            d="M-96 44-75 32-62 38-44 31-37 43-61 53-75 47Z"
            fill="#d7e8d4"
            stroke="#3e8a73"
          />
        </>
      ) : type.includes("ACCUEIL") ? (
        <>
          <path
            d="M-112 36-68 22-44 32-87 46V65L-112 56Z"
            fill="#b26788"
            stroke="#f68bb5"
          />
          <path d="M-87 46-44 32V51L-87 65Z" fill="#6e4766" />
          <rect
            x="63"
            y="13"
            width="23"
            height="38"
            rx="5"
            fill="#b56e99"
            stroke="#f6b2ce"
          />
          <path
            d="M69 13V5H80V13M65 51V55M82 51V55"
            stroke="#abbdd1"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="-82"
            cy="21"
            r="7"
            stroke="#fae2b0"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-77 26-66 37M-70 32-65 29"
            stroke="#fae2b0"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <path
            d="M49-35 103-49 103-5 49 10Z"
            fill="#12283c"
            stroke={p.color}
            strokeWidth="2"
          />
          <path
            d="M57-24 92-34M57-15 80-22M57-6 90-15"
            stroke="#77abc7"
            strokeWidth="2"
          />
          <path d="M76 3V20L58 25" stroke="#8ca3ba" strokeWidth="3" />
          <path
            d="M-108 13-85 6-65 14V62L-86 69-108 61Z"
            fill="#32475d"
            stroke="#7b92a9"
          />
          <path
            d="M-100 26-86 30M-100 37-86 41M-100 48-86 52"
            stroke={p.color}
            strokeWidth="3"
          />
        </>
      )}
    </g>
  );
}
export default function World({
  data,
  onUpdate,
  onEdit,
  onTask,
  onTasks,
  onHermes,
}: Props) {
  const [selected, setSelected] = useState("holding");
  const [tab, setTab] = useState("world");
  const [now, setNow] = useState(() => new Date());
  const [zoom, setZoom] = useState(1);
  const [delivery, setDelivery] = useState<{
    id: string;
    route: Place[];
    token: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const latest = useRef({ data, onUpdate });
  latest.current = { data, onUpdate };
  const seenEvent = useRef(data.world?.events.at(-1)?.id);
  const points = places(data);
  const height = Math.max(770, ...points.map((p) => p.y + 220));
  const selectedPlace = points.find((p) => p.id === selected) ?? points[0];
  const company = data.companies.find((c) => c.id === selectedPlace.id);
  const state = company ? robotState(data, company.id, now) : null;
  const preview = makeWeeklyReport(data, now);
  const [reportWeek, setReportWeek] = useState("");
  const reports = data.world?.reports ?? [];
  const report = reports.find((r) => r.week === reportWeek) ?? reports.at(-1);
  const events = (data.world?.events ?? []).filter(
    (e) => e.companyId === company?.id && e.kind === "report",
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      !data.companies.some((c) => c.id === selected) &&
      selected !== "holding"
    )
      setSelected("holding");
  }, [data.companies, selected]);
  function send(id: string) {
    if (delivery) return;
    const route = [points.find((p) => p.id === id)!];
    let parent = data.companies.find((c) => c.id === id)?.targetParentId;
    const visited = new Set([id]);
    while (parent && parent !== "holding" && !visited.has(parent)) {
      const p = points.find((p) => p.id === parent);
      if (!p) break;
      route.push(p);
      visited.add(parent);
      parent = data.companies.find((c) => c.id === parent)?.targetParentId;
    }
    route.push(points[0]);
    setDelivery({ id, route, token: crypto.randomUUID() });
    setMessage(
      `${route[0].name} apporte son rapport : ${route
        .slice(1)
        .map((p) => p.name)
        .join(" → ")}.`,
    );
  }
  // A completed task triggers a physical report when the world is open.
  useEffect(() => {
    const event = data.world?.events.at(-1);
    if (event?.id !== seenEvent.current) {
      seenEvent.current = event?.id;
      if (
        event?.kind === "completed" &&
        !delivery &&
        points.some((p) => p.id === event.companyId)
      )
        send(event.companyId);
    }
  }, [data.world?.events]);
  useEffect(() => {
    if (!delivery) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => {
        const { data: current, onUpdate: update } = latest.current;
        if (
          current.companies.some((c) => c.id === delivery.id) &&
          current.world
        ) {
          const at = new Date().toISOString();
          update({
            ...current,
            world: {
              ...current.world,
              events: [
                ...current.world.events,
                ...delivery.route
                  .slice(1)
                  .map((p) => ({
                    id: crypto.randomUUID(),
                    at,
                    companyId: delivery.id,
                    kind: "report" as const,
                    recipient: p.id,
                  })),
              ].slice(-20000),
            },
          });
          setMessage(
            `Rapport de ${delivery.route[0].name} reçu par ${current.holdingName}.`,
          );
        } else setMessage("Livraison annulée : l’entreprise n’existe plus.");
        setDelivery(null);
      },
      reduced ? 100 : (delivery.route.length - 1) * 3000,
    );
    return () => clearTimeout(timer);
  }, [delivery]);
  const path = delivery?.route
    .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y + 45}`)
    .join(" ");
  const states = data.companies.map((c) => ({
    c,
    s: robotState(data, c.id, now),
  }));
  return (
    <section className="world-shell" aria-label="Mon monde interactif">
      <div className="world-header">
        <div>
          <span className="world-kicker">PIO CAMPUS / LIVE</span>
          <h2>Un monde. Une vision.</h2>
          <p>Chaque action fait avancer votre équipe.</p>
        </div>
        <button className="world-hermes" onClick={onHermes}>
          <span>✦</span> Hermès <small>Ouvrir le poste de pilotage</small>
        </button>
      </div>
      <nav className="world-tabs" aria-label="Navigation du monde">
        <button
          className={tab === "world" ? "active" : ""}
          onClick={() => setTab("world")}
        >
          ◈ Mon monde
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          ▤ Bilans de Holding {reports.length > 0 && <b>{reports.length}</b>}
        </button>
        <button onClick={() => onTasks("")}>☷ Missions</button>
      </nav>
      {tab === "world" ? (
        <>
          <div className="world-summary">
            <span>
              <i className="live-dot" /> {data.companies.length} sociétés
            </span>
            <span>
              {states.filter((x) => x.s.kind === "working").length} au travail
            </span>
            <span>
              {states.filter((x) => x.s.kind === "sleeping").length} en veille
            </span>
            <span>
              {states.filter((x) => x.s.kind === "overloaded").length} débordées
            </span>
            <div className="world-zoom">
              <button
                aria-label="Réduire le monde"
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              >
                −
              </button>
              <button
                aria-label="Recentrer le monde"
                onClick={() => setZoom(1)}
              >
                Vue entière
              </button>
              <button
                aria-label="Agrandir le monde"
                onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              >
                +
              </button>
            </div>
          </div>
          <div
            className="campus-scroll"
            aria-label="Campus navigable, faites défiler pour explorer"
            tabIndex={0}
          >
            <svg
              className="campus"
              viewBox={`0 0 1200 ${height}`}
              style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 850}px` }}
              role="group"
              aria-label="Les quartiers de vos sociétés"
            >
              <defs>
                <pattern
                  id="campus-grid"
                  width="42"
                  height="42"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M42 0H0V42"
                    fill="none"
                    stroke="#233247"
                    strokeWidth=".6"
                  />
                </pattern>
                <linearGradient id="campus-ground" x2="0" y2="1">
                  <stop stopColor="#1c293c" />
                  <stop offset="1" stopColor="#0c1422" />
                </linearGradient>
              </defs>
              <rect
                width="1200"
                height={height}
                rx="26"
                fill="url(#campus-ground)"
              />
              <rect width="1200" height={height} fill="url(#campus-grid)" />
              <path
                d={`M585 80V${height - 50} M70 420H1130`}
                stroke="#34465c"
                strokeWidth="60"
                fill="none"
              />
              <path
                d={`M585 80V${height - 50} M70 420H1130`}
                stroke="#62748b"
                strokeWidth="1"
                strokeDasharray="7 12"
                fill="none"
              />
              <circle
                cx="585"
                cy="570"
                r="63"
                fill="#1a2c40"
                stroke="#496780"
                strokeWidth="3"
              />
              <circle cx="585" cy="570" r="43" fill="#29455b" />
              <path d="M561 580 585 546 609 580 585 594Z" fill="#7298b6" />
              <path d="M585 546V594" stroke="#b4d9f0" strokeWidth="2" />
              {points.slice(1).map((p) => {
                const c = data.companies.find((c) => c.id === p.id)!;
                const parent =
                  points.find((v) => v.id === c.targetParentId) ?? points[0];
                return (
                  <path
                    key={p.id}
                    d={`M${p.x} ${p.y + 45} V${p.y + 85} H${parent.x} V${parent.y + 45}`}
                    stroke={p.color}
                    strokeWidth="2"
                    strokeDasharray="4 9"
                    fill="none"
                    opacity=".55"
                    className="campus-route"
                  />
                );
              })}
              {[75, 425, 770, 1120].flatMap((x) =>
                [420, 700].map((y) => (
                  <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                    <path
                      d="M-16 10 0 16 16 10V18L0 24-16 18Z"
                      fill="#2e4454"
                    />
                    <path d="M0 8V-17" stroke="#536e73" strokeWidth="4" />
                    <circle cy="-20" r="16" fill="#37645b" />
                    <circle cx="-5" cy="-24" r="10" fill="#4b8270" />
                  </g>
                )),
              )}
              {points.map((p) => {
                const status =
                  p.id === "holding"
                    ? {
                        kind: "command",
                        label: "Commandement",
                        reason: "Bilan des sociétés et priorités",
                      }
                    : robotState(data, p.id, now);
                const away = delivery?.id === p.id;
                return (
                  <g
                    key={p.id}
                    className={`campus-station ${selectedPlace.id === p.id ? "selected" : ""}`}
                    style={{ "--sector": p.color } as CSSProperties}
                  >
                    <Building p={p} holding={p.id === "holding"} />
                    <Equipment p={p} />
                    <foreignObject
                      x={p.x - 125}
                      y={p.y - 185}
                      width="250"
                      height="60"
                    >
                      <button
                        className="station-label"
                        onClick={() => {
                          setSelected(p.id);
                          setMessage("");
                        }}
                        aria-label={`Ouvrir ${p.name}`}
                      >
                        <strong>{p.name}</strong>
                        <small>{p.role}</small>
                      </button>
                    </foreignObject>
                    {!away && (
                      <foreignObject
                        x={p.x - 50}
                        y={p.y - 15}
                        width="100"
                        height="130"
                      >
                        <button
                          className={`world-robot ${status.kind}`}
                          aria-label={`Robot ${p.name} : ${status.label}`}
                          title={status.reason}
                          onClick={() => setSelected(p.id)}
                        >
                          <FinanceRobot
                            name={p.id === "holding" ? "FABI Holding" : p.name}
                          />
                          {status.kind === "sleeping" && (
                            <span className="sleep-sign">z Z</span>
                          )}
                          {status.kind === "overloaded" && (
                            <span className="sweat-sign">••</span>
                          )}
                          <span className="robot-desk">
                            {status.kind === "working"
                              ? "▱"
                              : status.kind === "command"
                                ? "▤"
                                : ""}
                          </span>
                        </button>
                      </foreignObject>
                    )}
                    <foreignObject
                      x={p.x - 100}
                      y={p.y + 115}
                      width="200"
                      height="45"
                    >
                      <button
                        className={`station-status ${status.kind}`}
                        onClick={() => setSelected(p.id)}
                      >
                        {away ? "Rapport en livraison…" : status.label}
                      </button>
                    </foreignObject>
                  </g>
                );
              })}
              {delivery && (
                <g
                  key={delivery.token}
                  className="report-courier"
                  aria-label="Robot en livraison avec son rapport papier"
                >
                  <animateMotion
                    path={path}
                    dur={`${(delivery.route.length - 1) * 3}s`}
                    fill="freeze"
                    calcMode="linear"
                  />
                  <foreignObject x="-33" y="-83" width="92" height="110">
                    <div className="courier-body">
                      <FinanceRobot name={delivery.route[0].name} />
                      <span className="paper-report">▤</span>
                    </div>
                  </foreignObject>
                </g>
              )}
              <text
                x="50"
                y={height - 30}
                fill="#7d93ac"
                fontSize="11"
                letterSpacing="3"
              >
                PIO CAMPUS · VOTRE ÉQUIPE EN MOUVEMENT
              </text>
            </svg>
          </div>
          <p className="world-message" role="status">
            {message ||
              "Cliquez sur un bâtiment ou un robot pour entrer dans son quartier."}
          </p>
          <div className="world-bottom">
            <section className="world-detail" aria-label="Poste de la société">
              <span className="world-kicker">
                {company ? "QUARTIER SÉLECTIONNÉ" : "LE QUARTIER GÉNÉRAL"}
              </span>
              <h3>{selectedPlace.name}</h3>
              {company && state ? (
                <>
                  <p>
                    <b className={`state-text ${state.kind}`}>{state.label}</b>{" "}
                    · {state.reason}
                  </p>
                  <div className="world-actions">
                    <button
                      className="primary"
                      onClick={() => onTask(company.id)}
                    >
                      + Donner une mission
                    </button>
                    <button
                      className="secondary"
                      onClick={() => onTasks(company.id)}
                    >
                      Voir les tâches
                    </button>
                    <button
                      className="secondary"
                      onClick={() => onEdit(company.id)}
                    >
                      Ouvrir la fiche
                    </button>
                    <button
                      className="secondary"
                      disabled={!!delivery}
                      onClick={() => send(company.id)}
                    >
                      ▤ Porter un rapport
                    </button>
                  </div>
                  <ul
                    className="world-missions"
                    aria-label="Missions du quartier"
                  >
                    {data.tasks
                      .filter((t) => t.companyId === company.id && !t.done)
                      .slice(0, 4)
                      .map((t) => (
                        <li key={t.id}>
                          <span>
                            {t.title}
                            <small>
                              {t.due ? `Échéance : ${t.due}` : "Sans échéance"}
                            </small>
                          </span>
                          <button
                            disabled={!!delivery}
                            aria-label={`Terminer la mission ${t.title}`}
                            onClick={() =>
                              onUpdate({
                                ...data,
                                tasks: data.tasks.map((v) =>
                                  v.id === t.id ? { ...v, done: true } : v,
                                ),
                              })
                            }
                          >
                            Terminer
                          </button>
                        </li>
                      ))}
                  </ul>
                  <small>
                    {events.length
                      ? `Dernier passage : ${new Date(events.at(-1)!.at).toLocaleString("fr-FR")}`
                      : "Aucun rapport livré pour le moment."}
                  </small>
                </>
              ) : (
                <>
                  <p>
                    Les sociétés vous rendent compte ici. Hermès fait ressortir
                    les priorités et Holding conserve les bilans de fin de
                    semaine.
                  </p>
                  <div className="world-actions">
                    <button className="primary" onClick={onHermes}>
                      ✦ Consulter Hermès
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setTab("reports")}
                    >
                      Bilan hebdomadaire
                    </button>
                  </div>
                </>
              )}
            </section>
            <aside className="world-rules">
              <span className="world-kicker">COMMENT LE MONDE RÉAGIT</span>
              <p>
                💤 3 jours sans activité enregistrée, ou aucune mission ni
                activité récente : en veille.
              </p>
              <p>
                🔧 Des tâches ouvertes et une activité récente : au travail.
              </p>
              <p>💧 6 tâches ouvertes ou 3 retards : débordé.</p>
              <small>
                États visuels basés sur vos actions, pas sur une IA. Une
                livraison de rapport ne marque aucune tâche terminée.
              </small>
            </aside>
          </div>
        </>
      ) : (
        <section className="world-reports">
          <div className="report-heading">
            <div>
              <span className="world-kicker">
                FABI HOLDING / RAPPORT HEBDOMADAIRE
              </span>
              <h3>Ce qui avance. Ce qui demande de l’aide.</h3>
            </div>
            {reports.length > 0 && (
              <label>
                Bilan archivé
                <select
                  aria-label="Semaine du bilan"
                  value={report?.week ?? ""}
                  onChange={(e) => setReportWeek(e.target.value)}
                >
                  {[...reports].reverse().map((r) => (
                    <option key={r.week} value={r.week}>
                      {r.week} → {r.end}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {report ? (
            <>
              <p>
                Du {report.week} au {report.end} · Préparé le{" "}
                {new Date(report.generatedAt).toLocaleString("fr-FR")}
              </p>
              {report.partial && (
                <p className="notice">
                  Suivi partiel : l’historique ne couvre pas toute cette
                  semaine. Les anciennes tâches terminées n’ont pas de date
                  connue.
                </p>
              )}
              <div className="report-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Société</th>
                      <th>Tâches achevées*</th>
                      <th>Créées</th>
                      <th>Actions</th>
                      <th>Ouvertes à la préparation</th>
                      <th>Retards à la préparation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.companies.map((c) => (
                      <tr key={c.id}>
                        <th>{c.name}</th>
                        <td>{c.completed}</td>
                        <td>{c.created}</td>
                        <td>{c.activity}</td>
                        <td>{c.open}</td>
                        <td className={c.late ? "overdue" : ""}>{c.late}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint">
                * Tâches distinctes marquées terminées pendant la semaine, même
                si rouvertes ensuite. Actions : créations, modifications,
                changements d’état et fiches mises à jour. Les rapports livrés
                ne gonflent pas ces chiffres.
              </p>
              <h4>Lecture de Holding</h4>
              {report.companies.map((c) => (
                <p key={c.id}>
                  <strong>{c.name}</strong> —{" "}
                  {c.completed
                    ? `${c.completed} tâche(s) avancée(s) jusqu’à la clôture.`
                    : c.activity
                      ? "Des actions enregistrées, aucune clôture de tâche."
                      : "Aucune activité enregistrée sur la période."}{" "}
                  {c.late
                    ? `${c.late} retard(s) à traiter lors de la préparation du bilan.`
                    : ""}
                </p>
              ))}
            </>
          ) : (
            <div className="notice">
              <h3>Le premier bilan se prépare.</h3>
              <p>
                Le suivi commence le{" "}
                {data.world
                  ? localDay(new Date(data.world.startedAt))
                  : localDay(now)}
                . Le bilan sera archivé le lundi suivant, à l’ouverture du site.
                Les anciennes actions ne sont pas reconstituées.
              </p>
              <p>
                {preview.companies.reduce((n, c) => n + c.open, 0)} tâches
                ouvertes actuellement.
              </p>
            </div>
          )}
          <p className="hint">
            Bilan local de l’activité des tâches, sans classement de rentabilité
            ni consolidation financière. Le site doit être ouvert pour préparer
            un bilan ; à la réouverture, la dernière semaine terminée est
            traitée. Aucun envoi automatique externe. Historique conservé : 20
            000 actions et 104 bilans maximum.
          </p>
        </section>
      )}
    </section>
  );
}
