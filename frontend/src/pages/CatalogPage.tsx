import {
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Heart,
  ImageOff,
  LoaderCircle,
  Search,
  ShoppingCart,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import { useShop } from "../context/ShopContext";

import type {
  CatalogProduct,
  CatalogSearchResponse,
} from "../types/catalog";

import type { Product } from "../types/product";

const API_URL = "http://localhost:3001";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function CatalogPage() {
  const {
    favorites,
    compare,
    toggleFavorite,
    toggleCompare,
    requestAddToCart,
  } = useShop();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const query = searchParams.get("q") ?? "";

  const page = Math.max(
    1,
    Number(searchParams.get("page")) || 1
  );

  const [input, setInput] = useState(query);

  const [products, setProducts] = useState<
    CatalogProduct[]
  >([]);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [cartLoadingId, setCartLoadingId] =
    useState<number | null>(null);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams({
            q: query,
            page: String(page),
            limit: "24",
          });

        const response = await fetch(
          `${API_URL}/api/catalog/search?${params}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Backend returned ${response.status}`
          );
        }

        const data =
          (await response.json()) as CatalogSearchResponse;

        setProducts(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(err);

        setError(
          "Не удалось загрузить каталог. Проверьте backend."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () =>
      controller.abort();
  }, [query, page]);

  function handleSearch(
    event: FormEvent
  ) {
    event.preventDefault();

    const value = input.trim();

    const next =
      new URLSearchParams();

    if (value) {
      next.set("q", value);
    }

    next.set("page", "1");

    setSearchParams(next);
  }

  function changePage(
    nextPage: number
  ) {
    const next =
      new URLSearchParams(
        searchParams
      );

    next.set(
      "page",
      String(nextPage)
    );

    setSearchParams(next);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleAddToCart(
    productId: number
  ) {
    try {
      setCartLoadingId(productId);

      /*
       * Catalog results contain only lightweight
       * product information.
       *
       * Before allowing a cart request, fetch the
       * real EKT detail so we have verified stock.
       */
      const response = await fetch(
        `${API_URL}/api/products/${productId}`
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const product =
        (await response.json()) as Product;

      if (
        !product.quantity ||
        product.quantity <= 0
      ) {
        window.alert(
          "Товара сейчас нет в наличии."
        );

        return;
      }

      /*
       * This does NOT immediately modify the cart.
       *
       * ShopContext creates pendingCartItem and
       * CartConfirmModal asks the user to confirm.
       */
      requestAddToCart(
        product,
        1
      );
    } catch (err) {
      console.error(err);

      window.alert(
        "Не удалось получить актуальные данные товара."
      );
    } finally {
      setCartLoadingId(null);
    }
  }

  return (
    <section className="container catalog-page">
      {/* =========================
          PAGE HEADER
          ========================= */}

      <div className="catalog-page-header">
        <div>
          <span className="page-eyebrow">
            КАТАЛОГ EKT
          </span>

          <h1>
            {query
              ? `Результаты: «${query}»`
              : "Каталог электротоваров"}
          </h1>

          {!loading && !error && (
            <p>
              Найдено{" "}
              <strong>
                {new Intl.NumberFormat(
                  "ru-RU"
                ).format(total)}
              </strong>{" "}
              товаров
            </p>
          )}
        </div>
      </div>

      {/* =========================
          SEARCH
          ========================= */}

      <form
        className="catalog-search"
        onSubmit={handleSearch}
      >
        <Search size={20} />

        <input
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          placeholder="Название или артикул товара"
        />

        <button type="submit">
          Найти
        </button>
      </form>

      {/* =========================
          TOOLBAR
          ========================= */}

      <div className="catalog-toolbar">
        <div className="catalog-filter-pills">
          <button type="button">
            В наличии
          </button>

          <button type="button">
            Legrand
          </button>

          <button type="button">
            Schneider Electric
          </button>

          <button type="button">
            ABB
          </button>
        </div>

        <select defaultValue="relevance">
          <option value="relevance">
            По соответствию
          </option>

          <option value="price-asc">
            Сначала дешевле
          </option>

          <option value="price-desc">
            Сначала дороже
          </option>
        </select>
      </div>

      {/* =========================
          LOADING
          ========================= */}

      {loading && (
        <div className="catalog-state">
          <LoaderCircle
            className="catalog-loader"
            size={34}
          />

          <strong>
            Загружаем каталог
          </strong>

          <span>
            Ищем среди 15 035 товаров EKT
          </span>
        </div>
      )}

      {/* =========================
          ERROR
          ========================= */}

      {error && (
        <div className="catalog-state catalog-error">
          <strong>
            Каталог недоступен
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {/* =========================
          EMPTY
          ========================= */}

      {!loading &&
        !error &&
        products.length === 0 && (
          <div className="catalog-state">
            <Search size={34} />

            <strong>
              Ничего не найдено
            </strong>

            <span>
              Попробуйте изменить запрос
              или использовать артикул
              товара.
            </span>
          </div>
        )}

      {/* =========================
          PRODUCTS
          ========================= */}

      {!loading &&
        !error &&
        products.length > 0 && (
          <>
            <div className="catalog-real-grid">
              {products.map(
                (product) => {
                  const isFavorite =
                    favorites.includes(
                      product.id
                    );

                  const isCompared =
                    compare.includes(
                      product.id
                    );

                  const cartLoading =
                    cartLoadingId ===
                    product.id;

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                    >
                      {/* IMAGE */}

                      <div className="product-image">
                        <div className="product-card-actions">
                          {/* COMPARE */}

                          <button
                            type="button"
                            title={
                              isCompared
                                ? "Убрать из сравнения"
                                : "Добавить к сравнению"
                            }
                            className={
                              isCompared
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              toggleCompare(
                                product.id
                              )
                            }
                          >
                            <GitCompareArrows
                              size={18}
                            />
                          </button>

                          {/* FAVORITE */}

                          <button
                            type="button"
                            title={
                              isFavorite
                                ? "Убрать из избранного"
                                : "В избранное"
                            }
                            className={
                              isFavorite
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              toggleFavorite(
                                product.id
                              )
                            }
                          >
                            <Heart
                              size={18}
                              fill={
                                isFavorite
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>

                        <Link
                          to={`/product/${product.id}`}
                        >
                          {product.image ? (
                            <img
                              src={
                                product.image
                              }
                              alt={
                                product.name
                              }
                              loading="lazy"
                            />
                          ) : (
                            <div className="product-image-placeholder">
                              <ImageOff
                                size={30}
                              />

                              <span>
                                Нет изображения
                              </span>
                            </div>
                          )}
                        </Link>
                      </div>

                      {/* INFO */}

                      <div className="product-info">
                        <span className="product-brand">
                          EKT
                        </span>

                        <Link
                          to={`/product/${product.id}`}
                        >
                          <h3>
                            {product.name}
                          </h3>
                        </Link>

                        <span className="article">
                          Арт.{" "}
                          {product.article ||
                            "—"}
                        </span>

                        {/* PRICE */}

                        <div className="catalog-price">
                          {product.price >
                          0 ? (
                            <>
                              {formatPrice(
                                product.price
                              )}{" "}
                              ₸
                            </>
                          ) : (
                            "Цена по запросу"
                          )}
                        </div>

                        {/* BOTTOM */}

                        <div className="catalog-card-bottom">
                          <Link
                            className="details-button"
                            to={`/product/${product.id}`}
                          >
                            Подробнее
                          </Link>

                          <button
                            type="button"
                            className="add-cart"
                            title="Добавить в корзину"
                            disabled={
                              cartLoading
                            }
                            onClick={() =>
                              handleAddToCart(
                                product.id
                              )
                            }
                          >
                            {cartLoading ? (
                              <LoaderCircle
                                className="catalog-loader"
                                size={19}
                              />
                            ) : (
                              <ShoppingCart
                                size={19}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            {/* =========================
                PAGINATION
                ========================= */}

            <div className="pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  changePage(
                    page - 1
                  )
                }
              >
                <ChevronLeft
                  size={17}
                />

                Назад
              </button>

              <div>
                <strong>
                  {page}
                </strong>

                <span>
                  из
                </span>

                <span>
                  {totalPages}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  changePage(
                    page + 1
                  )
                }
              >
                Далее

                <ChevronRight
                  size={17}
                />
              </button>
            </div>
          </>
        )}
    </section>
  );
}