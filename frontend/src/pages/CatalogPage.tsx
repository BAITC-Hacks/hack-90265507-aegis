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

import { API_URL } from "../lib/api";

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price);
}

export default function CatalogPage() {
  const {
    selectedCity, setSelectedCity,
    favorites,
    compare,
    toggleFavorite,
    toggleCompare,
    requestAddToCart,
  } = useShop();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const city = searchParams.get("city") ?? selectedCity;
  const filtersKey = searchParams.toString();
  const [metadata,setMetadata] = useState<Pick<CatalogSearchResponse,"coverage"|"technicalAvailable"|"notice">>({});
  function setFilter(key:string,value:string) {
    const next=new URLSearchParams(searchParams);
    if(value)next.set(key,value);else next.delete(key);
    next.set("city",key==="city"?value:city);next.set("page","1");
    if(key==="city")setSelectedCity(value);
    setSearchParams(next);
  }
  function resetFilters(){setSearchParams(new URLSearchParams({city,q:query,page:"1"}));}
  useEffect(()=>{
    if(!searchParams.has("city")){const next=new URLSearchParams(searchParams);next.set("city",selectedCity);setSearchParams(next,{replace:true});}
    else if(searchParams.get("city")!==selectedCity)setSelectedCity(searchParams.get("city")!);
  },[searchParams,selectedCity,setSearchParams,setSelectedCity]);

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


  const brand = searchParams.get("brand") || "";
  const sort = searchParams.get("sort") || "relevance";
  function setBrand(update: (current: string) => string) {
    const next = new URLSearchParams(searchParams);
    const value = update(brand);
    if(value) next.set("brand",value); else next.delete("brand");
    next.set("page","1"); setSearchParams(next);
  }
  function setSort(value: string) {
    const next = new URLSearchParams(searchParams); next.set("sort",value);
    next.set("page","1"); setSearchParams(next);
  }

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
            limit: "24", brand, sort, category, city,
            ...Object.fromEntries(["inStock","minPrice","maxPrice","productType","current","poles","voltage","scan"].map(k=>[k,searchParams.get(k)||""])),
          });

        const response = await fetch(
          `${API_URL}/api/catalog/search?${params}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const problem=await response.json().catch(()=>({}));
          throw new Error(problem.error||"Не удалось получить каталог.");
        }

        const data =
          (await response.json()) as CatalogSearchResponse;

        setProducts(data.items);
        setMetadata({coverage:data.coverage,technicalAvailable:data.technicalAvailable,notice:data.notice});
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
          err instanceof Error ? err.message : "Не удалось загрузить каталог."
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
  }, [query, page, brand, sort, category, city, filtersKey, searchParams]);

  function handleSearch(
    event: FormEvent
  ) {
    event.preventDefault();

    const value = input.trim();

    const next =
      new URLSearchParams(searchParams);

    next.delete("q");
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
        `${API_URL}/api/products/${productId}?city=${encodeURIComponent(city)}`
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

      {category && <p>Группа: {category} · подбор по названию. <button onClick={()=>{const next=new URLSearchParams(searchParams);next.delete("category");next.set("page","1");setSearchParams(next);}}>Сбросить категорию</button></p>}
      <div className="catalog-toolbar">
        <div className="catalog-filter-pills">
  <label><input type="checkbox" checked={searchParams.get("inStock")==="true"} onChange={e=>setFilter("inStock",e.target.checked?"true":"")}/> В наличии в выбранном городе</label>
  <button type="button" className={brand === "Legrand" ? "active" : ""} onClick={() => setBrand((value) => value === "Legrand" ? "" : "Legrand")}>Legrand</button>
  <button type="button" className={brand === "Schneider Electric" ? "active" : ""} onClick={() => setBrand((value) => value === "Schneider Electric" ? "" : "Schneider Electric")}>Schneider Electric</button>
  <button type="button" className={brand === "ABB" ? "active" : ""} onClick={() => setBrand((value) => value === "ABB" ? "" : "ABB")}>ABB</button>
</div>

        <select aria-label="Сортировка" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="relevance">
            По соответствию
          </option>

          <option value="price-asc">
            Сначала дешевле
          </option>

          <option value="price-desc">
            Сначала дороже
          </option>
          <option value="name">По названию</option>
          <option value="stock">По подтверждённому остатку</option>
        </select>
      </div>

      <form className="catalog-filter-pills catalog-verified-filters" onSubmit={e=>{
        e.preventDefault();const data=new FormData(e.currentTarget);const next=new URLSearchParams(searchParams);
        for(const key of ["minPrice","maxPrice","brand","category","productType","current","poles","voltage"]){
          const value=String(data.get(key)||"").trim();if(value)next.set(key,value);else next.delete(key);
        }
        next.set("city",city);next.set("page","1");setSearchParams(next);
      }} key={filtersKey}>
        <label>Город<select aria-label="Город каталога" value={city} onChange={e=>setFilter("city",e.target.value)}>
          {[...new Set(["Астана","Алматы","Шымкент","Караганда","Актобе","Атырау","Актау","Тараз","Талдыкорган","Усть-Каменогорск",city])].map(c=><option key={c}>{c}</option>)}
        </select></label>
        <label>Цена от, ₸<input name="minPrice" type="number" min="0" step="any" defaultValue={searchParams.get("minPrice")||""}/></label>
        <label>Цена до, ₸<input name="maxPrice" type="number" min="0" step="any" defaultValue={searchParams.get("maxPrice")||""}/></label>
        <label>Бренд<input name="brand" defaultValue={brand} placeholder="Например, Legrand"/></label>
        <label>Категория<select name="category" defaultValue={category}><option value="">Все категории</option>{["Автоматика","Кабель и провод","Освещение","Розетки и выключатели","Щитовое оборудование","Инструменты"].map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Тип товара<select name="productType" defaultValue={searchParams.get("productType")||""}><option value="">Все типы</option>{["Автоматический выключатель","Контактор","Розетка","Выключатель","Кабель"].map(c=><option key={c}>{c}</option>)}</select></label>
        {(["current","poles","voltage"] as const).filter(k=>metadata.technicalAvailable?.includes(k)||searchParams.has(k)).map(k=><label key={k}>{({current:"Ток, А",poles:"Полюса",voltage:"Напряжение, В"})[k]}<input name={k} type="number" min={k==="poles"?1:0.001} step={k==="poles"?1:"any"} defaultValue={searchParams.get(k)||""}/></label>)}
        <button type="submit">Применить фильтры</button><button type="button" onClick={resetFilters}>Сбросить фильтры</button>
      </form>
      {metadata.coverage&&<p role="status">
        {metadata.notice} Проверено: {metadata.coverage.checked} из {metadata.coverage.candidates} кандидатов.
        {metadata.coverage.unknownPrice>0&&" Цена не подтверждена: "+metadata.coverage.unknownPrice+"."}
        {metadata.coverage.unknownStock>0&&" Остаток не подтверждён: "+metadata.coverage.unknownStock+"."}
        {metadata.coverage.unknownTechnical>0&&" Характеристики не подтверждены: "+metadata.coverage.unknownTechnical+"."}
        {metadata.coverage.failed>0&&" Ошибки получения EKT: "+metadata.coverage.failed+"."}
        {metadata.coverage.partial&&Number(searchParams.get("scan")||120)<600&&<button onClick={()=>setFilter("scan",String(Math.min(600,Number(searchParams.get("scan")||120)+120)))}>Проверить ещё 120 кандидатов</button>}
      </p>}

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
              Ничего не найдено в проверенной выборке
            </strong>
            <button onClick={resetFilters}>Сбросить ограничения</button>

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
                          {product.price !== null && product.price >
                          0 ? (
                            <>
                              {formatPrice(
                                product.price
                              )}{" "}
                              ₸
                            </>
                          ) : (
                            "Цена не подтверждена"
                          )}
                        </div>

                        <small>{product.stockCity||city}: {typeof product.cityQuantity==="number"?product.cityQuantity+" шт.":"остаток не подтверждён"}</small>
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
