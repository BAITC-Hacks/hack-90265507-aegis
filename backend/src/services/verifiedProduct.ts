import { extractTechnicalFacts } from "./technicalFacts.js";
export function safeUrl(v:unknown):string|null {try {if(typeof v!=="string")return null;const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}}
const num=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
export function normalizeProduct(raw:unknown,id:number) {
  if(!raw||typeof raw!=="object")throw new Error("Invalid EKT response");
  const p=raw as Record<string,any>;
  if(p.id!==id||typeof p.name!=="string"||!p.name.trim())throw new Error("Invalid EKT identity");
  const source=p.properties&&typeof p.properties==="object"&&!Array.isArray(p.properties)?p.properties:{};
  const properties:Record<string,string>={};
  for(const [k,v] of Object.entries(source)){
    if(/^(RECOMMEND|CML2_TRAITS|IMYAKARTINKI|BRAND_PRIORITY|NOVINKA|SPETSPREDLOZHENIE)$/.test(k))continue;
    if(["string","number","boolean"].includes(typeof v))properties[k]=String(v);
    else if(Array.isArray(v))properties[k]=v.filter(x=>typeof x==="string"||typeof x==="number").join(", ");
  }
  const stores:{id:number;name:string;quantity:number}[]=Array.isArray(p.stores)?p.stores.filter((s:any)=>s&&Number.isInteger(s.id)&&typeof s.name==="string"&&num(s.quantity)!==null).map((s:any)=>({id:s.id,name:s.name,quantity:s.quantity})):[];
  const certificates:string[]=Array.isArray(p.certificates)?p.certificates.flatMap((c:any)=>{const u=safeUrl(typeof c==="object"&&c?c.url:c);return u?[u]:[]}):[];
  return {id,name:p.name as string,article:typeof p.article==="string"?p.article:"",price:num(p.price),quantity:num(p.quantity),
    image:safeUrl(p.image),url:safeUrl(p.url),brand:typeof p.brand==="string"?p.brand:properties.TORGOVAYA_MARKA||"",
    description:typeof p.description==="string"?p.description:"",properties,stores,certificates,verifiedAt:new Date().toISOString(),
    facts:extractTechnicalFacts({name:p.name,description:p.description,properties:source})};
}
export type VerifiedProduct=ReturnType<typeof normalizeProduct>;
