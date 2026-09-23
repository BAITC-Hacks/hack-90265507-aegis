import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { downloadText } from "../lib/download";
export default function CheckoutPage() {
  const { cart, cartTotal, selectedCity } = useShop();
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  function exportRequest() {
    downloadText("EKTiQ-заявка.txt", ["ЗАЯВКА ДЛЯ СОГЛАСОВАНИЯ — НЕ ЗАКАЗ",new Date().toLocaleString("ru-RU"),"Город: "+selectedCity,"",
      ...cart.map((i,n)=>(n+1)+". "+i.product.name+" | арт. "+i.product.article+" | "+(i.product.stockCity||"город не подтверждён")+" | "+i.quantity+" шт. | "+i.product.price+" ₸/шт."),
      "", "Сумма по данным корзины: "+cartTotal+" ₸", "Доставка не включена. Цена и наличие требуют подтверждения EKT.",
      "", "Комментарий: "+note, "Заявка не отправлена. Согласуйте её с EKT через официальный сайт."].join("\n"));
    setSaved(true);
  }
  return <section className="container page-shell task-page"><span className="page-eyebrow">ЗАЯВКА НА ЗАКУПКУ</span><h1>Подготовить заявку</h1>
    <p>Это черновик для менеджера. Создание заказа и оплата на стороне EKT не подключены.</p>
    {!cart.length ? <Link to="/catalog">Добавьте товары из каталога</Link> : <>
      <ul>{cart.map(i=><li key={i.product.id}>{i.product.name} — {i.quantity} шт. · {i.product.stockCity||"город не подтверждён"}</li>)}</ul>
      <p>Город: {selectedCity}. Сумма: {cartTotal.toLocaleString("ru-RU")} ₸ без доставки.</p>
      <label>Комментарий к заявке<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Желаемые сроки, требования к сертификатам и вопросы менеджеру"/></label>
      <div className="task-actions"><button onClick={exportRequest}>Скачать заявку</button><Link to="/cart">Изменить корзину</Link><Link to="/help/contacts">Контакты EKT</Link></div>
      {saved&&<p role="status">Файл подготовлен для скачивания. Заявка не отправлена менеджеру.</p>}
    </>}
  </section>;
}
