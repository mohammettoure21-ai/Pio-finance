import { useId } from "react";

export default function FinanceRobot({ name }: { name: string }) {
  const id = useId().replace(/:/g, "");
  const key = name.trim().toLowerCase();
  const color = key === "fabi holding" ? "#34343c" : key === "fabi immobilier" ? "#ffd126" : key === "fabi conciergerie" ? "#ff80b4" : ["afrodemy", "afrodémy"].includes(key) ? "#13c896" : "#eeeef2";
  return <svg className="finance-robot" viewBox="0 0 140 150" role="img" aria-label={`Robot ${name}`}>
    <defs>
      <radialGradient id={`${id}-shell`} cx="30%" cy="20%" r="85%"><stop stopColor="white"/><stop offset=".24" stopColor={color}/><stop offset=".75" stopColor={color}/><stop offset="1" stopColor="#25252f"/></radialGradient>
      <radialGradient id={`${id}-eye`}><stop stopColor="#141322"/><stop offset=".48" stopColor="#151322"/><stop offset=".64" stopColor="#b9a4ef"/><stop offset=".85" stopColor="white"/><stop offset="1" stopColor="#625c87"/></radialGradient>
    </defs>
    <ellipse cx="70" cy="145" rx="44" ry="4" fill="#000" opacity=".35"/>
    <g stroke="#24242c" strokeWidth="2" strokeLinejoin="round">
      <path d="M48 109 42 133Q33 147 60 142L65 112M77 112 79 140Q108 148 99 133L94 109" fill={`url(#${id}-shell)`}/>
      <path d="M47 89Q26 91 29 118L39 121 48 103M94 89Q115 92 111 119L101 121 93 103" fill={`url(#${id}-shell)`}/>
      <path d="M49 83Q41 104 53 118H90Q103 101 92 83Z" fill={`url(#${id}-shell)`}/>
      <path d="M57 97H84L81 108H60Z" fill="#20212b"/>
      <circle cx="70" cy="101" r="3" fill="#dad4ff"/>
      <rect x="14" y="31" width="20" height="43" rx="10" fill="#363642"/>
      <rect x="109" y="31" width="20" height="43" rx="10" fill="#363642"/>
      <path d="M23 48Q20 7 68 5 118 4 119 49L115 69Q110 88 70 89 29 89 25 72Z" fill={`url(#${id}-shell)`}/>
      <path d="M32 47Q32 28 69 28 105 28 106 48L104 65Q101 78 70 79 38 79 35 66Z" fill="#292832"/>
      <ellipse cx="51" cy="54" rx="13" ry="16" fill={`url(#${id}-eye)`}/>
      <ellipse cx="87" cy="54" rx="13" ry="16" fill={`url(#${id}-eye)`}/>
      <path d="M39 20Q65 10 87 16" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3"/>
    </g>
  </svg>;
}
