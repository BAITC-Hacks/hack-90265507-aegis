import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { readDocument } from "../lib/readDocument";
import { downloadText } from "../lib/download";
import type { CatalogProduct, CatalogSearchResponse } from "../types/catalog";
type Match = { query: string; items: CatalogProduct[]; failed: boolean };
export default function ImportWorkbench({ photo = false }: { photo?: boolean }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const [error, setError] = useState(""), [matches, setMatches] = useState<Match[]>([]), [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const resources = useRef({live:true,operation:0,worker:null as {terminate:()=>Promise<unknown>}|null,controller:null as AbortController|null});
  useEffect(()=>{const active=resources.current;active.live=true;return()=>{active.live=false;active.operation++;active.controller?.abort();void active.worker?.terminate();};},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  async function load(file?: File) {
    if (!file || busy) return;
    const ticket = ++resources.current.operation;
    setBusy(true);setError("");setMatches([]);setStatus("Читаем файл…");
    try {
      if (file.size > 10*1024*1024) throw new Error("Максимальный размер — 10 МБ.");
      let result: string;
      if (photo) {
        if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error("Выберите JPG или PNG.");
        const image = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1,2400/Math.max(image.width,image.height));
        canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);image.close();
        if(!resources.current.live||ticket!==resources.current.operation)return;
        setPreview(URL.createObjectURL(file));
        const {createWorker} = await import("tesseract.js");
        const localWorker = await createWorker("rus+eng",1,{
          workerPath: (await import("tesseract.js/dist/worker.min.js?url")).default,
          logger: message=>{if(resources.current.live&&ticket===resources.current.operation)setStatus("Распознавание: "+Math.round(message.progress*100)+"%");}
        });
        if(!resources.current.live||ticket!==resources.current.operation){await localWorker.terminate();return;}
        resources.current.worker=localWorker;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {result=(await Promise.race([localWorker.recognize(canvas),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Распознавание заняло слишком много времени. Попробуйте обрезать фото.")),90000);})])).data.text;}
        finally {clearTimeout(timer);await localWorker.terminate();resources.current.worker=null;}
      } else result=await readDocument(file);
      if(!resources.current.live||ticket!==resources.current.operation)return;
      if(!result.trim())throw new Error("Текст не найден. Введите маркировку или список вручную.");
      setText(result.slice(0,20000));
      setStatus(result.length>20000?"Показаны первые 20 000 символов. Разделите большой список.":"Текст извлечён. Проверьте и исправьте его перед поиском.");
    } catch(e) {if(resources.current.live&&ticket===resources.current.operation)setError(e instanceof Error?e.message:"Не удалось прочитать файл. Попробуйте другой файл или введите текст.");}
    finally {if(resources.current.live&&ticket===resources.current.operation)setBusy(false);}
  }
  async function search() {
    const queries=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!queries.length)return;
    if(queries.length>30){setError("Оставьте до 30 строк за один поиск.");return;}
    setBusy(true);setMatches([]);setError("");setStatus("Ищем позиции…");
    const ticket=++resources.current.operation;const abort=new AbortController();resources.current.controller=abort;
    const results:Match[]=[];
    try{
      for(const query of queries) {
        if(abort.signal.aborted)break;
        try{
          const data=await api<CatalogSearchResponse>("/api/catalog/search?limit=3&q="+encodeURIComponent(query),{signal:abort.signal});
          results.push({query,items:data.items,failed:false});
        }catch{if(!abort.signal.aborted)results.push({query,items:[],failed:true});}
      }
      if(resources.current.live&&ticket===resources.current.operation){setMatches(results);setStatus("Обработано строк: "+results.length+". Откройте карточки для проверки цены и наличия.");}
    }finally{if(resources.current.live&&ticket===resources.current.operation)setBusy(false);}
  }
  function cancel(){resources.current.operation++;resources.current.controller?.abort();void resources.current.worker?.terminate();resources.current.worker=null;setBusy(false);setStatus("Операция отменена.");}
  return <section className="container page-shell task-page">
    <span className="page-eyebrow">{photo?"МАРКИРОВКА ПО ФОТО":"СПЕЦИФИКАЦИЯ"}</span>
    <h1>{photo?"Найти товар по тексту на фотографии":"Подбор по спецификации"}</h1>
    <p>{photo?"Загрузите чёткое фото маркировки. Распознавание текста не определяет совместимость или модель по внешнему виду.":"Загрузите документ или вставьте список. После извлечения оставьте на каждой строке только артикул либо название без количества и цены."}</p>
    <p>Файл обрабатывается в браузере. На сервер отправляется только текст после нажатия «Найти позиции». {photo&&"Для первого запуска OCR нужен интернет: загружаются языковые модели."}</p>
    <div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void load(e.dataTransfer.files[0]);}}>
      <strong>Перетащите {photo?"фотографию":"файл"} сюда</strong>
      <span>{photo?"JPG, PNG":"XLSX, DOCX, PDF с текстовым слоем, CSV, TXT"} · до 10 МБ</span>
      <input ref={fileInput} type="file" hidden accept={photo?".jpg,.jpeg,.png":".xlsx,.docx,.pdf,.csv,.txt"} onChange={e=>{void load(e.target.files?.[0]);e.target.value="";}}/>
      <button disabled={busy} onClick={()=>fileInput.current?.click()}>{photo?"Выбрать фотографию":"Выбрать файл"}</button>
    </div>
    {preview&&<img className="import-preview" src={preview} alt="Загруженная маркировка"/>}
    {status&&<p role="status">{status}</p>}{error&&<p role="alert" className="assistant-error">{error}</p>}
    <label>Позиции для поиска — одна на строку<textarea maxLength={20000} rows={8} value={text} disabled={busy} onChange={e=>setText(e.target.value)} placeholder={"027228\nкабель ВВГ\nрозетка IP44"}/></label>
    <div className="task-actions"><button disabled={busy||!text.trim()} onClick={()=>void search()}>Найти позиции</button>
    <button disabled={busy||!text.trim()} onClick={()=>downloadText("EKTiQ-распознанный-текст.txt",text)}>Скачать текст</button>
    {busy&&<button onClick={cancel}>Отменить</button>}</div>
    {matches.map((m,i)=><article className="import-result" key={i}><h3>{m.query}</h3>
      {m.failed?<p>Запрос не выполнен. Проверьте подключение и повторите поиск.</p>:!m.items.length?<p>Совпадений нет. Сократите строку до артикула или названия.</p>:<ul>{m.items.map(p=><li key={p.id}><Link to={"/product/"+p.id}>{p.name}</Link> · {p.article}</li>)}</ul>}
      <Link to={"/catalog?q="+encodeURIComponent(m.query)}>Открыть полный поиск</Link>
    </article>)}
  </section>;
}
