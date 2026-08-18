"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LANGS, DEFAULT_LANG, tName, tDesc, tSection, tDims, tUi } from "@/lib/i18n.mjs";

type Lang = string;
type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "gp-lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Start with the default so server and first client render match, then adopt
  // the saved choice on mount (avoids hydration mismatch).
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGS.includes(saved)) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

// Translation helpers bound to the active language.
export function useT() {
  const { lang } = useLang();
  return useMemo(
    () => ({
      lang,
      name: (slug: string, fallback?: string) => tName(lang, slug, fallback),
      desc: (eng: string) => tDesc(lang, eng),
      section: (eng: string) => tSection(lang, eng),
      dims: (eng: string) => tDims(lang, eng),
      ui: (key: string) => tUi(lang, key) as string,
      terms: () => (tUi(lang, "terms") as unknown as string[]) || [],
    }),
    [lang]
  );
}

/* ---------------- Flags ---------------- */
function FlagRO() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true">
      <rect width="1" height="2" x="0" fill="#002B7F" />
      <rect width="1" height="2" x="1" fill="#FCD116" />
      <rect width="1" height="2" x="2" fill="#CE1126" />
    </svg>
  );
}
function FlagHU() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true">
      <rect width="3" height="0.667" y="0" fill="#CD2A3E" />
      <rect width="3" height="0.667" y="0.667" fill="#ffffff" />
      <rect width="3" height="0.667" y="1.334" fill="#436F4D" />
    </svg>
  );
}
function FlagEN() {
  // Simplified Union Jack (centered diagonals) — reads correctly at small sizes.
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#ffffff" strokeWidth="8" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const FLAGS: Record<string, { node: React.ReactNode; label: string; short: string }> = {
  ro: { node: <FlagRO />, label: "Română", short: "RO" },
  en: { node: <FlagEN />, label: "English", short: "EN" },
  hu: { node: <FlagHU />, label: "Magyar", short: "HU" },
};

export function FlagSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flags" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={`flag-btn${l === lang ? " active" : ""}`}
          onClick={() => setLang(l)}
          aria-label={FLAGS[l].label}
          aria-pressed={l === lang}
          title={FLAGS[l].label}
        >
          <span className="flag">{FLAGS[l].node}</span>
          <span className="flag-code">{FLAGS[l].short}</span>
        </button>
      ))}
    </div>
  );
}
