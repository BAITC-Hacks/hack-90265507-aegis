import fs from "node:fs";
import path from "node:path";

export type CatalogProduct = {
  id: number;
  name: string;
  article: string;
  price: number;
  image: string | null;
  url: string;
  url_api_detail: string;
  offers: unknown[];
};

type SearchOptions = {
  query?: string;
  page?: number;
  limit?: number;
};

const catalogPath = path.resolve("data", "catalog.json");

let catalog: CatalogProduct[] = [];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function loadCatalog() {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      `Catalog file not found: ${catalogPath}. Run npm run sync:catalog first.`
    );
  }

  const raw = fs.readFileSync(catalogPath, "utf-8");

  catalog = JSON.parse(raw) as CatalogProduct[];

  console.log(`📦 EKTiQ catalog loaded: ${catalog.length} products`);
}

loadCatalog();

export function getCatalogSize() {
  return catalog.length;
}

export function getCatalogProduct(id: number) {
  return catalog.find((product) => product.id === id);
}

export function searchCatalog({
  query = "",
  page = 1,
  limit = 24,
}: SearchOptions) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const normalizedQuery = normalize(query);

  let results = catalog;

  if (normalizedQuery) {
    const tokens = normalizedQuery
      .split(" ")
      .filter(Boolean);

    results = catalog
      .map((product) => {
        const normalizedName = normalize(product.name);
        const normalizedArticle = normalize(product.article ?? "");

        const searchable = `${normalizedName} ${normalizedArticle}`;

        let score = 0;

        if (normalizedArticle === normalizedQuery) {
          score += 1000;
        }

        if (normalizedName === normalizedQuery) {
          score += 800;
        }

        if (normalizedName.includes(normalizedQuery)) {
          score += 300;
        }

        for (const token of tokens) {
          if (normalizedArticle.includes(token)) {
            score += 100;
          }

          if (normalizedName.includes(token)) {
            score += 20;
          }
        }

        return {
          product,
          score,
          matchesAll: tokens.every((token) =>
            searchable.includes(token)
          ),
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => {
        if (a.matchesAll !== b.matchesAll) {
          return a.matchesAll ? -1 : 1;
        }

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.product.name.localeCompare(
          b.product.name,
          "ru"
        );
      })
      .map((result) => result.product);
  }

  const total = results.length;
  const totalPages = Math.max(
    1,
    Math.ceil(total / safeLimit)
  );

  const start = (safePage - 1) * safeLimit;
  const items = results.slice(
    start,
    start + safeLimit
  );

  return {
    query,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    items,
  };
}