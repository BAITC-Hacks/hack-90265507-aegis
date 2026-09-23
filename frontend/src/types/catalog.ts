export type CatalogProduct = {
  id: number;
  name: string;
  article: string;
  price: number | null;
  priceConfirmed?:boolean;
  cityQuantity?:number|null;
  stockCity?:string|null;
  image: string | null;
  url: string;
  url_api_detail: string;
  offers: unknown[];
};

export type CatalogSearchResponse = {
  coverage?: {candidates:number;checked:number;failed:number;partial:boolean;unknownPrice:number;unknownStock:number;unknownTechnical:number};
  technicalAvailable?:string[];
  notice?:string;
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: CatalogProduct[];
};
