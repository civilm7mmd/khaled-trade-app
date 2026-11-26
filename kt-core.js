/* خالد تريد - النواة: البيانات (localStorage) · الصلاحيات · المنتجات · العملاء · فاتورة البيع · المشاركة/PDF
   جزء من برنامج حسابات خالد تريد. شوف README.md لتوزيع الملفات. */

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>(Math.round((+n||0)*100)/100).toLocaleString('en-US');
const today=()=>window.__TD||new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const UNITS=['شيكارة','كرتونة','علبة','عبوة','زجاجة','جالون','لتر','كيلو','قطعة'];
const PACKS=['','50 كجم','25 كجم','10 كجم','5 كجم','1 كجم','1 لتر','5 لتر','20 لتر','250 مل','100 جم'];
const unitT=p=>p.unit+(p.pack?' '+p.pack:'');
const CATS=['سماد','مبيد','مستلزمات'];
/* ===== طبقة البيانات: النقطة الوحيدة اللي بتكلم التخزين. لما نروح للسيرفر بنبدل store بس (API بدل localStorage) ===== */
const store={load:()=>null,save:d=>{if(typeof Auth!=='undefined')Auth.persist(d)}};/* التخزين مشفر عن طريق Auth (src_auth.js). للسيرفر: نبدل save/load بنداء API */
let db=store.load()||{products:[],customers:[],invoices:[],seq:{p:0,c:0,i:0}};
db.settings=db.settings||{name:'خالد تريد',sub:'أسمدة · مبيدات · مستلزمات زراعية',phone:'',addr:'سيدي سالم'};
/* ---------- تجهيز بيانات النظام وترحيل الإصدارات القديمة (ensure) ---------- */
function ensure(){db.seq=db.seq||{};db.settings=db.settings||{name:'خالد تريد',sub:'أسمدة · مبيدات · مستلزمات زراعية',phone:'',addr:'سيدي سالم'};db.products=db.products||[];db.customers=db.customers||[];db.invoices=db.invoices||[];
 db.companies=db.companies||[];db.sections=db.sections||[];db.seq.co=db.seq.co||db.companies.length;db.seq.se=db.seq.se||db.sections.length;
 if(!db.sections.length)['مبيدات','مغذيات','أسمدة','بذور','مستلزمات'].forEach(n=>db.sections.push({id:++db.seq.se,name:n}));
 const m={'سماد':'أسمدة','مبيد':'مبيدات'};db.products.forEach(p=>{if(!p.sec){const n=m[p.cat]||p.cat;const s=db.sections.find(x=>x.name===n);p.sec=s?s.id:0}if(p.code===undefined)p.code=''});
 db.wh=db.wh||[{id:1,name:'المخزن الرئيسي'}];db.seq.wh=db.seq.wh||db.wh.length;
 ['cars','suppliers','purchases','spay','rets','adjs','trans','exps','cashx','pay','audit','expCats','payments','quotes','cancelled','disp','offers','notes','msgs'].forEach(k=>db[k]=db[k]||[]);
 if(!db.stk){db.stk={w1:{}};db.products.forEach(p=>{db.stk.w1[p.id]=p.stock||0})}
 db.users=db.users||[{id:1,name:'المدير',username:'admin',role:'manager',perms:['*'],locs:[],emp:false,active:true}];
 db.users.forEach(u=>{if(!u.perms)u.perms=(TEMPLATES[u.role]||TEMPLATES.manager).perms.slice();u.locs=u.locs||[];if(u.id===1&&u.role==='manager')u.perms=['*']});
 db.chatRead=db.chatRead||{};db.settings.print=db.settings.print||{paper:'A4',logo:true,footer:''};db.me=db.me||1;delete db.roles;syncStock()}
const me=()=>db.users.find(u=>u.id==db.me)||db.users[0];
const can=k=>{const p=(me()||{}).perms||[];if(k==='data.delete'||k==='sales.delete'||k==='expenses.delete')return p.includes('*');/* الحذف للمدير بس */return p.includes('*')||p.includes(k)};
const secN=id=>(db.sections.find(x=>x.id==id)||{}).name||'',coN=id=>(db.companies.find(x=>x.id==id)||{}).name||'';
let fSec='',fCo='';
const save=()=>store.save(db);
function seed(){
 const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
 db={products:[],customers:[],invoices:[],seq:{p:0,c:0,i:0}};
 const P=(name,cat,unit,cost,price,stock,min,exp)=>db.products.push({id:++db.seq.p,name,cat,unit,cost,price,stock,min,exp});
 P('يوريا 46% (50 كجم)','سماد','شيكارة',820,900,120,20,'');
 P('سوبر فوسفات (50 كجم)','سماد','شيكارة',400,450,8,15,'');
 P('نترات نشادر 33.5%','سماد','شيكارة',700,760,60,20,'');
 P('كلوريبيريفوس 48% (لتر)','مبيد','لتر',150,185,40,10,d(25));
 P('مبيد فطري كوبر أوكسي','مبيد','كرتونة',900,1050,15,5,d(200));
 db.customers.push({id:++db.seq.c,name:'أبو محمود الجمال',phone:'01012345678',addr:'قرية الحامول',type:'آجل',balance:4500,open:0,map:'31.2940,30.9701'});
 db.customers.push({id:++db.seq.c,name:'م. أحمد السيد',phone:'01123456789',addr:'سيدي سالم',type:'آجل',balance:0});
 db.customers.push({id:++db.seq.c,name:'الحاج سعيد',phone:'01234567890',addr:'مطوبس',type:'كاش',balance:0});
 db.invoices.push({id:++db.seq.i,no:1,date:today(),cid:1,notes:'التسليم بكرة الصبح على العربية',items:[{pid:1,name:'يوريا 46% (50 كجم)',unit:'شيكارة',qty:10,price:900}],total:9000,paid:4500,rem:4500});
 db.invoices.push({id:++db.seq.i,no:2,date:today(),cid:0,items:[{pid:4,name:'كلوريبيريفوس 48% (لتر)',unit:'لتر',qty:4,price:185}],total:740,paid:740,rem:0});
 save();
}

