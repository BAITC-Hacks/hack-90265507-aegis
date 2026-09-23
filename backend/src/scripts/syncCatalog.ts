import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

const EKT_API_URL = process.env.EKT_API_URL;
const EKT_API_USER = process.env.EKT_API_USER;
const EKT_API_PASSWORD = process.env.EKT_API_PASSWORD;

type CatalogProduct = {
  id: number;
  name: string;
  article: string;
  price: number;
  image: string | null;
  url: string;
  url_api_detail: string;
  offers: unknown[];
};

type CatalogPage = {
  page: number;
  per_page: number;
  count: number;
  items: CatalogProduct[];
};

function getAuthHeader() {
  if (!EKT_API_USER || !EKT_API_PASSWORD) {
    throw new Error("EKT API credentials are missing");
  }

  const credentials = Buffer.from(
    `${EKT_API_USER}:${EKT_API_PASSWORD}`
  ).toString("base64");

  return `Basic ${credentials}`;
}

async function fetchPage(page: number): Promise<CatalogPage> {
  if (!EKT_API_URL) {
    throw new Error("EKT_API_URL is missing");
  }

  const response = await fetch(
    `${EKT_API_URL}/products?page=${page}`,
    {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Page ${page}: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CatalogPage;
}

async function syncCatalog() {
  console.log("⚡ EKTiQ Catalog Sync started");

  const products: CatalogProduct[] = [];

  let page = 1;

  while (true) {
    console.log(`Fetching page ${page}...`);

    const data = await fetchPage(page);

    if (!data.items || data.items.length === 0) {
      console.log(`Empty page ${page}. Catalog end reached.`);
      break;
    }

    products.push(...data.items);

    console.log(
      `✓ Page ${page}: ${data.items.length} products | Total: ${products.length}`
    );

    if (data.items.length < data.per_page) {
      console.log("Last partial page reached.");
      break;
    }

    page++;
  }

  // Remove duplicates by product ID
  const uniqueProducts = Array.from(
    new Map(
      products.map((product) => [product.id, product])
    ).values()
  );

  const dataDirectory = path.resolve("data");
  const outputFile = path.join(dataDirectory, "catalog.json");

  await fs.mkdir(dataDirectory, {
    recursive: true,
  });

  await fs.writeFile(
    outputFile,
    JSON.stringify(uniqueProducts, null, 2),
    "utf-8"
  );

  console.log("");
  console.log("================================");
  console.log("✅ EKTiQ Catalog Sync completed");
  console.log(`Products: ${uniqueProducts.length}`);
  console.log(`Pages: ${page}`);
  console.log(`Saved: ${outputFile}`);
  console.log("================================");
}

syncCatalog().catch((error) => {
  console.error("❌ Catalog sync failed:");
  console.error(error);

  process.exit(1);
});