import type { Metadata, Viewport } from "next";
import { Poppins, Quicksand } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Garden Proiect — Catalog 2026",
  description:
    "Garden Proiect 2026 catalog — solid-wood benches, planters, shelters and playground structures. Prices update live from the price sheet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${quicksand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
