import { readPrices } from "@/lib/prices";
import CatalogApp from "@/components/CatalogApp";
import type { PricesMap } from "@/components/prices-context";

export default async function Home() {
  const { prices, updatedAt, source } = await readPrices();
  return (
    <CatalogApp
      initialPrices={prices as PricesMap}
      initialUpdatedAt={updatedAt as string | null}
      initialSource={source as string}
    />
  );
}
