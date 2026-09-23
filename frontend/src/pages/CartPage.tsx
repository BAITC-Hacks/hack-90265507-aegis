import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function CartPage() {
  const {
    cart,
    cartCount,
    cartTotal,
    updateCartQuantity,
    removeFromCart,
  } = useShop();

  if (cart.length === 0) {
    return (
      <section className="container cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">
            <ShoppingCart size={32} />
          </div>

          <h1>Корзина пуста</h1>

          <p>
            Найдите нужное оборудование в каталоге
            и добавьте его после подтверждения.
          </p>

          <Link to="/catalog">
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container cart-page">
      <Link
        className="product-back"
        to="/catalog"
      >
        <ArrowLeft size={16} />
        Продолжить покупки
      </Link>

      <div className="cart-heading">
        <div>
          <span className="page-eyebrow">
            КОРЗИНА
          </span>

          <h1>Ваша закупка</h1>

          <p>
            {cartCount} шт. · {cart.length}{" "}
            {cart.length === 1
              ? "позиция"
              : "позиций"}
          </p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map(({ product, quantity }) => {
            const reachedStock =
              quantity >= product.quantity;

            return (
              <article
                className="cart-item"
                key={product.id}
              >
                <Link
                  className="cart-item-image"
                  to={`/product/${product.id}`}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  ) : (
                    <PackageCheck size={30} />
                  )}
                </Link>

                <div className="cart-item-info">
                  <span className="cart-item-brand">
                    {product.brand ||
                      product.properties
                        ?.TORGOVAYA_MARKA ||
                      "EKT"}
                  </span>

                  <Link
                    to={`/product/${product.id}`}
                  >
                    <h2>{product.name}</h2>
                  </Link>

                  <span className="cart-item-article">
                    Арт. {product.article || "—"}
                  </span>

                  <div className="cart-stock">
                    <CheckCircle2 size={14} />

                    В наличии:{" "}
                    {product.quantity} шт.
                  </div>
                </div>

                <div className="cart-item-controls">
                  <div className="cart-item-price">
                    <strong>
                      {formatPrice(
                        product.price * quantity
                      )}{" "}
                      ₸
                    </strong>

                    {quantity > 1 && (
                      <span>
                        {formatPrice(product.price)} ₸
                        / шт.
                      </span>
                    )}
                  </div>

                  <div className="cart-actions-row">
                    <div className="cart-quantity">
                      <button
                        onClick={() => {
                          if (quantity <= 1) {
                            removeFromCart(
                              product.id
                            );
                            return;
                          }

                          updateCartQuantity(
                            product.id,
                            quantity - 1
                          );
                        }}
                        title={
                          quantity === 1
                            ? "Удалить"
                            : "Уменьшить"
                        }
                      >
                        {quantity === 1 ? (
                          <Trash2 size={15} />
                        ) : (
                          <Minus size={15} />
                        )}
                      </button>

                      <strong>{quantity}</strong>

                      <button
                        disabled={reachedStock}
                        onClick={() =>
                          updateCartQuantity(
                            product.id,
                            quantity + 1
                          )
                        }
                        title={
                          reachedStock
                            ? "Достигнут доступный остаток"
                            : "Увеличить"
                        }
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <button
                      className="cart-remove"
                      onClick={() =>
                        removeFromCart(product.id)
                      }
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  </div>

                  {reachedStock && (
                    <span className="stock-limit">
                      Максимальный доступный
                      остаток
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="cart-summary">
          <span className="cart-summary-label">
            ИТОГО
          </span>

          <h2>Ваша закупка</h2>

          <div className="cart-summary-lines">
            <div>
              <span>Товаров</span>
              <strong>{cartCount} шт.</strong>
            </div>

            <div>
              <span>Позиций</span>
              <strong>{cart.length}</strong>
            </div>

            <div>
              <span>Доставка</span>
              <strong>Рассчитывается</strong>
            </div>
          </div>

          <div className="cart-total">
            <span>Итого</span>

            <strong>
              {formatPrice(cartTotal)} ₸
            </strong>
          </div>

          <button className="checkout-button">
            Перейти к оформлению
          </button>

          <p className="checkout-note">
            Оформление заказа будет доступно после
            подтверждения условий покупки.
          </p>

          <div className="cart-benefits">
            <div>
              <ShieldCheck size={17} />

              <span>
                <strong>
                  Проверенные данные
                </strong>

                <small>
                  Остаток получен из EKT
                </small>
              </span>
            </div>

            <div>
              <Truck size={17} />

              <span>
                <strong>
                  Доставка
                </strong>

                <small>
                  Условия уточняются при
                  оформлении
                </small>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}