"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { Cash } from "./icons";

export type PriceEntry = { label: string; price: number | null; unit: string; note: string };
export type PricesMap = Record<string, PriceEntry[]>;

type PricesState = { prices: PricesMap; updatedAt: string | null; source: string };
type Ctx = PricesState & { lastFetch: number };

const PricesContext = createContext<Ctx | null>(null);

const POLL_MS = 5000;

export function PricesProvider({
  initial, initialUpdatedAt, initialSource, children,
}: {
  initial: PricesMap;
  initialUpdatedAt: string | null;
  initialSource: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PricesState>({
    prices: initial, updatedAt: initialUpdatedAt, source: initialSource,
  });
  const [lastFetch, setLastFetch] = useState<number>(0);

  const tick = useCallback(async () => {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setState({ prices: data.prices, updatedAt: data.updatedAt, source: data.source });
      setLastFetch(Date.now());
    } catch {
      /* keep showing last-known prices if a poll fails */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [tick]);

  return (
    <PricesContext.Provider value={{ ...state, lastFetch }}>
      {children}
    </PricesContext.Provider>
  );
}

function usePrices() {
  const ctx = useContext(PricesContext);
  if (!ctx) throw new Error("usePrices must be used within PricesProvider");
  return ctx;
}

export function formatLei(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderEntries(entries: PriceEntry[], quoteLabel?: string) {
  // Note-only (e.g. "Please request a quote!")
  if (entries.length === 1 && (entries[0].price === null || entries[0].price === undefined)) {
    return <span className="quote-text">{quoteLabel || entries[0].note || "Please request a quote"}</span>;
  }
  // Multiple variants
  if (entries.length > 1) {
    return (
      <span className="lines">
        {entries.map((e, i) => (
          <span key={i}>
            {e.price !== null ? `${formatLei(e.price)} ${e.unit || "lei"}` : (quoteLabel || e.note)}
            {e.label ? <span className="variant"> — {e.label}</span> : null}
          </span>
        ))}
      </span>
    );
  }
  // Single price
  const e = entries[0];
  return <span>{e.price !== null ? `${formatLei(e.price)} ${e.unit || "lei"}` : (quoteLabel || e.note)}</span>;
}

export function LivePrice({ id, quoteLabel }: { id: string; quoteLabel?: string }) {
  const { prices } = usePrices();
  const entries = prices[id] ?? [{ label: "", price: null, unit: "", note: "—" }];
  const key = JSON.stringify(entries);

  const [flash, setFlash] = useState(false);
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1100);
      return () => clearTimeout(t);
    }
  }, [key]);

  const isQuote = entries.length === 1 && entries[0].price === null;

  return (
    <span className="price-row">
      <Cash size={20} />
      <span className={`price${isQuote ? " quote" : ""}`}>
        <span className={flash ? "flash" : undefined} style={{ borderRadius: 6, padding: "0 2px" }}>
          {renderEntries(entries, quoteLabel)}
        </span>
      </span>
    </span>
  );
}

export function LiveBadge({
  live = "Live prices ·",
  saved = "sheet saved",
  builtin = "built-in prices",
  reading = "reading sheet…",
}: { live?: string; saved?: string; builtin?: string; reading?: string }) {
  const { updatedAt, source } = usePrices();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  let label = reading;
  if (mounted) {
    if (source === "excel" && updatedAt) {
      const t = new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      label = `${saved} ${t}`;
    } else if (source === "seed") {
      label = builtin;
    }
  }

  return (
    <span className="live" title="Prices refresh automatically from the price sheet every few seconds">
      <span className="dot" />
      <span className="hide-sm">{live}</span> <b>{label}</b>
    </span>
  );
}
