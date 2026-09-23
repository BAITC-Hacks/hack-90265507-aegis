import "../verified.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Loader2, ShoppingCart, GitCompareArrows, TriangleAlert, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { useChat, sendChat, resetChat, type Check } from "../lib/chat";
function checkText(c:Check){return c.status==="conflict"?c.label+": конфликт — "+c.propertyValue+" / "+c.textValue:
  c.label+": "+(c.actual??"нет данных")+(c.status==="mismatch"?" (нужно "+c.requested+")":"");}
export default function AssistantPanel(){
  const chat=useChat(),{requestAddToCart,toggleCompare,compare}=useShop();
  const [input,setInput]=useState("");
  const end=useRef<HTMLDivElement>(null);
  useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[chat.messages,chat.loading]);
  function submit(e:FormEvent){e.preventDefault();if(!input.trim()||chat.loading)return;void sendChat(input);setInput("");}
  return <section className="assistant-panel">
    <div className="assistant-panel-header">
      <div className="assistant-panel-brand"><div className="assistant-panel-logo"><Bot size={20}/></div><div><strong>EKTiQ</strong><span>Подбор с проверкой фактов</span></div></div>
      <button type="button" onClick={resetChat} title="Новый диалог" aria-label="Новый диалог"><RotateCcw size={18}/></button>
    </div>
    {chat.aiStatus&&chat.aiStatus!=="ready"&&<div className="assistant-mode" role="status">
      {chat.aiStatus==="not_configured"?"Режим каталога: AI пока не настроен. Доступны поиск по артикулу и основные команды.":"AI временно недоступен. Ответ подготовлен по данным каталога."}
    </div>}
    <div className="assistant-messages" role="log" aria-live="polite">
      {chat.messages.map(m=><div key={m.id} className={"assistant-message-row"+(m.role==="user"?" assistant-message-row-user":"")}>
        <div className="assistant-message-content">
          <div className={"assistant-bubble"+(m.role==="user"?" assistant-bubble-user":"")}>{m.text}</div>
          {!!m.products.length&&<div className="assistant-products">{m.products.map((p,i)=><article key={p.id} className="assistant-product-card">
            <div className="assistant-product-top"><div className="assistant-product-main">
              <span className="assistant-product-brand">Вариант {i+1} · {p.brand||"EKT"}</span>
              <Link className="assistant-product-name" to={"/product/"+p.id}>{p.name}</Link>
              <span className="assistant-product-article">Артикул: {p.article}</span>
            </div></div>
            <div className="assistant-product-checks">{p.evaluation?.checks.map(c=><div key={c.field} className={"assistant-product-check assistant-product-check-"+c.status}>{checkText(c)}</div>)}</div>
            {Object.entries(p.facts||{}).filter(([,f])=>f.conflict).map(([key,f])=><p key={key} className="compare-conflict"><TriangleAlert size={14}/>{key}: свойства {f.propertyValue}; описание {f.textValue}. Требует проверки.</p>)}
            <div className="assistant-product-footer"><div><strong>{p.price>0?p.price.toLocaleString("ru-RU")+" ₸":"Цена по запросу"}</strong>
              <span>{typeof p.quantity==="number"?p.quantity>0?"В наличии: "+p.quantity:"Нет в наличии":"Остаток не указан"}</span>
              <small>{p.verifiedAt?"Проверено "+new Date(p.verifiedAt).toLocaleTimeString("ru-RU"):""}</small>
              {p.url&&<a href={p.url} target="_blank" rel="noreferrer">Источник EKT ↗</a>}
            </div><div className="assistant-product-actions">
              <button title="Сравнить" aria-pressed={compare.includes(p.id)} onClick={()=>toggleCompare(p.id)}><GitCompareArrows size={16}/>{compare.includes(p.id)?"В сравнении":"Сравнить"}</button>
              <button className="assistant-add-cart" disabled={!(p.quantity>0)} onClick={()=>requestAddToCart(p,1)}><ShoppingCart size={16}/>В корзину</button>
            </div></div>
          </article>)}</div>}
        </div>
      </div>)}
      {chat.loading&&<div className="assistant-thinking" role="status"><Loader2 className="assistant-spinner" size={18}/>Проверяю запрос и данные EKT…</div>}
      {chat.error&&<div className="assistant-error" role="alert">{chat.error}</div>}
      <div ref={end}/>
    </div>
    <div className="chat-shortcuts">
      <button disabled={chat.loading} onClick={()=>void sendChat("Сравни первые два")}>Сравнить варианты</button>
      <button disabled={chat.loading} onClick={()=>void sendChat("А есть дешевле?")}>Есть дешевле?</button>
      <Link to="/compare">Таблица сравнения ({compare.length})</Link><Link to="/cart">Моя корзина</Link>
    </div>
    <form className="assistant-input-area" onSubmit={submit}><input aria-label="Сообщение EKTiQ" maxLength={2000} value={input} onChange={e=>setInput(e.target.value)} placeholder="Артикул, задача или вопрос о выбранном товаре" disabled={chat.loading}/>
      <button type="submit" aria-label="Отправить" disabled={chat.loading||!input.trim()}><Send size={19}/></button>
    </form>
  </section>;
}