const recalc=c=>{c.balance=(c.open||0)+db.invoices.filter(i=>i.cid==c.id).reduce((a,i)=>a+i.total-i.paid,0)-(db.payments||[]).filter(p=>p.cid==c.id).reduce((a,p)=>a+p.amount,0)-(db.rets||[]).filter(r=>r.k==='sret'&&r.party==c.id).reduce((a,r)=>a+r.total-r.paid,0)};
const prod=id=>db.products.find(p=>p.id==id), cust=id=>db.customers.find(c=>c.id==id);
const cname=id=>id?(cust(id)?.name||'—'):'عميل نقدي';
function expState(p){ if(!p.exp)return null; const d=Math.ceil((new Date(p.exp)-new Date(today()))/864e5);
 if(d<0)return{c:'bad',t:'منتهي'}; if(d<=60)return{c:'warn',t:'باقي '+d+' يوم'}; return{c:'',t:p.exp}; }
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}
function head(title,back){ $('#hd').innerHTML=(back?'<button class="back" onclick="history.back()">رجوع ›</button>':'<img src="'+LOGO+'">')+'<h1>'+esc(title)+'</h1>'+(back?'':'<img src="'+LOGO+'" style="display:none">'); }
function navbar(){const h=location.hash.slice(1)||'/';const on=p=>h===p||h.startsWith(p+'/')||h.startsWith(p+'?');
 const it=[['/','🏠','الرئيسية',null,['/']],['/invoices','🧾','الفواتير','sales.view',['/invoices','/invoice']],['/products','📦','المنتجات',['products.view','stock.view','sales.add','purchases.add'],['/products','/product']],['/accounts','👥','الحسابات',['customers.view','suppliers.view'],['/accounts','/account','/customers','/customer','/suppliers','/supplier']],['/more','☰','المزيد',null,['/more']]];
 $('#nav').innerHTML=it.filter(x=>!x[3]||canAny(x[3])).map(x=>`<a href="#${x[0]}" class="${x[4].some(p=>p==='/'?h==='/':on(p))?'on':''}"><b>${x[1]}</b>${x[2]}</a>`).join('');}
const R={};
R['/']=()=>{head('خالد تريد');setTimeout(()=>{const h=document.querySelector('#hd');if(h&&!h.querySelector('.gear'))h.insertAdjacentHTML('beforeend','<button class="back gear" onclick="location.hash=\'#/settings\'">⚙️ الشركة</button>')},0);
 const low=db.products.filter(p=>p.stock<=p.min), ex=db.products.filter(p=>{const s=expState(p);return s&&s.c});
 const sales=db.invoices.filter(i=>i.date===today()).reduce((a,i)=>a+i.total,0);
 const owed=db.customers.reduce((a,c)=>a+(c.balance||0),0);
 return `<div class="hero"><button class="big gold full" data-need="sales.add" onclick="location.hash='#/invoice/new'"><span>🧾</span>فاتورة بيع جديدة</button>
 <button class="big" data-need="products.add" onclick="location.hash='#/product/new'"><span>📦</span>إضافة منتج</button>
 <button class="big" data-need="customers.add" onclick="location.hash='#/customer/new'"><span>👤</span>إضافة عميل</button><button class="big" data-need="customers.statement" onclick="location.hash='#/stmt'"><span>📄</span>كشف حساب</button><button class="big" data-need="reports.view" onclick="location.hash='#/reports'"><span>📊</span>التقارير</button></div>
 <div class="card" style="margin-top:12px"><h2>ملخص اليوم</h2>
 <div class="stat"><span>مبيعات النهارده</span><b>${fmt(sales)} ج.م</b></div>
 <div class="stat" data-need="customers.view"><span>اللي ليك عند العملاء</span><b>${fmt(owed)} ج.م</b></div><div class="stat" data-need="cash.view"><span>رصيد الخزينة</span><b>${fmt(cashBal())} ج.م</b></div>
 <div class="stat"><span>عدد المنتجات</span><b>${db.products.length}</b></div>
 <div class="stat"><span>عدد الحسابات</span><b>${(typeof aclList==="function"?aclList().length:db.customers.length)}</b></div></div>
 ${ex.length?`<div class="alert">⚠️ <b>صلاحية:</b> ${ex.map(p=>esc(p.name)+' ('+expState(p).t+')').join('، ')}</div>`:''}
 ${low.length?`<div class="alert">📉 <b>نواقص:</b> ${low.map(p=>esc(p.name)+' ('+p.stock+')').join('، ')}</div>`:''}`;};
