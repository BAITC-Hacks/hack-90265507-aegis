import {
  Bot,
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

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  useShop,
} from "../context/ShopContext";

const categories = [
  "Автоматика",
  "Кабель и провод",
  "Освещение",
  "Розетки и выключатели",
  "Щитовое оборудование",
  "Инструменты",
];

type HeaderProps = {
  onAssistantOpen: () => void;
};

export default function Header({
  onAssistantOpen,
}: HeaderProps) {
  const navigate =
    useNavigate();

  const {
    cartCount,
    favorites,
    compare,
    selectedCity,
    setSelectedCity,
  } = useShop();

  const [
    search,
    setSearch,
  ] = useState("");

  function handleSearch(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const query =
      search.trim();

    if (!query) {
      navigate("/catalog");
      return;
    }

    navigate(
      `/catalog?q=${encodeURIComponent(query)}`
    );
  }

  return (
    <header>
      <div className="utility-bar">
        <div className="container utility-inner">
          <label className="location-button"><MapPin size={15}/><select aria-label="Город" value={selectedCity} onChange={e=>{setSelectedCity(e.target.value);if(window.location.pathname==="/catalog"){const params=new URLSearchParams(window.location.search);params.set("city",e.target.value);params.set("page","1");navigate("/catalog?"+params);}}}>
            {["Астана","Алматы","Шымкент","Караганда","Актобе","Атырау",...(!["Астана","Алматы","Шымкент","Караганда","Актобе","Атырау"].includes(selectedCity)?[selectedCity]:[])].map(city=><option key={city}>{city}</option>)}
          </select></label>

          <div className="utility-links">
            <button onClick={()=>navigate("/help/delivery")}>
              Доставка и оплата
            </button>

            <button onClick={()=>navigate("/help/business")}>
              Для бизнеса
            </button>

            <button onClick={()=>navigate("/help/contacts")}>
              Контакты
            </button>
          </div>
        </div>
      </div>

      <div className="main-header">
        <div className="container header-inner">
          <Link
            className="brand"
            to="/"
            aria-label="EKTiQ"
          >
            <span className="brand-mark">
              E<span>Q</span>
            </span>
          </Link>

          <Link
            className="catalog-button"
            to="/catalog"
          >
            <Menu size={20} />
            Каталог
          </Link>

          <form
            className="search-shell"
            onSubmit={
              handleSearch
            }
          >
            <Search size={20} />

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Название или артикул"
              aria-label="Поиск товаров"
            />

            <div className="search-actions">
              <button
                type="button"
                title="Найти по фото"
                onClick={() =>
                  navigate(
                    "/identify"
                  )
                }
              >
                <Camera
                  size={20}
                />
              </button>

              <button
                type="button"
                title="Загрузить спецификацию"
                onClick={() =>
                  navigate(
                    "/specification"
                  )
                }
              >
                <FileSpreadsheet
                  size={20}
                />
              </button>

              <button
                type="submit"
                className="search-submit"
              >
                Найти
              </button>
            </div>
          </form>

          <button
            type="button"
            className="assistant-header-button"
            onClick={
              onAssistantOpen
            }
          >
            <Bot size={19} />

            <span>
              EKTiQ
            </span>
          </button>

          <nav className="account-actions">
            <Link to="/compare">
              <GitCompareArrows />

              <span>
                Сравнить
              </span>

              {compare.length >
                0 && (
                <b>
                  {
                    compare.length
                  }
                </b>
              )}
            </Link>

            <Link to="/favorites">
              <Heart />

              <span>
                Избранное
              </span>

              {favorites.length >
                0 && (
                <b>
                  {
                    favorites.length
                  }
                </b>
              )}
            </Link>

            <Link to="/profile">
              <UserRound />

              <span>
                Профиль
              </span>
            </Link>

            <Link
              to="/cart"
              className="cart-action"
            >
              <ShoppingCart />

              <span>
                Корзина
              </span>

              {cartCount >
                0 && (
                <b>
                  {cartCount}
                </b>
              )}
            </Link>
          </nav>
        </div>
      </div>

      <div className="category-bar">
        <div className="container categories">
          {categories.map(
            (category) => (
              <button
                key={
                  category
                }
                onClick={() =>
                  navigate(
                    `/catalog?category=${encodeURIComponent(category)}`
                  )
                }
              >
                {category}
              </button>
            )
          )}

          <button
            className="category-more"
            onClick={() =>
              navigate(
                "/catalog"
              )
            }
          >
            Все категории
            <ChevronDown
              size={14}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
