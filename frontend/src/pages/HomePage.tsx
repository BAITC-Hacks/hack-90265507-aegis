import {
  ArrowRight,
  Camera,
  ClipboardList,
  FileSpreadsheet,
  GitCompareArrows,
  Search,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AssistantPanel from "../components/AssistantPanel";
import ProductCard from "../components/ProductCard";
import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import { api } from "../lib/api";
import type { Product } from "../types/product";

export default function HomePage() {
  const navigate = useNavigate();
  const {selectedCity}=useShop();
  const [heroQuery,setHeroQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatus] = useState("Загружаем товары EKT…");
  useEffect(() => {
    const controller = new AbortController();
    api<{items:{id:number}[]}>("/api/catalog/search?limit=4", {signal:controller.signal})
      .then(data => Promise.allSettled(data.items.map(p => api<Product>("/api/products/"+p.id+"?city="+encodeURIComponent(selectedCity), {signal:controller.signal}))))
      .then(results => {
        if(controller.signal.aborted) return;
        setProducts(results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]));
        setCatalogStatus(results.some(r=>r.status==="rejected")?"Часть товаров недоступна. Проверьте подключение EKT API.":"");
      }).catch(()=>{if(!controller.signal.aborted)setCatalogStatus("Не удалось получить товары EKT. Проверьте настройки API.");});
    return ()=>controller.abort();
  }, [selectedCity]);

  return (
    <>
      <section className="container hero">
        <div className="hero-main">
          <div className="hero-copy">
            <span className="eyebrow">
              <Zap size={16} />
              EKTiQ
            </span>

            <h1>
              Электротовары.
              <br />
              Найдены точно.
            </h1>

            <p>
              Найдите оборудование по названию, артикулу,
              техническим требованиям. Сравнивайте данные
              и уточняйте выбор в чате.
            </p>

            <div className="hero-search">
              <Search size={21} />

              <input
                value={heroQuery} onChange={e=>setHeroQuery(e.target.value)}
                placeholder="Например: автомат Legrand, 3P, 160A, 18kA"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  const query =
                    event.currentTarget.value.trim();

                  if (query) {
                    navigate(
                      `/catalog?q=${encodeURIComponent(query)}`
                    );
                  }
                }}
              />

              <button
                onClick={() =>
                  navigate("/catalog?q="+encodeURIComponent(heroQuery.trim()))
                }
              >
                Найти
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="example-queries">
              <span>Попробуйте:</span>

              <button
                onClick={() =>
                  navigate(
                    "/catalog?q=автомат 3P 160A"
                  )
                }
              >
                Автомат 3P 160A
              </button>

              <button
                onClick={() =>
                  navigate(
                    "/catalog?q=кабель"
                  )
                }
              >
                Кабель
              </button>

              <button
                onClick={() =>
                  navigate(
                    "/catalog?q=розетка IP44"
                  )
                }
              >
                Розетка IP44
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="finder-card">
              <div className="finder-top">
                <div className="finder-icon">
                  <Zap size={21} />
                </div>

                <div>
                  <strong>
                    Точный подбор
                  </strong>

                  <span>
                    По техническим требованиям
                  </span>
                </div>
              </div>

              <div className="requirement">
                <span>Запрос</span>
                <p>
                  Автомат · 3P · 160А · ≥18kA
                </p>
              </div>

              <div className="match-card">
                <div className="match-status">
                  <span className="status-dot" />
                  Пример запроса
                  <b>ДЕМО</b>
                </div>

                <strong>
                  DRX250 MT 3P 160А
                </strong>

                <small>
                  Legrand
                </small>

                <div className="match-specs">
                  <span>3P ✓</span>
                  <span>160A ✓</span>
                  <span>18kA ✓</span>
                </div>

                <div className="match-bottom">
                  <strong>
                    Цена из API
                  </strong>

                  <span>
                    Остаток из API
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-tools">
          <button
            onClick={() =>
              navigate(
                "/specification"
              )
            }
          >
            <span className="quick-icon">
              <FileSpreadsheet />
            </span>

            <span>
              <strong>
                Спецификация
              </strong>

              <small>
                XLSX, PDF, DOCX, CSV
              </small>
            </span>

            <ArrowRight />
          </button>

          <button
            onClick={() =>
              navigate("/identify")
            }
          >
            <span className="quick-icon">
              <Camera />
            </span>

            <span>
              <strong>
                Поиск по фото
              </strong>

              <small>
                Распознавание маркировки
              </small>
            </span>

            <ArrowRight />
          </button>

          <button
            onClick={() =>
              navigate(
                "/analogue"
              )
            }
          >
            <span className="quick-icon">
              <GitCompareArrows />
            </span>

            <span>
              <strong>
                Подобрать аналог
              </strong>

              <small>
                По характеристикам
              </small>
            </span>

            <ArrowRight />
          </button>

          <button
            onClick={() =>
              navigate(
                "/specification"
              )
            }
          >
            <span className="quick-icon">
              <ClipboardList />
            </span>

            <span>
              <strong>
                Собрать закупку
              </strong>

              <small>
                Список оборудования
              </small>
            </span>

            <ArrowRight />
          </button>
        </div>
      </section>

      <section className="container assistant-home-section">
        <div className="assistant-home-heading">
          <div>
            <span className="assistant-home-eyebrow">
              EKTiQ ASSISTANT
            </span>

            <h2>
              Опишите задачу обычными словами
            </h2>

            <p>
              EKTiQ поймёт технические требования,
              проверит каталог EKT и покажет
              подходящие товары.
            </p>
          </div>

          <div className="assistant-home-status">
            <span />
            Каталог EKT подключён
          </div>
        </div>

        <AssistantPanel />
      </section>

      <section className="container catalog-section">
        <div className="section-heading">
          <div>
            <span>КАТАЛОГ</span>
            <h2>
              Товары из каталога EKT
            </h2>
          </div>

          <button
            onClick={() =>
              navigate("/catalog")
            }
          >
            Смотреть все
            <ArrowRight size={17} />
          </button>
        </div>

        {catalogStatus && <p role="status">{catalogStatus}</p>}
        <div className="product-grid">
          {products
            .slice(0, 4)
            .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
        </div>
      </section>
    </>
  );
}
