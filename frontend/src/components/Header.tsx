import {
  Camera,
  ChevronDown,
  FileSpreadsheet,
  GitCompareArrows,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useShop } from "../context/ShopContext";

const categories = [
  "Автоматика",
  "Кабель и провод",
  "Освещение",
  "Розетки и выключатели",
  "Щитовое оборудование",
  "Инструменты",
];

export default function Header() {
  const navigate = useNavigate();
  const { cartCount, favorites, compare, selectedCity } = useShop();
  const [search, setSearch] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      navigate("/catalog");
      return;
    }

    navigate(`/catalog?q=${encodeURIComponent(query)}`);
  }

  return (
    <header>
      <div className="utility-bar">
        <div className="container utility-inner">
          <button className="location-button">
            <MapPin size={15} />
            {selectedCity}
            <ChevronDown size={14} />
          </button>

          <div className="utility-links">
            <button>Доставка и оплата</button>
            <button>Для бизнеса</button>
            <button>Контакты</button>
          </div>
        </div>
      </div>

      <div className="main-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="EKTiQ">
            <span className="brand-mark">
              E<span>Q</span>
            </span>
          </Link>

          <Link className="catalog-button" to="/catalog">
            <Menu size={20} />
            Каталог
          </Link>

          <form className="search-shell" onSubmit={handleSearch}>
            <Search size={20} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название, артикул или опишите, что вам нужно"
              aria-label="Поиск товаров"
            />

            <div className="search-actions">
              <button
                type="button"
                title="Найти по фото"
                onClick={() => navigate("/identify")}
              >
                <Camera size={20} />
              </button>

              <button
                type="button"
                title="Загрузить спецификацию"
                onClick={() => navigate("/specification")}
              >
                <FileSpreadsheet size={20} />
              </button>

              <button type="submit" className="search-submit">
                Найти
              </button>
            </div>
          </form>

          <nav className="account-actions">
            <Link to="/compare">
              <GitCompareArrows />
              <span>Сравнить</span>

              {compare.length > 0 && (
                <b>{compare.length}</b>
              )}
            </Link>

            <Link to="/favorites">
              <Heart />
              <span>Избранное</span>

              {favorites.length > 0 && (
                <b>{favorites.length}</b>
              )}
            </Link>

            <Link to="/profile">
              <UserRound />
              <span>Профиль</span>
            </Link>

            <Link to="/cart" className="cart-action">
              <ShoppingCart />
              <span>Корзина</span>

              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </nav>
        </div>
      </div>

      <div className="category-bar">
        <div className="container categories">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                navigate(
                  `/catalog?category=${encodeURIComponent(category)}`
                )
              }
            >
              {category}
            </button>
          ))}

          <button
            className="category-more"
            onClick={() => navigate("/catalog")}
          >
            Все категории
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}