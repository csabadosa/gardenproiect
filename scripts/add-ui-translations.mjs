// Injects `ui`, `sections`, `descriptions` and `dims` blocks into each language
// file (ro/en/hu.json), alongside the existing `benches`. The English file uses
// identity values for sections/descriptions/dims (keys are the English source
// strings used in catalog.mjs). Run once: node scripts/add-ui-translations.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "languages");

const UI = {
  en: {
    catalogWord: "CATALOG", year: "2026",
    heroLead: "Handcrafted solid-wood garden furniture, planters, shelters and playground structures — built to last, finished in the colors you choose.",
    warrantyKicker: "Warranty & Terms",
    warrantyTitle: "Made from solid wood, guaranteed for 5 years",
    vat: "Prices do not include VAT.",
    galleryTitle: "Selected Realizations",
    itemsSuffix: "items",
    requestQuote: "Please request a quote!",
    footerNote: "Prices do not include VAT · Prices are read live from the price sheet.",
    badgeLive: "Live prices ·", badgeSaved: "sheet saved", badgeBuiltin: "built-in prices", badgeReading: "reading sheet…",
    langName: "English",
    terms: [
      "We provide a 5-year warranty on products made of solid wood, calculated from the date of manufacture. The warranty for purchased products is valid in accordance with the legislation in force at the time of purchase. The warranty covers only defects resulting from manufacturing faults or hidden material defects and becomes void if the products are used improperly or contrary to their intended purpose.",
      "The customer acknowledges that products made from natural materials, such as solid wood or solid wood plywood, may vary in texture and in the shades achieved through different finishing processes. Such variations are considered natural characteristics of the material and do not constitute quality defects.",
      "At the customer's request, solid wood may be substituted with pine wood; however, in this case, the warranty period is reduced to 1 year. A custom quotation is required for such requests.",
      "Payment terms: 50% advance payment upon ordering, with the remaining balance payable upon delivery, unless otherwise specified in the contract.",
      "Please request a custom quotation regarding the terms and costs of loading, transportation, assembly, and installation. Should you require any further information, we will be pleased to assist you. Do not hesitate to contact us.",
    ],
  },
  ro: {
    catalogWord: "CATALOG", year: "2026",
    heroLead: "Mobilier de grădină din lemn masiv lucrat manual, jardiniere, foișoare și structuri de joacă — construite să reziste, finisate în culorile alese de dumneavoastră.",
    warrantyKicker: "Garanție și termeni",
    warrantyTitle: "Fabricat din lemn masiv, garantat 5 ani",
    vat: "Prețurile nu includ TVA.",
    galleryTitle: "Realizări selectate",
    itemsSuffix: "produse",
    requestQuote: "Vă rugăm cereți o ofertă!",
    footerNote: "Prețurile nu includ TVA · Prețurile sunt citite în timp real din foaia de prețuri.",
    badgeLive: "Prețuri live ·", badgeSaved: "actualizat", badgeBuiltin: "prețuri implicite", badgeReading: "se citește…",
    langName: "Română",
    terms: [
      "Oferim o garanție de 5 ani pentru produsele din lemn masiv, calculată de la data fabricației. Garanția pentru produsele achiziționate este valabilă în conformitate cu legislația în vigoare la momentul achiziției. Garanția acoperă numai defectele rezultate din vicii de fabricație sau defecte ascunse ale materialului și își pierde valabilitatea dacă produsele sunt utilizate necorespunzător sau contrar destinației lor.",
      "Clientul recunoaște că produsele fabricate din materiale naturale, precum lemnul masiv sau placajul din lemn masiv, pot varia ca textură și ca nuanțe obținute prin diferite procese de finisare. Aceste variații sunt considerate caracteristici naturale ale materialului și nu constituie defecte de calitate.",
      "La cererea clientului, lemnul masiv poate fi înlocuit cu lemn de pin; totuși, în acest caz, perioada de garanție se reduce la 1 an. Pentru astfel de solicitări este necesară o ofertă personalizată.",
      "Condiții de plată: 50% avans la comandă, restul sumei fiind plătibil la livrare, cu excepția cazului în care se specifică altfel în contract.",
      "Vă rugăm să solicitați o ofertă personalizată privind condițiile și costurile de încărcare, transport, montaj și instalare. Dacă aveți nevoie de informații suplimentare, vă stăm cu plăcere la dispoziție. Nu ezitați să ne contactați.",
    ],
  },
  hu: {
    catalogWord: "KATALÓGUS", year: "2026",
    heroLead: "Kézzel készített tömörfa kerti bútorok, virágládák, pavilonok és játszótéri szerkezetek — tartósra építve, az Ön által választott színben.",
    warrantyKicker: "Garancia és feltételek",
    warrantyTitle: "Tömörfából készült, 5 év garanciával",
    vat: "Az árak nem tartalmazzák az áfát.",
    galleryTitle: "Válogatott megvalósítások",
    itemsSuffix: "termék",
    requestQuote: "Kérjen árajánlatot!",
    footerNote: "Az árak nem tartalmazzák az áfát · Az árak élőben, az ártáblázatból frissülnek.",
    badgeLive: "Élő árak ·", badgeSaved: "mentve", badgeBuiltin: "beépített árak", badgeReading: "beolvasás…",
    langName: "Magyar",
    terms: [
      "Tömörfából készült termékeinkre 5 év garanciát vállalunk, a gyártás dátumától számítva. A vásárolt termékek garanciája a vásárláskor hatályos jogszabályoknak megfelelően érvényes. A garancia csak a gyártási hibákból vagy rejtett anyaghibákból eredő hibákra terjed ki, és érvényét veszti, ha a termékeket nem rendeltetésszerűen vagy céljukkal ellentétesen használják.",
      "A vásárló tudomásul veszi, hogy a természetes anyagokból, például tömörfából vagy tömörfa rétegelt lemezből készült termékek textúrája és a különböző felületkezelési eljárásokkal elért árnyalatai eltérőek lehetnek. Az ilyen eltérések az anyag természetes tulajdonságainak minősülnek, és nem jelentenek minőségi hibát.",
      "A vásárló kérésére a tömörfa fenyőfával helyettesíthető; ebben az esetben azonban a garancia időtartama 1 évre csökken. Az ilyen kérésekhez egyedi árajánlat szükséges.",
      "Fizetési feltételek: 50% előleg a megrendeléskor, a fennmaradó összeg a szállításkor fizetendő, kivéve, ha a szerződés másként rendelkezik.",
      "Kérjük, kérjen egyedi árajánlatot a berakodás, szállítás, összeszerelés és telepítés feltételeiről és költségeiről. Ha további információra van szüksége, örömmel állunk rendelkezésére. Ne habozzon kapcsolatba lépni velünk.",
    ],
  },
};

