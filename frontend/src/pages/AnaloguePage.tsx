import { useState, type FormEvent } from "react";
import AssistantPanel from "../components/AssistantPanel";
import { useShop } from "../context/ShopContext";
import { sendChat, useChat } from "../lib/chat";
export default function AnaloguePage(){
 const {selectedCity}=useShop();
 const [query,setQuery]=useState("");const {loading}=useChat();
 function submit(e:FormEvent){e.preventDefault();if(query.trim())void sendChat("Подбери аналог: "+query.trim(),selectedCity);}
 return <section className="container page-shell task-page"><span className="page-eyebrow">ТЕХНИЧЕСКИЙ ПОДБОР</span><h1>Подобрать аналог</h1>
 <p>Укажите артикул или характеристики исходного товара. Кандидаты требуют проверки назначения и совместимости.</p>
 <form className="task-actions" onSubmit={submit}><input aria-label="Исходный товар" maxLength={300} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Артикул 027228 или автомат 3P 160А"/><button disabled={!query.trim()||loading}>Подобрать</button></form>
 <AssistantPanel/></section>;
}
