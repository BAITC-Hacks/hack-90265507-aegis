import { Check, ShoppingCart, X } from "lucide-react";

import { useShop } from "../context/ShopContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function CartConfirmModal() {
  const {
    pendingCartItem,
    confirmAddToCart,
    cancelAddToCart,
  } = useShop();

  if (!pendingCartItem) {
    return null;
  }

  const { product, quantity } = pendingCartItem;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={cancelAddToCart}
    >
      <div
        className="cart-confirm-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={cancelAddToCart}
          aria-label="Закрыть"
        >
          <X size={19} />
        </button>

        <div className="modal-icon">
          <ShoppingCart size={23} />
        </div>

        <span className="modal-label">
          ПОДТВЕРЖДЕНИЕ
        </span>

        <h2>Добавить товар в корзину?</h2>

        <div className="modal-product">
          <div>
            <strong>{product.name}</strong>
            <span>Арт. {product.article}</span>
          </div>

          <strong>
            {formatPrice(product.price)} ₸
          </strong>
        </div>

        <div className="modal-summary">
          <span>
            Количество
            <strong>{quantity} шт.</strong>
          </span>

          <span>
            Доступно
            <strong>{product.quantity} шт.</strong>
          </span>

          <span>
            Итого
            <strong>
              {formatPrice(product.price * quantity)} ₸
            </strong>
          </span>
        </div>

        <div className="modal-buttons">
          <button
            className="modal-cancel"
            onClick={cancelAddToCart}
          >
            Отмена
          </button>

          <button
            className="modal-confirm"
            onClick={confirmAddToCart}
          >
            <Check size={18} />
            Да, добавить
          </button>
        </div>
      </div>
    </div>
  );
}