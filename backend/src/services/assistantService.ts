import { checkProduct, parsePrice, priceExplanation, cityQuantity } from "./productFilters.js";
import { verifyCandidates } from "./verifiedCatalog.js";
import { searchCatalog, getCatalogProduct } from "./catalogService.js";
import { getProductById } from "./ektApi.js";
import { parseRequirements,type ProductRequirements } from "./requirementParser.js";
import { aiConfigured,interpretMessage,explainVerified,type Plan,type Action } from "./aiService.js";
import { evaluateProduct } from "./constraintEngine.js";
import { addConversationTurn,getOrCreateConversation,updateConversationProducts } from "./conversationService.js";
import type { VerifiedProduct } from "./verifiedProduct.js";
type AssistantProduct=VerifiedProduct & {cityQuantity?:number|null;stockCity?:string|null;priceExplanation?:string;evaluation:ReturnType<typeof evaluateProduct>};
const fields=["brand","productType","poles","current","voltage","article","price","inStock","city"] as const;
export function fallbackPlan(message:string):Plan{
  const q=message.toLowerCase(),requirements=parseRequirements(message);
  let action:Action=/сравн|compare/.test(q)?"compare":/аналог|замен|alternative/.test(q)?"analogue":
    /сертифик|certificate/.test(q)?"certificate":/налич|склад|алматы|астан|stock/.test(q)?"stock":
    /достав|оплат|покуп|партия|delivery|payment/.test(q)?"conditions":/корзин|добав|cart/.test(q)?"cart":
    /характер|расскажи|известно|почему|какая|какой|what|explain/.test(q)?"question":
    /^(привет|здравствуй(?:те)?|сәлем|hello|hi|спасибо|thanks)[!.\s]*$/i.test(q)?"greeting":"search";
  const references:number[]=[];
  for(const [pattern,n] of [[/перв|first/,1],[/втор|second/,2],[/трет|third/,3],[/четв|fourth/,4]] as const)if(pattern.test(q))references.push(n);
  if(/первые два|first two/.test(q))references.push(2);
  if(requirements.inStock!==undefined&&!references.length)action="search";
  if(references.length&&action==="search")action="question";
  return {action,requirements,providedFields:[...fields.filter(f=>requirements[f]!==undefined),...(parsePrice(message).clear?["price"]:[])],reset:false,references:[...new Set(references)],
    city:/алматы/i.test(q)?"Алматы":/астан|нур-султан/i.test(q)?"Астана":null,sort:/дешев|cheaper|cheap/.test(q)?"price-asc":"relevance",clarification:null};
}
export function mergePlan(previous:ProductRequirements,plan:Plan):ProductRequirements{
  const changedType=plan.requirements.productType&&previous.productType&&plan.requirements.productType!==previous.productType;
  const result:ProductRequirements=plan.reset||changedType?{originalQuery:plan.requirements.originalQuery}:{...previous,originalQuery:plan.requirements.originalQuery};
  for(const f of fields)if(plan.providedFields.includes(f)){delete result[f];if(plan.requirements[f]!==undefined)Object.assign(result,{[f]:plan.requirements[f]});}
  if(plan.providedFields.some(f=>["brand","productType","current","poles","voltage"].includes(f))&&!plan.providedFields.includes("article"))delete result.article;
  return result;
}
function articleKey(s:string){return s.toLowerCase().replace(/[\s_-]/g,"");}
function summarize(p:AssistantProduct,city:string|null){
  const available=city?cityQuantity(p,city):p.quantity;
  const stock=available===null?"остаток не подтверждён":available+" шт.",price=p.price!==null&&p.price>0?p.price+" ₸":"цена по запросу";
  const stores=p.stores.filter(s=>s.quantity>0&&(!city||s.name.toLowerCase().includes(city.toLowerCase())||(city==="Астана"&&/нур-султан/i.test(s.name))));
  const conflicts=Object.entries(p.facts).filter(([,v])=>v.conflict).map(([k,v])=>k+": свойство "+v.propertyValue+", текст "+v.textValue);
  return [p.name+" — "+price+"; "+stock+".",city?"Склады "+city+": "+(stores.map(s=>s.name+" — "+s.quantity).join("; ")||"подтверждённый остаток не найден"):"",
    conflicts.length?"Требует проверки: "+conflicts.join("; ")+".":"",
    p.evaluation.checks.map(c=>c.label+": "+(c.status==="conflict"?"противоречие":c.actual??"нет данных")+" ("+c.status+")").join("; ")].filter(Boolean).join("\n");
}
export async function processAssistantMessage(message:string,conversationId?:string,selectedCity?:string){
  const clean=message.trim();if(!clean||clean.length>2000)throw new Error("Message must contain 1–2000 characters");
  const conversation=getOrCreateConversation(conversationId);
  const history=conversation.turns.slice(-8).map(t=>({role:t.role,content:t.content.slice(0,3000)})),oldIds=[...conversation.lastProductIds];
  let plan=fallbackPlan(clean),source:"ai"|"fallback"="fallback",aiStatus=aiConfigured()?"unavailable":"not_configured";
  if(aiConfigured())try{
    plan=await interpretMessage(clean,{history,requirements:conversation.requirements,lastProducts:oldIds.map((id,i)=>({position:i+1,id}))});
    source="ai";aiStatus="ready";
  }catch{console.warn("AI interpretation unavailable; using local parser");}
  const local=parseRequirements(clean),parsedPrice=parsePrice(clean);
  if(local.price||parsedPrice.clear){plan.requirements.price=local.price;if(!plan.providedFields.includes("price"))plan.providedFields.push("price");}
  for(const field of ["inStock","city"] as const)if(local[field]!==undefined){Object.assign(plan.requirements,{[field]:local[field]});if(!plan.providedFields.includes(field))plan.providedFields.push(field);}
  const requirements=mergePlan(conversation.requirements,plan);
  if(selectedCity&&selectedCity!==conversation.selectedCity&&!plan.requirements.city)requirements.city=selectedCity;
  if(selectedCity)conversation.selectedCity=selectedCity;
  if(plan.city)requirements.city=plan.city;
  plan.city=requirements.city||null;
  if(!["greeting","conditions","cart"].includes(plan.action))conversation.requirements=requirements;
  addConversationTurn(conversation,"user",clean);
  let products:AssistantProduct[]=[],answer="",evidence:unknown={};
  let checked=0,candidates=0,unknownPrice=0,unknownData=0;
  const finish=async()=>{
    if(source==="ai"&&!["cart","conditions"].includes(plan.action))try{
      answer=await explainVerified(clean,history,{action:plan.action,requirements,products,details:evidence},answer);
    }catch{aiStatus="answer_fallback";}
    if(unknownPrice)answer+="\nЦена не подтверждена у "+unknownPrice+" проверенных товаров; они исключены.";
    if(unknownData)answer+="\nНе подтверждены запрошенные характеристики или остаток у "+unknownData+" товаров; они исключены.";
    if(candidates>checked)answer+="\nПроверено "+checked+" из "+candidates+" кандидатов. Это не весь каталог; уточните тип, бренд или артикул.";
    addConversationTurn(conversation,"assistant",answer);
    if(products.length)updateConversationProducts(conversation,products.map(p=>p.id));
    return {conversationId:conversation.id,message:answer,intent:plan.action,requirements,products,needsConfirmation:false,source,aiStatus,cartUrl:"/cart",compareUrl:"/compare"};
  };
  if(plan.action==="greeting"){answer="Здравствуйте! Я EKTiQ. Помогу найти товар EKT, проверить склады и объяснить различия. Напишите артикул или опишите задачу.";return finish();}
  if(plan.action==="clarify"){answer=plan.clarification||"Уточните, пожалуйста, товар или задачу.";return finish();}
  if(plan.action==="conditions"){answer="В подключённом API нет подтверждённых правил оплаты и доставки. Эти условия нужно уточнить у EKT. Минимальную кратность могу проверить по конкретному артикулу; платёжные данные в чат отправлять не нужно.";return finish();}
  if(plan.action==="cart"){answer="Нажмите «В корзину» на карточке и подтвердите количество в окне. Сообщение в чате само по себе корзину не меняет. Ссылка на текущую корзину находится ниже.";return finish();}
  let ids:number[]=[];
  if(requirements.article&&(!plan.references.length||plan.providedFields.includes("article"))){
    ids=searchCatalog({query:requirements.article,limit:100}).items.filter(p=>articleKey(p.article)===articleKey(requirements.article!)||p.name.split(/\s+/).some(w=>articleKey(w)===articleKey(requirements.article!))).slice(0,8).map(p=>p.id);
    if(!ids.length&&/^\d+$/.test(requirements.article)&&getCatalogProduct(Number(requirements.article)))ids=[Number(requirements.article)];
    if(!ids.length){answer="Точный артикул "+requirements.article+" не найден. Проверьте артикул или укажите название.";return finish();}
  }else if(plan.references.length){
    ids=plan.references.flatMap(n=>oldIds[n-1]?[oldIds[n-1]]:[]);
    if(ids.length!==plan.references.length){answer="Не удалось определить выбранный вариант. Укажите его артикул.";return finish();}
  }else if(["question","stock","certificate","compare"].includes(plan.action)&&oldIds.length&&!plan.providedFields.length){
    if(plan.action==="compare")ids=oldIds.slice(0,4);else if(oldIds.length===1)ids=oldIds;
    else{answer="О каком из последних товаров речь? Укажите артикул или номер: например, «о втором».";return finish();}
  }
  let excludedId: number | undefined;
  if (plan.action === "analogue" && ids.length) {
    try {
      const original = await getProductById(ids[0]);
      excludedId = original.id;
      const inferred = parseRequirements(original.name.replace(/(?:^|\s)ав(?=\s)/i," автомат "));
      requirements.productType ||= inferred.productType;
      const disputed = (["poles","current","voltage"] as const).filter(field=>original.facts[field].conflict&&!plan.providedFields.includes(field));
      if (disputed.length) {
        const labels = {poles:"число полюсов",current:"номинальный ток",voltage:"напряжение"};
        answer = "У исходного товара противоречивые данные: " + disputed.map(field=>labels[field]+": "+original.facts[field].propertyValue+" в свойствах / "+original.facts[field].textValue+" в описании").join("; ") + ". Укажите обязательные параметры вместе с артикулом, чтобы подобрать кандидатов без догадок.";
        return finish();
      }
      for (const field of ["poles","current","voltage"] as const) {
        if (!plan.providedFields.includes(field)) {
          delete requirements[field];
          if (!original.facts[field].conflict && original.facts[field].value !== undefined)
            requirements[field] = original.facts[field].value;
        }
      }
      delete requirements.article;
      if (!plan.providedFields.includes("brand")) delete requirements.brand;
      evidence = { original: {id:original.id,name:original.name,facts:original.facts} };
      ids = [];
      if (!requirements.productType) {
        answer = "Уточните тип оборудования и обязательные параметры аналога для " + original.name + ".";
        return finish();
      }
    } catch {
      answer = "Не удалось проверить исходный товар EKT. Повторите запрос позже.";
      return finish();
    }
  }
  if(!ids.length){
    if(!fields.some(f=>requirements[f]!==undefined)){answer=plan.clarification||"Что нужно подобрать? Напишите название или артикул. Например: автомат Legrand, 3 полюса, 160 А.";return finish();}
    const query=[requirements.productType].filter(Boolean).join(" ");
    const matched=searchCatalog({query,brand:requirements.brand,all:true}).items;
    candidates=matched.length;
    ids=matched.slice(0,120).map(p=>p.id);
  }
  if(excludedId)ids=ids.filter(id=>id!==excludedId);
  checked=ids.length;
  const results=await verifyCandidates(ids);
  const applyFilters=["search","analogue"].includes(plan.action)||plan.providedFields.some(f=>["price","inStock","current","poles","voltage","brand","productType"].includes(f));
  products=results.flatMap(p=>{
    if(!p)return [];
    const check=checkProduct(p,requirements);
    if(applyFilters&&!check.matches){
      if(check.unknown.includes("цена не подтверждена"))unknownPrice++;
      if(check.unknown.some(s=>s!=="цена не подтверждена"))unknownData++;
      return [];
    }
    return [{...p,cityQuantity:cityQuantity(p,requirements.city),stockCity:requirements.city||null,
      priceExplanation:requirements.price&&p.price!==null?priceExplanation(p.price,requirements.price):undefined,
      evaluation:evaluateProduct({id:p.id,name:p.name,article:p.article,brand:p.brand,description:p.description,properties:p.properties},requirements)}];
  });
  if(plan.action==="analogue")products=products.filter(p=>(cityQuantity(p,requirements.city)??0)>0);
  const failed=results.filter(p=>!p).length;
  if(!products.length){answer=failed?"Не удалось проверить товары через EKT. Попробуйте позже; наличие и цены сейчас подтвердить не могу.":"Среди проверенных товаров нет подходящих под все условия. Попробуйте изменить цену, город, бренд или характеристики.";return finish();}
  if(plan.action==="analogue")answer="Это кандидаты для технического сравнения, а не подтверждённые взаимозаменяемые аналоги. Проверьте назначение, характеристики и противоречия.";
  if(plan.action==="compare"){
    answer=products.length<2?"Для сравнения нужны минимум два товара. Укажите второй артикул.":"Сравнение проверенных товаров:\n\n"+products.map(p=>summarize(p,plan.city)).join("\n\n");
    const keys=[...new Set(products.flatMap(p=>Object.keys(p.properties)))].filter(k=>!/^CML2|ARTIKUL|BRAND/.test(k));
    const differences=keys.filter(k=>new Set(products.map(p=>p.properties[k]??"нет данных")).size>1).slice(0,12);
    evidence={differences:differences.map(k=>({property:k,values:products.map(p=>({id:p.id,value:p.properties[k]??null}))}))};
    answer+="\n\nРазличия:\n"+differences.map(k=>k+": "+products.map(p=>p.properties[k]??"нет данных").join(" / ")).join("\n");
  }else if(["question","stock","certificate"].includes(plan.action)){
    answer=products.map(p=>summarize(p,plan.city)).join("\n\n");
    if(plan.action==="certificate")answer+="\n"+products.map(p=>p.certificates.length?p.certificates.join("\n"):"Для "+p.article+" сертификаты в ответе EKT отсутствуют.").join("\n");
    if(plan.action==="question")answer+="\n\n"+Object.entries(products[0].properties).slice(0,18).map(([k,v])=>k+": "+v).join("\n");
  }else{
    products.sort((a,b)=>plan.sort==="price-asc"?(a.price&&a.price>0?a.price:Infinity)-(b.price&&b.price>0?b.price:Infinity):b.evaluation.score-a.evaluation.score);
    products=products.slice(0,8);
    if(!answer)answer="Проверены "+products.length+" товаров EKT. Карточки показывают совпадения, отличия и пробелы в данных. Совпадение отдельных параметров не гарантирует взаимозаменяемость.";
    if(products.some(p=>Object.values(p.facts).some(f=>f.conflict)))answer+=" Есть противоречивые характеристики — они отмечены для проверки.";
  }
  if(requirements.price&&products.length)answer+="\n"+products.map(p=>p.article+": "+p.priceExplanation).join("\n");
  if(failed)answer+="\nЧасть товаров не удалось проверить; показаны только полученные ответы EKT.";
  return finish();
}
