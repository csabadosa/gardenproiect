// Plain SVG icons (server-safe — no client boundary needed).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round",
});

export function Shield({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
      <path d="M9.2 12.2l2 2 3.6-3.8" />
    </svg>
  );
}

export function Cash({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2.2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 9v6M18 9v6" />
    </svg>
  );
}

export function Ruler({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="8" width="18" height="8" rx="1.5" transform="rotate(0 12 12)" />
      <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
    </svg>
  );
}

export function Phone({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 5c0-1 .8-1.8 1.8-1.8h1.6c.8 0 1.5.6 1.7 1.4l.6 2.4c.1.6-.1 1.2-.6 1.6l-1.1.9c1 2 2.6 3.6 4.6 4.6l.9-1.1c.4-.5 1-.7 1.6-.6l2.4.6c.8.2 1.4.9 1.4 1.7v1.6c0 1-.8 1.8-1.8 1.8C10.6 19.9 4.1 13.4 4 5z" />
    </svg>
  );
}

export function Globe({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" />
    </svg>
  );
}

export function Facebook({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 8.5V7c0-.7.5-1 1.2-1H16.5V3.2h-2.3c-2.3 0-3.7 1.4-3.7 3.6v1.7H8.5V11h2v9.8h3V11h2.2l.5-2.5H13.5" />
    </svg>
  );
}

// The Garden Proiect tree-in-a-loop mark, redrawn as an inline SVG.
export function Logo({ size = 34, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 72" fill="none"
      stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="38" cy="21" r="15" />
      <path d="M23 7 V61" />
      <path d="M23 41 C34 44, 44 40, 45 28" />
      <path d="M23 61 C16 61, 12 57, 11.5 50" />
    </svg>
  );
}
