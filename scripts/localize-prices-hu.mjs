// Updates prices.xlsx in place: translates the header row and the Product column
// to Hungarian. Prices, variants, units and notes are left untouched, so the
// website keeps working exactly as before (it reads by column position and
// ignores both the header row and the Product column).
import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_PRODUCTS } from "../lib/catalog.mjs";
import { HU_NAMES, HU_HEADERS } from "../lib/hu-names.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(projectRoot, "prices.xlsx");

const codeById = Object.fromEntries(ALL_PRODUCTS.map((p) => [p.id, p.code || ""]));

function huLabel(id) {
  const name = HU_NAMES[id] || id;
  const code = codeById[id];
  return code ? `${name} (${code})` : name;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(FILE);
const ws = wb.worksheets[0];

// Header row -> Hungarian
HU_HEADERS.forEach((h, i) => {
  ws.getRow(1).getCell(i + 1).value = h;
});

// Product column (2) -> Hungarian, matched by the ID in column 1
let updated = 0;
const missing = [];
ws.eachRow((row, n) => {
  if (n === 1) return;
  const id = String(row.getCell(1).value ?? "").trim();
  if (!id) return;
  if (HU_NAMES[id]) {
    row.getCell(2).value = huLabel(id);
    updated++;
  } else {
    missing.push(id);
  }
});

await wb.xlsx.writeFile(FILE);
console.log(`Localized ${updated} product names to Hungarian.`);
if (missing.length) console.log("No Hungarian name for IDs:", missing.join(", "));
