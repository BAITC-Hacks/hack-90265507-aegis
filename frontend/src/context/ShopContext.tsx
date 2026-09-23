import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CartItem, Product } from "../types/product";

type PendingCartItem = {
  product: Product;
  quantity: number;
};

type ShopContextValue = {
  favorites: number[];
  compare: number[];
  cart: CartItem[];
  selectedCity: string;

  pendingCartItem: PendingCartItem | null;

  toggleFavorite: (productId: number) => void;
  toggleCompare: (productId: number) => void;

  requestAddToCart: (product: Product, quantity?: number) => void;
  confirmAddToCart: () => void;
  cancelAddToCart: () => void;

  updateCartQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;

  setSelectedCity: (city: string) => void;

  cartCount: number;
  cartTotal: number;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

type ShopProviderProps = {
  children: ReactNode;
};

export function ShopProvider({ children }: ShopProviderProps) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compare, setCompare] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [selectedCity, setSelectedCity] = useState("Астана");

  const [pendingCartItem, setPendingCartItem] =
    useState<PendingCartItem | null>(null);

  function toggleFavorite(productId: number) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function toggleCompare(productId: number) {
    setCompare((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function requestAddToCart(product: Product, quantity = 1) {
    if (product.quantity <= 0) {
      return;
    }

    const safeQuantity = Math.max(
      1,
      Math.min(quantity, product.quantity)
    );

    setPendingCartItem({
      product,
      quantity: safeQuantity,
    });
  }

  function confirmAddToCart() {
    if (!pendingCartItem) {
      return;
    }

    const { product, quantity } = pendingCartItem;

    setCart((current) => {
      const existingItem = current.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        return current.map((item) => {
          if (item.product.id !== product.id) {
            return item;
          }

          return {
            ...item,
            quantity: Math.min(
              item.quantity + quantity,
              product.quantity
            ),
          };
        });
      }

      return [
        ...current,
        {
          product,
          quantity: Math.min(quantity, product.quantity),
        },
      ];
    });

    setPendingCartItem(null);
  }

  function cancelAddToCart() {
    setPendingCartItem(null);
  }

  function updateCartQuantity(productId: number, quantity: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(
            1,
            Math.min(quantity, item.product.quantity)
          ),
        };
      })
    );
  }

  function removeFromCart(productId: number) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId)
    );
  }

  const cartCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.product.price * item.quantity,
        0
      ),
    [cart]
  );

  return (
    <ShopContext.Provider
      value={{
        favorites,
        compare,
        cart,
        selectedCity,
        pendingCartItem,

        toggleFavorite,
        toggleCompare,

        requestAddToCart,
        confirmAddToCart,
        cancelAddToCart,

        updateCartQuantity,
        removeFromCart,

        setSelectedCity,

        cartCount,
        cartTotal,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error(
      "useShop must be used inside ShopProvider"
    );
  }

  return context;
}