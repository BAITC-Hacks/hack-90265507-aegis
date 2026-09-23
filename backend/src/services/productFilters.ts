import type { VerifiedProduct } from "./verifiedProduct.js";
export type PriceFilter = { operator:"lt"|"lte"|"gt"|"gte"|"eq"|"between"; value:number; max?:number; currency:"KZT" };
export const FRESH_MS = 30_000;
export const CITIES = ["Астана","Алматы","Шымкент","Караганда","Актобе","Атырау","Актау","Тараз","Талдыкорган","Усть-Каменогорск"];
export function normalizeCity(city:string) { return /^(нур[- ]султан|астана)$/i.test(city.trim())?"Астана":CITIES.find(c=>c.toLowerCase()===city.trim().toLowerCase())??city.trim(); }
export function cityQuantity(product: Pick<VerifiedProduct,"stores"|"quantity">, city?:string):number|null {
  if(!city)return product.quantity;
  const wanted=normalizeCity(city).toLowerCase();
  const stores=product.stores.filter(s=>{
    const name=s.name.toLowerCase();
    return wanted==="астана"?/астана|нур[- ]султан/.test(name):new RegExp("(^|[^а-яa-z])"+wanted.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^а-яa-z])","i").test(name);
  });
  return stores.length?stores.reduce((sum,s)=>sum+s.quantity,0):null;
}
export function fresh(product:Pick<VerifiedProduct,"verifiedAt">,now=Date.now()) {
  const age=now-Date.parse(product.verifiedAt);return Number.isFinite(age)&&age>=0&&age<=FRESH_MS;
}
export function priceMatches(price:number,filter:PriceFilter) {
  switch(filter.operator){
    case "lt":return price<filter.value;case "lte":return price<=filter.value;
    case "gt":return price>filter.value;case "gte":return price>=filter.value;
    case "eq":return price===filter.value;case "between":return price>=filter.value&&price<=filter.max!;
  }
}
export function priceExplanation(price:number,filter:PriceFilter) {
  const words={lt:"ниже лимита",lte:"не выше лимита",gt:"выше",gte:"не ниже",eq:"равна",between:"в диапазоне"};
  return "Цена "+price.toLocaleString("ru-RU")+" ₸ — "+words[filter.operator]+" "+filter.value.toLocaleString("ru-RU")+(filter.operator==="between"?"–"+filter.max!.toLocaleString("ru-RU"):"")+" ₸.";
}
export function validPriceFilter(value:unknown):value is PriceFilter {
  if(!value||typeof value!=="object")return false;const p=value as PriceFilter;
  return ["lt","lte","gt","gte","eq","between"].includes(p.operator)&&p.currency==="KZT"&&Number.isFinite(p.value)&&p.value>=0&&p.value<=1e12&&(p.operator!=="between"||(Number.isFinite(p.max)&&p.max!>=p.value&&p.max!<=1e12));
}
export type VerifiedFilters = { price?:PriceFilter; inStock?:boolean; city?:string; brand?:string; productType?:string; current?:number; poles?:number; voltage?:number };
export function checkProduct(p:VerifiedProduct,filters:VerifiedFilters,now=Date.now()) {
  const reasons:string[]=[],unknown:string[]=[];
  const current=fresh(p,now);
  if(filters.price){
    if(!current||p.price===null||p.price<=0)unknown.push("цена не подтверждена");
    else if(!priceMatches(p.price,filters.price))reasons.push("цена не соответствует");
  }
  const stock=current?cityQuantity(p,filters.city):null;
  if(filters.inStock){if(stock===null)unknown.push("остаток не подтверждён");else if(stock<=0)reasons.push("нет в наличии");}
  if(filters.brand){
    const brand=p.facts.brand;
    if(brand.conflict||!brand.value)unknown.push("бренд не подтверждён");
    else if(brand.value.toLowerCase()!==filters.brand.toLowerCase())reasons.push("другой бренд");
  }
  if(filters.productType){
    const value=p.properties.OBYEM;
    if(!value)unknown.push("тип товара не подтверждён");
    else if(value.toLowerCase()!==filters.productType.toLowerCase())reasons.push("другой тип товара");
  }
  for(const key of ["current","poles","voltage"] as const)if(filters[key]!==undefined){
    const fact=p.facts[key];
    if(!current||fact.conflict||fact.value===undefined)unknown.push(key+" не подтверждён");
    else if(Math.abs(fact.value-filters[key]!)>0.001)reasons.push(key+" не соответствует");
  }
  return {matches:!reasons.length&&!unknown.length,reasons,unknown,cityQuantity:stock};
}
const amount="(\\d+(?:[ \\u00a0]\\d{3})*(?:[.,]\\d+)?)";
const scale="\\s*(тыс\\.?|тысяч(?:и|а)?|млн\\.?|k)?";
function money(value:string,unit?:string){return Number(value.replace(/[ \u00a0]/g,"").replace(",","."))*(unit?/млн/i.test(unit)?1e6:1e3:1);}
export function parsePrice(text:string):{filter?:PriceFilter; textWithoutPrice:string; clear:boolean} {
  const clear=/без\s+(?:ограничени[яй]\s+(?:по\s+)?цен[ые]|лимита\s+цен[ыа])|любой бюджет|сбрось?\s+(?:цену|бюджет)/i.test(text);
  const range=new RegExp("от\\s*"+amount+scale+"\\s*(?:₸|тенге|тг|kzt)?\\s*до\\s*"+amount+scale+"\\s*(?:₸|тенге|тг|kzt)?","i");
  const r=text.match(range);
  if(r&&/^\s*(?:а|a|в|v|ка|ka|полюс)(?=\s|$|[,.;])/i.test(text.slice(r.index!+r[0].length)))return {textWithoutPrice:text,clear};
  if(r){const value=money(r[1],r[2]||r[4]),max=money(r[3],r[4]||r[2]);const filter:PriceFilter={operator:"between",value,max,currency:"KZT"};return {filter:validPriceFilter(filter)?filter:undefined,textWithoutPrice:text.replace(r[0],""),clear};}
  const regex=new RegExp("(не\\s+дороже|не\\s+дешевле|дешевле|меньше|ниже|дороже|больше|выше|равно|ровно|до|от|<=|>=|<|>|=)\\s*"+amount+scale+"\\s*(?:₸|тенге|тг|kzt)?","i");
  const m=text.match(regex);
  if(!m)return {textWithoutPrice:text,clear};
  if(/^\s*(?:а|a|в|v|ка|ka|полюс)(?=\s|$|[,.;])/i.test(text.slice(m.index!+m[0].length)))return {textWithoutPrice:text,clear};
  const op=m[1].toLowerCase().replace(/\s+/g," ");
  const operator:PriceFilter["operator"]=["не дороже","до","<="].includes(op)?"lte":["не дешевле","от",">="].includes(op)?"gte":["дороже","больше","выше",">"].includes(op)?"gt":["равно","ровно","="].includes(op)?"eq":"lt";
  const filter:PriceFilter={operator,value:money(m[2],m[3]),currency:"KZT"};
  return {filter:validPriceFilter(filter)?filter:undefined,textWithoutPrice:text.replace(m[0],""),clear};
}
