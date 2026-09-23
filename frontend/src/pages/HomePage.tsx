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

import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function HomePage() {
  const navigate = useNavigate();

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
              техническим требованиям, фотографии или
              спецификации.
            </p>

            <div className="hero-search">
              <Search size={21} />

              <input
                placeholder="Например: автомат Legrand, 3P, 160A, 18kA"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  const query = event.currentTarget.value.trim();

                  if (query) {
                    navigate(
                      `/catalog?q=${encodeURIComponent(query)}`
                    );
                  }
                }}
              />

              <button
                onClick={() => navigate("/catalog")}
              >
                Найти
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="example-queries">
              <span>Попробуйте:</span>

              <button
                onClick={() =>
                  navigate("/catalog?q=автомат 3P 160A")
                }
              >
                Автомат 3P 160A
              </button>

              <button
                onClick={() =>
                  navigate("/catalog?q=кабель")
                }
              >
                Кабель
              </button>

              <button
                onClick={() =>
                  navigate("/catalog?q=розетка IP44")
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
                  <strong>Точный подбор</strong>
                  <span>По техническим требованиям</span>
                </div>
              </div>

              <div className="requirement">
                <span>Запрос</span>
                <p>Автомат · 3P · 160А · ≥18kA</p>
              </div>

              <div className="match-card">
                <div className="match-status">
                  <span className="status-dot" />
                  Соответствие
                  <b>98%</b>
                </div>

                <strong>DRX250 MT 3P 160А</strong>
                <small>Legrand</small>

                <div className="match-specs">
                  <span>3P ✓</span>
                  <span>160A ✓</span>
                  <span>18kA ✓</span>
                </div>

                <div className="match-bottom">
                  <strong>64 920 ₸</strong>
                  <span>23 шт.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-tools">
          <button onClick={() => navigate("/specification")}>
            <span className="quick-icon">
              <FileSpreadsheet />
            </span>

            <span>
              <strong>Спецификация</strong>
              <small>Excel, PDF или Word</small>
            </span>

            <ArrowRight />
          </button>

          <button onClick={() => navigate("/identify")}>
            <span className="quick-icon">
              <Camera />
            </span>

            <span>
              <strong>Поиск по фото</strong>
              <small>Оборудование и маркировка</small>
            </span>

            <ArrowRight />
          </button>

          <button
            onClick={() => navigate("/catalog?mode=analogue")}
          >
            <span className="quick-icon">
              <GitCompareArrows />
            </span>

            <span>
              <strong>Подобрать аналог</strong>
              <small>По характеристикам</small>
            </span>

            <ArrowRight />
          </button>

          <button onClick={() => navigate("/specification")}>
            <span className="quick-icon">
              <ClipboardList />
            </span>

            <span>
              <strong>Собрать закупку</strong>
              <small>Список оборудования</small>
            </span>

            <ArrowRight />
          </button>
        </div>
      </section>

      <section className="container catalog-section">
        <div className="section-heading">
          <div>
            <span>КАТАЛОГ</span>
            <h2>Популярные товары</h2>
          </div>

          <button onClick={() => navigate("/catalog")}>
            Смотреть все
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
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