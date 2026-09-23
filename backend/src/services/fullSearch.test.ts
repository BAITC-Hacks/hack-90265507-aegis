import test from "node:test";
import assert from "node:assert/strict";
import { searchCatalog } from "./catalogService.js";
import { searchVerifiedCatalog, verifyCandidates, parseCatalogOptions } from "./verifiedCatalog.js";
import { normalizeProduct } from "./verifiedProduct.js";
import { parseRequirements } from "./requirementParser.js";

test("full price search includes candidates beyond 120 and preserves early observations during a long scan", async t=>{
  const candidates=searchCatalog({all:true}).items;
  assert.ok(candidates.length>120);
  const early=candidates[0].id,late=candidates[120].id;
  let clock=Date.now(),calls=0;
  t.mock.method(Date,"now",()=>clock);
  const result=await searchVerifiedCatalog({price:{operator:"lt",value:50000,currency:"KZT"}},async id=>{
    calls++;clock+=1000;
    return {...normalizeProduct({id,name:"Светильник",price:id===early||id===late?49999:50000,quantity:1},id),verifiedAt:new Date(clock).toISOString()};
  });
  assert.equal(calls,candidates.length);
  assert.equal(result.total,2);
  assert.deepEqual(result.items.map(p=>p.id),[early,late]);
  assert.equal(result.coverage.partial,false);
  assert.equal(result.coverage.unknownPrice,0);
});

test("verification retains order, counts failures and bounds concurrent requests",async()=>{
  let active=0,peak=0;
  const result=await verifyCandidates([1,2,3,4,5,6],async id=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,1));
    active--;
    if(id===2)throw new Error("unavailable");
    return normalizeProduct({id,name:"Product",price:49999},id);
  });
  assert.ok(peak<=4);
  assert.deepEqual(result.map(p=>p?.id),[1,undefined,3,4,5,6]);
  assert.equal(result.filter(p=>!p).length,1);
});

test("luminaire ranges are recognized and default scan is unlimited",()=>{
  const requirements=parseRequirements("дай мне светильники от 40000 до 50000 тенге");
  assert.equal(requirements.productType,"Светильник");
  assert.deepEqual(requirements.price,{operator:"between",value:40000,max:50000,currency:"KZT"});
  assert.equal(requirements.article,undefined);
  assert.equal(parseCatalogOptions({}).scan,undefined);
});
