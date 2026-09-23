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
  if(message.length>2000){update({error:"Сообщение должно быть не длиннее 2000 символов."});return;}
  const controller=new AbortController();pending=controller;
  const timeout=setTimeout(()=>controller.abort(),75000);
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
export function resetChat(){pending?.abort();pending=undefined;update({messages:[welcome],conversationId:undefined,loading:false,error:"",aiStatus:""});}
