type Props = { domain: string; color: string };
export default function Character({ domain, color }: Props) {
  const reading = ["lecture", "religion", "etudes"].includes(domain);
  return (
    <svg className="character" viewBox="0 0 160 140" aria-hidden="true">
      <defs>
        <linearGradient id={"shirt-" + domain} x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor="#25303c" />
        </linearGradient>
      </defs>
      <ellipse cx="82" cy="128" rx="52" ry="7" fill={color} opacity=".07" />
      <path d="M53 121l8-39h43l9 39" fill="#161e29" />
      <path
        d="M61 81q-9-27 6-32h28q16 3 11 32l-5 25H62z"
        fill={"url(#shirt-" + domain + ")"}
      />
      <path d="M76 48v-12h15v12" fill="#b89177" />
      <ellipse cx="82" cy="27" rx="17" ry="20" fill="#c5a18b" />
      <path
        d="M65 27q-7-27 16-26 24 1 19 30l-6-13q-17 5-25-3z"
        fill="#252b33"
      />
      <path
        d="M74 32q7 5 15 0"
        fill="none"
        stroke="#9e7b67"
        strokeWidth="1.2"
      />
      {reading ? (
        <>
          <path d="M46 76l34 10 34-10-3 28-31 10-31-10z" fill={color} />
          <path d="M80 86v28" stroke="#24303b" />
          <path
            d="M60 60L44 83m58-23 15 23"
            stroke="#b89177"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </>
      ) : domain === "sport" ? (
        <>
          <path
            d="M64 58L41 74 27 54m73 4 22 16 15-20"
            stroke="#b89177"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {[27, 137].map((x) => (
            <g key={x} stroke={color} strokeWidth="5">
              <path d={`M${x - 12} 51h24`} />
              <path d={`M${x - 8} 42v18m16-18v18`} />
            </g>
          ))}
        </>
      ) : (
        <>
          <path
            d="M62 61L48 89h36m18-28 16 28H85"
            fill="none"
            stroke="#b89177"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M49 79h65l-7 35H56z"
            fill="#263440"
            stroke={color}
            strokeWidth="1"
          />
          <circle cx="82" cy="96" r="3" fill={color} />
        </>
      )}
      <path d="M58 123h50" stroke="#080d13" strokeWidth="5" />
    </svg>
  );
}
