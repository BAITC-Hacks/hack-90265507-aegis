import test from "node:test";
import assert from "node:assert/strict";
import {fallbackPlan,mergePlan,processAssistantMessage} from "./assistantService.js";
import {normalizeProduct,safeUrl} from "./verifiedProduct.js";
import {parseRequirements} from "./requirementParser.js";
import {evaluateProduct} from "./constraintEngine.js";
import {searchCatalog} from "./catalogService.js";
import {getProductById} from "./ektApi.js";
test("bare article and electrical requirements are parsed",()=>{
 assert.equal(parseRequirements("515291").article,"515291");
 const p=parseRequirements("автомат Legrand 3P 160А 400В");assert.equal(p.poles,3);assert.equal(p.current,160);assert.equal(p.voltage,400);
});
test("follow-ups preserve requirements while changing brand",()=>{
 const initial=parseRequirements("автомат Legrand 3P 160А");
 const next=mergePlan(initial,fallbackPlan("А ABB?"));
 assert.equal(next.brand,"ABB");assert.equal(next.current,160);assert.equal(next.poles,3);
 assert.equal(fallbackPlan("А есть дешевле?").sort,"price-asc");
 assert.deepEqual(fallbackPlan("Сравни первые два").references,[1,2]);
});
test("changing category clears unrelated requirements",()=>{
 const next=mergePlan(parseRequirements("автомат Legrand 3P 160А"),fallbackPlan("нужна розетка"));
 assert.equal(next.current,undefined);assert.equal(next.productType,"Розетка");
});
test("unknown values and unsafe URLs are not made into facts",()=>{
 const p=normalizeProduct({id:1,name:"Товар",quantity:null,price:-1,url:"javascript:alert(1)",certificates:["https://ekt.kz/test.pdf","javascript:1"]},1);
 assert.equal(p.quantity,null);assert.equal(p.price,null);assert.equal(p.url,null);assert.equal(p.certificates.length,1);
 assert.equal(safeUrl("data:text/html,test"),null);
 assert.throws(()=>normalizeProduct({id:2,name:"Other"},1));
});
test("conflicting current is exposed, not silently selected",()=>{
 const raw={id:1,name:"Автомат 160А",properties:{NOMINALNYY_TOK:100}};
 const p=normalizeProduct(raw,1);assert.equal(p.facts.current.conflict,true);
 assert.equal(evaluateProduct(raw,parseRequirements("160А")).hasConflicts,true);
});
test("catalog pagination rejects nonfinite values and matches all query tokens",()=>{
 const p=searchCatalog({page:Infinity,limit:NaN});assert.equal(p.page,1);assert.equal(p.limit,24);
 assert.equal(searchCatalog({query:"zzznomatchtoken Legrand"}).total,0);
});
test("greeting, conditions and cart are distinct and never mutate cart",async()=>{
 delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
 const greeting=await processAssistantMessage("Привет");assert.equal(greeting.intent,"greeting");assert.equal(greeting.aiStatus,"not_configured");assert.deepEqual(greeting.products,[]);
 const terms=await processAssistantMessage("Как оплатить?",greeting.conversationId);assert.equal(terms.intent,"conditions");
 const cart=await processAssistantMessage("Добавь в корзину",greeting.conversationId);assert.equal(cart.intent,"cart");assert.equal(cart.needsConfirmation,false);assert.equal(cart.cartUrl,"/cart");
 await assert.rejects(processAssistantMessage("x".repeat(2001)));
});
test("EKT cache deduplicates and explicit refresh bypasses cache",async()=>{
 const original=globalThis.fetch;
 const saved={url:process.env.EKT_API_URL,user:process.env.EKT_API_USER,password:process.env.EKT_API_PASSWORD};
 process.env.EKT_API_URL="https://example.test/api";process.env.EKT_API_USER="test";process.env.EKT_API_PASSWORD="test";
 let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({id:999999,name:"Fixture",quantity:2,price:10}),{status:200});};
 try{
  await Promise.all([getProductById(999999),getProductById(999999)]);assert.equal(calls,1);
  await getProductById(999999);assert.equal(calls,1);
  await getProductById(999999,true);assert.equal(calls,2);
 }finally{globalThis.fetch=original;for(const [key,value] of Object.entries({EKT_API_URL:saved.url,EKT_API_USER:saved.user,EKT_API_PASSWORD:saved.password}))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

test("catalog abbreviations find candidates without certifying technical facts",()=>{
 assert.ok(searchCatalog({query:"Автоматический выключатель Legrand 160А 3P"}).total>0);
 const next=mergePlan({...parseRequirements("артикул 027228"),current:160},fallbackPlan("А ABB?"));
 assert.equal(next.article,undefined);assert.equal(next.current,160);
});
test("real catalog candidates support follow-up comparison with fixture details",async()=>{
 const original=globalThis.fetch;
 const env={...process.env};
 delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
 process.env.EKT_API_URL="https://example.test/api";process.env.EKT_API_USER="test";process.env.EKT_API_PASSWORD="test";
 globalThis.fetch=async(input)=>{
  const id=Number(new URL(String(input)).searchParams.get("id"));
  return new Response(JSON.stringify({id,name:"Legrand 3P 160А",article:String(id),price:id,quantity:2,properties:{OBYEM:"Автоматический выключатель",NOMINALNYY_TOK:160,KOLICHESTVO_POLYUSOV:3,TORGOVAYA_MARKA:"Legrand"}}));
 };
 try {
  const r=await processAssistantMessage("Автомат Legrand 3P 160А");
  assert.ok(r.products.length>=2);
  const comparison=await processAssistantMessage("Сравни первые два",r.conversationId);
  assert.equal(comparison.intent,"compare");assert.deepEqual(comparison.products.map(p=>p.id),r.products.slice(0,2).map(p=>p.id));
  const stock=await processAssistantMessage("Наличие второго",r.conversationId);assert.equal(stock.products[0].id,r.products[1].id);
 }finally{globalThis.fetch=original;for(const k of ["EKT_API_URL","EKT_API_USER","EKT_API_PASSWORD","OPENAI_API_KEY","OPENAI_MODEL"])if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];}
});

