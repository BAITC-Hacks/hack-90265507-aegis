import { searchCatalog } from "./catalogService.js";
import { getProductById } from "./ektApi.js";
import { checkProduct, fresh, cityQuantity, type VerifiedFilters } from "./productFilters.js";
import type { VerifiedProduct } from "./verifiedProduct.js";
export type CatalogOptions = VerifiedFilters & {query?:string;category?:string;page?:number;limit?:number;sort?:"relevance"|"price-asc"|"price-desc"|"name"|"stock";scan?:number};
export function parseCatalogOptions(params:Record<string,unknown>):CatalogOptions {
  function text(key:string,max=200){const v=params[key];if(v===undefined||v==="")return undefined;if(typeof v!=="string"||v.length>max)throw new Error("Некорректный параметр: "+key);return v.trim();}
  function number(key:string,min:number,max:number,integer=false){const value=text(key);if(value===undefined)return undefined;if(!/^\d+(?:\.\d+)?$/.test(value))throw new Error("Некорректное число: "+key);const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error("Некорректное число: "+key);return n;}
  const sort=text("sort")||"relevance";if(!["relevance","price-asc","price-desc","name","stock"].includes(sort))throw new Error("Некорректная сортировка");
  const stock=text("inStock");if(stock&&!["true","false","1","0"].includes(stock))throw new Error("Некорректный фильтр наличия");
  const min=number("minPrice",0,1e12),max=number("maxPrice",0,1e12);
  if(min!==undefined&&max!==undefined&&min>max)throw new Error("Минимальная цена выше максимальной");
  return {query:text("q")||"",category:text("category",100),brand:text("brand",80),productType:text("productType",100),city:text("city",80),
    page:number("page",1,1000000,true)||1,limit:number("limit",1,100,true)||24,scan:number("scan",1,600,true)||120,
    sort:sort as CatalogOptions["sort"],inStock:stock==="true"||stock==="1",
    price:min!==undefined&&max!==undefined?{operator:"between",value:min,max,currency:"KZT"}:min!==undefined?{operator:"gte",value:min,currency:"KZT"}:max!==undefined?{operator:"lte",value:max,currency:"KZT"}:undefined,
    current:number("current",0.001,1e7),poles:number("poles",1,20,true),voltage:number("voltage",0.001,1e7)};
}
export async function verifyCandidates(ids:number[],loader=getProductById) {
  const result:(VerifiedProduct|undefined)[]=new Array(ids.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
    for(;;){const index=next++;if(index>=ids.length)return;try{result[index]=await loader(ids[index]);}catch{ /* Expose failures through coverage, never fabricate fields. */ }}
  }));
  return result;
}
export async function searchVerifiedCatalog(options:CatalogOptions,loader=getProductById) {
  const {page=1,limit=24,sort="relevance",scan=120}=options;
  const candidates=searchCatalog({query:options.query||options.productType,brand:options.brand,category:options.category,all:true,sort:sort==="name"?"name":"relevance"}).items;
  const strict=!!(options.price||options.inStock||options.brand||options.productType||options.current!==undefined||options.poles!==undefined||options.voltage!==undefined||sort==="price-asc"||sort==="price-desc"||sort==="stock");
  const selected=strict?candidates.slice(0,scan):candidates.slice((page-1)*limit,page*limit);
  const details=await verifyCandidates(selected.map(p=>p.id),loader);
  const confirmed=details.filter((p):p is VerifiedProduct=>!!p);
  const technicalAvailable=(["current","poles","voltage"] as const).filter(k=>confirmed.some(p=>p.facts[k].value!==undefined&&!p.facts[k].conflict));
  let unknownPrice=0,unknownStock=0,unknownTechnical=0;
  let verified=confirmed.filter(p=>{
    const check=checkProduct(p,options);
    if(check.unknown.includes("цена не подтверждена"))unknownPrice++;
    if(check.unknown.includes("остаток не подтверждён"))unknownStock++;
    if(check.unknown.some(s=>/current|poles|voltage|тип|бренд/.test(s)))unknownTechnical++;
    if((sort==="price-asc"||sort==="price-desc")&&(!fresh(p)||p.price===null||p.price<=0)){if(!options.price)unknownPrice++;return false;}
    if(sort==="stock"&&(!fresh(p)||cityQuantity(p,options.city)===null)){if(!options.inStock)unknownStock++;return false;}
    return check.matches;
  });
  if(sort==="price-asc"||sort==="price-desc")verified.sort((a,b)=>(sort==="price-asc"?1:-1)*(a.price!-b.price!)||a.id-b.id);
  if(sort==="stock")verified.sort((a,b)=>cityQuantity(b,options.city)!-cityQuantity(a,options.city)!||a.id-b.id);
  if(sort==="name")verified.sort((a,b)=>a.name.localeCompare(b.name,"ru")||a.id-b.id);
  const total=strict?verified.length:candidates.length;
  const items=strict?verified.slice((page-1)*limit,page*limit).map(p=>({...p,cityQuantity:cityQuantity(p,options.city),stockCity:options.city||null,priceConfirmed:fresh(p)&&p.price!==null&&p.price>0})):
    selected.map((p,i)=>details[i]?{...details[i]!,cityQuantity:cityQuantity(details[i]!,options.city),stockCity:options.city||null,priceConfirmed:fresh(details[i]!)&&details[i]!.price!==null&&details[i]!.price!>0}:{...p,price:null,quantity:null,cityQuantity:null,stockCity:options.city||null,priceConfirmed:false});
  return {query:options.query||"",page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit)),items,
    technicalAvailable,coverage:{candidates:candidates.length,checked:selected.length,failed:details.filter(p=>!p).length,partial:strict&&selected.length<candidates.length,scope:strict?"verified-candidates":"catalog-page",unknownPrice,unknownStock,unknownTechnical},
    notice:strict&&selected.length<candidates.length?"Фильтры и сортировка применены к проверенной части каталога. Уточните поиск или увеличьте охват.":""};
}
