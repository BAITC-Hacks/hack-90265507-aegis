import { useShop } from "../context/ShopContext";

export default function ComparePage() {
  const { compare } = useShop();

  return (
    <section className="container page-shell">
      <span className="page-eyebrow">СРАВНЕНИЕ</span>
      <h1>Сравнение товаров</h1>
      <p>Выбрано товаров: {compare.length}</p>
    </section>
  );
}