import {
  GitCompareArrows,
  Heart,
  ImageOff,
  ShoppingCart,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function ProductCard({ product }: ProductCardProps) {
  const {
    favorites,
    compare,
    toggleFavorite,
    toggleCompare,
    requestAddToCart,
  } = useShop();

  const isFavorite = favorites.includes(product.id);
  const isCompared = compare.includes(product.id);
  const inStock = product.quantity > 0;

  return (
    <article className="product-card">
      <div className="product-image">
        <span
          className={`product-badge ${
            !inStock ? "product-badge-out" : ""
          }`}
        >
          {inStock ? "В наличии" : "Нет в наличии"}
        </span>

        <div className="product-card-actions">
          <button
            className={isCompared ? "active" : ""}
            onClick={() => toggleCompare(product.id)}
            title="Сравнить"
          >
            <GitCompareArrows size={18} />
          </button>

          <button
            className={isFavorite ? "active" : ""}
            onClick={() => toggleFavorite(product.id)}
            title="В избранное"
          >
            <Heart
              size={18}
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>

        <Link to={`/product/${product.id}`}>
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div className="product-image-placeholder">
              <ImageOff size={30} />
              <span>Изображение товара</span>
            </div>
          )}
        </Link>
      </div>

      <div className="product-info">
        <span className="product-brand">{product.brand}</span>

        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>

        <span className="article">
          Арт. {product.article}
        </span>

        <div className={`stock ${!inStock ? "stock-out" : ""}`}>
          <span />
          {inStock
            ? `${product.quantity} шт. в наличии`
            : "Нет в наличии"}
        </div>

        <div className="product-bottom">
          <strong>{formatPrice(product.price)} ₸</strong>

          <button
            className="add-cart"
            title={
              inStock
                ? "Добавить в корзину"
                : "Нет в наличии"
            }
            disabled={!inStock}
            onClick={() => requestAddToCart(product)}
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}