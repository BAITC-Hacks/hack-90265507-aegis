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

export type CatalogSearchResponse = {
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: CatalogProduct[];
};