import { useEffect, useRef, useState } from "react";
import type { RobotMood } from "./robot3d";
import FinanceRobot from "./FinanceRobot";

export default function CampusRobot({
  name,
  mood = "ready",
}: {
  name: string;
  mood?: RobotMood;
}) {
  const key = name.trim().toLowerCase();
  const color =
    key === "fabi holding"
      ? "#323943"
      : key === "fabi immobilier"
        ? "#f3c328"
        : key === "fabi conciergerie"
          ? "#ed80b1"
          : ["afrodemy", "afrodémy"].includes(key)
            ? "#26b887"
            : "#e6ecf2";
  const canvas = useRef<HTMLCanvasElement>(null);
  const currentMood = useRef(mood);
  currentMood.current = mood;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    setReady(false);
    import("./robot3d")
      .then(({ mountRobot }) => {
        if (!active || !canvas.current) return;
        try {
          cleanup = mountRobot(
            canvas.current,
            color,
            currentMood.current,
            () => currentMood.current,
          );
          setReady(true);
        } catch {
          setReady(false);
        }
      })
      .catch(() => {
        if (active) setReady(false);
      });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [color]);
  return (
    <span
      className="finance-robot campus-robot-actor"
      role="img"
      aria-label={`Robot ${name}`}
      data-renderer={ready ? "3d" : "fallback"}
      data-mood={mood}
      data-workstation={mood !== "walking"}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={ready ? "" : "actor-hidden"}
      />
      {!ready && (
        <span className={`actor-fallback ${mood}`} aria-hidden="true">
          <FinanceRobot name={name} />
          {mood === "sleeping" && (
            <span className="fallback-closed-eyes">⌣ ⌣</span>
          )}
        </span>
      )}
    </span>
  );
}