const SECTIONS = {
  "Benches & Seating": { ro: "Bănci și șezut", hu: "Padok és ülőhelyek" },
  "Waste Baskets": { ro: "Coșuri de gunoi", hu: "Szemetesek" },
  "Planters, Boxes & Wells": { ro: "Jardiniere, lăzi și fântâni", hu: "Virágládák, ládák és kutak" },
  "Tables & Sets": { ro: "Mese și seturi", hu: "Asztalok és szettek" },
  "Shelters & Structures": { ro: "Adăposturi și structuri", hu: "Fedett építmények és szerkezetek" },
  "Fencing & Signage": { ro: "Garduri și panouri", hu: "Kerítések és táblák" },
  "Playground — Swings & Play": { ro: "Loc de joacă — Leagăne și joacă", hu: "Játszótér — Hinták és játék" },
  "Large Play Structures": { ro: "Structuri mari de joacă", hu: "Nagy játszótéri szerkezetek" },
};

const DESCRIPTIONS = {
  "Wood (oak, acacia) and metal with special paint. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm) și metal cu vopsea specială. Disponibil în culori selectate.", hu: "Fa (tölgy, akác) és fém különleges festéssel. Válogatott színekben kapható." },
  "Wood (oak, acacia) and metal treated with a special protective coating. Available in various colors upon request.":
    { ro: "Lemn (stejar, salcâm) și metal tratat cu un strat protector special. Disponibil în diverse culori la cerere.", hu: "Fa (tölgy, akác) és fém speciális védőbevonattal kezelve. Igény szerint különböző színekben kapható." },
  "Wood (oak, acacia) and metal with a special coating. Available in different colors upon request.":
    { ro: "Lemn (stejar, salcâm) și metal cu un strat special. Disponibil în diferite culori la cerere.", hu: "Fa (tölgy, akác) és fém speciális bevonattal. Igény szerint különböző színekben kapható." },
  "Wood (oak, acacia) and metal treated with special paint. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm) și metal tratat cu vopsea specială. Disponibil în culori selectate.", hu: "Fa (tölgy, akác) és fém különleges festékkel kezelve. Válogatott színekben kapható." },
  "Wood (oak, acacia), treated with special paint. Carved decoration. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm), tratat cu vopsea specială. Decor sculptat. Disponibil în culori selectate.", hu: "Fa (tölgy, akác), különleges festékkel kezelve. Faragott díszítés. Válogatott színekben kapható." },
  "Wood (oak, acacia) and carved stone. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm) și piatră sculptată. Disponibil în culori selectate.", hu: "Fa (tölgy, akác) és faragott kő. Válogatott színekben kapható." },
  "Wood (oak, acacia), treated with special paint. Carved motifs. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm), tratat cu vopsea specială. Motive sculptate. Disponibil în culori selectate.", hu: "Fa (tölgy, akác), különleges festékkel kezelve. Faragott motívumok. Válogatott színekben kapható." },
  "Wood (oak, acacia) and metal with special paint. Carved motifs. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm) și metal cu vopsea specială. Motive sculptate. Disponibil în culori selectate.", hu: "Fa (tölgy, akác) és fém különleges festéssel. Faragott motívumok. Válogatott színekben kapható." },
  "Wood (oak, acacia), special paint finish. Carved motifs. Available in selected colors.":
    { ro: "Lemn (stejar, salcâm), finisaj cu vopsea specială. Motive sculptate. Disponibil în culori selectate.", hu: "Fa (tölgy, akác), különleges festék felülettel. Faragott motívumok. Válogatott színekben kapható." },
  "Pine wood, treated with special paint. Available in selected colors. Roof on request (quote). Table and chairs on request (quote).":
    { ro: "Lemn de pin, tratat cu vopsea specială. Disponibil în culori selectate. Acoperiș la cerere (ofertă). Masă și scaune la cerere (ofertă).", hu: "Fenyőfa, különleges festékkel kezelve. Válogatott színekben kapható. Tető igény szerint (ajánlat). Asztal és székek igény szerint (ajánlat)." },
  "Carved stone, metal.":
    { ro: "Piatră sculptată, metal.", hu: "Faragott kő, fém." },
  "Wood (oak, acacia) and metal with special paint. Available in selected colors. Recommended for private gardens.":
    { ro: "Lemn (stejar, salcâm) și metal cu vopsea specială. Disponibil în culori selectate. Recomandat pentru grădini private.", hu: "Fa (tölgy, akác) és fém különleges festéssel. Válogatott színekben kapható. Magánkertekbe ajánlott." },
  "Wood and metal with special paint. Available in selected colors.":
    { ro: "Lemn și metal cu vopsea specială. Disponibil în culori selectate.", hu: "Fa és fém különleges festéssel. Válogatott színekben kapható." },
};

const DIMS = {
  "Length 160 · Width 60 · Height 80 cm":
    { ro: "Lungime 160 · Lățime 60 · Înălțime 80 cm", hu: "Hossz 160 · Szélesség 60 · Magasság 80 cm" },
};

function project(table, lang) {
  const out = {};
  for (const [key, val] of Object.entries(table)) out[key] = lang === "en" ? key : val[lang];
  return out;
}

for (const lang of ["en", "ro", "hu"]) {
  const file = path.join(dir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.ui = UI[lang];
  data.sections = project(SECTIONS, lang);
  data.descriptions = project(DESCRIPTIONS, lang);
  data.dims = project(DIMS, lang);
  fs.writeFileSync(file, JSON.stringify(data, null, 4) + "\n");
  console.log(`Updated ${lang}.json`);
}
