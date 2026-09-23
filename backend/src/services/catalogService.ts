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
  all?: boolean;
  page?: number;
  limit?: number;
  brand?: string;
  category?: string;
  sort?: "relevance" | "price-asc" | "price-desc" | "name";
};

const catalogPath = path.resolve("data", "catalog.json");

let catalog: CatalogProduct[] = [];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/автоматический выключатель|автомат(?:ы)?|(?:^|\s)ав(?=\s)/g, "автомат")
    .replace(/(\d+)\s*[aа](?=\s|$|[,.;])/g, "$1а")
    .replace(/(\d+)\s*[pпф](?=\s|$|[,.;])/g, "$1p")
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
  all = false,
  page = 1,
  limit = 24,
  brand = "",
  category = "",
  sort = "relevance",
}: SearchOptions) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 100) : 24;

  const normalizedQuery = normalize(query);

  let results = catalog;
  // The lightweight API has no category IDs; these are explicit name-based groups.
  const groups: Record<string, RegExp> = {
    "Автоматика": /автомат|(?:^|\s)ав\s|контактор|реле|пускател|узо|диф\./i,
    "Кабель и провод": /кабел|провод|ввг|пвс|сип[- ]/i,
    "Освещение": /светильник|ламп|прожектор|светодиод/i,
    "Розетки и выключатели": /розетк|выключател/i,
    "Щитовое оборудование": /щит|шкаф|бокс|din[- ]|дин[- ]рейк/i,
    "Инструменты": /инструмент|отвертк|отвёртк|пассатиж|кусач|клещи|перфоратор|дрель|стриппер/i,
  };
  if (category) results = groups[category] ? results.filter(p=>groups[category].test(p.name)) : [];

  const normalizedBrand = normalize(brand);
  if (normalizedBrand) {
    results = results.filter((product) => {
      const searchableBrand = normalize(product.name);
      return searchableBrand.includes(normalizedBrand);
    });
  }

  if (normalizedQuery) {
    const tokens = normalizedQuery
      .split(" ")
      .filter(Boolean);

    results = results
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
      .filter((result) => result.matchesAll)
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

  if (sort === "price-asc") results = [...results].sort((a, b) => (a.price > 0 ? a.price : Infinity) - (b.price > 0 ? b.price : Infinity));
  if (sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);

  if(sort==="name")results=[...results].sort((a,b)=>a.name.localeCompare(b.name,"ru")||a.id-b.id);
  const total = results.length;
  const totalPages = Math.max(
    1,
    Math.ceil(total / safeLimit)
  );

  const start = (safePage - 1) * safeLimit;
  const items = all ? results : results.slice(
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
