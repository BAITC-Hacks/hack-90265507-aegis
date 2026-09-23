import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api } from "../lib/api";
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
  cartError: string;
  cartBusy: boolean;

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

  const [cartError, setCartError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const cartLock = useRef(false);

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
    if (cartLock.current || !Number.isFinite(quantity) || !Number.isFinite(product.quantity) || product.quantity < 1) {
      return;
    }

    setCartError("");
    const safeQuantity = Math.max(
      1,
      Math.floor(Math.min(quantity, product.quantity))
    );

    setPendingCartItem({
      product,
      quantity: safeQuantity,
    });
  }

  async function confirmAddToCart() {
    if (!pendingCartItem || cartLock.current) {
      return;
    }

    const { product: previous, quantity } = pendingCartItem;
    cartLock.current = true; setCartBusy(true); setCartError("");
    try {
    const product = await api<Product>("/api/products/" + previous.id + "?fresh=true&city=" + encodeURIComponent(selectedCity));
    if (!Number.isFinite(product.quantity) || product.quantity < 1 || !Number.isFinite(product.price) || product.price <= 0) {
      setCartError("Покупка недоступна: уточните цену и наличие у EKT."); return;
    }
    if (product.price !== previous.price || product.quantity !== previous.quantity || product.stockCity !== previous.stockCity) {
      setPendingCartItem({product, quantity: Math.min(quantity, Math.floor(product.quantity))});
      setCartError("Проверены цена и остаток для выбранного города. Проверьте данные и подтвердите добавление."); return;
    }

    if(cart.some(item=>item.product.id===product.id&&item.product.stockCity!==product.stockCity)){setCartError("Этот товар уже есть в корзине для другого города. Удалите старую позицию перед сменой города.");return;}
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
            product,
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
    } catch { setCartError("Не удалось проверить наличие. Корзина не изменена. Повторите попытку."); }
    finally { cartLock.current = false; setCartBusy(false); }
  }

  function cancelAddToCart() {
    if (cartLock.current) return;
    setCartError("");
    setPendingCartItem(null);
  }

  function updateCartQuantity(productId: number, quantity: number) {
    if (!Number.isFinite(quantity)) return;
    quantity = Math.floor(quantity);
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
        cartError, cartBusy,

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