R['/settings']=()=>{head('بيانات الشركة',true);const st=db.settings;return `<div class="card"><p style="color:var(--mut);font-size:13px;margin-top:0">دي البيانات اللي بتظهر في أعلى الفاتورة المطبوعة.</p><label>اسم الشركة</label><input id="s_name" value="${esc(st.name)}"><label>الوصف</label><input id="s_sub" value="${esc(st.sub||'')}"><label>رقم التليفون</label><input id="s_phone" type="tel" value="${esc(st.phone)}" placeholder="01xxxxxxxxx"><label>العنوان</label><input id="s_addr" value="${esc(st.addr)}"><button class="btn" onclick="db.settings={name:$('#s_name').value,sub:$('#s_sub').value,phone:$('#s_phone').value,addr:$('#s_addr').value};save();toast('تم الحفظ ✅');history.back()">حفظ</button></div>`};
R['/products']=()=>{head('المنتجات');
 return `<input class="search" placeholder="🔍 ابحث عن منتج" oninput="filt(this.value)"><div class="bar"><select onchange="fSec=this.value;filt('')"><option value="">كل الأقسام</option>${db.sections.map(x=>`<option value="${x.id}" ${fSec==x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><select onchange="fCo=this.value;filt('')"><option value="">كل الشركات</option>${db.companies.map(x=>`<option value="${x.id}" ${fCo==x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="bar"><button onclick="location.hash='#/lists'">🏢 الشركات والأقسام</button><button onclick="location.hash='#/pricelist'">🧾 قائمة أصناف</button><button class="${reorder?'on':''}" onclick="reorder=!reorder;route()">↕ ترتيب بالسحب للأعلى/الأسفل</button><select onchange="sortP(this.value);this.value=''"><option value="">فرز حسب…</option><option value="name">الاسم</option><option value="cat">القسم والشركة</option><option value="low">النواقص أولاً</option><option value="exp">الأقرب صلاحية</option></select></div><div class="card" id="plist">${plist('')}</div><button class="fab" onclick="location.hash='#/product/new'">＋ منتج</button>`;};
let reorder=false;
function sortP(k){const cmp={name:(a,b)=>a.name.localeCompare(b.name,'ar'),cat:(a,b)=>secN(a.sec).localeCompare(secN(b.sec),'ar')||coN(a.co).localeCompare(coN(b.co),'ar')||a.name.localeCompare(b.name,'ar'),low:(a,b)=>(a.stock-a.min)-(b.stock-b.min),exp:(a,b)=>(a.exp||'9999').localeCompare(b.exp||'9999')}[k];if(!cmp)return;db.products.sort(cmp);save();filt('');toast('تم الفرز ✅')}
function mvP(id,d){const i=db.products.findIndex(p=>p.id==id),j=i+d;if(j<0||j>=db.products.length)return;[db.products[i],db.products[j]]=[db.products[j],db.products[i]];save();$('#plist').innerHTML=plist('')}
function mvL(k,d){const j=k+d;if(j<0||j>=draft.lines.length)return;[draft.lines[k],draft.lines[j]]=[draft.lines[j],draft.lines[k]];drawLines()}
function plist(q){const l=db.products.filter(p=>p.name.includes(q)&&(!fSec||p.sec==fSec)&&(!fCo||p.co==fCo));if(!l.length)return '<div class="empty">مفيش منتجات. دوس ＋ منتج</div>';
 return l.map(p=>{const e=expState(p);return `<div class="item" ${reorder?'':`onclick="location.hash='#/product/${p.id}'"`}>${reorder?`<div class="mv"><button onclick="mvP(${p.id},-1)">▲</button><button onclick="mvP(${p.id},1)">▼</button></div>`:''}<div class="main"><div class="t">${esc(p.name)}</div><div class="s">${esc(secN(p.sec))}${p.co?' · '+esc(coN(p.co)):''} · ${esc(unitT(p))} بـ ${fmt(p.price)}${e?` · <span class="pill ${e.c}">${e.t}</span>`:''}</div></div><div style="text-align:left"><div class="num ${p.stock<=p.min?'neg':''}">${fmt(p.stock)}</div><div class="s">${esc(p.unit)}</div></div></div>`}).join('');}
function filt(q){$('#plist')&&($('#plist').innerHTML=plist(q));$('#clist')&&($('#clist').innerHTML=clist(q));}
R['/product']=id=>{const p=id==='new'?{name:'',sec:fSec||(db.sections[0]||{}).id,co:fCo||'',unit:'شيكارة',cost:'',price:'',stock:'',min:5,exp:''}:prod(id);if(!p)return '<div class="empty">المنتج مش موجود</div>';
 head(id==='new'?'إضافة منتج':'تعديل منتج',true);
 const opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
 return `<div class="card"><label>اسم المنتج</label><input id="f_name" value="${esc(p.name)}" placeholder="مثال: يوريا 46%"><label>كود المنتج (اختياري، للبحث السريع)</label><input id="f_code" value="${esc(p.code||'')}" placeholder="مثال: 101">
 <div class="row2"><div><label>الشركة</label><select id="f_co" onchange="addNew(this,'co')"><option value="">— اختار —</option>${db.companies.map(x=>`<option value="${x.id}" ${p.co==x.id?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="__new">＋ شركة جديدة</option></select></div><div><label>القسم</label><select id="f_sec" onchange="addNew(this,'se')">${db.sections.map(x=>`<option value="${x.id}" ${p.sec==x.id?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="__new">＋ قسم جديد</option></select></div></div>
 <div class="row2"><div><label>الوحدة</label><select id="f_unit">${opt(UNITS,p.unit)}</select></div><div><label>حجم / محتوى العبوة</label><input id="f_pack" list="packs" value="${esc(p.pack||'')}" placeholder="مثال: 50 كجم، لتر"><datalist id="packs">${PACKS.filter(x=>x).map(x=>`<option value="${x}">`).join('')}</datalist></div></div>
 <div class="row2"><div data-need="products.cost"><label>سعر شراء العبوة</label><input id="f_cost" type="number" inputmode="decimal" value="${p.cost}"></div><div><label>سعر بيع العبوة</label><input id="f_price" type="number" inputmode="decimal" value="${p.price}"></div></div>
 <div class="row2"><div><label>${id==='new'?'الكمية الافتتاحية (في المخزن الرئيسي)':'الرصيد (بيتغير بفواتير الشراء والجرد والتحويل)'}</label><input id="f_stock" type="number" inputmode="decimal" value="${p.stock}" ${id==='new'?'':'disabled'}></div><div><label>حد النواقص</label><input id="f_min" type="number" inputmode="decimal" value="${p.min}"></div></div>
 <label>📦 عدد العبوات (أو الكيلو) في الوحدة الواحدة</label><input id="f_pk" type="number" inputmode="decimal" value="${p.pk||''}" placeholder="مثال: كرتونة فيها 20 عبوة ← 20 · شيكارة 10 كجم ← 10"><div class="note" style="margin:-4px 0 10px">في الفاتورة هتلاقي خانة للوحدات (كراتين/شكائر) وخانة للعبوات، والبرنامج يضرب تلقائي. سيبها فاضية لو الصنف بيتباع بالقطعة بس.</div><label>تاريخ الصلاحية (للمبيدات)</label><input id="f_exp" type="date" value="${p.exp||''}">
 <button class="btn" data-need="${id==='new'?'products.add':'products.edit'}" onclick="saveProduct('${id}')">حفظ المنتج</button>
 ${id!=='new'?`<button class="btn sec" onclick="location.hash='#/pmove/${p.id}'">📒 حركة الصنف (وارد / منصرف / رصيد)</button><button class="btn del" data-need="products.delete" onclick="delProduct(${p.id})">حذف المنتج</button>`:''}</div>`;};
function saveProduct(id){const g=k=>{const e=$('#f_'+k);return e?e.value.trim():''};if(!g('name'))return toast('اكتب اسم المنتج');
 if(!g('price'))return toast('اكتب سعر البيع');
 const o={name:g('name'),code:g('code'),sec:+g('sec')||0,co:+g('co')||0,cat:secN(+g('sec')),unit:g('unit'),pack:g('pack'),pk:+g('pk')||0,price:+g('price')||0,min:+g('min')||0,exp:g('exp')};
 if($('#f_cost'))o.cost=+g('cost')||0;
 if(id==='new'){const p={id:++db.seq.p,stock:0,cost:o.cost||0,...o};db.products.push(p);const q=+g('stock')||0;if(q)mv('w'+db.wh[0].id,p.id,q)}else Object.assign(prod(id),o);
 save();toast('تم الحفظ ✅');location.hash='#/products';}
function addNew(el,k){if(el.value!=='__new')return;const n=(prompt(k==='co'?'اسم الشركة':'اسم القسم')||'').trim();if(!n){el.selectedIndex=0;return}const a=k==='co'?db.companies:db.sections;let x=a.find(y=>y.name===n);if(!x){x={id:++db.seq[k],name:n};a.push(x)}save();const o=document.createElement('option');o.value=x.id;o.textContent=n;el.insertBefore(o,el.querySelector('[value=__new]'));el.value=x.id}
R['/lists']=()=>{head('الشركات والأقسام',true);const blk=(t,a,k,ph)=>`<div class="card"><h2>${t}</h2>${a.map(x=>`<div class="item"><div class="main"><div class="t">${esc(x.name)}</div><div class="s">${db.products.filter(p=>p[k==='co'?'co':'sec']==x.id).length} منتج</div></div><button class="mv-b" style="border:0;background:#fdecea;color:#c0392b;border-radius:10px;padding:8px 12px;font:inherit" onclick="delList('${k}',${x.id})">حذف</button></div>`).join('')||'<div class="empty">فاضي</div>'}<div class="row2" style="margin-top:10px"><input id="n_${k}" placeholder="${ph}"><button class="btn" style="margin:0" onclick="addList('${k}')">＋ إضافة</button></div></div>`;
 return blk('الشركات (الموردين / الماركات)',db.companies,'co','مثال: Green Life')+blk('الأقسام',db.sections,'se','مثال: مبيدات');};
function addList(k){const n=$('#n_'+k).value.trim();if(!n)return;const a=k==='co'?db.companies:db.sections;if(a.some(x=>x.name===n))return toast('موجود قبل كده');a.push({id:++db.seq[k],name:n});save();route()}
function delList(k,id){const f=k==='co'?'co':'sec';const n=db.products.filter(p=>p[f]==id).length;if(n)return toast('فيه '+n+' منتج تابع له. غيّرهم الأول');if(confirm('تحذف؟')){if(k==='co')db.companies=db.companies.filter(x=>x.id!=id);else db.sections=db.sections.filter(x=>x.id!=id);save();route()}}
function delProduct(id){if(confirm('تحذف المنتج؟')){db.products=db.products.filter(p=>p.id!=id);save();location.hash='#/products'}}
R['/customers']=()=>{head('العملاء');return `<input class="search" placeholder="🔍 ابحث عن عميل" oninput="filt(this.value)"><div class="card" id="clist">${clist('')}</div><button class="fab" onclick="location.hash='#/customer/new'">＋ عميل</button>`;};
const ad=t=>(t||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const phones=c=>[c.phone,c.phone2,c.phone3].filter(Boolean);
const cmatch=(c,q)=>{q=ad(q).trim();if(!q)return true;const d=q.replace(/\D/g,'');return c.name.includes(q)||(d.length>0&&phones(c).some(p=>ad(p).replace(/\D/g,'').includes(d)))};
function clist(q){const l=db.customers.filter(c=>cmatch(c,q));if(!l.length)return '<div class="empty">مفيش عملاء. دوس ＋ عميل</div>';
 return l.map(c=>`<div class="item" onclick="location.hash='#/customer/${c.id}'"><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.phone||'')}${c.phone?' · ':''}${esc([c.area,c.gov,c.addr].filter(Boolean).join('، '))} ${c.rep?'· 🚚 '+esc(uname(c.rep)):''} · <span class="pill ${c.type==='آجل'?'warn':''}">${esc(c.type)}</span></div></div><div style="text-align:left"><div class="num ${c.balance>0?'neg':''}">${fmt(c.balance)}</div><div class="s">ج.م عليه</div></div></div>`).join('');}
R['/customer']=id=>{const c=id==='new'?{name:'',phone:'',addr:'',type:'كاش',balance:0,open:0}:cust(id);if(!c)return '<div class="empty">العميل مش موجود</div>';
 head(id==='new'?'إضافة عميل':'بيانات العميل',true);
 const inv=id==='new'?[]:db.invoices.filter(i=>i.cid==id).reverse();
 return `<div class="card"><label>اسم العميل</label><input id="f_name" value="${esc(c.name)}" placeholder="الاسم">
 <label>أرقام التليفون (لحد 3، الأول هو اللي بيتبعت عليه واتساب)</label><input id="f_phone" type="tel" inputmode="tel" value="${esc(c.phone)}" placeholder="الرقم الأول (واتساب)"><div class="row2" style="margin-top:8px"><input id="f_phone2" type="tel" inputmode="tel" value="${esc(c.phone2||'')}" placeholder="رقم تاني"><input id="f_phone3" type="tel" inputmode="tel" value="${esc(c.phone3||'')}" placeholder="رقم تالت"></div>
 <label>العنوان / القرية</label><input id="f_addr" value="${esc(c.addr)}"><div class="row2"><div><label>المحافظة</label><input id="f_gov" value="${esc(c.gov||'')}" placeholder="كفر الشيخ"></div><div><label>المنطقة</label><input id="f_area" value="${esc(c.area||'')}" placeholder="سيدي سالم"></div></div><label>المندوب المسؤول</label><select id="f_rep"><option value="">— بدون —</option>${db.users.filter(u=>u.emp).map(u=>`<option value="${u.id}" ${c.rep==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select><label>ملاحظات عن العميل</label><input id="f_notes" value="${esc(c.notes||'')}" placeholder="أي ملاحظة">
 <div class="row2"><div><label>نوع التعامل</label><select id="f_type"><option ${c.type==='كاش'?'selected':''}>كاش</option><option ${c.type==='آجل'?'selected':''}>آجل</option></select></div>
 <div><label>رصيد سابق (عليه) قبل البرنامج</label><input id="f_bal" type="number" inputmode="decimal" value="${c.open||0}"></div></div>
 <label>موقع العميل على الخريطة (اختياري)</label>
 <input id="f_map" value="${esc(c.map||'')}" placeholder="إحداثيات أو رابط خرائط جوجل">
 <button class="btn sec" style="margin-top:8px" onclick="getLoc()">📍 حدد موقعي الحالي</button>
 ${c.map?`<a class="btn sec" style="display:block;text-align:center;text-decoration:none;margin-top:8px" target="_blank" href="${mapUrl(c.map)}">🗺️ فتح موقع العميل في الخرائط</a>`:''}
 <button class="btn" data-need="${id==='new'?'customers.add':'customers.edit'}" onclick="saveCustomer('${id}')">حفظ العميل</button>
 ${id!=='new'?`<button class="btn sec" onclick="location.hash='#/invoice/new?c=${c.id}'">فاتورة بيع لهذا العميل</button><button class="btn del" data-need="customers.delete" onclick="delCustomer(${c.id})">حذف العميل</button>`:''}</div>
 ${id!=='new'?custTotals(c,inv)+payBox(c)+`<div data-need="customers.statement">${stmt(c)}</div>`:''}`;};
const payBox=c=>`<div class="card noprint" data-need="customers.collect"><h2>تسجيل دفعة من العميل</h2><div class="row2"><div><label>المبلغ</label><input id="pay_a" type="number" inputmode="decimal" placeholder="0"></div><div><label>ملاحظة</label><input id="pay_n" placeholder="اختياري"></div></div><button class="btn" onclick="addPay(${c.id})">💵 تسجيل التحصيل</button></div>`;
function addPay(cid){const a=+$('#pay_a').value;if(!(a>0))return toast('اكتب مبلغ صحيح');db.payments.push({id:++db.seq.pay,cid,date:today(),ts:Date.now(),by:db.me||1,amount:a,note:$('#pay_n').value.trim()});recalc(cust(cid));save();toast('تم تسجيل الدفعة ✅');route();}
const mapUrl=m=>/^https?:/.test(m)?m:'https://www.google.com/maps?q='+encodeURIComponent(m);
function getLoc(){if(!navigator.geolocation)return toast('الموبايل مش بيدعم تحديد الموقع');navigator.geolocation.getCurrentPosition(p=>{$('#f_map').value=p.coords.latitude.toFixed(6)+','+p.coords.longitude.toFixed(6);toast('تم تحديد الموقع ✅')},()=>toast('اسمح للمتصفح بالموقع'),{enableHighAccuracy:true,timeout:15000})}
function saveCustomer(id){const g=k=>$('#f_'+k).value.trim();if(!g('name'))return toast('اكتب اسم العميل');
 const o={name:g('name'),phone:g('phone'),phone2:g('phone2'),phone3:g('phone3'),addr:g('addr'),type:g('type'),open:+g('bal')||0,map:g('map'),gov:g('gov'),area:g('area'),rep:+g('rep')||0,notes:g('notes')};
 let cc;if(id==='new'){cc={id:++db.seq.c,...o};db.customers.push(cc)}else{cc=cust(id);Object.assign(cc,o)}recalc(cc);save();toast('تم الحفظ ✅');location.hash='#/customers';}
function delCustomer(id){if(confirm('تحذف العميل؟')){db.customers=db.customers.filter(c=>c.id!=id);save();location.hash='#/customers'}}
R['/invoices']=()=>{head('فواتير البيع');const l=[...db.invoices].reverse();
 return `<div class="card">${l.length?l.map(i=>`<div class="item" onclick="location.hash='#/invoice/${i.id}'"><div class="main"><div class="t">فاتورة #${i.no} · ${esc(cname(i.cid))}</div><div class="s">${i.date}${i.rem>0?` · <span class="pill bad">آجل · باقي ${fmt(i.rem)}</span>`:' · <span class="pill">كاش</span>'}</div></div><div class="num">${fmt(i.total)}</div></div>`).join(''):'<div class="empty">مفيش فواتير لسه</div>'}</div><button class="fab" onclick="location.hash='#/invoice/new'">＋ فاتورة</button>`;};
let draft={cid:0,lines:[{}],paid:null,notes:'',kind:'كاش',adjT:'خصم',adjM:'amt',adjV:0};
R['/invoice']=(id,qs)=>{
 if(id!=='new'){const i=db.invoices.find(x=>x.id==id);if(!i)return '<div class="empty">الفاتورة مش موجودة</div>';head('فاتورة #'+i.no,true);const st=db.settings,c=i.cid?cust(i.cid):null;
  return `<div class="card inv"><div class="lh"><img src="${LOGO}"><div><div class="co">${esc(st.name)}</div><div class="sub2">${esc(st.sub||'')}</div>${st.phone?`<div class="sub2">📞 ${esc(st.phone)}</div>`:''}${st.addr?`<div class="sub2">📍 ${esc(st.addr)}</div>`:''}</div></div>
  <div class="meta"><div><span>فاتورة بيع رقم</span><b>#${i.no}</b></div><div><span>التاريخ</span><b>${i.date}</b></div><div><span>النوع</span><b class="${i.rem>0?'neg':''}">${i.rem>0?'آجل':'كاش'}</b></div></div>
  <div class="cu"><div><span>العميل:</span> <b>${esc(cname(i.cid))}</b></div>${i.loc?`<div><span>البيع من:</span> ${esc(locName(i.loc))}</div>`:''}${c&&c.phone?`<div><span>تليفون:</span> ${esc(phones(c).join(' - '))}</div>`:''}${c&&c.addr?`<div><span>العنوان:</span> ${esc(c.addr)}</div>`:''}</div>
  ${invTable(i)}
  ${i.adj?`<div class="stat"><span>مجموع الأصناف</span><b>${fmt(i.sub)} ج.م</b></div>${adjParts(i).map(p=>`<div class="stat"><span>${esc(p[0])}</span><b class="${p[1]<0?'neg':''}">${p[1]<0?'−':'+'}${fmt(Math.abs(p[1]))} ج.م</b></div>`).join('')}`:''}<div class="stat"><span>الإجمالي</span><b>${fmt(i.total)} ج.م</b></div><div class="stat"><span>المدفوع</span><b>${fmt(i.paid)} ج.م</b></div><div class="stat"><span>الباقي</span><b class="${i.rem>0?'neg':''}">${fmt(i.rem)} ج.م</b></div>
  ${i.notes?`<div class="notes"><span>ملاحظات:</span> ${esc(i.notes)}</div>`:''}
  ${retBtns('inv',i)}<button class="btn sec noprint" data-need="sales.edit" onclick="editInvoice(${i.id})">✏️ تعديل الفاتورة</button><button class="btn del noprint" data-need="sales.delete" onclick="delInvoice(${i.id})">⛔ إلغاء الفاتورة</button>${invStrip(i)}<button class="btn wa noprint" onclick="shareInv(${i.id},'text')">💬 إرسال على واتساب العميل${c&&c.phone?' ('+esc(c.phone)+')':''}</button><button class="btn sec noprint" onclick="shareInv(${i.id})">📎 إرسال الفاتورة PDF (اختار العميل في واتساب)</button><div class="row2 noprint"><button class="btn sec" onclick="window.print()">🖨️ طباعة</button><button class="btn sec" onclick="saveInvPdf(${i.id})">⬇️ حفظ PDF</button></div></div>`;}
 head('فاتورة بيع جديدة',true);
 const m=/c=(\d+)/.exec(qs||'');if(m)draft.cid=+m[1];
 return `${myLocs().length>1?`<div class="card"><label>البيع من</label><select onchange="draft.loc=this.value;drawLines()">${myLocs().map(l=>`<option value="${l}" ${dLoc()===l?'selected':''}>${esc(locName(l))}</option>`).join('')}</select></div>`:''}<div class="card"><label>نوع البيع</label><div class="seg"><button class="${draft.kind==='كاش'?'on':''}" onclick="setKind('كاش')">💵 كاش</button><button class="${draft.kind==='آجل'?'on credit':''}" onclick="setKind('آجل')">🕒 آجل</button></div></div><div class="card"><label>العميل (اكتب أول حرف)</label><div class="ac"><input id="i_cq" autocomplete="off" placeholder="🔍 ابحث باسم العميل أو عميل نقدي" value="${draft.cid?esc(cname(draft.cid)):''}" oninput="draft.cid=0;acCust(this.value)" onfocus="this.select();acCust(this.value)"><div class="acl" id="i_cl"></div></div></div>
 <div class="card"><h2>الأصناف</h2><div class="lines" id="lines"></div><button class="btn sec" style="margin-top:0" onclick="draft.lines.push({});drawLines()">＋ إضافة صنف</button></div>
 <div class="card"><label>خصم أو زيادة على الفاتورة (اختياري)</label><div class="adj"><select onchange="draft.adjT=this.value;drawTot()"><option ${draft.adjT==='خصم'?'selected':''}>خصم</option><option ${draft.adjT==='زيادة'?'selected':''}>زيادة</option></select><input type="number" inputmode="decimal" placeholder="0" value="${draft.adjV||''}" oninput="draft.adjV=+this.value||0;drawTot()"><div class="seg2"><button class="${draft.adjM==='amt'?'on':''}" onclick="draft.adjM='amt';route();drawLines()">ج.م</button><button class="${draft.adjM==='pct'?'on':''}" onclick="draft.adjM='pct';route();drawLines()">%</button></div></div></div>
 <div class="card"><label>ملاحظات الفاتورة</label><input id="i_notes" placeholder="مثال: التسليم بكرة الصبح" value="${esc(draft.notes||'')}" oninput="draft.notes=this.value"><div id="tot"></div><button class="btn" onclick="saveInvoice()">حفظ الفاتورة</button></div>`;};
function hideAc(){document.querySelectorAll('.acl').forEach(e=>e.style.display='none')}
document.addEventListener('click',e=>{if(!e.target.closest('.ac'))hideAc()});
function showAc(id,items){const el=$('#'+id);if(!el)return;hideAc();if(!items.length){el.innerHTML='<div class="aco" style="color:#6b727c">مفيش نتيجة. سجّله الأول من صفحته</div>';}else el.innerHTML=items.join('');el.style.display='block';}
function acCust(q){q=q.trim();const l=[];if(!q||'عميل نقدي'.includes(q))l.push('<div class="aco" onclick="pickC(0)"><b>عميل نقدي</b></div>');
 db.customers.filter(c=>cmatch(c,q)).slice(0,8).forEach(c=>l.push(`<div class="aco" onclick="pickC(${c.id})"><b>${esc(c.name)}</b><span>${c.balance>0?'عليه '+fmt(c.balance):esc(c.phone||c.addr||'')}</span></div>`));if(typeof aclOnly==='function')aclOnly('s',q).forEach(s=>l.push(`<div class="aco" onclick="pickCS(${s.id})"><b>${esc(s.name)}</b><span>${esc(s.phone||s.addr||'')}</span></div>`));showAc('i_cl',l);}
function pickC(id){draft.cid=id;draft.lines.forEach(l=>{if(l.pid&&!l.edited){const lp=lastPrice(id,l.pid);l.price=lp??prod(l.pid).price;l.last=lp!=null}});if($('#lines'))drawLines();$('#i_cq').value=id?cname(id):'عميل نقدي';hideAc();}
function lastPrice(cid,pid){if(!cid)return null;for(let i=db.invoices.length-1;i>=0;i--){const v=db.invoices[i];if(v.cid==cid){const it=v.items.find(x=>x.pid==pid);if(it)return it.price}}return null}
function setKind(k){draft.kind=k;if(k==='آجل')draft.paid=0;route();drawLines();}
const remTxt=r=>r>0?`🕒 آجل: الباقي على العميل <b>${fmt(r)} ج.م</b> (هيتسجل عليه)`:'الفاتورة اتدفعت بالكامل، هتتسجل كاش';
function drawRem(){const t=dTotal();$('#rem').innerHTML=remTxt(t-paidOf(t));}

const FONT="'Noto Kufi Arabic','Segoe UI',Tahoma,Arial,sans-serif";
function invCanvas(i){return new Promise(res=>{const st=db.settings,c=i.cid?cust(i.cid):null;const W=900;
 const rows=i.items.length,extra=(i.adj?1+adjParts(i).length:0)+(i.notes?1:0)+6;const H=520+rows*54+extra*46+190;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.direction='rtl';x.textBaseline='middle';
 x.fillStyle='#fff';x.fillRect(0,0,W,H);
 const R=W-40,L=40;const t=(txt,px,y,font,col,al)=>{x.font=font+' '+FONT;x.fillStyle=col||'#171d25';x.textAlign=al||'right';x.fillText(txt,px,y)};
 const im=new Image();im.onload=()=>{
  x.fillStyle='#13233b';x.fillRect(0,0,W,150);x.save();x.beginPath();x.arc(R-55,75,55,0,7);x.clip();x.drawImage(im,R-110,20,110,110);x.restore();
  t(st.name,R-135,48,'bold 40px','#fff');t(st.sub||'',R-135,88,'20px','#afc4e4');t([st.phone,st.addr].filter(Boolean).join('  •  '),R-135,120,'20px','#e6b93c');
  let y=190;t('فاتورة بيع رقم '+i.no,R,y,'bold 30px','#13233b');t(i.date,L,y,'24px','#6b727c','left');
  y+=46;t((i.rem>0?'آجل':'كاش'),R,y,'bold 24px',i.rem>0?'#c0392b':'#1d437c');
  y+=44;x.fillStyle='#f4f6f8';x.fillRect(L,y-24,W-80,c?110:48);
  t('العميل: '+cname(i.cid),R-14,y,'bold 26px');if(c){t([phones(c).join(' - '),c.addr].filter(Boolean).join('  •  '),R-14,y+44,'22px','#6b727c')}
  y+=c?118:70;x.fillStyle='#13233b';x.fillRect(L,y-26,W-80,52);
  const hU=i.items.some(x=>pkSplit(x)),cU=hU?455:-1,cQ=hU?340:560,cP=hU?215:380;t('م',R-10,y,'bold 20px','#fff');t('الصنف',R-52,y,'bold 22px','#fff');if(hU)t('الوحدات',cU,y,'bold 20px','#fff','center');t(hU?'الكلية':'الكمية',cQ,y,'bold 20px','#fff','center');t('السعر',cP,y,'bold 22px','#fff','center');t('الإجمالي',L+12,y,'bold 22px','#fff','left');let tU=0,tQ=0;
  i.items.forEach((it,n)=>{y+=54;const sp=pkSplit(it);tQ+=it.qty;if(sp)tU+=sp.u;t(String(n+1),R-10,y,'20px');t(it.name,R-52,y,'22px');if(hU)t(sp?sp.u+' '+it.unit+(sp.o?' + '+sp.o:''):'-',cU,y,'20px','#171d25','center');t(fmt(it.qty)+(sp||hU?'':' '+unitT(it)),cQ,y,'22px','#171d25','center');t(fmt(it.price),cP,y,'22px','#171d25','center');t(fmt(it.qty*it.price),L+12,y,'22px','#171d25','left');x.fillStyle='#dfe3e8';x.fillRect(L,y+27,W-80,2)});
  y+=54;x.fillStyle='#e8ecf3';x.fillRect(L,y-26,W-80,52);t('إجمالي الكميات',R-12,y,'bold 22px');if(hU)t(String(tU||'-'),cU,y,'bold 22px','#13233b','center');t(fmt(tQ),cQ,y,'bold 22px','#13233b','center');
  y+=62;const line=(a,b,col,bold)=>{t(a,R-12,y,(bold?'bold ':'')+'26px');t(b,L+12,y,(bold?'bold ':'')+'26px',col||'#171d25','left');y+=46};
  if(i.adj){line('مجموع الأصناف',fmt(i.sub)+' ج.م');adjParts(i).forEach(p=>line(p[0],(p[1]<0?'−':'+')+fmt(Math.abs(p[1]))+' ج.م',p[1]<0?'#c0392b':'#9a6a00'))}
  line('الإجمالي',fmt(i.total)+' ج.م','#13233b',true);line('المدفوع',fmt(i.paid)+' ج.م');line('الباقي',fmt(i.rem)+' ج.م',i.rem>0?'#c0392b':'#1d437c',true);
  const bl=invBal(i);if(bl){line('رصيد سابق',fmt(bl.prev)+' ج.م');line('رصيد حالي',fmt(bl.cur)+' ج.م','#13233b',true);line('آخر سداد',bl.last?fmt(bl.last.cr)+' ج.م  '+bl.last.d:'-')}
  const wrap=(s,fs)=>{x.font=fs+' '+FONT;const o=[];let c='';s.split(' ').forEach(w=>{const n=c?c+' '+w:w;if(x.measureText(n).width>W-100&&c){o.push(c);c=w}else c=n});if(c)o.push(c);return o};
  wrap(amtWords(i.total),'bold 22px').forEach(s=>{t(s,R-12,y,'bold 22px','#13233b');y+=34});
  if(i.notes){y+=8;t('ملاحظات: '+i.notes,R-12,y,'22px','#6b727c');y+=34}
  const ft=(db.settings.print||{}).footer;if(ft)wrap(ft,'20px').forEach(s=>{t(s,R-12,y,'20px','#6b727c');y+=30})
  t('شكراً لتعاملكم معنا',W/2,H-40,'22px','#6b727c','center');
  res(cv)};im.src=LOGO})}
function jpegPdf(jpg,w,h){const enc=new TextEncoder();const parts=[];let off=0;const offs=[];const add=d=>{const u=typeof d==='string'?enc.encode(d):d;parts.push(u);off+=u.length};
 const pw=420,ph=Math.round(420*h/w);add('%PDF-1.4\n');
 offs[1]=off;add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');offs[2]=off;add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n');
 offs[3]=off;add(`3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw} ${ph}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>endobj\n`);
 offs[4]=off;add(`4 0 obj<</Type/XObject/Subtype/Image/Width ${w}/Height ${h}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpg.length}>>stream\n`);add(jpg);add('\nendstream endobj\n');
 const cs=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;offs[5]=off;add(`5 0 obj<</Length ${cs.length}>>stream\n${cs}\nendstream endobj\n`);
 const xo=off;let x='xref\n0 6\n0000000000 65535 f \n';for(let k=1;k<=5;k++)x+=String(offs[k]).padStart(10,'0')+' 00000 n \n';add(x+`trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xo}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'})}
async function invPdf(i){const cv=await invCanvas(i);const d=cv.toDataURL('image/jpeg',0.92).split(',')[1];const bin=atob(d);const jpg=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)jpg[k]=bin.charCodeAt(k);return new File([jpegPdf(jpg,cv.width,cv.height)],'فاتورة-'+i.no+'.pdf',{type:'application/pdf'})}
const waNum=p=>{p=(p||'').replace(/\D/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('0'))p='20'+p.slice(1);return p};
const invText=i=>`*${db.settings.name}*\nفاتورة رقم ${i.no} - ${i.date}\nالعميل: ${cname(i.cid)}\n`+i.items.map(x=>{const s=pkSplit(x);return `• ${x.name}: ${s?s.u+' '+x.unit+(s.o?' + '+s.o+' عبوة':'')+' = '+fmt(x.qty):x.qty+' '+unitT(x)} × ${fmt(x.price)} = ${fmt(x.qty*x.price)}`}).join('\n')+adjParts(i).map(p=>`\n${p[0]}: ${p[1]<0?'-':'+'}${fmt(Math.abs(p[1]))}`).join('')+`\n*الإجمالي: ${fmt(i.total)} ج.م*\nالمدفوع: ${fmt(i.paid)} | الباقي: ${fmt(i.rem)}`+(()=>{const b=invBal(i);return b?`\nرصيد سابق: ${fmt(b.prev)} | رصيد حالي: ${fmt(b.cur)}`:''})()+`\n${amtWords(i.total)}`+(i.notes?`\nملاحظات: ${i.notes}`:'');
function dl(f){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove()}
async function shareInv(id,mode){const i=db.invoices.find(x=>x.id==id),c=i.cid?cust(i.cid):null;
 if(mode==='text'){if(c&&!waNum(c.phone))toast('مفيش رقم تليفون مسجل للعميل ده');window.open('https://wa.me/'+(c?waNum(c.phone):'')+'?text='+encodeURIComponent(invText(i)),'_blank');return}
 toast('جاري تجهيز الفاتورة…');const f=await invPdf(i);
 if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'فاتورة '+i.no,text:'فاتورة رقم '+i.no+' - '+db.settings.name});return}catch(e){if(e.name==='AbortError')return}}
 dl(f);toast('اتحمل ملف الـ PDF. ابعته من الواتساب');setTimeout(()=>window.open('https://wa.me/'+(c?waNum(c.phone):''),'_blank'),900)}
async function saveInvPdf(id){const f=await invPdf(db.invoices.find(x=>x.id==id));dl(f)}

let PL={by:'co',off:{}};
function plGroups(){const by=PL.by;if(by==='none')return[{k:'all',n:'',items:db.products.slice()}];
 const src=by==='co'?db.companies:db.sections,f=by==='co'?'co':'sec';const g=src.map(x=>({k:by+x.id,n:x.name,items:db.products.filter(p=>p[f]==x.id)}));
 const rest=db.products.filter(p=>!src.some(x=>x.id==p[f]));if(rest.length)g.push({k:by+'0',n:by==='co'?'بدون شركة':'بدون قسم',items:rest});return g.filter(x=>x.items.length)}
const plSel=()=>plGroups().filter(g=>!PL.off[g.k]);
R['/pricelist']=()=>{head('قائمة الأصناف',true);const g=plGroups();
 return `<div class="card noprint"><label>تقسيم القائمة حسب</label><div class="seg"><button class="${PL.by==='co'?'on':''}" onclick="PL.by='co';route()">الشركة</button><button class="${PL.by==='sec'?'on':''}" onclick="PL.by='sec';route()">القسم</button><button class="${PL.by==='none'?'on':''}" onclick="PL.by='none';route()">ترتيبي</button></div>
 ${PL.by==='none'?'':`<label style="margin-top:12px">اختار اللي يظهر في القائمة</label>${g.map(x=>`<label class="chk"><input type="checkbox" ${PL.off[x.k]?'':'checked'} onchange="PL.off['${x.k}']=!this.checked;plDraw()"> ${esc(x.n)} <span class="s">(${x.items.length})</span></label>`).join('')}`}</div>
 <div class="card inv" id="plv">${plHtml()}</div>
 <button class="btn wa noprint" onclick="sharePL()">💬 إرسال القائمة على واتساب</button><div class="row2 noprint"><button class="btn sec" onclick="window.print()">🖨️ طباعة</button><button class="btn sec" onclick="savePLPdf()">⬇️ حفظ PDF</button></div>`};
function plDraw(){$('#plv').innerHTML=plHtml()}
function plHtml(){const st=db.settings;return `<div class="lh"><img src="${LOGO}"><div><div class="co">${esc(st.name)}</div><div class="sub2">${esc(st.sub||'')}</div>${st.phone?`<div class="sub2">📞 ${esc(st.phone)}</div>`:''}${st.addr?`<div class="sub2">📍 ${esc(st.addr)}</div>`:''}</div></div>
 <h3 style="margin:14px 0 4px;color:var(--g2)">قائمة الأصناف والأسعار</h3><div class="s" style="margin-bottom:8px">${today()}</div>
 ${plSel().map(g=>`${g.n?`<div class="plh">${esc(g.n)}</div>`:''}<table class="tb"><tbody>${g.items.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(unitT(p))}</td><td><b>${fmt(p.price)}</b></td></tr>`).join('')}</tbody></table>`).join('')||'<div class="empty">اختار قسم أو شركة</div>'}`}
function plCanvas(){return new Promise(res=>{const st=db.settings,G=plSel(),W=900;let n=0;G.forEach(g=>n+=g.items.length+(g.n?1:0));const H=330+n*52+G.length*20+80;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.direction='rtl';x.textBaseline='middle';x.fillStyle='#fff';x.fillRect(0,0,W,H);
 const R=W-40,L=40;const t=(txt,px,y,font,col,al)=>{x.font=font+' '+FONT;x.fillStyle=col||'#171d25';x.textAlign=al||'right';x.fillText(txt,px,y)};
 const im=new Image();im.onload=()=>{x.fillStyle='#13233b';x.fillRect(0,0,W,150);x.save();x.beginPath();x.arc(R-55,75,55,0,7);x.clip();x.drawImage(im,R-110,20,110,110);x.restore();
  t(st.name,R-135,48,'bold 40px','#fff');t(st.sub||'',R-135,88,'20px','#afc4e4');t([st.phone,st.addr].filter(Boolean).join('  •  '),R-135,120,'20px','#e6b93c');
  let y=195;t('قائمة الأصناف والأسعار',R,y,'bold 30px','#13233b');t(today(),L,y,'24px','#6b727c','left');y+=30;
  G.forEach(g=>{y+=20;if(g.n){y+=32;x.fillStyle='#13233b';x.fillRect(L,y-24,W-80,46);t(g.n,R-12,y,'bold 24px','#fff')}
   g.items.forEach(p=>{y+=52;t(p.name,R-12,y,'22px');t(unitT(p),400,y,'22px','#6b727c','center');t(fmt(p.price)+' ج.م',L+12,y,'bold 22px','#13233b','left');x.fillStyle='#dfe3e8';x.fillRect(L,y+26,W-80,2)})});
  res(cv)};im.src=LOGO})}
async function plPdf(){const cv=await plCanvas();const d=cv.toDataURL('image/jpeg',0.92).split(',')[1];const bin=atob(d);const jpg=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)jpg[k]=bin.charCodeAt(k);return new File([jpegPdf(jpg,cv.width,cv.height)],'قائمة-الأصناف.pdf',{type:'application/pdf'})}
async function savePLPdf(){dl(await plPdf())}
async function sharePL(){toast('جاري تجهيز القائمة…');const f=await plPdf();
 if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'قائمة الأصناف',text:db.settings.name+' - قائمة الأصناف والأسعار'});return}catch(e){if(e.name==='AbortError')return}}
 dl(f);toast('اتحمل ملف الـ PDF. ابعته من الواتساب');setTimeout(()=>window.open('https://wa.me/','_blank'),900)}

