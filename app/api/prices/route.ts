import { readPrices } from "@/lib/prices";

// Always read the spreadsheet fresh on every request (never cached),
// so edits to prices.xlsx show up on the next poll.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// Allow the prices API to be called from any origin (e.g. the app opened via the
// laptop's LAN IP from a phone). The page itself fetches this same-origin, so
// this is mainly a safety net for cross-origin access.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const data = await readPrices();
  return Response.json(data, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
