/* خالد تريد - Service Worker
   هدفه: التطبيق يفتح حتى لو النت ضعيف أو مقطوع (من نسخة محفوظة بعد أول فتح).
   أمان: بيتعامل مع ملفات التطبيق بس (نفس الدومين وطلبات GET). مش بيلمس المزامنة ولا الدخول ولا الخزنة
   ولا أي اتصال بسيرفر تاني (Firestore وغيره) ولا بيخزن أي بيانات. الشبكة أولاً دايماً، فمفيش نسخة قديمة بتظهر وإنت أونلاين. */
const C='kt-shell-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil((async()=>{try{const c=await caches.open(C);const r=await fetch('index.html',{cache:'reload'});if(r.ok){await c.put('index.html',r.clone());const t=await r.text();const us=[...t.matchAll(/(?:src|href)="((?:kt-|style)[^"]+)"/g)].map(m=>m[1]);await Promise.all(us.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))}}catch(x){}})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
const skip=p=>/(\/version\.json|\/sw\.js|\.apk)$/.test(p);
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin||skip(u.pathname))return;
 e.respondWith((async()=>{const c=await caches.open(C);
  try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),9000);const n=await fetch(r,{signal:ctl.signal});clearTimeout(t);if(n&&n.ok&&n.type==='basic')c.put(r,n.clone());return n}
  catch(x){const m=await c.match(r,{ignoreSearch:true});if(m)return m;if(r.mode==='navigate'){const i=await c.match('index.html');if(i)return i}throw x}})())});
