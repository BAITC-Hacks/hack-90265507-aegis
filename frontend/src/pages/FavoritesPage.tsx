import {
  Heart,
  ImageOff,
  LoaderCircle,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";

import type { Product } from "../types/product";

const API_URL = "http://localhost:3001";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function FavoritesPage() {
  const {
    favorites,
    toggleFavorite,
    requestAddToCart,
  } = useShop();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFavorites() {
      if (favorites.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const results = await Promise.all(
          favorites.map(async (id) => {
            const response = await fetch(
              `${API_URL}/api/products/${id}`,
              {
                signal: controller.signal,
              }
            );

            if (!response.ok) {
              throw new Error(
                `Failed to load product ${id}`
              );
            }

            return response.json() as Promise<Product>;
          })
        );

        setProducts(results);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(err);

        setError(
          "Не удалось загрузить избранные товары."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      controller.abort();
    };
  }, [favorites]);

  if (loading) {
    return (
      <section className="container favorites-page">
        <div className="catalog-state">
          <LoaderCircle
            className="catalog-loader"
            size={36}
          />

          <strong>
            Загружаем избранное
          </strong>

          <span>
            Получаем актуальные данные EKT
          </span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container favorites-page">
        <div className="catalog-state catalog-error">
          <strong>
            Не удалось загрузить избранное
          </strong>

          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (favorites.length === 0) {
    return (
      <section className="container favorites-page">
        <div className="favorites-empty">
          <div className="favorites-empty-icon">
            <Heart size={30} />
          </div>

          <h1>В избранном пока ничего нет</h1>

          <p>
            Сохраняйте оборудование, чтобы быстро
            вернуться к нему позже.
          </p>

          <Link to="/catalog">
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container favorites-page">
      <div className="favorites-heading">
        <span className="page-eyebrow">
          ИЗБРАННОЕ
        </span>

        <h1>Сохранённые товары</h1>

        <p>
          {products.length}{" "}
          {products.length === 1
            ? "товар"
            : "товаров"}
        </p>
      </div>

      <div className="favorites-grid">
        {products.map((product) => {
          const brand =
            product.brand ||
            product.properties
              ?.TORGOVAYA_MARKA ||
            "EKT";

          const inStock =
            product.quantity > 0;

          return (
            <article
              className="favorite-product-card"
              key={product.id}
            >
              <div className="favorite-product-image">
                <Link
                  to={`/product/${product.id}`}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  ) : (
                    <div className="favorite-image-empty">
                      <ImageOff size={30} />

                      <span>
                        Нет изображения
                      </span>
                    </div>
                  )}
                </Link>

                <button
                  className="favorite-remove-button"
                  onClick={() =>
                    toggleFavorite(product.id)
                  }
                  title="Удалить из избранного"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="favorite-product-info">
                <span className="favorite-brand">
                  {brand}
                </span>

                <Link
                  to={`/product/${product.id}`}
                >
                  <h2>
                    {product.name}
                  </h2>
                </Link>

                <span className="favorite-article">
                  Арт. {product.article || "—"}
                </span>

                <div
                  className={`favorite-stock ${
                    !inStock ? "out" : ""
                  }`}
                >
                  <span />

                  {inStock
                    ? `В наличии · ${product.quantity} шт.`
                    : "Нет в наличии"}
                </div>

                <div className="favorite-bottom">
                  <strong>
                    {product.price > 0
                      ? `${formatPrice(
                          product.price
                        )} ₸`
                      : "Цена по запросу"}
                  </strong>

                  <button
                    disabled={!inStock}
                    onClick={() =>
                      requestAddToCart(
                        product,
                        1
                      )
                    }
                    title={
                      inStock
                        ? "Добавить в корзину"
                        : "Нет в наличии"
                    }
                  >
                    <ShoppingCart
                      size={17}
                    />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}