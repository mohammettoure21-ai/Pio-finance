// Five independent actors cropped from the transparent 3D sprite sheet.
export default function CampusRobot({ name }: { name: string }) {
  const key = name.trim().toLowerCase();
  const index =
    key === "fabi holding"
      ? 0
      : key === "fabi immobilier"
        ? 1
        : key === "fabi conciergerie"
          ? 2
          : ["afrodemy", "afrodémy"].includes(key)
            ? 3
            : 4;
  return (
    <svg
      className="finance-robot campus-robot-sprite"
      viewBox={`${index * 434.4} 85 434.4 615`}
      role="img"
      aria-label={`Robot ${name}`}
    >
      <image href="/world/robots.png" width="2172" height="724" />
    </svg>
  );
}
