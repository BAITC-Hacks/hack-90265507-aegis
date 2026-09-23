import { normalizeProduct,type VerifiedProduct } from "./verifiedProduct.js";
const cache=new Map<number,{expires:number;product:VerifiedProduct}>();
const pending=new Map<number,Promise<VerifiedProduct>>();
let active=0;
const waiters:(()=>void)[]=[];
async function acquire(){if(active<6){active++;return;}if(waiters.length>=60)throw new Error("EKT busy");await new Promise<void>(r=>waiters.push(r));}
function release(){const next=waiters.shift();if(next)next();else active--;}
export async function getProductById(id:number,fresh=false):Promise<VerifiedProduct>{
  if(!Number.isSafeInteger(id)||id<=0)throw new Error("Invalid product ID");
  if(!fresh){const c=cache.get(id);if(c&&c.expires>Date.now())return c.product;const r=pending.get(id);if(r)return r;}
  const operation=(async()=>{
    await acquire();
    try{
      const {EKT_API_URL:base,EKT_API_USER:user,EKT_API_PASSWORD:password}=process.env;
      if(!base||!user||!password)throw new Error("EKT is not configured");
      const url=new URL(base.replace(/\/$/,"")+"/products/detail");url.searchParams.set("id",String(id));
      if(url.protocol!=="https:")throw new Error("EKT requires HTTPS");
      const r=await fetch(url,{headers:{Authorization:"Basic "+Buffer.from(user+":"+password).toString("base64"),Accept:"application/json"},signal:AbortSignal.timeout(10000),redirect:"error"});
      if(!r.ok)throw new Error("EKT HTTP "+r.status);
      const product=normalizeProduct(await r.json(),id);
      if(cache.size>=500)cache.delete(cache.keys().next().value!);
      cache.set(id,{expires:Date.now()+30000,product});return product;
    }finally{release();}
  })();
  if(!fresh)pending.set(id,operation);
  try{return await operation;}finally{if(!fresh)pending.delete(id);}
}
