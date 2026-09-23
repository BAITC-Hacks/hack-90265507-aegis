import test from "node:test";
import assert from "node:assert/strict";
import { parsePrice, priceMatches, checkProduct, cityQuantity, FRESH_MS } from "./productFilters.js";
import { normalizeProduct } from "./verifiedProduct.js";
import { parseRequirements } from "./requirementParser.js";
import { fallbackPlan, mergePlan } from "./assistantService.js";
import { parseCatalogOptions, searchVerifiedCatalog } from "./verifiedCatalog.js";
const sample=(changes:Record<string,unknown>={})=>normalizeProduct({id:1,name:"Автомат Legrand 3P 160А",article:"a",price:50000,quantity:23,
 stores:[{id:1,name:"Алматы",quantity:5},{id:2,name:"Нур-Султан",quantity:8},{id:3,name:"Шымкент (Тассай)",quantity:1},{id:4,name:"Шымкент (ул.Байдукова)",quantity:2}],
 properties:{OBYEM:"Автоматический выключатель",TORGOVAYA_MARKA:"Legrand",NOMINALNYY_TOK:160,KOLICHESTVO_POLYUSOV:3,NOMINALNOE_NAPRYAZHENIE:"400В"},...changes},1);
test("all price operators, thousands and inclusive ranges",()=>{
 for(const [q,operator,value] of [
 ["дешевле 50 000 ₸","lt",50000],["меньше 50 тыс.","lt",50000],["не дороже 50 тысяч тенге","lte",50000],
 ["дороже 50000 ₸","gt",50000],["не дешевле 50 тыс","gte",50000],["равно 50000 ₸","eq",50000],
 ["не дороже 1,5 тыс.","lte",1500],["<= 50000","lte",50000]
 ] as const){const f=parsePrice(q).filter!;assert.equal(f.operator,operator,q);assert.equal(f.value,value,q);}
 const f=parsePrice("от 30 до 50 тыс.").filter!;assert.equal(f.value,30000);assert.equal(f.max,50000);
 assert.equal(priceMatches(30000,f),true);assert.equal(priceMatches(50000,f),true);assert.equal(priceMatches(50001,f),false);
 assert.equal(priceMatches(50000,parsePrice("дешевле 50 тыс").filter!),false);
 assert.equal(priceMatches(50000,parsePrice("не дороже 50 тыс").filter!),true);
 assert.equal(parseRequirements("Покажи автоматические выключатели дешевле 50000 ₸").article,undefined);
 assert.equal(parseRequirements("артикул 027228 дешевле 50000 ₸").article,"027228");
});
test("follow-ups preserve price with brand and stock; explicit reset clears",()=>{
 const initial=mergePlan({originalQuery:""},fallbackPlan("Покажи автоматы дешевле 50 тысяч"));
 const branded=mergePlan(initial,fallbackPlan("только Legrand"));
 const stock=mergePlan(branded,fallbackPlan("только в наличии"));
 assert.equal(stock.price?.value,50000);assert.equal(stock.brand,"Legrand");assert.equal(stock.inStock,true);
 assert.equal(mergePlan(stock,fallbackPlan("без ограничения цены")).price,undefined);
 assert.equal(mergePlan(stock,fallbackPlan("нужна розетка")).price,undefined);
});
test("city quantities, multiple warehouses and unknown stock",()=>{
 const p=sample();assert.equal(cityQuantity(p,"Алматы"),5);assert.equal(cityQuantity(p,"Астана"),8);assert.equal(cityQuantity(p,"Шымкент"),3);
 assert.equal(cityQuantity(p,"Актобе"),null);assert.equal(cityQuantity(p),23);
 assert.equal(checkProduct(p,{inStock:true,city:"Актобе"}).matches,false);
 assert.equal(cityQuantity(sample({stores:[{id:1,name:"Алматы",quantity:0}]}),"Алматы"),0);
});
test("strict validation excludes missing/stale prices and conflicting facts",()=>{
 const f=parsePrice("не дороже 50 тыс").filter!;
 assert.equal(checkProduct(sample(),{price:f,city:"Алматы",inStock:true,current:160,brand:"Legrand"}).matches,true);
 for(const price of [null,0,-1])assert.equal(checkProduct(sample({price}),{price:f}).matches,false);
 const stale={...sample(),verifiedAt:new Date(Date.now()-FRESH_MS-1000).toISOString()};
 assert.equal(checkProduct(stale,{price:f}).matches,false);
 assert.equal(checkProduct(sample({properties:{NOMINALNYY_TOK:250}}),{current:160}).matches,false);
});
test("backend validates ranges, duplicate params and sort values",()=>{
 for(const q of [{minPrice:"500",maxPrice:"100"},{minPrice:"NaN"},{page:"-1"},{page:"1.5"},{limit:"9999"},{inStock:"yes"},{sort:"bad"},{q:["a","b"]},{scan:"601"}])assert.throws(()=>parseCatalogOptions(q));
 const options=parseCatalogOptions({minPrice:"0",maxPrice:"50000",inStock:"true",city:"Алматы",sort:"stock",page:"2"});
 assert.equal(options.price?.operator,"between");assert.equal(options.page,2);assert.equal(options.inStock,true);
});
test("verified filtering, sort and pagination compose with coverage metadata",async()=>{
 let n=0;const prices=[60000,20000,40000,null];
 const loader=async(id:number)=>{const index=n++%4;return {...sample({price:prices[index]}),id};};
 const r=await searchVerifiedCatalog({query:"Legrand",brand:"Legrand",price:{operator:"lte",value:50000,currency:"KZT"},city:"Алматы",inStock:true,sort:"price-asc",scan:4,page:2,limit:1},loader);
 assert.equal(r.total,2);assert.equal(r.totalPages,2);assert.equal(r.items[0].price,40000);assert.equal(r.items[0].cityQuantity,5);
 assert.equal(r.coverage.partial,true);assert.equal(r.coverage.unknownPrice,1);
 const noStock=await searchVerifiedCatalog({query:"Legrand",city:"Актобе",inStock:true,scan:4},loader);
 assert.equal(noStock.total,0);assert.equal(noStock.coverage.unknownStock,4);
});
