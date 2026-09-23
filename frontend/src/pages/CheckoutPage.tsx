import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { downloadText } from "../lib/download";
export default function CheckoutPage() {
  const { cart, cartTotal, selectedCity } = useShop();
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  function containsPaymentData(value: string) {
    return /(?:^|[^\d])(?:\d[ -]?){12,18}\d(?![ -]?\d)/u.test(value)
      || /(?:cvv|cvc|пин|pin|код\s+из\s+смс|sms\s*code)\s*[:=—-]?\s*\d{3,8}/iu.test(value)
      || /(?:номер\s+карт[ыа]|card\s*(?:number)?|карт[аыуе])\s*[:=—-]?\s*(?:\d[ -]?){8,19}/iu.test(value)
      || /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b/i.test(value);
  }
  function exportRequest() {
    if (containsPaymentData(note)) {
      setNote("");
      setPrivacyError("Платёжные данные удалены. Укажите только требования к товарам и доставке.");
      return;
    }
    downloadText("EKTiQ-заявка.txt", ["ЗАЯВКА ДЛЯ СОГЛАСОВАНИЯ — НЕ ЗАКАЗ",new Date().toLocaleString("ru-RU"),"Город: "+selectedCity,"",
      ...cart.map((i,n)=>(n+1)+". "+i.product.name+" | арт. "+i.product.article+" | "+(i.product.stockCity||"город не подтверждён")+" | "+i.quantity+" шт. | "+i.product.price+" ₸/шт."),
      "", "Сумма по данным корзины: "+cartTotal+" ₸", "Доставка не включена. Цена и наличие требуют подтверждения EKT.",
      "", "Комментарий: "+note, "Заявка не отправлена. Согласуйте её с EKT через официальный сайт."].join("\n"));
    setSaved(true);
  }
  return <section className="container page-shell task-page"><span className="page-eyebrow">ЗАЯВКА НА ЗАКУПКУ</span><h1>Подготовить заявку</h1>
    <p>Это черновик для менеджера. Создание заказа и оплата на стороне EKT не подключены.</p>
    <p>Не вводите номера карт, CVV/CVC, PIN, банковские реквизиты, коды из SMS и лишние персональные данные. Комментарий остаётся в этой вкладке до скачивания; скачанный файл хранится на вашем устройстве.</p>
    {!cart.length ? <Link to="/catalog">Добавьте товары из каталога</Link> : <>
      <ul>{cart.map(i=><li key={i.product.id}>{i.product.name} — {i.quantity} шт. · {i.product.stockCity||"город не подтверждён"}</li>)}</ul>
      <p>Город: {selectedCity}. Сумма: {cartTotal.toLocaleString("ru-RU")} ₸ без доставки.</p>
      <label>Комментарий к заявке<textarea maxLength={2000} value={note} onChange={e=>{
        setSaved(false);
        if (containsPaymentData(e.target.value)) {
          setNote("");
          setPrivacyError("Платёжные данные удалены. Укажите только требования к товарам и доставке.");
        } else { setNote(e.target.value); setPrivacyError(""); }
      }} placeholder="Желаемые сроки, требования к сертификатам и вопросы менеджеру"/></label>
      {privacyError && <p role="alert">{privacyError}</p>}
      <div className="task-actions"><button onClick={exportRequest}>Скачать заявку</button><Link to="/cart">Изменить корзину</Link><Link to="/help/contacts">Контакты EKT</Link></div>
      {saved&&<p role="status">Файл подготовлен для скачивания. Заявка не отправлена менеджеру.</p>}
    </>}
  </section>;
}
