"use client";

import { SECTIONS, CONTACT, GALLERY } from "@/lib/catalog.mjs";
import { PricesProvider, LivePrice, LiveBadge, type PricesMap } from "@/components/prices-context";
import { LangProvider, useT, FlagSwitcher } from "@/components/lang";
import { Logo, Shield, Ruler, Phone, Globe, Facebook } from "@/components/icons";

type Product = { id: string; name: string; code?: string; desc: string; dims?: string };
type Section = { title: string; products: Product[] };

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <div className="brand">
      <Logo size={footer ? 40 : 34} style={{ color: footer ? "#fff" : "var(--green-deep)" }} />
      <span className="wordmark">
        <b>GARDEN</b>
        <span>PROIECT</span>
      </span>
    </div>
  );
}

function Card({ p }: { p: Product }) {
  const t = useT();
  return (
    <article className="card">
      <div className="card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/products/${p.id}.png`} alt={t.name(p.id, p.name)} loading="lazy" />
      </div>
      <div className="card-body">
        <h3 className="card-name">{t.name(p.id, p.name)}</h3>
        <div className="card-code">{p.code || " "}</div>
        <hr className="rule" />
        <div className="card-row">
          <Shield size={20} />
          <span>{t.desc(p.desc)}</span>
        </div>
        {p.dims ? (
          <div className="card-dims">
            <Ruler size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            {t.dims(p.dims)}
          </div>
        ) : null}
        <hr className="rule" />
        <div className="card-foot">
          <LivePrice id={p.id} quoteLabel={t.ui("requestQuote")} />
        </div>
      </div>
    </article>
  );
}

function CatalogInner() {
  const t = useT();
  const sections = SECTIONS as Section[];

  return (
    <>
      {/* Top bar */}
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Brand />
          <div className="topbar-right">
            <FlagSwitcher />
            <LiveBadge
              live={t.ui("badgeLive")}
              saved={t.ui("badgeSaved")}
              builtin={t.ui("badgeBuiltin")}
              reading={t.ui("badgeReading")}
            />
          </div>
        </div>
      </header>

      {/* Hero / cover */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1 className="hero-title">
              {t.ui("catalogWord")}
              <span className="yr">{t.ui("year")}</span>
            </h1>
            <div className="hero-rule" />
            <p className="hero-lead">{t.ui("heroLead")}</p>
            <div className="hero-contact">
              <span className="chip"><Phone size={16} /> {CONTACT.phone}</span>
              <span className="chip"><Globe size={16} /> {CONTACT.website}</span>
              <span className="chip"><Facebook size={16} /> {CONTACT.facebook}</span>
            </div>
          </div>
          <div className="hero-media">
            <div className="frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cover.png" alt="Garden bench in a landscaped park" />
            </div>
          </div>
        </div>
      </section>

      {/* Terms / warranty */}
      <section className="terms">
        <div className="wrap">
          <div className="sub">{t.ui("warrantyKicker")}</div>
          <h2>{t.ui("warrantyTitle")}</h2>
          <div className="terms-card">
            {t.terms().map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <div className="terms-vat">{t.ui("vat")}</div>
        </div>
      </section>

      {/* Product sections */}
      {sections.map((section) => (
        <section className="section" key={section.title}>
          <div className="wrap">
            <div className="section-head">
              <h2>{t.section(section.title)}</h2>
              <span className="bar" />
              <span className="count">{section.products.length} {t.ui("itemsSuffix")}</span>
            </div>
            <div className="grid">
              {section.products.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Reference gallery */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>{t.ui("galleryTitle")}</h2>
            <span className="bar" />
          </div>
          <div className="gallery">
            {(GALLERY as string[]).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Garden Proiect ${i + 1}`} loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <Brand footer />
          <div className="footer-contact">
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}><Phone size={18} /> {CONTACT.phone}</a>
            <a href={`https://${CONTACT.website}`} target="_blank" rel="noopener noreferrer"><Globe size={18} /> {CONTACT.website}</a>
            <span><Facebook size={18} /> {CONTACT.facebook}</span>
          </div>
        </div>
        <div className="wrap">
          <div className="footer-note">© {new Date().getFullYear()} Garden Proiect · {t.ui("footerNote")}</div>
        </div>
      </footer>
    </>
  );
}

export default function CatalogApp({
  initialPrices, initialUpdatedAt, initialSource,
}: {
  initialPrices: PricesMap;
  initialUpdatedAt: string | null;
  initialSource: string;
}) {
  return (
    <LangProvider>
      <PricesProvider initial={initialPrices} initialUpdatedAt={initialUpdatedAt} initialSource={initialSource}>
        <CatalogInner />
      </PricesProvider>
    </LangProvider>
  );
}
