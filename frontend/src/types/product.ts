export type StoreStock = {
  id: number;
  name: string;
  quantity: number;
};

export type Product = {
  id: number;
  name: string;
  article: string;

  brand?: string;
  category?: string;

  price: number;
  quantity: number;

  image?: string | null;
  url?: string;

  description?: string;

  stores?: StoreStock[];

  properties?: Record<string, string>;

  certificates?: string[];

  offers?: unknown[];
};

export type CartItem = {
  product: Product;
  quantity: number;
};