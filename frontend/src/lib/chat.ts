import { useSyncExternalStore } from "react";
import { api } from "./api";
import type { Product } from "../types/product";
export type Check={field:string;label:string;status:string;actual?:string|number;requested?:string|number;propertyValue?:string|number;textValue?:string|number};
export type ChatProduct=Product & {cityQuantity?:number|null;stockCity?:string|null;priceExplanation?:string;verifiedAt?:string;facts?:Record<string,{conflict?:boolean;propertyValue?:string|number;textValue?:string|number}>;evaluation:{level:string;checks:Check[]}};
export type Message={id:string;role:"user"|"assistant";text:string;products:ChatProduct[]};
type State={messages:Message[];conversationId?:string;loading:boolean;error:string;aiStatus:string};
const welcome:Message={id:"welcome",role:"assistant" as const,text:"Здравствуйте! Я EKTiQ. Найду товар EKT, проверю остаток и помогу сравнить характеристики. Начнём с артикула или вашей задачи?",products:[]};
let state:State={messages:[welcome],loading:false,error:"",aiStatus:""};
const listeners=new Set<()=>void>();
let pending:AbortController|undefined;
function update(p:Partial<State>){state={...state,...p};listeners.forEach(fn=>fn());}
export function useChat(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state);}
export async function sendChat(text:string,city?:string){
  const message=text.trim();if(state.loading||!message)return;
  if(/(?:\d[ -]?){13,19}|\b(?:cvv|cvc|pin)\b|(?:номер|данные|реквизиты)\s+карт|пин[ -]?код|(?:код\s+из\s+смс|sms\s*code)\s*[:=—-]?\s*\d{3,8}|\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b|(?:card\s*(?:number)?|карт[аыуе])\s*[:=—-]?\s*(?:\d[ -]?){8,19}/i.test(message)){
    update({error:"Не отправляйте номера карт, CVV/CVC, PIN или платёжные реквизиты. Укажите только товар и условия поиска."});return;
  }
  if(message.length>2000){update({error:"Сообщение должно быть не длиннее 2000 символов."});return;}
  const controller=new AbortController();pending=controller;
  // Full-candidate verification can take minutes; do not cut it off at 75 seconds.
  const timeout=setTimeout(()=>controller.abort(),30*60*1000);
  update({messages:[...state.messages,{id:crypto.randomUUID(),role:"user",text:message,products:[]}],loading:true,error:""});
  try{
    const data=await api<{message:string;conversationId:string;products:ChatProduct[];aiStatus:string}>("/api/assistant/chat",{
      method:"POST",body:JSON.stringify({message,conversationId:state.conversationId,city}),signal:controller.signal});
    if(pending!==controller)return;
    if(typeof data.message!=="string"||!Array.isArray(data.products))throw new Error("Некорректный ответ сервера.");
    update({conversationId:data.conversationId,aiStatus:data.aiStatus,messages:[...state.messages,{id:crypto.randomUUID(),role:"assistant" as const,text:data.message,products:data.products}].slice(-40)});
  }catch(e){if(pending===controller)update({error:controller.signal.aborted?"Запрос прерван. Попробуйте ещё раз.":e instanceof Error?e.message:"Ошибка подключения."});}
  finally{clearTimeout(timeout);if(pending===controller){pending=undefined;update({loading:false});}}
}
export function resetChat(){
  const previous=state.conversationId;
  pending?.abort();pending=undefined;
  update({messages:[welcome],conversationId:undefined,loading:false,error:"",aiStatus:""});
  if(previous)void api("/api/assistant/conversations/"+encodeURIComponent(previous),{method:"DELETE"}).catch(()=>{
    update({error:"Локальный диалог очищен. Удаление серверного диалога не подтверждено; он истечёт по сроку хранения."});
  });
}
