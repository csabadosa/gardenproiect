// Reads live prices from prices.xlsx (the spreadsheet the user edits).
// Used by the /api/prices route AND for the server-rendered initial page.
import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";
import { ALL_PRODUCTS } from "./catalog.mjs";

export const PRICES_PATH = path.join(process.cwd(), "prices.xlsx");

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  // exceljs may return {result} for formulas
  if (typeof v === "object" && v && "result" in v) v = v.result;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cellText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v && "richText" in v) {
    return v.richText.map((t) => t.text).join("");
  }
  if (typeof v === "object" && v && "result" in v) return String(v.result);
  return String(v).trim();
}

// Fallback map built from the seed prices in catalog.mjs.
function seedMap() {
  const map = {};
  for (const p of ALL_PRODUCTS) {
    if (p.variants) {
      map[p.id] = p.variants.map((v) => ({ label: v.label, price: v.seed, unit: p.unit || "", note: "" }));
    } else {
      map[p.id] = [{ label: "", price: p.seed ?? null, unit: p.unit || "", note: p.note || "" }];
    }
  }
  return map;
}

export async function readPrices() {
  const seed = seedMap();

  if (!fs.existsSync(PRICES_PATH)) {
    return { source: "seed", updatedAt: null, prices: seed };
  }

  try {
    const stat = fs.statSync(PRICES_PATH);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(PRICES_PATH);
    const ws = wb.worksheets[0];

    const map = {};
    ws.eachRow((row, n) => {
      if (n === 1) return; // header row
      const id = cellText(row.getCell(1).value);
      if (!id) return;
      const label = cellText(row.getCell(3).value);
      const price = toNumber(row.getCell(4).value);
      const unit = cellText(row.getCell(5).value);
      const note = cellText(row.getCell(6).value);
      if (!map[id]) map[id] = [];
      map[id].push({ label, price, unit, note });
    });

    // Any product missing from the sheet falls back to its seed price.
    for (const p of ALL_PRODUCTS) {
      if (!map[p.id] || map[p.id].length === 0) map[p.id] = seed[p.id];
    }

    return { source: "excel", updatedAt: stat.mtime.toISOString(), prices: map };
  } catch (err) {
    // If the file is open/locked or malformed, fall back gracefully.
    return { source: "seed", updatedAt: null, error: String(err && err.message || err), prices: seed };
  }
}
