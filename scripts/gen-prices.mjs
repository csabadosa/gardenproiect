// Generates prices.xlsx from the seed prices in lib/catalog.mjs.
// Run: node scripts/gen-prices.mjs          (skips if the file already exists)
//      node scripts/gen-prices.mjs --force   (overwrites — DISCARDS your edits)
import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ALL_PRODUCTS } from "../lib/catalog.mjs";
import { HU_NAMES, HU_HEADERS } from "../lib/hu-names.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(projectRoot, "prices.xlsx");
const force = process.argv.includes("--force");

if (fs.existsSync(OUT) && !force) {
  console.log("prices.xlsx already exists — leaving your edits untouched. Use --force to regenerate.");
  process.exit(0);
}

const wb = new ExcelJS.Workbook();
wb.creator = "Garden Proiect";
const ws = wb.addWorksheet("Prices", {
  views: [{ state: "frozen", ySplit: 1 }],
});

ws.columns = [
  { header: HU_HEADERS[0], key: "id", width: 26 },
  { header: HU_HEADERS[1], key: "product", width: 44 },
  { header: HU_HEADERS[2], key: "variant", width: 22 },
  { header: HU_HEADERS[3], key: "price", width: 14 },
  { header: HU_HEADERS[4], key: "unit", width: 14 },
  { header: HU_HEADERS[5], key: "note", width: 34 },
];

// Header styling
const header = ws.getRow(1);
header.font = { bold: true, color: { argb: "FFFFFFFF" } };
header.alignment = { vertical: "middle" };
header.height = 22;
header.eachCell((c) => {
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F6B3B" } };
});

function label(p) {
  const name = HU_NAMES[p.id] || p.name;
  return p.code ? `${name} (${p.code})` : name;
}

for (const p of ALL_PRODUCTS) {
  if (p.variants) {
    for (const v of p.variants) {
      ws.addRow({ id: p.id, product: label(p), variant: v.label, price: v.seed, unit: p.unit || "", note: "" });
    }
  } else {
    ws.addRow({ id: p.id, product: label(p), variant: "", price: p.seed ?? null, unit: p.unit || "", note: p.note || "" });
  }
}

// Format the price column and gray out the ID column so it reads as "locked".
ws.getColumn("price").numFmt = "#,##0";
ws.eachRow((row, n) => {
  if (n === 1) return;
  row.getCell(1).font = { color: { argb: "FF9AA0A6" } };
  row.getCell(4).font = { bold: true };
});

await wb.xlsx.writeFile(OUT);
console.log(`Wrote ${OUT} with ${ws.rowCount - 1} price rows.`);
