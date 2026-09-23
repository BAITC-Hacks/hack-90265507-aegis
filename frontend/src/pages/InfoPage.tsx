import { Link, useParams } from "react-router-dom";
import { useShop } from "../context/ShopContext";
export default function InfoPage() {
  const { topic } = useParams();
  const { selectedCity } = useShop();
  const title = topic === "business" ? "Закупки для бизнеса" : topic === "contacts" ? "Связаться с EKT" : "Доставка и оплата";
  return <section className="container page-shell task-page"><span className="page-eyebrow">ПОМОЩЬ ПОКУПАТЕЛЮ</span><h1>{title}</h1>
    {topic === "business" ? <>
      <p>Загрузите спецификацию, проверьте товары и соберите корзину. Затем скачайте заявку для согласования с менеджером EKT.</p>
      <div className="task-actions"><Link to="/specification">Загрузить спецификацию</Link><Link to="/cart">Подготовить заявку из корзины</Link></div>
      <p>Счёт, скидки, документы для юридического лица и условия договора согласуются с EKT. Заявка здесь не отправляется автоматически.</p>
    </> : topic === "contacts" ? <>
      <p>Для уточнения доставки, сертификатов и условий покупки обратитесь к EKT через официальный сайт. Контактные телефоны не передаются каталогом API.</p>
      <a href="https://ekt.kz" target="_blank" rel="noreferrer">Открыть официальный сайт EKT ↗</a>
      <p>Можно заранее подготовить список товаров и вопросов:</p><Link to="/checkout">Подготовить заявку</Link>
    </> : <>
      <p>Выбранный город: <strong>{selectedCity}</strong>. В карточках товаров показаны остатки по складам, если EKT передал эти данные.</p>
      <ol><li>Выберите товары и подтвердите добавление в корзину.</li><li>Скачайте заявку и согласуйте с EKT доставку или самовывоз.</li><li>Уточните стоимость доставки, сроки, способы оплаты и минимальную партию у менеджера.</li></ol>
      <p>Подтверждённых тарифов и правил оплаты в API нет. На этом сайте платёжные данные не запрашиваются и оплата не принимается.</p>
      <div className="task-actions"><Link to="/cart">Перейти в корзину</Link><Link to="/help/contacts">Связаться с EKT</Link></div>
    </>}
  </section>;
}
