import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { downloadText } from "../lib/download";
export default function ProfilePage() {
  const { cart, favorites, compare, selectedCity, setSelectedCity } = useShop();
  const [saved, setSaved] = useState("");
  const [name, setName] = useState(()=>{try{return localStorage.getItem("ektiq-project-name")||"";}catch{return "";}});
  function save(){try{localStorage.setItem("ektiq-project-name",name.trim());setSaved("Название проекта сохранено в этом браузере.");}catch{setSaved("Браузер запретил сохранение.");}}
  return <section className="container page-shell task-page"><span className="page-eyebrow">МОЙ ПРОЕКТ</span><h1>Рабочее пространство закупки</h1>
    <p>Локальное рабочее пространство без регистрации. Авторизация и история заказов EKT не подключены.</p>
    <label>Название проекта<input maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Город<input maxLength={80} value={selectedCity} onChange={e=>setSelectedCity(e.target.value)}/></label>
    <div className="task-actions"><button onClick={save}>Сохранить название</button>
      <button onClick={()=>downloadText("EKTiQ-проект.json",JSON.stringify({version:1,name,city:selectedCity,cart,favorites,compare,exportedAt:new Date().toISOString()},null,2),"application/json")}>Скачать проект</button></div>
    {saved&&<p role="status">{saved}</p>}
    <div className="task-actions"><Link to="/cart">Корзина: {cart.length}</Link><Link to="/favorites">Избранное: {favorites.length}</Link><Link to="/compare">Сравнение: {compare.length}</Link><Link to="/specification">Загрузить спецификацию</Link></div>
    <p>Корзина, избранное и сравнение хранятся до перезагрузки страницы. Перед закрытием скачайте проект или заявку.</p>
  </section>;
}
