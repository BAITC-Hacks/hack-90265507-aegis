import "../verified.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { api } from "../lib/api";
import type { Product } from "../types/product";
type Fact={value?:string|number;source:string;conflict?:boolean;propertyValue?:string|number;textValue?:string|number};
type Verified=Product & {facts?:Record<string,Fact>;verifiedAt?:string};
const labels:Record<string,string>={TORGOVAYA_MARKA:"Бренд",NOMINALNYY_TOK:"Номинальный ток",KOLICHESTVO_POLYUSOV:"Количество полюсов",NOMINALNOE_NAPRYAZHENIE:"Напряжение",NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST:"Отключающая способность",TIP_USTANOVKI:"Монтаж",KRATNOST_MIN:"Минимальная кратность"};
export default function ComparePage(){
  const {compare,toggleCompare,requestAddToCart}=useShop();
  const [products,setProducts]=useState<Verified[]>([]),[failed,setFailed]=useState<number[]>([]);
  const [loading,setLoading]=useState(false),[onlyDifferences,setOnlyDifferences]=useState(false),[refresh,setRefresh]=useState(0);
  const ids=compare.slice(0,4).join(",");
  useEffect(()=>{
    const controller=new AbortController();
    const selected=ids?ids.split(",").map(Number):[];
    if(!selected.length){setProducts([]);setFailed([]);setLoading(false);return;}
    setLoading(true);
    Promise.allSettled(selected.map(id=>api<Verified>("/api/products/"+id+(refresh?"?fresh=true":""),{signal:controller.signal}))).then(results=>{
      if(controller.signal.aborted)return;
      setProducts(results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]));
      setFailed(results.flatMap((r,i)=>r.status==="rejected"?[selected[i]]:[]));setLoading(false);
    });
    return()=>controller.abort();
  },[ids,refresh]);
  const rows=useMemo(()=>{
    const keys=[...new Set(products.flatMap(p=>Object.keys(p.properties||{})))].filter(k=>!/^CML2|ARTIKUL|RECOMMEND/.test(k));
    return [
      {key:"price",label:"Цена",values:products.map(p=>p.price&&p.price>0?p.price.toLocaleString("ru-RU")+" ₸":"По запросу")},
      {key:"quantity",label:"Общий остаток",values:products.map(p=>typeof p.quantity==="number"?p.quantity+" шт.":"Нет данных")},
      ...keys.map(k=>({key:k,label:labels[k]||k.replaceAll("_"," ").toLowerCase(),values:products.map(p=>p.properties?.[k]||"Нет данных")})),
    ].map(row=>({...row,different:new Set(row.values).size>1}));
  },[products]);
  return <section className="container page-shell compare-page">
    <span className="page-eyebrow">ПАСПОРТ СРАВНЕНИЯ · EKT</span>
    <h1>Различия, которые влияют на выбор</h1>
    <p>Факты из EKT, пробелы и противоречия — рядом. Сравнение не является подтверждением взаимозаменяемости.</p>
    {!compare.length?<div className="catalog-state"><GitCompareArrows size={36}/><h2>Выберите товары для сравнения</h2><Link to="/catalog">Открыть каталог</Link></div>:<>
      <div className="compare-toolbar">
        <label><input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)}/> Только различия</label>
        <button onClick={()=>setRefresh(n=>n+1)} disabled={loading}><RefreshCw size={16}/> Обновить</button>
        <Link to="/catalog">Добавить товары</Link>
      </div>
      {compare.length>4&&<p role="status">Показаны первые четыре товара. Удалите один, чтобы увидеть следующий.</p>}
      {loading?<p role="status">Проверяем характеристики EKT…</p>:<>
        {failed.length>0&&<div role="alert" className="assistant-error">Не удалось загрузить товары: {failed.join(", ")}. Можно повторить запрос или удалить недоступную позицию.
          {failed.map(id=><button key={id} onClick={()=>toggleCompare(id)}>Удалить {id}</button>)}</div>}
        {products.length>0&&<div className="compare-scroll"><table className="compare-table"><thead><tr><th scope="col">Параметр</th>{products.map(p=><th scope="col" key={p.id}>
          <Link to={"/product/"+p.id}>{p.name}</Link><small>Арт. {p.article}</small>
          <button onClick={()=>toggleCompare(p.id)} aria-label={"Убрать "+p.name}><Trash2 size={16}/></button>
        </th>)}</tr></thead><tbody>
          <tr><th scope="row">Проверка данных</th>{products.map(p=><td key={p.id}>
            <small>{p.verifiedAt?"Получены "+new Date(p.verifiedAt).toLocaleTimeString("ru-RU"):"Время не указано"}</small>
            {Object.entries(p.facts||{}).filter(([,f])=>f.conflict).map(([k,f])=><p className="compare-conflict" key={k}><TriangleAlert size={16}/>{k}: в свойствах {f.propertyValue}, в тексте {f.textValue}. Требует уточнения.</p>)}
            {p.url&&<a href={p.url} target="_blank" rel="noreferrer">Источник EKT ↗</a>}
          </td>)}</tr>
          {rows.filter(r=>!onlyDifferences||r.different).map(r=><tr key={r.key} className={r.different?"compare-difference":""}><th scope="row">{r.label}</th>{r.values.map((v,i)=><td key={products[i].id}>{v}</td>)}</tr>)}
          <tr><th scope="row">Склады</th>{products.map(p=><td key={p.id}>{p.stores?.some(s=>s.quantity>0)?p.stores.filter(s=>s.quantity>0).map(s=><div key={s.id}>{s.name}: {s.quantity}</div>):"Нет подтверждённых остатков"}</td>)}</tr>
          <tr><th scope="row">Сертификаты</th>{products.map(p=><td key={p.id}>{p.certificates?.length?p.certificates.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer">Сертификат {i+1} ↗ </a>):"Не предоставлены API"}</td>)}</tr>
          <tr><th scope="row">Действие</th>{products.map(p=><td key={p.id}><button className="product-add-cart" disabled={!(p.quantity>0)} onClick={()=>requestAddToCart(p,1)}>В корзину с подтверждением</button></td>)}</tr>
        </tbody></table></div>}
        {products.length===1&&<p>Добавьте второй товар для сравнения различий.</p>}
      </>}
    </>}
  </section>;
}
