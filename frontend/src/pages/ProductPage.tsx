import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Check,
  ChevronRight,
  FileText,
  GitCompareArrows,
  Heart,
  ImageOff,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { useShop } from "../context/ShopContext";
import type { Product } from "../types/product";

import { API_URL } from "../lib/api";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

function cleanPropertyName(key: string) {
  const knownNames: Record<string, string> = {
    TORGOVAYA_MARKA: "Торговая марка",
    KOLICHESTVO_POLYUSOV: "Количество полюсов",
    NOMINALNYY_TOK: "Номинальный ток",
    NOMINALNOE_NAPRYAZHENIE: "Номинальное напряжение",
    NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST:
      "Отключающая способность",
    TIP_USTANOVKI: "Тип установки",
    ARTIKULPOSTAVSHCHIKA: "Артикул поставщика",
    CML2_ARTICLE: "Артикул",
    CML2_BAR_CODE: "Штрихкод",
    OBYEM: "Тип оборудования",
    KRATNOST_MIN: "Минимальная кратность",
  };

  if (knownNames[key]) {
    return knownNames[key];
  }

  return key
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default function ProductPage() {
  const { id } = useParams();

  const {
    selectedCity,
    favorites,
    compare,
    toggleFavorite,
    toggleCompare,
    requestAddToCart,
  } = useShop();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) {
      setError("Некорректный ID товара");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/products/${id}?city=${encodeURIComponent(selectedCity)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Backend returned ${response.status}`
          );
        }

        const data = (await response.json()) as Product;

        setProduct(data);
        setQuantity(1);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(err);

        setError(
          "Не удалось получить данные товара."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [id,selectedCity]);

  const propertyEntries = useMemo(() => {
    if (!product?.properties) {
      return [];
    }

    return Object.entries(product.properties).filter(
      ([key, value]) => {
        if (!value) return false;

        return ![
          "RECOMMEND",
          "IMYAKARTINKI",
          "NOVINKA",
          "SPETSPREDLOZHENIE",
          "BRAND_PRIORITY",
        ].includes(key);
      }
    );
  }, [product]);

  const activeStores = useMemo(() => {
    if (!product?.stores) {
      return [];
    }

    return product.stores
      .filter((store) => store.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
  }, [product]);

  if (loading) {
    return (
      <section className="container product-page">
        <div className="catalog-state">
          <LoaderCircle
            className="catalog-loader"
            size={36}
          />

          <strong>Загружаем товар</strong>

          <span>
            Проверяем актуальные данные EKT
          </span>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="container product-page">
        <div className="catalog-state catalog-error">
          <strong>Не удалось открыть товар</strong>
          <span>{error}</span>

          <Link
            className="product-back-button"
            to="/catalog"
          >
            Вернуться в каталог
          </Link>
        </div>
      </section>
    );
  }

  const brand =
    product.brand ||
    product.properties?.TORGOVAYA_MARKA ||
    "EKT";

  const inStock = product.quantity > 0;

  const isFavorite = favorites.includes(product.id);
  const isCompared = compare.includes(product.id);

  const maxQuantity = Math.max(
    1,
    product.quantity
  );

  return (
    <section className="container product-page">
      <div className="product-breadcrumbs">
        <Link to="/">
          Главная
        </Link>

        <ChevronRight size={13} />

        <Link to="/catalog">
          Каталог
        </Link>

        <ChevronRight size={13} />

        <span>{brand}</span>
      </div>

      <Link
        className="product-back"
        to="/catalog"
      >
        <ArrowLeft size={16} />
        Назад в каталог
      </Link>

      <div className="product-detail-layout">
        <div className="product-gallery">
          <div className="product-main-image">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
              />
            ) : (
              <div className="product-detail-placeholder">
                <ImageOff size={44} />
                <span>Нет изображения</span>
              </div>
            )}
          </div>
        </div>

        <div className="product-detail-info">
          <span className="product-detail-brand">
            {brand}
          </span>

          <h1>{product.name}</h1>

          <div className="product-meta">
            <span>
              Арт. {product.article || "—"}
            </span>

            <span>
              ID {product.id}
            </span>
          </div>

          <div className="product-detail-actions">
            <button
              className={isFavorite ? "active" : ""}
              onClick={() =>
                toggleFavorite(product.id)
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

              {isFavorite
                ? "В избранном"
                : "В избранное"}
            </button>

            <button
              className={isCompared ? "active" : ""}
              onClick={() =>
                toggleCompare(product.id)
              }
            >
              <GitCompareArrows size={18} />

              {isCompared
                ? "В сравнении"
                : "Сравнить"}
            </button>
          </div>

          <div className="product-purchase-card">
            <div className="product-detail-price">
              {product.price > 0 ? (
                <>
                  {formatPrice(product.price)}{" "}
                  <small>₸</small>
                </>
              ) : (
                "Цена по запросу"
              )}
            </div>

            <div
              className={`product-detail-stock ${
                !inStock ? "out" : ""
              }`}
            >
              {inStock ? (
                <>
                  <Check size={16} />
                  {selectedCity}: в наличии · {product.quantity} шт.
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  {typeof product.quantity==="number"?selectedCity+": нет в наличии":selectedCity+": остаток не подтверждён"}
                </>
              )}
            </div>

            {inStock && (
              <div className="purchase-controls">
                <div className="quantity-control">
                  <button
                    onClick={() =>
                      setQuantity((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(
                          maxQuantity,
                          current + 1
                        )
                      )
                    }
                    disabled={
                      quantity >= maxQuantity
                    }
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  className="product-add-cart"
                  onClick={() =>
                    requestAddToCart(
                      product,
                      quantity
                    )
                  }
                >
                  <ShoppingCart size={19} />
                  Добавить в корзину
                </button>
              </div>
            )}

            <div className="purchase-note">
              Добавление произойдёт только после
              подтверждения количества.
            </div>
          </div>

          <div className="product-service-grid">
            <div>
              <Truck size={19} />

              <span>
                <strong>Доставка</strong>
                <small>
                  Условия зависят от региона
                </small>
              </span>
            </div>

            <div>
              <MapPin size={19} />

              <span>
                <strong>
                  {activeStores.length} складов
                </strong>

                <small>
                  с доступным остатком
                </small>
              </span>
            </div>

            <div>
              <ShieldCheck size={19} />

              <span>
                <strong>
                  Характеристики
                </strong>

                <small>
                  из данных EKT
                </small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="product-content-grid">
        <div className="product-content-main">
          {product.description && (
            <section className="product-section">
              <div className="product-section-heading">
                <Box size={19} />
                <h2>Описание</h2>
              </div>

              <p className="product-description">
                {product.description}
              </p>
            </section>
          )}

          <section className="product-section">
            <div className="product-section-heading">
              <FileText size={19} />
              <h2>Характеристики</h2>
            </div>

            {propertyEntries.length > 0 ? (
              <div className="property-table">
                {propertyEntries.map(
                  ([key, value]) => (
                    <div
                      className="property-row"
                      key={key}
                    >
                      <span>
                        {cleanPropertyName(key)}
                      </span>

                      <strong>{value}</strong>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="product-empty">
                Характеристики не указаны.
              </div>
            )}
          </section>
        </div>

        <aside className="warehouse-section">
          <div className="product-section-heading">
            <MapPin size={19} />
            <h2>Наличие по складам</h2>
          </div>

          <div className="warehouse-total">
            <span>Остаток: {selectedCity}</span>

            <strong>
              {typeof product.quantity==="number"?product.quantity+" шт.":"Не подтверждён"}
            </strong>
          </div>

          {activeStores.length > 0 ? (
            <div className="warehouse-list">
              {activeStores.map((store) => (
                <div
                  className="warehouse-row"
                  key={store.id}
                >
                  <div>
                    <span className="warehouse-dot" />
                    <strong>{store.name}</strong>
                  </div>

                  <span>
                    {store.quantity} шт.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="product-empty">
              Нет доступного остатка.
            </div>
          )}

          <div className="warehouse-refresh">
            <RotateCcw size={14} />
            Данные получены из EKT при открытии
            товара
          </div>
        </aside>
      </div>
    </section>
  );
}