test("AI flow sends history and structured plan before grounded explanation (mock API)",async()=>{
 const original=globalThis.fetch, oldKey=process.env.OPENAI_API_KEY, oldModel=process.env.OPENAI_MODEL;
 process.env.OPENAI_API_KEY="fixture-only";process.env.OPENAI_MODEL="fixture-model";
 const calls:any[]=[];
 globalThis.fetch=async(_input,init)=>{
  const body=JSON.parse(String(init?.body));calls.push(body);
  const text=calls.length===1?JSON.stringify({action:"greeting",requirements:{brand:null,productType:null,poles:null,current:null,voltage:null,article:null},providedFields:[],reset:false,references:[],city:null,sort:"relevance",clarification:null}):"Здравствуйте! Чем помочь с подбором?";
  return new Response(JSON.stringify({id:"fixture",object:"response",status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text,annotations:[]}]}]}),{headers:{"Content-Type":"application/json"}});
 };
 try{
  const reply=await processAssistantMessage("Сәлем!");
  assert.equal(reply.source,"ai");assert.equal(reply.aiStatus,"ready");assert.equal(calls.length,2);
  assert.equal(calls[0].text.format.type,"json_schema");assert.equal(calls[0].store,false);
  assert.ok(Array.isArray(JSON.parse(calls[0].input).context.history));
  assert.deepEqual(JSON.parse(calls[1].input).evidence.products,[]);
 }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=oldModel;}
});

test("name-based catalog groups narrow the index and unknown groups return empty",()=>{
 const all=searchCatalog({limit:1});
 for(const category of ["Автоматика","Кабель и провод","Освещение","Розетки и выключатели","Щитовое оборудование","Инструменты"]){
  const group=searchCatalog({category,limit:1});assert.ok(group.total>0,category);assert.ok(group.total<all.total,category);
 }
 assert.equal(searchCatalog({category:"not-a-group"}).total,0);
});
test("analogue requests ask about conflicting source facts instead of guessing",async()=>{
 const original=globalThis.fetch, saved={...process.env};
 process.env.EKT_API_URL="https://example.test/api";process.env.EKT_API_USER="test";process.env.EKT_API_PASSWORD="test";delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
 globalThis.fetch=async()=>new Response(JSON.stringify({id:515291,name:"027228 Автомат 3P 160А",article:"027228",price:100,quantity:0,properties:{NOMINALNYY_TOK:100,KOLICHESTVO_POLYUSOV:3}}));
 try{
  await getProductById(515291,true);
  const result=await processAssistantMessage("Подбери аналог: артикул 027228");
  assert.equal(result.intent,"analogue");assert.equal(result.products.length,0);assert.match(result.message,/противоречивые/);
 }finally{globalThis.fetch=original;for(const k of ["EKT_API_URL","EKT_API_USER","EKT_API_PASSWORD","OPENAI_API_KEY","OPENAI_MODEL"])if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
});
