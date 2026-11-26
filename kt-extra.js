/* خالد تريد - فاتورة متقدمة · عروض كميات · إدارة الفواتير · إذن صرف · عروض أسعار · بحث · إشعارات · إعدادات · محادثات
   جزء من برنامج حسابات خالد تريد. شوف README.md لتوزيع الملفات. */
/* ===== EXTRA ===== 
   فاتورة البيع المتقدمة (مندوب/تاريخ/خصم صنف/عروض كميات) · إدارة الفواتير وإذن الصرف · عروض الأسعار
   · البحث الشامل · الإشعارات وسجل النشاط · الإعدادات المركزية · المحادثات
   ===================================================================== */
const blankDraft=()=>({cid:0,lines:[{}],paid:null,notes:'',kind:'كاش',adjT:'خصم',adjM:'amt',adjV:0,date:today(),rep:0});
const fdt=ts=>new Date(ts).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});

/* ---------- الإشعارات (للمدير) وسجل العمليات ---------- */
function notify(txt){db.notes.push({id:nid('note'),ts:Date.now(),by:db.me,txt});if(db.notes.length>600)db.notes.splice(0,100)}
audit=function(act,detail){db.audit.push({ts:Date.now(),by:db.me,act,detail});notify('🛡️ '+act+(detail?': '+detail:''))};
const _docSave=docSave;
docSave=function(){const d=doc,c=d&&DOC_CFG[d.k];const n=c?db[c.db].length:0;_docSave();if(c&&db[c.db].length>n){const r=db[c.db][db[c.db].length-1];notify(`${c.ic} ${c.t} #${r.no}${r.total?' بقيمة '+fmt(r.total):''}`)}};
const _addExp=addExp;addExp=function(){const n=db.exps.length;_addExp();if(db.exps.length>n){const x=db.exps[db.exps.length-1];notify(`💸 مصروف ${x.cat} بقيمة ${fmt(x.amount)}`)}};
const _addPay=addPay;addPay=function(cid){const n=db.payments.length;_addPay(cid);if(db.payments.length>n)notify(`💵 تحصيل ${fmt(db.payments[db.payments.length-1].amount)} من ${cname(cid)}`)};
const _addCx=addCx;addCx=function(d){const n=db.cashx.length;_addCx(d);if(db.cashx.length>n)notify(`🏦 ${d==='in'?'إيداع':'سحب'} يدوي ${fmt(db.cashx[db.cashx.length-1].amount)}`)};

/* ---------- العروض التجارية: شرائح كميات (اشتري N خد M مجانًا / خصم %) ---------- */
function offerFor(l){const q=+l.qty||0;if(!l.pid||!q)return null;let best=null;(db.offers||[]).forEach(o=>{if(o.on!==false&&o.pid==l.pid&&q>=o.min&&(!best||o.min>best.min))best=o});return best}
const offFree=(o,q)=>o.type==='free'?(o.rep?Math.floor(q/o.min)*o.free:o.free):0;
const offTxt=o=>o.type==='free'?`اشتري ${o.min} ${o.rep?'(وكل '+o.min+' بعدها) ':''}وخد ${o.free} مجانًا`:`من ${o.min} وحدة: خصم ${o.disc}%`;
function applyOffer(l){const o=offerFor(l);if(!l.freeM)l.free=o&&o.type==='free'&&(o.auto||l.offerOn)?offFree(o,l.qty):0;if(!l.discM)l.disc=o&&o.type==='disc'&&(o.auto||l.offerOn)?o.disc:0;l.offer=o?o.id:0}
function useOffer(k){const l=draft.lines[k];l.offerOn=true;l.freeM=false;l.discM=false;applyOffer(l);drawLines()}
R['/offers']=()=>{head('العروض التجارية',true);const O=db.offers;
 return `<div class="card"><h2>عرض جديد</h2><label>المنتج</label><input list="dl_of" id="of_p" placeholder="اسم المنتج"><datalist id="dl_of">${db.products.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
 <div class="row2"><div><label>من كمية</label><input id="of_min" type="number" inputmode="decimal" placeholder="10"></div><div><label>النوع</label><select id="of_t" onchange="$('#of_vl').textContent=this.value==='free'?'الكمية المجانية':'نسبة الخصم %'"><option value="free">كمية مجانية</option><option value="disc">خصم %</option></select></div></div>
 <label id="of_vl">الكمية المجانية</label><input id="of_v" type="number" inputmode="decimal" placeholder="1">
 <label class="chk"><input type="checkbox" id="of_rep"> يتكرر (كل N كمية يعطي المجاني تاني)</label><label class="chk"><input type="checkbox" id="of_auto" checked> يتطبق أوتوماتيك على الفاتورة</label>
 <button class="btn" onclick="addOffer()">＋ حفظ العرض</button></div>
 <div class="card"><h2>العروض الحالية</h2>${O.length?O.map(o=>`<div class="item"><div class="main"><div class="t">${esc((prod(o.pid)||{}).name||'—')}</div><div class="s">${offTxt(o)} · ${o.auto?'أوتوماتيك':'يدوي'} ${o.on===false?'· موقوف':''}</div></div><div><button class="x" style="border:0;background:#eef1f6;border-radius:10px;padding:8px" onclick="togOffer(${o.id})">${o.on===false?'تفعيل':'إيقاف'}</button> <button class="x" style="border:0;background:#fbe3df;color:#c0392b;border-radius:10px;padding:8px" onclick="delOffer(${o.id})">×</button></div></div>`).join(''):'<div class="empty">مفيش عروض. اضف شرائح زي: اشتري 10 كراتين وخد 1 مجانًا</div>'}</div>`};
function addOffer(){const p=db.products.find(x=>x.name===$('#of_p').value.trim());const min=+$('#of_min').value,v=+$('#of_v').value;if(!p||!(min>0)||!(v>0))return toast('اختار المنتج واكتب الكمية والقيمة');
 db.offers.push({id:nid('offer'),pid:p.id,min,type:$('#of_t').value,free:$('#of_t').value==='free'?v:0,disc:$('#of_t').value==='disc'?v:0,rep:$('#of_rep').checked,auto:$('#of_auto').checked,on:true});audit('عرض تجاري','إضافة عرض على '+p.name);save();route()}
function togOffer(id){const o=db.offers.find(x=>x.id==id);o.on=o.on===false;save();route()}
function delOffer(id){if(confirm('تحذف العرض؟')){db.offers=db.offers.filter(x=>x.id!=id);save();route()}}

/* ---------- فاتورة البيع: السطور ---------- */
const lineNet=l=>(+l.qty||0)*(+l.price||0)*(1-(+l.disc||0)/100);
const dSub=()=>draft.lines.reduce((a,l)=>a+(l.pid?lineNet(l):0),0);
const dAdjBase=()=>{const sb=dSub(),v=+draft.adjV||0;const a=draft.adjM==='pct'?sb*v/100:v;const x=Math.round(a*100)/100;return draft.adjT==='خصم'?-Math.min(x,sb):x};
/* ضريبة القيمة المضافة (اختيارية): بتتحسب على (الأصناف ± الخصم/الزيادة)، ومتفعّلة من الإعدادات */
const vatRate=()=>+((db.settings||{}).vatRate)||14;
const dVat=()=>{if(!draft.vat||!(db.settings&&db.settings.vat))return 0;return Math.round((dSub()+dAdjBase())*vatRate())/100};
const dAdj=()=>dAdjBase()+dVat();
const adDesc=()=>{const b=dAdjBase(),v=dVat();return [b?draft.adjT+(draft.adjM==='pct'?' '+draft.adjV+'%':''):'',v?'ضريبة قيمة مضافة '+vatRate()+'%':''].filter(Boolean).join(' + ')};
const dTotal=()=>dSub()+dAdj();
const lossTxt=(l,p)=>{if(!p)return '';let h='';if(l.last)h+='<div class="note">✔ آخر سعر اشتراه بيه العميل ده</div>';const net=l.price*(1-(+l.disc||0)/100);if(net>0&&net<p.cost&&can('products.cost'))h+=`<div class="loss">⛔ خسارة! السعر أقل من الشراء (${fmt(p.cost)}). الخسارة ${fmt((p.cost-net)*(l.qty||1))} ج.م</div>`;else if(net>0&&net<p.cost)h+='<div class="loss">⛔ السعر أقل من التكلفة</div>';
 const o=offerFor(l);if(o)h+=(o.auto||l.offerOn)?`<div class="note">🎁 ${offTxt(o)} (متطبق)</div>`:`<div class="note">🎁 ${offTxt(o)} <a style="color:var(--g3);font-weight:700" onclick="useOffer(${draft.lines.indexOf(l)})">← طبّقه</a></div>`;return h};
const paidOf=t=>draft.kind==='كاش'?t:draft.kind==='آجل'?0:Math.min(draft.paid||0,t);
function drawLines(){
 /* سطر الصنف المضغوط: اسم + × ، وتحتها كمية | سعر | إجمالي. الخصم والمجاني مطويين لحد ما تحتاجهم */
 $('#lines').innerHTML=draft.lines.map((l,k)=>{const p=prod(l.pid),open=l.x||l.disc||l.free;
 return `<div class="ln"><div class="top"><div class="ac" style="flex:1"><input autocomplete="off" id="pq${k}" placeholder="🔍 اسم المنتج أو الكود" value="${p?esc(p.name):''}" oninput="draft.lines[${k}]={};acProd(${k},this.value)" onfocus="this.select();acProd(${k},this.value)"><div class="acl" id="pl${k}"></div></div>${draft.lines.length>1?`<button class="x" onclick="draft.lines.splice(${k},1);if(!draft.lines.length)draft.lines.push({});drawLines()">×</button>`:''}</div>
 ${p&&pkOf(p)>1?`<div class="row2 pkr"><div><label>عدد ${esc(p.unit)} (×${fmt(pkOf(p))})</label><input id="lu${k}" type="number" inputmode="decimal" placeholder="0" value="${pkU(l,p)||''}" oninput="setU(${k},'u',this.value)"></div><div><label>عبوات / فرادى</label><input id="lo${k}" type="number" inputmode="decimal" placeholder="0" value="${pkO(l,p)||''}" oninput="setU(${k},'o',this.value)"></div></div>`:''}
 ${p?`<div class="row3"><div><label>${pkOf(p)>1?'الكمية الكلية':'الكمية'} (${esc(unitT(p))})</label><input data-f="qty" id="lq${k}" type="number" inputmode="decimal" placeholder="0" value="${l.qty||''}" oninput="setL(${k},'qty',this.value)"></div><div><label>السعر${can('reports.profit')?` <b style="color:#1f6fb3;font-size:12px">${fmt(p.cost||0)}</b>`:''}</label><input data-f="price" id="lp${k}" type="number" inputmode="decimal" value="${l.price}" ${can('sales.price')?'':'readonly'} oninput="setL(${k},'price',this.value)"></div><div class="lt"><label>الإجمالي</label><b id="lt${k}">${fmt(lineNet(l))}</b></div></div>
 ${open?`<div class="row2 lx"><div><label>خصم الصنف %</label><input id="ld${k}" type="number" inputmode="decimal" placeholder="0" value="${l.disc||''}" ${can('sales.discount')?'':'disabled'} oninput="setL(${k},'disc',this.value)"></div><div><label>كمية مجانية 🎁</label><input id="lf${k}" type="number" inputmode="decimal" placeholder="0" value="${l.free||''}" oninput="setL(${k},'free',this.value)"></div></div>`:`<a class="lmore" onclick="draft.lines[${k}].x=1;drawLines()">＋ خصم أو كمية مجانية</a>`}
 <div id="lw${k}">${lossTxt(l,p)}</div><div class="sub"><span>متاح: ${fmt(qtyAt(dLoc(),p.id))} ${pkOf(p)>1?'':esc(unitT(p))}${pkOf(p)>1?` (${Math.floor(qtyAt(dLoc(),p.id)/pkOf(p))} ${esc(p.unit)} و ${+(qtyAt(dLoc(),p.id)%pkOf(p)).toFixed(3)} عبوة)`:''}${expState(p)&&expState(p).c?` · <b style="color:#9a6a00">⚠ ${expState(p).t}</b>`:''}${can('reports.profit')?` · <b style="color:#1f6fb3">سعر الشراء: ${fmt(p.cost||0)}</b>`:''}</span></div>`:''}</div>`}).join('');
 drawTot();}
/* الوحدات × العدد في الوحدة: الكمية الكلية هي اللي بتتخزن وبتخصم من المخزون زي الأول */
const pkOf=p=>+(p&&p.pk)||0;
const pkU=(l,p)=>l.u!==undefined?l.u:(pkOf(p)>1&&l.qty?Math.floor(l.qty/pkOf(p)):0);
const pkO=(l,p)=>l.o!==undefined?l.o:(pkOf(p)>1&&l.qty?+(l.qty-Math.floor(l.qty/pkOf(p))*pkOf(p)).toFixed(3):0);
function setU(k,f,v){const l=draft.lines[k],p=prod(l.pid),n=pkOf(p);if(!p)return;const u=f==='u'?(+v||0):pkU(l,p),o=f==='o'?(+v||0):pkO(l,p);l.u=u;l.o=o;const q=+(u*n+o).toFixed(3);const e=$('#lq'+k);if(e)e.value=q||'';setL(k,'qty',q,true)}
function setL(k,f,v,keep){const l=draft.lines[k];l[f]=+v||0;
 if(f==='qty'&&!keep){const p=prod(l.pid),n=pkOf(p);if(n>1){l.u=Math.floor(l.qty/n);l.o=+(l.qty-l.u*n).toFixed(3);const a=$('#lu'+k),b=$('#lo'+k);if(a)a.value=l.u||'';if(b)b.value=l.o||''}}
 if(f==='price'){l.edited=true;l.last=false}
 if(f==='free')l.freeM=true;if(f==='disc')l.discM=true;
 if(f==='qty'){applyOffer(l);const a=$('#lf'+k),b=$('#ld'+k);if(a)a.value=l.free||'';if(b)b.value=l.disc||''}
 const w=$('#lw'+k);if(w)w.innerHTML=lossTxt(l,prod(l.pid));const e=$('#lt'+k);if(e)e.textContent=fmt(lineNet(l));drawTot();}
function acProd(k,q){q=q.trim();showAc('pl'+k,db.products.filter(p=>pmatch(p,q)).slice(0,8).map(p=>`<div class="aco" onclick="pickP(${k},${p.id})"><b>${esc(p.name)}${p.code?' <small>#'+esc(p.code)+'</small>':''}</b><span>${fmt(qtyAt(dLoc(),p.id))} ${esc(unitT(p))} · ${fmt(p.price)} ج.م${can('reports.profit')?' · شراء '+fmt(p.cost||0):''}</span></div>`));}
function pickP(k,v){const p=prod(v);const lp=p?lastPrice(draft.cid,p.id):null;draft.lines[k]=p?{pid:p.id,qty:pkOf(p)>1?pkOf(p):0,u:pkOf(p)>1?1:undefined,o:pkOf(p)>1?0:undefined,price:lp??p.price,last:lp!=null}:{};if(p)applyOffer(draft.lines[k]);if(p&&k===draft.lines.length-1)draft.lines.push({});drawLines();hideAc();if(p){const q=$((pkOf(p)>1?'#lu':'#lq')+k);q&&q.focus()}}
/* الانتقال التلقائي: الكمية ← السعر ← سطر جديد جاهز للبحث */
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.tagName!=='INPUT')return;const t=e.target,f=t.dataset&&t.dataset.f,m=/(\d+)$/.exec(t.id||'');if(!f||!m)return;e.preventDefault();const k=+m[1];
 if(f==='qty'){const n=$('#lp'+k);n&&(n.focus(),n.select())}
 else if(f==='price'){if(k===draft.lines.length-1){draft.lines.push({});drawLines()}const n=$('#pq'+(k+1));n&&n.focus()}});
const dLoc=()=>myLocs().includes(draft.loc)?draft.loc:defLoc();
function drawTot(){const t=dTotal(),paid=paidOf(t),rem=t-paid;const sb=$('#sbar');const q=draft.q;if(sb)sb.innerHTML=`<div><span>الصافي</span><b>${fmt(t)} ج.م</b></div><button onclick="saveInvoice()">${q?'حفظ العرض ✔':'حفظ ✔'}</button>`;
 const fr=draft.lines.reduce((a,l)=>a+(l.pid?(+l.free||0):0),0),ld=draft.lines.reduce((a,l)=>a+(l.pid?(+l.qty||0)*(+l.price||0)*(+l.disc||0)/100:0),0);
 $('#tot').innerHTML=`<div class="tot">${dAdj()||ld||fr?`<div class="r"><span>مجموع الأصناف (بعد خصم الأصناف)</span><span>${fmt(dSub())}</span></div>`:''}${ld?`<div class="r" style="color:#ffe08a"><span>خصومات الأصناف (موجودة في الأسعار)</span><span>${fmt(ld)}</span></div>`:''}${fr?`<div class="r" style="color:#9ec0f4"><span>🎁 كميات مجانية</span><span>${fr}</span></div>`:''}${dAdjBase()?`<div class="r" style="color:${dAdjBase()<0?'#ffb4a8':'#ffe08a'}"><span>${draft.adjT}${draft.adjM==='pct'?` (${draft.adjV}%)`:''}</span><span>${dAdjBase()<0?'−':'+'}${fmt(Math.abs(dAdjBase()))}</span></div>`:''}${dVat()?`<div class="r" style="color:#ffe08a"><span>ضريبة القيمة المضافة (${vatRate()}%)</span><span>+${fmt(dVat())}</span></div>`:''}<div class="r"><span>صافي الفاتورة</span><span class="grand">${fmt(t)} ج.م</span></div></div>
 ${q?'':draft.kind==='كاش'?`<div class="alert" style="margin:10px 0 0">💵 بيع كاش: المدفوع كامل ${fmt(t)} ج.م</div>`:draft.kind==='آجل'?`<div class="alert credit" id="rem" style="margin:10px 0 0">${remTxt(rem)}</div>`:`<label>المدفوع دلوقتي (الباقي دين على العميل)</label><input id="i_paid" type="number" inputmode="decimal" value="${draft.paid||''}" placeholder="0" oninput="draft.paid=+this.value||0;drawRem()"><div class="alert credit" id="rem" style="margin:10px 0 0">${remTxt(rem)}</div>`}`;}

/* ---------- شاشة فاتورة / عرض سعر جديد ---------- */
function newInvoiceScreen(qs){const m=/c=(\d+)/.exec(qs||'');if(m)draft.cid=+m[1];if(/q=1/.test(qs||'')&&!draft.q){draft=blankDraft();draft.q=true;if(m)draft.cid=+m[1]}
 if(!draft.date)draft.date=today();if(draft.rep===undefined)draft.rep=0;const q=draft.q;
 head(draft.edit?'تعديل فاتورة':q?'عرض سعر جديد':'فاتورة بيع جديدة',true);
 const reps=db.users.filter(u=>u.emp),selfRep=me().emp;
 const kseg=q?'':`<div class="seg"><button class="${draft.kind==='كاش'?'on':''}" onclick="setKind('كاش')">💵 كاش</button><button class="${draft.kind==='آجل'?'on credit':''}" onclick="setKind('آجل')">🕒 آجل</button><button class="${draft.kind==='متنوع'?'on credit':''}" onclick="setKind('متنوع')">🔀 متنوع</button></div>`;
 const moreOpen=draft.mo||draft.adjV||draft.notes||draft.edit;
 /* ترتيب الخطوات: العميل ← الأصناف ← الدفع ← حفظ (الباقي في "خيارات إضافية" مطوي) */
 return `<div class="invn">${q?'<div class="alert">📝 عرض سعر: مش بيخصم من المخزن ولا بيسجل على العميل.</div>':''}
 <div class="card"><h2>العميل</h2><div class="ac"><input id="i_cq" autocomplete="off" placeholder="🔍 ابحث باسم العميل أو سيبه عميل نقدي" value="${draft.cid?esc(cname(draft.cid)):''}" oninput="draft.cid=0;acCust(this.value)" onfocus="this.select();acCust(this.value)"><div class="acl" id="i_cl"></div></div></div>
 <div class="card"><h2>الأصناف</h2><div class="lines" id="lines"></div><button class="btn sec addl" onclick="draft.lines.push({});drawLines()">＋ إضافة صنف</button></div>
 <div class="card"><h2>${q?'الإجمالي':'الدفع'}</h2>${kseg}<div id="tot"></div></div>
 <details class="card more" ${moreOpen?'open':''} ontoggle="draft.mo=this.open"><summary>⚙️ خيارات إضافية <small>تاريخ · مندوب · خصم · ملاحظات${!q&&myLocs().length>1?' · المخزن':''}</small></summary>
 ${!q&&myLocs().length>1?`<label>البيع من</label><select onchange="draft.loc=this.value;drawLines()">${myLocs().map(l=>`<option value="${l}" ${dLoc()===l?'selected':''}>${esc(locName(l))}</option>`).join('')}</select>`:''}
 ${q?'':`<div class="row2"><div><label>تاريخ الفاتورة</label><input type="date" value="${draft.date}" ${can('sales.date')?'':'disabled'} onchange="draft.date=this.value"></div><div><label>المندوب</label><select ${selfRep&&!can('sales.anyrep')?'disabled':''} onchange="draft.rep=+this.value"><option value="0">— بدون —</option>${reps.map(u=>`<option value="${u.id}" ${(draft.rep||(selfRep?me().id:0))==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div></div>`}
 <label>خصم أو زيادة على الفاتورة</label><div class="adj"><select onchange="draft.adjT=this.value;drawTot()"><option ${draft.adjT==='خصم'?'selected':''}>خصم</option><option ${draft.adjT==='زيادة'?'selected':''}>زيادة</option></select><input type="number" inputmode="decimal" placeholder="0" value="${draft.adjV||''}" oninput="draft.adjV=+this.value||0;drawTot()"><div class="seg2"><button class="${draft.adjM==='amt'?'on':''}" onclick="draft.adjM='amt';draft.mo=1;route();drawLines()">ج.م</button><button class="${draft.adjM==='pct'?'on':''}" onclick="draft.adjM='pct';draft.mo=1;route();drawLines()">%</button></div></div>
${db.settings&&db.settings.vat?`<label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" ${draft.vat?'checked':''} onchange="draft.vat=this.checked;drawTot()"> إضافة ضريبة القيمة المضافة (${vatRate()}%)</label>`:''}
 <label>ملاحظات</label><input id="i_notes" placeholder="مثال: التسليم بكرة الصبح" value="${esc(draft.notes||'')}" oninput="draft.notes=this.value"></details>
 ${draft.edit||draft.fromQuote?`<button class="btn sec" onclick="draft=blankDraft();location.hash='#/invoices'">إلغاء</button>`:''}</div>`}
const R_INV=R['/invoice'];
R['/invoice']=(id,qs)=>{if(id==='new')return newInvoiceScreen(qs);
 let i=db.invoices.find(x=>x.id==id);if(!i)return R_INV(id,qs);let h=R_INV(id,qs);
 const v=db.disp.find(d=>d.inv==i.id),rep=db.users.find(u=>u.id==i.by),cm=rep&&rep.emp?repComm(rep,d=>d===i.date&&true):null;
 let rc=0;if(rep&&rep.emp)i.items.forEach(it=>{const k=i.sub?i.total/i.sub:1;rc+=rcOf(rep,it,it.qty*it.price*k)});
 const card=`<div class="card noprint"><h2>حالة الفاتورة</h2><div class="stat"><span>الدفع</span><b>${i.rem>0?'🕒 آجل (باقي '+fmt(i.rem)+')':'💵 مدفوعة'}</b></div><div class="stat"><span>التسليم</span><b>${v?(v.st==='delivered'?'✅ تم التسليم':'📦 إذن صرف صادر'):'لا يوجد إذن صرف'}</b></div><div class="stat"><span>المخزن (اتخصم منه)</span><b>${esc(locName(i.loc||'w1'))}</b></div>${i.cid?`<div class="stat"><span>حساب العميل</span><b><a onclick="location.hash='#/stmt/${i.cid}'" style="color:var(--g3)">كشف الحساب ↗</a></b></div>`:''}${rep?`<div class="stat"><span>المندوب</span><b>${esc(rep.name)}${rep.emp&&can('reports.profit')?' · عمولة '+fmt(rc):''}</b></div>`:''}
 ${v?`<button class="btn sec" onclick="location.hash='#/disp/${v.id}'">📤 فتح إذن الصرف #${v.no}</button>`:`<button class="btn sec" onclick="issueDisp(${i.id})">📤 إصدار إذن صرف</button>`}</div>`;
 const pf=invProfit(i);
 const pcard=invProfitCard(i);
 return card+pcard+h};
/* ربح الفاتورة = صافي البيع (الأصناف ± الخصم/الزيادة، من غير الضريبة) - تكلفة الأصناف. تكلفة الصنف بتتسجل وقت البيع (it.cost). */
/* زر ربح الفاتورة: للي معاه صلاحية الأرباح بس، ومش بيتطبع مع نسخة العميل */
function invProfitCard(i){const pf=invProfit(i);return pf&&can('reports.profit')?`<div class="card noprint"><button class="btn sec" onclick="const b=document.getElementById('pfbox');b.style.display=b.style.display==='none'?'block':'none'">💹 ربح الفاتورة</button><div id="pfbox" style="display:none"><div class="stat"><span>صافي البيع (من غير الضريبة)</span><b>${fmt(pf.rev)} ج.م</b></div><div class="stat"><span>تكلفة الأصناف</span><b>${fmt(pf.cost)} ج.م</b></div><div class="stat"><span>الربح</span><b class="${pf.profit<0?'neg':''}" style="color:${pf.profit<0?'':'#1c4b92'}">${pf.profit<0?'−':''}${fmt(Math.abs(pf.profit))} ج.م${pf.rev?' ('+(pf.profit/pf.rev*100).toFixed(1)+'%)':''}</b></div>${pf.est?'<div class="s" style="color:var(--mut)">بعض الأصناف تكلفتها تقديرية (سعر الشراء الحالي) لأن الفاتورة قديمة.</div>':''}<details style="margin-top:6px"><summary>ربح كل صنف</summary>${pf.rows.map(r=>`<div class="stat"><span>${esc(r.name)} × ${fmt(r.qty)}</span><b class="${r.p<0?'neg':''}">${fmt(r.p)}</b></div>`).join('')}</details></div></div>`:''}
function invProfit(i){if(!i||!i.items)return null;let est=false,cost=0;const k=i.sub?(i.sub+(i.adj||0)-(i.vatAmt||0))/i.sub:1;const rows=i.items.map(it=>{let c=it.cost;if(c===undefined||c===null){c=(prod(it.pid)||{}).cost||0;est=true}const rv=it.qty*it.price*k,cs=it.qty*c;cost+=cs;return{name:it.name,qty:it.qty,p:Math.round((rv-cs)*100)/100}});const rev=Math.round(i.items.reduce((a,it)=>a+it.qty*it.price,0)*k*100)/100;return{rev,cost:Math.round(cost*100)/100,profit:Math.round((rev-cost)*100)/100,est,rows}}

function lineItems(L){const out=[];L.forEach(l=>{const p=prod(l.pid),net=l.price*(1-(+l.disc||0)/100);out.push({pid:p.id,name:p.name,unit:p.unit,pack:p.pack||'',pk:p.pk||0,qty:+l.qty,price:+net.toFixed(4),list:+l.price,disc:+l.disc||0,cost:p.cost||0});if(+l.free>0)out.push({pid:p.id,name:p.name,unit:p.unit,pack:p.pack||'',pk:p.pk||0,qty:+l.free,price:0,list:0,disc:0,cost:p.cost||0,free:true})});return out}
/* سطور الخصم/الزيادة والضريبة منفصلة: [الوصف, القيمة بالإشارة] */
const adjParts=i=>{if(!i.adj)return [];const v=i.vatAmt||0,b=Math.round((i.adj-v)*100)/100,o=[];if(b){const d=String(i.adjDesc||'').replace(/\s*\+?\s*ضريبة قيمة مضافة.*$/,'').trim()||(b<0?'خصم':'زيادة');o.push([d,b])}if(v)o.push(['ضريبة القيمة المضافة '+(i.vatRate||'')+'%',v]);return o};
function saveInvoice(){const L=draft.lines.filter(l=>l.pid&&l.qty>0);if(!L.length)return toast('أضف صنف واحد على الأقل');
 const sb=dSub(),ad=dAdj();
 const manD=L.filter(l=>l.disc>0&&!(l.offer&&!l.discM));
 if((ad<0||manD.length)&&!can('sales.discount'))return toast('مش مسموح لك تعمل خصم');
 const mx=+me().maxDisc||0;if(mx&&(ad<0||manD.length)){const gross=L.reduce((a,l)=>a+l.qty*l.price,0),dt=manD.reduce((a,l)=>a+l.qty*l.price*l.disc/100,0)-ad;if(dt>gross*mx/100+.01)return toast('أقصى خصم مسموح لك '+mx+'%')}
 const items=lineItems(L),t=dTotal();
 if(draft.q)return saveQuote(items,sb,ad,t);
 const loc=dLoc(),old=draft.edit&&db.invoices.find(x=>x.id==draft.edit.id);
 const need={};items.forEach(i=>need[i.pid]=(need[i.pid]||0)+i.qty);
 const back=pid=>old&&(old.loc||'w1')===loc?old.items.filter(i=>i.pid==pid).reduce((a,i)=>a+i.qty,0):0;
 for(const pid in need){const p=prod(pid);if(need[pid]>qtyAt(loc,+pid)+back(+pid)&&!can('sales.nostock'))return toast('الكمية أكبر من المتاح في '+locName(loc)+': '+p.name);const e=expState(p);if(e&&e.c==='bad'&&!confirm(p.name+' منتهي الصلاحية. تكمل؟'))return}
 const lo=L.filter(l=>l.price*(1-(l.disc||0)/100)<prod(l.pid).cost);
 if(lo.length){if(!can('sales.belowcost'))return toast('مش مسموح البيع بأقل من التكلفة');if(!confirm('⚠️ تحذير خسارة:\n'+lo.map(l=>prod(l.pid).name).join('\n')+'\n\nتكمل الحفظ برضو؟'))return}
 const paid=paidOf(t);if(draft.kind!=='كاش'&&t>paid&&!draft.cid)return toast('البيع الآجل أو المتنوع لازم تختار عميل مسجل');
 if(old){old.items.forEach(it=>mv(old.loc||'w1',it.pid,it.qty));db.invoices=db.invoices.filter(x=>x!==old);audit('تعديل فاتورة','#'+old.no+' من '+fmt(old.total)+' إلى '+fmt(t))}
 items.forEach(it=>mv(loc,it.pid,-it.qty));
 const rem=t-paid,id=old?old.id:++db.seq.i,rep=draft.rep||(me().emp?me().id:0)||db.me||1;
 const inv={id,no:old?old.no:id,date:old?old.date:(draft.date||today()),cid:draft.cid,loc,items,ts:old?old.ts:Date.now(),by:old?old.by:rep,cr:old?old.cr:db.me,kind:rem>0?'آجل':'كاش',sub:sb,adj:ad,adjDesc:ad?adDesc():'',vatAmt:dVat(),vatRate:dVat()?vatRate():0,total:t,paid,rem,inst:buildPlan(rem,old),mixed:draft.kind==='متنوع'&&paid>0&&rem>0,notes:(draft.notes||'').trim()};
 db.invoices.push(inv);db.invoices.sort((a,b)=>a.id-b.id);if(draft.cid)recalc(cust(draft.cid));if(old&&old.cid&&old.cid!=draft.cid)recalc(cust(old.cid));
 if(draft.fromQuote){const q=db.quotes.find(x=>x.id==draft.fromQuote);if(q){q.st='converted';q.inv=inv.id}}
 if(!old)notify(`🧾 فاتورة بيع #${inv.no} - ${cname(inv.cid)} بقيمة ${fmt(t)}`);
 save();draft=blankDraft();toast('تم حفظ الفاتورة ✅');location.hash='#/invoice/'+inv.id;}
function editInvoice(id){if(!(can('sales.edit')||can('data.edit')))return toast('مش مسموح لك تعدل فاتورة محفوظة');const i=db.invoices.find(x=>x.id==id);if(!i)return;if(db.rets.some(r=>r.ref&&r.ref.k==='inv'&&r.ref.id==id))return toast('الفاتورة عليها مرتجع، مينفعش تتعدل');
 const lines=[];i.items.forEach(x=>{if(x.free){const l=[...lines].reverse().find(y=>y.pid==x.pid);if(l){l.free=(l.free||0)+x.qty;l.freeM=true}}else lines.push({pid:x.pid,qty:x.qty,price:x.list??x.price,disc:x.disc||0,discM:true,edited:true})});
 draft={...blankDraft(),cid:i.cid,loc:i.loc||'w1',lines,paid:i.paid,notes:i.notes||'',kind:(i.mixed?'متنوع':i.kind),adjT:(i.adj-(i.vatAmt||0))<0?'خصم':'زيادة',adjM:'amt',adjV:Math.abs((i.adj||0)-(i.vatAmt||0)),vat:!!i.vatAmt,edit:{id:i.id},date:i.date,rep:i.by};location.hash='#/invoice/new'}

/* ---------- إلغاء الفاتورة (بصلاحية) ويفضل سجلها ---------- */
function delInvoice(id){if(!(can('sales.delete')||can('data.delete')))return toast('مش مسموح لك تلغي فاتورة محفوظة');const i=db.invoices.find(x=>x.id==id);if(!i)return;
 if(db.rets.some(r=>r.ref&&r.ref.k==='inv'&&r.ref.id==id))return toast('الفاتورة عليها مرتجع، مينفعش تتلغي');
 const why=prompt('سبب إلغاء الفاتورة #'+i.no+' (المخزون هيرجع والحساب هيتعدل):');if(why===null)return;
 i.items.forEach(it=>mv(i.loc||'w1',it.pid,it.qty));db.invoices=db.invoices.filter(x=>x!==i);db.disp=db.disp.filter(d=>d.inv!=i.id);
 db.cancelled.push({...i,st:'cancelled',cby:db.me,cts:Date.now(),why});if(i.cid)recalc(cust(i.cid));audit('إلغاء فاتورة','#'+i.no+' بقيمة '+fmt(i.total)+(why?' - '+why:''));save();toast('اتلغت الفاتورة');location.hash='#/invoices'}
R['/cinv']=id=>{const i=db.cancelled.find(x=>x.id==id);if(!i)return nf();head('فاتورة ملغاة #'+i.no,true);
 return `<div class="card"><div class="alert">⛔ فاتورة ملغاة بواسطة ${esc(uname(i.cby))} · ${fdt(i.cts)}${i.why?'<br>السبب: '+esc(i.why):''}</div><div class="stat"><span>العميل</span><b>${esc(cname(i.cid))}</b></div><div class="stat"><span>التاريخ</span><b>${i.date}</b></div><table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>${i.items.map(x=>`<tr><td>${esc(x.name)}${x.free?' 🎁':''}</td><td>${x.qty}</td><td>${fmt(x.price)}</td></tr>`).join('')}</table><div class="stat"><span>الإجمالي</span><b>${fmt(i.total)}</b></div></div>`};

/* ---------- إدارة الفواتير: بحث برقم / عميل / مندوب + الحالة ---------- */
/* ---------- بحث الفواتير: زي شاشة البحث في البرنامج القديم ----------
   الفلاتر: رقم الفاتورة من/إلى، العميل، التاريخ من/إلى، الصنف، المجموعة، المخزن، المندوب،
   القيمة من/إلى، نوع السداد (الكل/نقدي/آجل)، وبحث عام. كل الفلاتر بتشتغل مع بعض فورًا. */
const IV0={q:'',s:'all',nf:'',nt:'',cu:'',df:'',dt:'',it:'',gr:'',lo:'',rp:'',vf:'',vt:'',py:'all'};
let IV={...IV0},IVopen=true;
const ivN=s=>String(s==null?'':s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
R['/invoices']=()=>{head('فواتير البيع');
 const reps=db.users.filter(u=>u.emp||db.invoices.some(i=>i.by==u.id)),F=(k,t,ph)=>`<div><label>${t}</label><input ${t.includes('تاريخ')?'type="date"':'inputmode="'+(ph==='n'?'numeric':'text')+'"'} value="${esc(IV[k])}" oninput="IV.${k}=this.value;ivDraw()"></div>`;
 return `<div class="card noprint"><h2 onclick="IVopen=!IVopen;route()" style="cursor:pointer">🔍 بحث في الفواتير ${IVopen?'▾':'◂'}</h2>${IVopen?`
 <label>بحث عام (رقم، عميل، مندوب، صنف، ملاحظات)</label><input class="search" placeholder="🔍 اكتب أي حاجة" value="${esc(IV.q)}" oninput="IV.q=this.value;ivDraw()">
 <div class="row2" style="margin-top:8px">${F('nf','رقم الفاتورة من','n')}${F('nt','إلى','n')}</div>
 <div class="row2" style="margin-top:8px">${F('df','التاريخ من')}${F('dt','إلى')}</div>
 <label style="margin-top:8px">العميل</label><input list="ivcl" value="${esc(IV.cu)}" placeholder="اسم العميل أو جزء منه" oninput="IV.cu=this.value;ivDraw()"><datalist id="ivcl">${db.customers.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
 <label style="margin-top:8px">الصنف</label><input list="ivpl" value="${esc(IV.it)}" placeholder="اسم الصنف أو جزء منه" oninput="IV.it=this.value;ivDraw()"><datalist id="ivpl">${db.products.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
 <div class="row2" style="margin-top:8px"><div><label>المجموعة</label><select onchange="IV.gr=this.value;ivDraw()">${selOpts(db.sections.map(s=>[s.id,s.name]),IV.gr,'الكل')}</select></div><div><label>المخزن</label><select onchange="IV.lo=this.value;ivDraw()">${selOpts(allLocs().map(l=>[l,locName(l)]),IV.lo,'الكل')}</select></div></div>
 <label style="margin-top:8px">المندوب</label><select onchange="IV.rp=this.value;ivDraw()">${selOpts(reps.map(u=>[u.id,u.name]),IV.rp,'الكل')}</select>
 <div class="row2" style="margin-top:8px">${F('vf','القيمة من','n')}${F('vt','إلى','n')}</div>
 <label style="margin-top:8px">نوع السداد</label><div class="chips">${[['all','الكل'],['cash','نقدي'],['credit','آجل']].map(([k,n])=>`<button class="chip ${IV.py===k?'on':''}" onclick="IV.py='${k}';route()">${n}</button>`).join('')}</div>
 <div class="chips" style="margin-top:8px">${[['all','كل الحالات'],['nodel','لم تُسلَّم'],['cancel','ملغاة']].map(([k,n])=>`<button class="chip ${IV.s===k?'on':''}" onclick="IV.s='${k}';route()">${n}</button>`).join('')}</div>
 <button class="btn sec" onclick="IV={...IV0};route()">مسح الفلاتر</button>`:''}</div><div class="card" id="ivl">${ivRows()}</div><button class="fab" data-need="sales.add" onclick="location.hash='#/invoice/new'">＋ فاتورة</button>`};
function ivRows(){const q=ivN(IV.q).toLowerCase(),cu=IV.cu.trim(),it=IV.it.trim();let L=IV.s==='cancel'?db.cancelled.map(i=>({...i,_c:1})):[...db.invoices].reverse();
 const pOf=id=>db.products.find(p=>p.id==id)||{};
 if(IV.py==='cash')L=L.filter(i=>!(i.rem>0));if(IV.py==='credit')L=L.filter(i=>i.rem>0);
 if(IV.s==='nodel')L=L.filter(i=>{const d=db.disp.find(d=>d.inv==i.id);return !d||d.st!=='delivered'});
 const nf=ivN(IV.nf),nt=ivN(IV.nt),vf=ivN(IV.vf),vt=ivN(IV.vt);
 if(nf!=='')L=L.filter(i=>+i.no>=+nf);if(nt!=='')L=L.filter(i=>+i.no<=+nt);
 if(IV.df)L=L.filter(i=>i.date>=IV.df);if(IV.dt)L=L.filter(i=>i.date<=IV.dt);
 if(vf!=='')L=L.filter(i=>+i.total>=+vf);if(vt!=='')L=L.filter(i=>+i.total<=+vt);
 if(cu)L=L.filter(i=>cname(i.cid).includes(cu));
 if(IV.rp)L=L.filter(i=>i.by==IV.rp);
 if(IV.lo)L=L.filter(i=>(i.loc||'w1')===IV.lo);
 if(it)L=L.filter(i=>(i.items||[]).some(x=>(x.name||pOf(x.pid).name||'').includes(it)));
 if(IV.gr)L=L.filter(i=>(i.items||[]).some(x=>pOf(x.pid).sec==IV.gr));
 if(q)L=L.filter(i=>String(i.no)===q.replace('#','')||cname(i.cid).toLowerCase().includes(q)||uname(i.by).toLowerCase().includes(q)||(i.notes||'').toLowerCase().includes(q)||(i.items||[]).some(x=>(x.name||pOf(x.pid).name||'').toLowerCase().includes(q)));
 const tot=L.reduce((a,i)=>a+(+i.total||0),0);
 return `<div class="stat"><span>عدد الفواتير: ${L.length}</span><b>${fmt(tot)} ج.م</b></div>`+(L.length?L.slice(0,200).map(i=>{const v=db.disp.find(d=>d.inv==i.id);return `<div class="item" onclick="location.hash='#/${i._c?'cinv':'invoice'}/${i.id}'"><div class="main"><div class="t">#${i.no} · ${esc(cname(i.cid))}</div><div class="s">${i.date} · 🚚 ${esc(uname(i.by))} · <span class="pill ${i._c?'bad':i.rem>0?'bad':''}">${i._c?'ملغاة':i.rem>0?'آجل':'نقدي'}</span>${!i._c?(v?(v.st==='delivered'?' <span class="pill">✅ تم التسليم</span>':' <span class="pill warn">📦 إذن صادر</span>'):''):''}</div></div><div class="num">${fmt(i.total)}</div></div>`}).join(''):'<div class="empty">مفيش فواتير بالشروط دي</div>')}
function ivDraw(){$('#ivl').innerHTML=ivRows()}

/* ---------- إذن الصرف: مرتبط بالفاتورة + حالة التسليم ---------- */
function issueDisp(invId){const i=db.invoices.find(x=>x.id==invId);if(!i)return;const id=nid('disp');db.disp.push({id,no:id,inv:i.id,ts:Date.now(),by:db.me,st:'issued',loc:i.loc||'w1'});audit('إذن صرف','#'+id+' للفاتورة #'+i.no);save();location.hash='#/disp/'+id}
R['/disp']=id=>{const v=db.disp.find(x=>x.id==id),i=v&&db.invoices.find(x=>x.id==v.inv);if(!v||!i)return nf();head('إذن صرف #'+v.no,true);const st=db.settings,c=i.cid?cust(i.cid):null;
 return `<div class="card inv"><div class="lh"><img src="${LOGO}"><div><div class="co">${esc(st.name)}</div><div class="sub2">إذن صرف بضاعة</div></div></div>
 <div class="meta"><div><span>إذن رقم</span><b>#${v.no}</b></div><div><span>للفاتورة</span><b>#${i.no}</b></div><div><span>التاريخ</span><b>${new Date(v.ts).toISOString().slice(0,10)}</b></div></div>
 <div class="cu"><div><span>العميل:</span> <b>${esc(cname(i.cid))}</b></div>${c&&c.addr?`<div><span>العنوان:</span> ${esc(c.addr)}</div>`:''}<div><span>الصرف من:</span> ${esc(locName(v.loc))}</div><div><span>أصدره:</span> ${esc(uname(v.by))}</div></div>
 <table><tr><th>الصنف</th><th>الكمية</th></tr>${i.items.map(x=>`<tr><td>${esc(x.name)}${x.free?' 🎁 (مجاني)':''}</td><td>${x.qty} ${esc(unitT(x))}</td></tr>`).join('')}</table>
 <div class="stat"><span>حالة التسليم</span><b>${v.st==='delivered'?'✅ تم التسليم · '+esc(v.recv||'')+' · '+fdt(v.dts):'📦 في انتظار التسليم'}</b></div>
 <div class="row2" style="margin-top:18px;text-align:center;font-size:12.5px;color:var(--mut)"><div>أمين المخزن<br><br>................</div><div>المستلم<br><br>................</div></div>
 ${v.st==='delivered'?'':`<button class="btn noprint" onclick="delivered(${v.id})">✅ تأكيد التسليم</button>`}<button class="btn sec noprint" onclick="location.hash='#/invoice/${i.id}'">↗ الفاتورة</button></div>`};
function delivered(id){const v=db.disp.find(x=>x.id==id);const r=prompt('اسم المستلم (اختياري):');if(r===null)return;v.st='delivered';v.dts=Date.now();v.dby=db.me;v.recv=r;audit('تسليم بضاعة','إذن #'+v.no);save();route()}

/* ---------- عروض الأسعار: تتحول لفاتورة ---------- */
function saveQuote(items,sb,ad,t){const id=nid('qt');db.quotes.push({id,no:id,date:today(),ts:Date.now(),by:db.me,cid:draft.cid,items,sub:sb,adj:ad,adjDesc:ad?adDesc():'',vatAmt:dVat(),vatRate:dVat()?vatRate():0,total:t,notes:(draft.notes||'').trim(),st:'open'});notify(`📝 عرض سعر #${id} - ${cname(draft.cid)} بقيمة ${fmt(t)}`);save();draft=blankDraft();toast('اتحفظ عرض السعر ✅');location.hash='#/quote/'+id}
/* حالات عرض السعر: open=في الانتظار، accepted=العميل وافق، rejected=العميل رفض، converted=اتحول لفاتورة */
const QST={open:['⏳ في الانتظار','warn'],accepted:['✅ العميل وافق','ok'],rejected:['❌ العميل رفض','bad'],converted:['🧾 اتحول لفاتورة','ok']};
const qstPill=q=>{const m=QST[q.st]||QST.open;let t=m[0];if(q.st==='converted'){const i=db.invoices.find(x=>x.id==q.inv);t+=' #'+(i?i.no:q.inv)}return`<span class="pill ${m[1]}">${t}</span>`};
let qFilter='all';
R['/quotes']=()=>{head('عروض الأسعار');const L=[...db.quotes].reverse().filter(q=>qFilter==='all'||(q.st||'open')===qFilter);const cnt=k=>db.quotes.filter(q=>(q.st||'open')===k).length;
 return `<div class="chips">${[['all','الكل',db.quotes.length],['open','⏳ في الانتظار',cnt('open')],['accepted','✅ وافق',cnt('accepted')],['converted','🧾 اتحول',cnt('converted')],['rejected','❌ رفض',cnt('rejected')]].map(c=>`<button class="chip ${qFilter===c[0]?'on':''}" onclick="qFilter='${c[0]}';route()">${c[1]} (${c[2]})</button>`).join('')}</div><div class="card">${L.length?L.map(q=>`<div class="item" onclick="location.hash='#/quote/${q.id}'"><div class="main"><div class="t">عرض #${q.no} · ${esc(cname(q.cid))}</div><div class="s">${q.date} · ${qstPill(q)}</div></div><div class="num">${fmt(q.total)}</div></div>`).join(''):'<div class="empty">مفيش عروض أسعار</div>'}</div><button class="fab" data-need="sales.add" onclick="draft=blankDraft();draft.q=true;location.hash='#/invoice/new?q=1'">＋ عرض سعر</button>`};
function setQst(id,st){const q=db.quotes.find(x=>x.id==id);if(!q||q.st==='converted')return;q.st=st;q.stDate=today();save();route()}
/* ضغطة واحدة: العميل وافق ← يتسجل وافق ويفتح الفاتورة بنفس العميل والأصناف */
function quoteAccept(id){setQst(id,'accepted');quoteToInvoice(id)}
R['/quote']=id=>{const q=db.quotes.find(x=>x.id==id);if(!q)return nf();head('عرض سعر #'+q.no,true);const st=db.settings,c=q.cid?cust(q.cid):null;
 return `<div class="card inv"><div class="lh"><img src="${LOGO}"><div><div class="co">${esc(st.name)}</div><div class="sub2">${esc(st.sub||'')}</div>${st.phone?`<div class="sub2">📞 ${esc(st.phone)}</div>`:''}</div></div>
 <div class="meta"><div><span>عرض سعر رقم</span><b>#${q.no}</b></div><div><span>التاريخ</span><b>${q.date}</b></div><div><span>الحالة</span><b>${qstPill(q)}</b></div></div>
 <div class="cu"><div><span>العميل:</span> <b>${esc(cname(q.cid))}</b></div>${c&&c.phone?`<div><span>تليفون:</span> ${esc(phones(c).join(' - '))}</div>`:''}</div>
 <table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>${q.items.map(x=>`<tr><td>${esc(x.name)}${x.free?' 🎁 مجاني':''}${x.disc?' <small>(خصم '+x.disc+'%)</small>':''}</td><td>${x.qty} ${esc(unitT(x))}</td><td>${x.free?'—':fmt(x.price)}</td><td>${fmt(x.qty*x.price)}</td></tr>`).join('')}</table>
 ${q.adj?`<div class="stat"><span>${esc(q.adjDesc)}</span><b>${q.adj<0?'−':'+'}${fmt(Math.abs(q.adj))} ج.م</b></div>`:''}<div class="stat"><span>الإجمالي</span><b>${fmt(q.total)} ج.م</b></div>${q.notes?`<div class="notes"><span>ملاحظات:</span> ${esc(q.notes)}</div>`:''}
 ${q.st==='converted'?`<button class="btn sec noprint" onclick="location.hash='#/invoice/${q.inv}'">↗ فتح الفاتورة</button>`:`<button class="btn noprint" data-need="sales.add" onclick="quoteAccept(${q.id})">✅ العميل وافق، حوّلها لفاتورة</button>${q.st==='open'?`<button class="btn sec noprint" onclick="setQst(${q.id},'accepted')">وافق (من غير فاتورة دلوقتي)</button><button class="btn sec noprint" onclick="setQst(${q.id},'rejected')">❌ العميل رفض</button>`:`<button class="btn sec noprint" onclick="setQst(${q.id},'open')">↩ رجّعها في الانتظار</button>`}`}<button class="btn del noprint" data-need="sales.delete" onclick="delQuote(${q.id})">حذف عرض السعر</button></div>`};
function quoteToInvoice(id){const q=db.quotes.find(x=>x.id==id);if(!q)return;const lines=[];q.items.forEach(x=>{if(x.free){const l=[...lines].reverse().find(y=>y.pid==x.pid);if(l){l.free=(l.free||0)+x.qty;l.freeM=true}}else lines.push({pid:x.pid,qty:x.qty,price:x.list??x.price,disc:x.disc||0,discM:true,edited:true})});
 draft={...blankDraft(),cid:q.cid,lines,notes:q.notes||'',adjT:q.adj<0?'خصم':'زيادة',adjM:'amt',adjV:Math.abs(q.adj||0),fromQuote:q.id};location.hash='#/invoice/new'}
function delQuote(id){if(confirm('تحذف عرض السعر؟')){db.quotes=db.quotes.filter(x=>x.id!=id);save();location.hash='#/quotes'}}
const R_CUST=R['/customer'];R['/customer']=id=>{let h=R_CUST(id);if(id==='new')return h;const qs=db.quotes.filter(q=>q.cid==id);return h+(qs.length?`<div class="card"><h2>عروض الأسعار (${qs.length})</h2>${qs.map(q=>`<div class="item" onclick="location.hash='#/quote/${q.id}'"><div class="main"><div class="t">عرض #${q.no}</div><div class="s">${q.date} · ${q.st==='converted'?'اتحول لفاتورة':'مفتوح'}</div></div><div class="num">${fmt(q.total)}</div></div>`).join('')}</div>`:'')+`<button class="btn sec" data-need="sales.add" onclick="draft=blankDraft();draft.q=true;draft.cid=${id};location.hash='#/invoice/new?q=1'">📝 عرض سعر لهذا العميل</button>`};
const _oc=outCtx;outCtx=function(){const s=location.hash.slice(1).split('?')[0].split('/').filter(Boolean);
 if(s[0]==='quote'){const q=db.quotes.find(x=>x.id==s[1]),c=q&&q.cid?cust(q.cid):null;return{ph:c&&phones(c)[0],name:'عرض-سعر-'+(q&&q.no)}}
 if(s[0]==='disp'){const v=db.disp.find(x=>x.id==s[1]),i=v&&db.invoices.find(x=>x.id==v.inv),c=i&&i.cid?cust(i.cid):null;return{ph:c&&phones(c)[0],name:'إذن-صرف-'+(v&&v.no)}}
 return _oc()};

/* ---------- البحث الشامل ---------- */
function gsearch(q){q=ad(q).trim();if(!q)return[];const n=q.toLowerCase(),R_=[];const add=(g,ic,t,s,h)=>R_.push({g,ic,t,s,h});
 db.customers.filter(c=>cmatch(c,q)).slice(0,5).forEach(c=>add('العملاء','👤',c.name,(phones(c)[0]||'')+' · '+fmt(c.balance)+' ج.م','customer/'+c.id));
 db.products.filter(p=>pmatch(p,q)||p.name.includes(q)).slice(0,5).forEach(p=>add('المنتجات','📦',p.name,fmt(p.stock)+' '+unitT(p)+' · '+fmt(p.price)+' ج.م'+(p.code?' · #'+p.code:''),'product/'+p.id));
 const num=q.replace('#','');db.invoices.filter(i=>String(i.no)===num||cname(i.cid).includes(q)).slice(-5).reverse().forEach(i=>add('الفواتير','🧾','فاتورة #'+i.no+' - '+cname(i.cid),i.date+' · '+fmt(i.total)+' ج.م','invoice/'+i.id));
 db.quotes.filter(x=>String(x.no)===num||cname(x.cid).includes(q)).slice(-3).forEach(x=>add('عروض الأسعار','📝','عرض #'+x.no+' - '+cname(x.cid),fmt(x.total)+' ج.م','quote/'+x.id));
 allLocs().filter(l=>locName(l).includes(q)).forEach(l=>add('المخازن والسيارات','🏬',locName(l),'عرض المخزون','stock'));
 db.users.filter(u=>u.name.includes(q)||(u.username||'').toLowerCase().includes(n)).slice(0,5).forEach(u=>add(u.emp?'المناديب':'المستخدمين','🚚',u.name,u.phone||'',u.emp?'rep/'+u.id:'user/'+u.id));
 db.suppliers.filter(s=>s.name.includes(q)||(s.phone||'').includes(q)).slice(0,5).forEach(s=>add('الموردين','🏭',s.name,s.phone||'','supplier/'+s.id));
 return R_}
function sRender(q){const r=gsearch(q);let g='',h='';r.forEach(x=>{if(x.g!==g){g=x.g;h+=`<div class="s" style="margin:10px 4px 2px;color:var(--mut);font-weight:700">${g}</div>`}h+=`<div class="item" onclick="location.hash='#/${x.h}'"><div class="main"><div class="t">${x.ic} ${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div></div>`});return {h:h||(q.trim()?'<div class="empty">مفيش نتيجة</div>':'<div class="empty">اكتب أي حاجة: اسم عميل، منتج، رقم فاتورة، مندوب، مورد، مخزن…</div>'),first:r[0]}}
R['/search']=()=>{head('بحث شامل',true);setTimeout(()=>{const e=$('#gs');e&&e.focus()},50);return `<input class="search" id="gs" autocomplete="off" placeholder="🔍 ابحث في كل البرنامج…" oninput="$('#gsr').innerHTML=sRender(this.value).h" onkeydown="if(event.key==='Enter'){const f=sRender(this.value).first;if(f)location.hash='#/'+f.h}"><div id="gsr">${sRender('').h}</div>`};

/* ---------- مركز الإشعارات + سجل النشاط ---------- */
const unreadN=()=>can('users.manage')?db.notes.filter(n=>n.ts>(db.notesRead||0)&&n.by!=db.me).length:0;
R['/notifs']=()=>{head('إشعارات المدير',true);const L=[...db.notes].reverse().slice(0,150),r=db.notesRead||0;db.notesRead=Date.now();save();
 return `<div class="card">${L.length?L.map(n=>`<div class="item"><div class="main"><div class="t" style="font-weight:${n.ts>r?800:500}">${n.ts>r?'🔵 ':''}${esc(n.txt)}</div><div class="s">${esc(uname(n.by))} · ${fdt(n.ts)}</div></div></div>`).join(''):'<div class="empty">مفيش إشعارات</div>'}</div><button class="btn sec" onclick="location.hash='#/activity'">📜 سجل النشاط الكامل</button>`};
let AC={u:'',q:'',from:today().slice(0,8)+'01',to:today()};
R['/activity']=()=>{head('سجل النشاط',true);const ev=activity().filter(e=>{const d=new Date(e.ts).toISOString().slice(0,10);return d>=AC.from&&d<=AC.to&&(!AC.u||e.by==AC.u)&&(!AC.q||e.t.includes(AC.q))});
 return `<div class="card noprint"><div class="row2"><div><label>من</label><input type="date" value="${AC.from}" onchange="AC.from=this.value;route()"></div><div><label>إلى</label><input type="date" value="${AC.to}" onchange="AC.to=this.value;route()"></div></div><label style="margin-top:8px">المستخدم</label><select onchange="AC.u=this.value;route()">${selOpts(db.users.map(u=>[u.id,u.name]),AC.u,'الكل')}</select><input class="search" style="margin-top:8px" placeholder="🔍 بحث في العمليات" value="${esc(AC.q)}" onchange="AC.q=this.value;route()"></div>
 <div class="card out"><h2>سجل النشاط (مين عمل إيه ومتى)</h2>${ev.length?rtbl(['الوقت','المستخدم','العملية','المبلغ'],ev.slice(0,300).map(e=>[fdt(e.ts),esc(uname(e.by)),esc(e.ic+' '+e.t),e.a?fmt(e.a):''])):'<div class="empty">مفيش عمليات في الفترة دي</div>'}</div>`};

/* ---------- المحادثات (واجهة + نموذج بيانات جاهز للسيرفر؛ التوصيل بين الأجهزة في مرحلة السيرفر) ---------- */
/* msg: {id, th:'g'|'p<userId>', by, ts, text, att:{name,type,data}|null}   — قراءة: db.chatRead[userId][th]=آخر وقت */
const thName=th=>th==='g'?'👥 كل الموظفين':'💬 '+(th.slice(1)==me().id?'المدير':uname(+th.slice(1)));
const myThreads=()=>can('users.manage')?['g',...db.users.filter(u=>u.id!=me().id).map(u=>'p'+u.id)]:['g','p'+me().id];
const chatRd=th=>((db.chatRead||{})[db.me]||{})[th]||0;
const thUnread=th=>db.msgs.filter(m=>m.th===th&&m.by!=db.me&&m.ts>chatRd(th)).length;
const chatUnread=()=>myThreads().reduce((a,th)=>a+thUnread(th),0);
let CH='';
R['/chat']=th=>{if(!th){head('المحادثات',true);return `<div class="alert">💡 المحادثات بتتحفظ على الجهاز ده لحد مرحلة السيرفر، وساعتها بتوصل لكل الأجهزة فورًا.</div><div class="card">${myThreads().map(t=>{const l=[...db.msgs].reverse().find(m=>m.th===t),u=thUnread(t);return `<div class="item" onclick="location.hash='#/chat/${t}'"><div class="main"><div class="t">${esc(thName(t))}</div><div class="s">${l?esc((l.text||'📎 '+(l.att||{}).name).slice(0,40)):'ابدأ المحادثة'}</div></div>${u?`<div class="num" style="background:var(--red);color:#fff;border-radius:12px;padding:2px 9px">${u}</div>`:''}</div>`}).join('')}</div>`}
 if(!myThreads().includes(th))return nf();head(thName(th).replace(/^\S+ /,''),true);db.chatRead=db.chatRead||{};(db.chatRead[db.me]=db.chatRead[db.me]||{})[th]=Date.now();save();
 const M=db.msgs.filter(m=>m.th===th);setTimeout(()=>{const b=$('#cmsgs');b&&(b.scrollTop=b.scrollHeight)},30);
 return `<div class="card" id="cmsgs" style="max-height:60vh;overflow:auto">${M.length?M.map(m=>{const mine=m.by==db.me;return `<div style="display:flex;justify-content:${mine?'flex-start':'flex-end'};margin:6px 0"><div style="max-width:82%;background:${mine?'#d7e3f4':'#eeeff1'};border-radius:14px;padding:8px 12px"><div class="s" style="font-size:11.5px;color:var(--mut)">${mine?'أنا':esc(uname(m.by))} · ${fdt(m.ts)}${can('users.manage')?` · <a class="noprint" style="color:var(--red);font-weight:700" onclick="chatDel(${m.id})">🗑 حذف</a>`:''}</div>${m.text?`<div>${esc(m.text)}</div>`:''}${m.att?(m.att.type.startsWith('image/')?`<img src="${m.att.data}" style="max-width:100%;border-radius:10px;margin-top:6px" onclick="openAtt(${m.id})">`:`<div><a style="color:var(--g3);font-weight:700" onclick="openAtt(${m.id})">📄 ${esc(m.att.name)} (فتح)</a></div>`):''}</div></div>`}).join(''):'<div class="empty">ابدأ المحادثة</div>'}</div>
 <div class="card"><textarea id="cm_t" rows="2" placeholder="اكتب رسالة…" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit"></textarea><div class="row2" style="margin-top:8px"><label class="btn sec" style="margin:0;text-align:center">📎 صورة / PDF<input type="file" id="cm_f" accept="image/*,application/pdf" style="display:none" onchange="chatSend('${th}')"></label><button class="btn" style="margin:0" onclick="chatSend('${th}')">إرسال</button></div></div>`};
function chatSend(th){const t=$('#cm_t').value.trim(),f=$('#cm_f').files[0];if(!t&&!f)return;
 const push=att=>{const id=nid('msg');db.msgs.push({id,th,by:db.me,ts:Date.now(),text:t,att});notify(`💬 رسالة في ${thName(th).replace(/^\S+ /,'')}`);save();route()};
 if(!f)return push(null);if(f.size>1300000)return toast('الملف كبير (لحد 1.3 ميجا دلوقتي)');const r=new FileReader();r.onload=()=>push({name:f.name,type:f.type,data:r.result});r.readAsDataURL(f)}
/* حذف رسائل الشات: للمدير بس (رسالة واحدة أو المحادثة كلها) وبيتسجل في سجل النشاط */
function chatDel(id){if(!can('users.manage'))return toast('الحذف للمدير بس');if(!confirm('حذف الرسالة دي؟'))return;const m=db.msgs.find(x=>x.id==id);db.msgs=db.msgs.filter(x=>x.id!=id);try{audit('حذف رسالة شات',(m?thName(m.th):'')+' - '+(m?uname(m.by):''))}catch(e){}save();route()}
function openAtt(id){const m=db.msgs.find(x=>x.id==id);if(!m||!m.att)return;const a=m.att.data.split(','),bin=atob(a[1]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);window.open(URL.createObjectURL(new Blob([u],{type:m.att.type})),'_blank')}

/* ---------- لوحة المدير: ويدجت المحادثات + آخر الإشعارات ---------- */
const R_DASH2=R['/'];
R['/']=()=>{let h=R_DASH2();if(!can('reports.view'))return h;const un=chatUnread(),last=[...db.msgs].reverse().slice(0,3);
 const w=`<div class="card"><h2>💬 المحادثات ${un?`<span class="pill bad">${un} جديد</span>`:''}</h2>${last.length?last.map(m=>`<div class="item" onclick="location.hash='#/chat/${m.th}'"><div class="main"><div class="t">${esc(uname(m.by))}</div><div class="s">${esc((m.text||'📎 مرفق').slice(0,50))}</div></div></div>`).join(''):'<div class="empty">لسه مفيش رسائل</div>'}<button class="btn sec" onclick="location.hash='#/chat'">فتح المحادثات</button></div>`;
 const nn=[...db.notes].reverse().slice(0,6),nw=`<div class="card"><h2>🔔 آخر الإشعارات ${unreadN()?`<span class="pill bad">${unreadN()} جديد</span>`:''}</h2>${nn.length?nn.map(n=>`<div class="item"><div class="main"><div class="t" style="font-weight:500">${esc(n.txt)}</div><div class="s">${esc(uname(n.by))} · ${fdt(n.ts)}</div></div></div>`).join(''):'<div class="empty">مفيش إشعارات</div>'}<button class="btn sec" onclick="location.hash='#/notifs'">كل الإشعارات + سجل النشاط</button></div>`;
 return h.replace('<div class="card"><h2>🔔 إشعارات المدير',nw+w+'<div class="card"><h2>⚠️ تنبيهات المخزون والصلاحية')};

/* ---------- الإعدادات المركزية ---------- */
const THEMES={green:['#0e1a2c','#13233b','#1e3353','كحلي (الأساسي)'],navy:['#0f2540','#143358','#1f4a7a','أزرق غامق'],brown:['#2b1f0f','#3a2a14','#52401f','بني'],black:['#111','#1c1c1c','#333','أسود']};
function applySettings(){const s=db.settings,r=document.documentElement.style,t=THEMES[s.theme]||THEMES.green;r.setProperty('--g1',t[0]);r.setProperty('--g2',t[1]);r.setProperty('--g3',t[2]);document.body.style.fontSize=({s:'14px',m:'',l:'17px'})[s.fs||'m'];
 document.body.classList.toggle('nologo',(s.print||{}).logo===false);let st=$('#pgst');if(!st){st=document.createElement('style');st.id='pgst';document.head.appendChild(st)}st.textContent='@page{size:'+(({A4:'A4',A5:'A5',r80:'80mm auto'})[(s.print||{}).paper||'A4'])+';margin:8mm}'}
R['/settings']=()=>{head('الإعدادات',true);const s=db.settings,pr=s.print||{};
 return `<div class="card"><h2>🏢 بيانات الشركة</h2><label>اسم الشركة</label><input id="s_name" value="${esc(s.name)}"><label>الوصف</label><input id="s_sub" value="${esc(s.sub||'')}"><div class="row2"><div><label>تليفون 1</label><input id="s_phone" type="tel" value="${esc(s.phone||'')}"></div><div><label>تليفون 2</label><input id="s_phone2" type="tel" value="${esc(s.phone2||'')}"></div></div><label>العنوان</label><input id="s_addr" value="${esc(s.addr||'')}">
 <label>اللوجو</label><div class="row2"><label class="btn sec" style="margin:0;text-align:center">🖼️ رفع لوجو<input type="file" accept="image/*" style="display:none" onchange="setLogo(this)"></label><button class="btn sec" style="margin:0" onclick="db.settings.logo='';LOGO=LOGO0;save();route()">الرجوع للأساسي</button></div><img src="${LOGO}" style="width:70px;margin-top:8px"></div>
 <div class="card"><h2>🌐 اللغة</h2><select><option>العربية (من اليمين لليسار)</option><option disabled>English (قريبًا)</option></select></div>
 <div class="card"><h2>🖨️ الطباعة</h2><label>حجم الورق الافتراضي للطباعة</label><select id="s_paper">${[['A4','A4'],['A5','A5'],['r80','رول حراري 80 مم'],['r58','رول حراري 58 مم']].map(([k,n])=>`<option value="${k}" ${(pr.paper||'A4')===k?'selected':''}>${n}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="s_phead" ${pr.head===false?'':'checked'}> ترويسة الشركة (لوجو + اسم + عنوان) فوق كل مطبوع وPDF</label><label class="chk"><input type="checkbox" id="s_plogo" ${pr.logo===false?'':'checked'}> إظهار اللوجو في المطبوعات</label><label>الملاحظة اللي فوق الفاتورة (تتغير في أي وقت)</label><textarea id="s_ptop" rows="2">${esc(pr.top!==undefined?pr.top:IVTOP)}</textarea><label>سياسة الاستبدال / الاسترجاع (آخر الفاتورة)</label><textarea id="s_ppol" rows="3">${esc(pr.pol!==undefined?pr.pol:IVPOL)}</textarea><label>سطر في آخر كل فاتورة/كشف (شروط، شكر…)</label><input id="s_foot" value="${esc(pr.footer||'')}" placeholder="مثال: شكرًا لتعاملكم معنا"></div>
 <div class="card"><h2>🎨 المظهر</h2><label>اللون</label><select id="s_theme">${Object.entries(THEMES).map(([k,t])=>`<option value="${k}" ${(s.theme||'green')===k?'selected':''}>${t[3]}</option>`).join('')}</select><label>حجم الخط</label><select id="s_fs">${[['s','صغير'],['m','عادي'],['l','كبير']].map(([k,n])=>`<option value="${k}" ${(s.fs||'m')===k?'selected':''}>${n}</option>`).join('')}</select></div>
 <button class="btn" onclick="saveSettings()">💾 حفظ الإعدادات</button>
 <div class="card" style="margin-top:12px"><h2>🧩 إعدادات الأقسام</h2><div class="tiles"><a class="tile" href="#/places"><span>🏬</span>المخازن والسيارات</a><a class="tile" href="#/offers"><span>🎁</span>العروض التجارية</a><a class="tile" href="#/lists"><span>🏷️</span>الشركات والأقسام</a><a class="tile" href="#/more"><span>☰</span>كل الأقسام</a></div></div>`};
function saveSettings(){const s=db.settings,g=k=>$('#s_'+k).value.trim();if(!g('name'))return toast('اكتب اسم الشركة');Object.assign(s,{name:g('name'),sub:g('sub'),phone:g('phone'),phone2:g('phone2'),addr:g('addr'),theme:$('#s_theme').value,fs:$('#s_fs').value});s.print={top:$('#s_ptop').value.trim(),pol:$('#s_ppol').value.trim(),paper:$('#s_paper').value,logo:$('#s_plogo').checked,footer:g('foot'),head:$('#s_phead').checked};save();applySettings();toast('اتحفظت الإعدادات ✅');route()}
function setLogo(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,300/Math.max(im.width,im.height));c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);db.settings.logo=c.toDataURL('image/png');LOGO=db.settings.logo;save();route()};im.src=r.result};r.readAsDataURL(f)}
const _oa=outAuto;outAuto=function(){_oa();const ft=(db.settings.print||{}).footer;if(ft)document.querySelectorAll('#app .out').forEach(e=>{if(!e.querySelector('.pfoot'))e.insertAdjacentHTML('beforeend',`<div class="pfoot" style="text-align:center;color:var(--mut);font-size:12.5px;margin-top:12px">${esc(ft)}</div>`)});
 const hd=$('#hd');if(hd&&!hd.querySelector('.hs')){hd.insertAdjacentHTML('beforeend',`<button class="back hs" onclick="location.hash='#/search'">🔍</button>${can('users.manage')?`<button class="back hs" onclick="location.hash='#/notifs'">🔔${unreadN()?' '+unreadN():''}</button>`:''}`)}};

/* ---------- تسجيل الصفحات الجديدة في "المزيد" وفي الصلاحيات ---------- */
TILES.push(['🔍','بحث شامل','#/search',null],['📝','عروض الأسعار','#/quotes','sales.view'],['🎁','العروض التجارية','#/offers','products.edit'],['💬','المحادثات','#/chat',null],['🔔','الإشعارات','#/notifs','users.manage'],['📜','سجل النشاط','#/activity','users.manage'],['⚙️','الإعدادات','#/settings','settings.edit']);
Object.assign(ROUTE_PERM,{'/quotes':'sales.view','/quote':'sales.view','/offers':'products.edit','/notifs':'users.manage','/activity':'users.manage','/disp':'sales.view','/cinv':'sales.view','/settings':'settings.edit'});

/* ---------- تقرير الجرد المطبوع (ورقة جرد بعمود للعدّ الفعلي) ---------- */
let skL='all';
R['/stocktake']=()=>{head('ورقة الجرد',1);const ls=myLocs();
 const rows=db.products.map(p=>{const q=skL==='all'?db.products&&Object.keys(db.stk).reduce((a,l)=>a+qtyAt(l,p.id),0):qtyAt(skL,p.id);return [esc(p.name),fmt(q)+' '+esc(unitT(p)),'','']});
 return `<div class="card"><label>المكان</label><select onchange="skL=this.value;route()"><option value="all">كل المخازن</option>${locOpts(skL,ls)}</select></div>
 <div class="card out"><div style="text-align:center;font-weight:800">ورقة جرد - ${esc(db.settings.company||'خالد تريد')}</div><div style="text-align:center;font-size:12px">${skL==='all'?'كل المخازن':esc(locName(skL))} · ${new Date().toLocaleDateString('en-GB')}</div>
 ${rtbl(['الصنف','رصيد البرنامج','الجرد الفعلي','الفرق'],rows)}</div>`};

/* ===== شكل الفاتورة: عدد الوحدات + الكمية الكلية، إجماليات، أرصدة، المبلغ بالحروف ===== */
const arW=(()=>{const O=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'],T=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'],H=['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
 const u3=n=>{const h=Math.floor(n/100),r=n%100,p=[];if(h)p.push(H[h]);if(r){if(r<20)p.push(O[r]);else{const u=r%10;p.push((u?O[u]+' و':'')+T[Math.floor(r/10)])}}return p.join(' و')};
 const sc=(n,one,two,few,many)=>n===1?one:n===2?two:n<=10?u3(n)+' '+few:u3(n)+' '+many;
 return n=>{n=Math.floor(n);if(!n)return 'صفر';const p=[],b=Math.floor(n/1e9),m=Math.floor(n/1e6)%1000,t=Math.floor(n/1e3)%1000,r=n%1000;
  if(b)p.push(sc(b,'مليار','ملياران','مليارات','مليار'));if(m)p.push(sc(m,'مليون','مليونان','ملايين','مليون'));if(t)p.push(sc(t,'ألف','ألفان','آلاف','ألف'));if(r)p.push(u3(r));return p.join(' و')}})();
const amtWords=v=>{v=Math.round(Math.abs(+v||0)*100)/100;const g=Math.floor(v),pi=Math.round((v-g)*100);return 'فقط '+arW(g)+' جنيه'+(pi?' و'+arW(pi)+' قرش':'')+' لا غير'};
function invBal(i){const c=i.cid?cust(i.cid):null;if(!c)return null;const ev=custEv(c),k=ev.findIndex(e=>e.link==='invoice/'+i.id);if(k<0)return null;
 const nx=ev[k+1],af=nx&&nx.desc==='مدفوع عند البيع'&&nx.t===ev[k].t+.5?nx:ev[k];let last=null;for(let j=k-1;j>=0;j--)if((ev[j].desc||'').indexOf('تحصيل')>=0){last=ev[j];break}
 return{prev:k?ev[k-1].bal:0,cur:af.bal,last}}
const pkSplit=x=>{const n=+x.pk||0;if(n<=1)return null;const u=Math.floor(x.qty/n);return{u,o:+(x.qty-u*n).toFixed(3)}};
function invTable(i){const hasU=i.items.some(x=>pkSplit(x));let tu=0,tq=0;
 const rows=i.items.map((x,n)=>{const s=pkSplit(x);tq+=x.qty;if(s)tu+=s.u;return `<tr><td>${n+1}</td><td>${esc(x.name)}${x.free?' 🎁':''}</td>${hasU?`<td>${s?s.u+' '+esc(x.unit)+(s.o?' + '+s.o:''):'-'}</td>`:''}<td>${fmt(x.qty)}${s||hasU?'':' '+esc(unitT(x))}</td><td>${fmt(x.price)}</td><td>${fmt(x.qty*x.price)}</td></tr>`}).join('');
 return `<table><tr><th>م</th><th>الصنف</th>${hasU?'<th>الوحدات</th>':''}<th>${hasU?'الكمية الكلية':'الكمية'}</th><th>السعر</th><th>الإجمالي</th></tr>${rows}<tr class="tot"><td></td><td><b>إجمالي الكميات</b></td>${hasU?`<td><b>${tu||'-'}</b></td>`:''}<td><b>${fmt(tq)}</b></td><td></td><td></td></tr></table>`}
function invStrip(i){const b=invBal(i);let h='';if(b){h+=`<div class="stat"><span>رصيد سابق</span><b class="${b.prev>0?'neg':''}">${fmt(b.prev)} ج.م</b></div><div class="stat"><span>رصيد حالي</span><b class="${b.cur>0?'neg':''}">${fmt(b.cur)} ج.م</b></div><div class="stat"><span>آخر سداد</span><b>${b.last?fmt(b.last.cr)+' ج.م · '+b.last.d:'-'}</b></div>`}
 return h+`<div class="notes" style="font-weight:700">${esc(amtWords(i.total))}</div>`}

/* ===== تحديث البرنامج من الإعدادات =====
   بيجيب آخر كود (ملفات الموقع) بس. الداتا (kt_dbe المشفرة) والحسابات في مخزن المتصفح على نفس العنوان، فمبتتلمسش.
   قبل التحديث بنعمل نسخة أمان من الداتا. لو العنوان اتغير لسيرفر تاني لازم نسخة احتياطية (الإعدادات > النسخ الاحتياطي). */
const KTV=()=>{const m=document.querySelector('meta[name=kt-ver]');return m?m.content:'0'};
const updBase=()=>{let u=(((db.settings||{}).updUrl)||'').trim();if(!/^https?:\/\//i.test(u))u=location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/,'');return u.endsWith('/')?u:u+'/'};
const updDate=v=>+v?new Date(+v*1000).toLocaleString('ar-EG'):'—';
async function updCheck(silent){const el=$('#updst');try{if(el&&!silent)el.innerHTML='⏳ بنفحص...';const r=await fetch(updBase()+'version.json?x='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();const nw=+j.v>+KTV();
  if(el)el.innerHTML=nw?`<div class="note">🔔 فيه تحديث جديد (${esc(updDate(j.v))})${j.notes?'<br>'+esc(String(j.notes)).replace(/\n/g,'<br>'):''}</div>`:'✅ البرنامج على آخر نسخة';
  if(silent&&nw)toast('🔔 فيه تحديث جديد للبرنامج: الإعدادات ← تحديث البرنامج');return nw}catch(e){if(el&&!silent)el.innerHTML='⚠️ مقدرناش نوصل لملف التحديث. اتأكد من النت أو من عنوان السيرفر.';return false}}
async function updApply(){if(!can('users.manage'))return toast('للمدير بس');
 if(!confirm('هيتم تحديث البرنامج لآخر نسخة. الفواتير والعملاء والحسابات مش هتتغير، وهيتعمل نسخة أمان قبل التحديث. تكمل؟'))return;
 try{const d=localStorage.getItem('kt_dbe');if(d)localStorage.setItem('kt_dbe_prev',d)}catch(e){}
 try{if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
 location.replace(updBase()+'?upd='+Date.now()+(DEMO?'&demo=1':''))}
function updCard(){if(!can('users.manage'))return '';const s=db.settings;const far=updBase()!==location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/,'');
 return `<div class="card noprint"><h2>🔄 تحديث البرنامج</h2><div class="stat"><span>النسخة الحالية</span><b>${esc(updDate(KTV()))}</b></div>
 <div class="note">التحديث بيجيب آخر كود للبرنامج بس. الفواتير والعملاء والحسابات والمستخدمين محفوظين على الجهاز ومش بيتغيروا، وبيتعمل نسخة أمان قبل التحديث.</div>
 <label>عنوان السيرفر (سيبه فاضي لنفس العنوان الحالي)</label><input id="s_upd" value="${esc(s.updUrl||'')}" placeholder="https://..." onchange="db.settings.updUrl=this.value.trim();save()">
 ${far?'<div class="alert">⚠️ العنوان ده غير عنوان البرنامج الحالي. الداتا مخزنة على العنوان الحالي، فلو هتشتغل من عنوان تاني اعمل نسخة احتياطية الأول واستعدها هناك.</div>':''}
 <div id="updst" style="margin:8px 0"></div><div class="row2"><button class="btn sec" onclick="updCheck()">🔎 فحص التحديثات</button><button class="btn" onclick="updApply()">⬇️ تحديث الآن</button></div></div>`}
{const _s=R['/settings'];R['/settings']=(...a)=>_s(...a)+updCard()}
setTimeout(()=>{try{if(!DEMO&&Auth.ok()&&can('users.manage')&&Date.now()-(+localStorage.getItem('kt_updchk')||0)>36e5){localStorage.setItem('kt_updchk',Date.now());updCheck(true)}}catch(e){}},25000);

/* ================= بيانات الأصناف: بحث زي البرنامج القديم + طباعة بيانات أصناف =================
   (1) شاشة المنتجات: المجموعة، الشركة المنتجة، الصنف، بحث عام (اسم/كود/باركود)، الرصيد الحالي، ترتيب بالكود أو الاسم.
   (2) تقرير "طباعة بيانات أصناف": اختيار الأعمدة والفلاتر والتقسيم والترتيب، وبيتطبع زي أي تقرير. */
let PF={it:'',sort:'name'};
const pBal=(p,loc)=>loc?qtyAt(loc,p.id):myLocs().reduce((a,l)=>a+qtyAt(l,p.id),0);
const pCodeK=p=>String(p.code||p.id);
const pCmp=k=>k==='code'?(a,b)=>pCodeK(a).localeCompare(pCodeK(b),'ar',{numeric:true}):(a,b)=>a.name.localeCompare(b.name,'ar');
plist=function(q){q=ivN(q).toLowerCase();const it=PF.it.trim().toLowerCase();
 const l=db.products.filter(p=>(!q||p.name.toLowerCase().includes(q)||String(p.code||'').toLowerCase().includes(q)||String(p.barcode||'').includes(q)||secN(p.sec).toLowerCase().includes(q)||coN(p.co).toLowerCase().includes(q))&&(!it||p.name.toLowerCase().includes(it))&&(!fSec||p.sec==fSec)&&(!fCo||p.co==fCo));
 if(!l.length)return '<div class="empty">مفيش أصناف بالشروط دي</div>';
 if(!reorder)l.sort(pCmp(PF.sort));
 return `<div class="stat"><span>عدد الأصناف: ${l.length}</span><b>الرصيد الحالي</b></div>`+l.map(p=>{const e=expState(p),b=pBal(p);return `<div class="item" ${reorder?'':`onclick="location.hash='#/product/${p.id}'"`}>${reorder?`<div class="mv"><button onclick="mvP(${p.id},-1)">▲</button><button onclick="mvP(${p.id},1)">▼</button></div>`:''}<div class="main"><div class="t">${esc(p.name)}</div><div class="s">${p.code?'كود '+esc(p.code)+' · ':''}${esc(secN(p.sec))}${p.co?' · '+esc(coN(p.co)):''} · ${esc(unitT(p))} بـ ${fmt(p.price)}${e?` · <span class="pill ${e.c}">${e.t}</span>`:''}</div></div><div style="text-align:left"><div class="num ${b<=p.min?'neg':''}">${fmt(b)}</div><div class="s">${esc(p.unit)}</div></div></div>`}).join('')};
const R_PRD0=R['/products'];
R['/products']=()=>{let h=R_PRD0().replace('كل الأقسام','كل المجموعات').replace('كل الشركات','كل الشركات المنتجة');
 const card=`<div class="card noprint"><label>الصنف</label><input list="pfl" value="${esc(PF.it)}" placeholder="اسم الصنف أو جزء منه" oninput="PF.it=this.value;filt(($('.search')||{}).value||'')"><datalist id="pfl">${db.products.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist><label style="margin-top:8px">الترتيب</label><div class="chips">${[['name','بالاسم'],['code','بالكود']].map(([k,n])=>`<button class="chip ${PF.sort===k?'on':''}" onclick="PF.sort='${k}';route()">${n}</button>`).join('')}</div><button class="btn sec" onclick="location.hash='#/itemsrep'">🖨 طباعة بيانات أصناف (تقرير)</button></div>`;
 return h.replace('<div class="bar">',card+'<div class="bar">')};
/* تقرير طباعة بيانات الأصناف */
const IR0={cols:{code:1,name:1,co:0,cost:0,wp:0,price:1,bal:1,unit:0,pk:0,min:0,sold:0,ser:1},sec:'',co:'',loc:'',bf:'',bt:'',pf:'',pt:'',cf:'',ct:'',sd:'',ld:'',show:'bal',grp:'none',sort:'name',run:0};
let IR=JSON.parse(JSON.stringify(IR0));
const IRC=[['ser','مسلسل'],['code','كود الصنف'],['name','اسم الصنف'],['co','الشركة المنتجة'],['cost','سعر التوريد'],['wp','سعر الجملة'],['price','سعر التجزئة'],['bal','الرصيد'],['unit','الوحدة'],['pk','عدد الوحدة'],['min','الرصيد الحرج'],['sold','كمية المبيعات']];
function irRows(){const PR=can('reports.profit'),N=v=>ivN(v),d0=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
 const sold={},soldAll={},sup={},mov=new Set(),sdN=N(IR.sd),ldN=N(IR.ld);
 db.invoices.forEach(i=>(i.items||[]).forEach(x=>{mov.add(x.pid);soldAll[x.pid]=(soldAll[x.pid]||0)+(+x.qty||0);if(sdN===''||i.date>=d0(+sdN))sold[x.pid]=(sold[x.pid]||0)+(+x.qty||0)}));
 db.purchases.forEach(v=>(v.items||[]).forEach(x=>{mov.add(x.pid);if(!sup[x.pid]||v.date>sup[x.pid])sup[x.pid]=v.date}));
 let L=db.products.map(p=>({p,bal:pBal(p,IR.loc),sold:sold[p.id]||0}));
 if(IR.sec)L=L.filter(r=>r.p.sec==IR.sec);if(IR.co)L=L.filter(r=>r.p.co==IR.co);
 if(IR.show==='bal')L=L.filter(r=>r.bal>0);if(IR.show==='nobal')L=L.filter(r=>r.bal<=0);if(IR.show==='nomov')L=L.filter(r=>!mov.has(r.p.id));
 if(N(IR.bf)!=='')L=L.filter(r=>r.bal>=+N(IR.bf));if(N(IR.bt)!=='')L=L.filter(r=>r.bal<=+N(IR.bt));
 if(N(IR.pf)!=='')L=L.filter(r=>+r.p.price>=+N(IR.pf));if(N(IR.pt)!=='')L=L.filter(r=>+r.p.price<=+N(IR.pt));
 if(PR){if(N(IR.cf)!=='')L=L.filter(r=>+r.p.cost>=+N(IR.cf));if(N(IR.ct)!=='')L=L.filter(r=>+r.p.cost<=+N(IR.ct))}
 if(sdN!==''&&IR.sdOnly)L=L.filter(r=>r.sold>0);
 if(ldN!=='')L=L.filter(r=>sup[r.p.id]&&sup[r.p.id]>=d0(+ldN));
 L.sort((a,b)=>pCmp(IR.sort)(a.p,b.p));
 if(IR.grp!=='none'){const k=r=>IR.grp==='sec'?secN(r.p.sec)||'بدون مجموعة':coN(r.p.co)||'بدون شركة';L.sort((a,b)=>k(a).localeCompare(k(b),'ar'));L.forEach(r=>r.g=k(r))}
 return L}
function irReport(){const PR=can('reports.profit'),L=irRows(),cols=IRC.filter(([k])=>IR.cols[k]&&(k!=='cost'||PR));let n=0;
 const cell=(k,r,i)=>{const p=r.p;return{ser:i,code:esc(p.code||''),name:esc(p.name),co:esc(coN(p.co)),cost:fmt(p.cost),wp:fmt(+p.wp>0?p.wp:p.price),price:fmt(p.price),bal:fmt(r.bal),unit:esc(p.unit||''),pk:+p.pk>1?p.pk:'',min:p.min||'',sold:fmt(r.sold)}[k]};
 let rows='',cur=null,i=0;L.forEach(r=>{if(IR.grp!=='none'&&r.g!==cur){cur=r.g;rows+=`<tr><td colspan="${cols.length}" style="background:var(--g0,#eef1f6);font-weight:800;text-align:right">${esc(cur)}</td></tr>`}i++;rows+=`<tr>${cols.map(([k])=>`<td>${cell(k,r,i)}</td>`).join('')}</tr>`});
 const tb=db.settings&&db.settings.name||'خالد تريد',locT=IR.loc?locName(IR.loc):'كل المخازن';
 return `<div class="card out"><h2>بيانات الأصناف</h2><div class="s" style="color:var(--mut);margin-bottom:6px">${esc(tb)} · ${locT} · ${today()}${IR.sec?' · مجموعة: '+esc(secN(IR.sec)):''}${IR.co?' · شركة: '+esc(coN(IR.co)):''} · عدد الأصناف: ${L.length}</div>${L.length?`<table><tr>${cols.map(([,t])=>`<th>${t}</th>`).join('')}</tr>${rows}</table>`:'<div class="empty">مفيش أصناف بالشروط دي</div>'}</div>`}
R['/itemsrep']=()=>{head('طباعة بيانات أصناف',true);const PR=can('reports.profit'),I=(k,t)=>`<div><label>${t}</label><input inputmode="numeric" value="${esc(IR[k])}" onchange="IR.${k}=this.value"></div>`;
 const rd=(k,a)=>a.map(([v,t])=>`<button class="chip ${IR[k]===v?'on':''}" onclick="IR.${k}='${v}';irKeep()">${t}</button>`).join('');
 return `<div class="card noprint"><h2>الأعمدة اللي تظهر</h2><div class="chips">${IRC.filter(([k])=>k!=='cost'||PR).map(([k,t])=>`<button class="chip ${IR.cols[k]?'on':''}" onclick="IR.cols.${k}=IR.cols.${k}?0:1;irKeep()">${t}</button>`).join('')}</div>
 <h2 style="margin-top:12px">الفلاتر</h2><div class="row2"><div><label>المجموعة</label><select onchange="IR.sec=this.value">${selOpts(db.sections.map(s=>[s.id,s.name]),IR.sec,'الكل')}</select></div><div><label>الشركة المنتجة</label><select onchange="IR.co=this.value">${selOpts(db.companies.map(s=>[s.id,s.name]),IR.co,'الكل')}</select></div></div>
 <label style="margin-top:8px">المخزن</label><select onchange="IR.loc=this.value">${selOpts(myLocs().map(l=>[l,locName(l)]),IR.loc,'كل مخازني')}</select>
 <div class="row2" style="margin-top:8px">${I('bf','الرصيد من')}${I('bt','إلى')}</div><div class="row2" style="margin-top:8px">${I('pf','سعر التجزئة من')}${I('pt','إلى')}</div>${PR?`<div class="row2" style="margin-top:8px">${I('cf','سعر التوريد من')}${I('ct','إلى')}</div>`:''}
 <div class="row2" style="margin-top:8px">${I('sd','كمية مبيعات آخر (يوم)')}${I('ld','آخر توريد خلال (يوم)')}</div>
 <label style="margin-top:10px"><input type="checkbox" ${IR.sdOnly?'checked':''} onchange="IR.sdOnly=this.checked"> المطلوب فقط خلال المدة (اللي اتباع بس)</label>
 <label style="margin-top:8px">عرض</label><div class="chips">${rd('show',[['bal','أصناف برصيد فقط'],['all','كل الأصناف'],['nobal','بدون رصيد'],['nomov','بدون حركة']])}</div>
 <label style="margin-top:8px">التقسيم</label><div class="chips">${rd('grp',[['none','بدون'],['sec','مجموعة'],['co','شركة']])}</div>
 <label style="margin-top:8px">الترتيب</label><div class="chips">${rd('sort',[['name','أبجدي'],['code','كود']])}</div>
 <button class="btn" onclick="IR.run=1;route()">عرض</button><button class="btn sec" onclick="IR=JSON.parse(JSON.stringify(IR0));route()">إعادة ضبط</button></div>${IR.run?irReport():''}`};
function irKeep(){const y=window.scrollY;route();window.scrollTo(0,y)}
try{ROUTE_PERM['/itemsrep']=['products.view','stock.view']}catch(e){}

// ===== استيراد بيانات خالد تريد (أصناف + عملاء + موردين) — للمدير فقط =====
let GL=null;
function goLiveFile(inp){const f=inp.files[0];if(!f)return;if(!can('users.manage'))return toast('للمدير بس');
 const r=new FileReader();r.onload=()=>{let d;try{d=JSON.parse(r.result)}catch(e){return toast('الملف مش صالح')}
  if(!d||d.kt!=='golive1'||!Array.isArray(d.items)||!Array.isArray(d.customers)||!Array.isArray(d.suppliers))return toast('الملف مش ملف بيانات خالد تريد');
  goLiveShow(d)};
 r.readAsText(f)}
function goLiveShow(d){  GL=d;const sc=d.customers.reduce((a,c)=>a+(+c.open||0),0),ss=d.suppliers.reduce((a,c)=>a+(+c.open||0),0);
  $('#golive_st').innerHTML=`<div class="card" style="margin:10px 0 0;border:1px solid var(--leaf)"><b>تأكيد الاستيراد</b><div style="margin:6px 0;font-size:14px">أصناف: <b>${d.items.length}</b><br>عملاء: <b>${d.customers.length}</b> (مجموع الأرصدة ${fmt(sc)})<br>موردين: <b>${d.suppliers.length}</b> (مجموع الأرصدة ${fmt(ss)})</div><div style="font-size:12px;color:var(--mut)">هيتم استبدال الأصناف والعملاء والموردين الحاليين.</div><button class="btn" onclick="goLiveApply()">✅ تأكيد واستبدال</button></div>`}
function goLiveApply(){if(!GL||!can('users.manage'))return;const d=GL;
 const T=['invoices','cancelled','purchases','payments','rets','disp','quotes','spay','stk','xfers','trans','adjs','hand','chq'];
 const tx=T.map(k=>[k,(db[k]||[]).length]).filter(x=>x[1]>0);
 if(tx.length&&!confirm('فيه حركات متسجلة على الجهاز ('+tx.map(x=>x[0]+':'+x[1]).join('، ')+') وهتتمسح لأنها مرتبطة بالأصناف والعملاء القديمين. يتعمل نسخة أمان. تكمل؟'))return;
 try{const o=localStorage.getItem('kt_dbe');if(o)localStorage.setItem('kt_dbe_prev',o)}catch(e){}
 tx.forEach(x=>{db[x[0]]=[]});
 db.seq=db.seq||{};db.sections=db.sections||[];db.companies=db.companies||[];
 // المجموعات (x.g) وكود الصنف الحقيقي (x.rc) والجرد الافتتاحي لكل مخزن (x.st) من ملف golive2. كله بيتفك على جهازك بس.
 db.sections=[];db.seq.se=0;const secMap={};const whMap={};db.stk={};
 db.wh=db.wh||[];const oldWh=db.wh;db.wh=[];
 const whId=n=>{if(whMap[n])return whMap[n];const o=oldWh.find(w=>w.name===n);const id=o?o.id:nid('wh');db.wh.push({id:id,name:n});return whMap[n]=id};
 db.products=d.items.map((x,i)=>{let sec=0;if(x.g){if(!secMap[x.g]){const id=nid('se');db.sections.push({id:id,name:x.g});secMap[x.g]=id}sec=secMap[x.g]}
  const id=i+1,pk=+x.pk||1;if(x.st)Object.keys(x.st).forEach(n=>{const l='w'+whId(n);(db.stk[l]=db.stk[l]||{})[id]=+x.st[n]||0});
  return{id:id,code:String(x.rc||x.code),name:x.name,sec:sec,co:0,cat:'',unit:x.unit||'عبوة',pk:pk,pack:'',cost:0,price:0,stock:0,min:0,exp:'',barcode:''}});db.seq.p=db.products.length;
 if(!db.wh.length)db.wh.push({id:nid('wh'),name:'المخزن الرئيسي'});
 db.customers=d.customers.map((x,i)=>({id:i+1,code:String(x.code),name:x.name,phone:x.phone||'',phone2:x.phone2||'',phone3:x.phone3||'',addr:x.addr||'',area:x.addr||'',type:'آجل',balance:0,open:+x.open||0,limit:0}));db.seq.c=db.customers.length;
 db.suppliers=d.suppliers.map((x,i)=>({id:i+1,code:String(x.code),name:x.name,phone:x.phone||'',phone2:x.phone2||'',phone3:x.phone3||'',addr:x.addr||'',map:'',open:+x.open||0}));db.seq.sup=db.suppliers.length;
 try{if(typeof UNITS!=='undefined'&&UNITS.indexOf('عدد')<0)UNITS.push('عدد')}catch(e){}
 recalcAll();try{syncStock()}catch(e){}db.settings.seeded=today();save();GL=null;toast('تم الاستيراد ✅ '+db.products.length+' صنف، '+db.customers.length+' عميل، '+db.suppliers.length+' مورد');location.hash='#/';route()}

// ===== شكل الفاتورة المطبوعة زي النظام القديم (تغيير 9) =====
// النموذج المشترك للشاشة/الطباعة/PDF: صفوف الأصناف + الإجماليات + الأرصدة + التفقيط
const IVDIR=v=>v>0.004?'عليه':v<-0.004?'له':'-';
const IVPOL='مسموح الاستبدال او الاسترجاع فى خلال 14 يوم من تاريخ الفاتورة او اخر فاتورة فقط ما لم يحدث تغيير فى الاسعار';
const IV2=n=>(Math.round((+n||0)*100)/100).toFixed(2);
function invModel(i){const c=i.cid?cust(i.cid):null;let tp=0,tu=0,gross=0;
 const rows=i.items.map((x,n)=>{const s=pkSplit(x);const p=s?s.u+(s.o?' + '+s.o:''):fmt(x.qty);tp+=s?s.u:x.qty;tu+=x.qty;const v=x.qty*x.price;gross+=v;return{n:n+1,name:x.name+(x.free?' 🎁':''),pk:p,qty:fmt(x.qty),price:IV2(x.price),val:IV2(v)}});
 const parts=adjParts(i);let disc=0,add=0;parts.forEach(p=>{if(p[1]<0)disc-=p[1];else add+=p[1]});
 const b=invBal(i),cur=b?b.cur:null,wv=b&&Math.abs(b.cur)>0.004?b.cur:i.total;
 const pr0=db.settings.print||{};const ft=(pr0.footer||'').trim();
 return{i,c,rows,tp,tu,gross,disc,add,net:i.total,b,pay:i.rem>0?'آجل':'نقدي',
  cl:'العميل: '+cname(i.cid)+(c&&(c.addr||c.area)?' - '+(c.addr||c.area):'')+(c&&phones(c)[0]?'  ت: '+phones(c)[0]:''),
  words:amtWords(Math.abs(wv)),top:pr0.top!==undefined?pr0.top:IVTOP,pol:(pr0.pol!==undefined?pr0.pol:(ft||IVPOL)),pc:i.pc||1,
  strip:[['إجمالي',IV2(gross)],['الخصم',IV2(disc)],['الإضافة',IV2(add)],['الصافي',IV2(i.total)],['رصيد سابق',b?IV2(Math.abs(b.prev))+' '+IVDIR(b.prev):'-'],['رصيد حالي',b?IV2(Math.abs(b.cur))+' '+IVDIR(b.cur):'-'],['آخر سداد',b&&b.last?(+b.last.cr)+' جنيه '+b.last.d:'-']]}}
function invDocHtml(i){const m=invModel(i);
 return `<div class="ivp"><div class="ivp-top"><span class="ivp-no">*${i.no}*</span><b class="ivp-t">فاتورة بيع</b><span class="ivp-pc">طباعة: <b id="ivpc">${m.pc}</b></span></div>
 ${m.top?`<div class="ivp-note">${esc(m.top)}</div>`:''}
 <div class="ivp-cl">${esc(cname(i.cid))}${m.c&&(m.c.addr||m.c.area)?`<div class="ivp-ad">${esc(m.c.addr||m.c.area)}</div>`:''}${m.c&&phones(m.c).length?`<div class="ivp-ph">ت: ${phones(m.c).map(esc).join(' - ')}</div>`:''}</div><div class="ivp-row"><span>التاريخ: <b>${esc(i.date)}</b></span><span>السداد: <b>${m.pay}</b></span></div>
 <div class="ivp-rc">${m.rows.map(r=>`<div class="rc-it"><b>${esc(r.name)}</b><div><span>${r.qty} × ${r.price}</span><span>${r.val}</span></div></div>`).join('')}<div class="rc-it rc-tt"><div><span>إجمالي الكميات</span><span>${fmt(m.tp)} / ${fmt(m.tu)}</span></div></div>${m.strip.map(x=>`<div class="rc-ln"><span>${x[0]}</span><b>${esc(x[1])}</b></div>`).join('')}<div class="rc-w">${esc(m.words)}</div></div>
 <div class="ivp-sc"><table class="ivp-tb"><tr><th>م</th><th>اسم الصنف</th><th>الكمية</th><th>إجمالي</th><th>السعر</th><th>القيمة</th></tr>${m.rows.map(r=>`<tr><td>${r.n}</td><td class="nm">${esc(r.name)}</td><td>${r.pk}</td><td>${r.qty}</td><td>${r.price}</td><td>${r.val}</td></tr>`).join('')}<tr class="ivp-tot"><td colspan="2">إجمالي الكميات</td><td>${fmt(m.tp)}</td><td>${fmt(m.tu)}</td><td></td><td></td></tr></table></div>
 <div class="ivp-sc"><table class="ivp-tb ivp-st"><tr>${m.strip.map(s=>`<th>${s[0]}</th>`).join('')}</tr><tr>${m.strip.map(s=>`<td>${esc(s[1])}</td>`).join('')}</tr><tr><td colspan="7" class="ivp-w">${esc(m.words)}</td></tr></table></div>
 <div class="ivp-pol"><b>سياسة الاستبدال او الاسترجاع</b><br>${esc(m.pol)}</div>${i.notes?`<div class="ivp-nt">ملاحظات: ${esc(i.notes)}</div>`:''}<div class="ivp-pg">صفحة 1/1</div></div>`}
function invPrintCount(id){const i=db.invoices.find(x=>x.id==id);if(!i)return;i.pc=(i.pc||0)+1;save();const e=$('#ivpc');if(e)e.textContent=i.pc}
const R_INV9=R['/invoice'];
R['/invoice']=(id,qs)=>{if(id==='new')return R_INV9(id,qs);const i=db.invoices.find(x=>x.id==id);if(!i)return R_INV9(id,qs);
 head('فاتورة #'+i.no,true);const c=i.cid?cust(i.cid):null,ph=c?phones(c)[0]:'';
 return invProfitCard(i)+`<div class="card inv">${invDocHtml(i)}${retBtns('inv',i)}<button class="btn sec noprint" data-need="sales.edit" onclick="editInvoice(${i.id})">✏️ تعديل الفاتورة</button><button class="btn del noprint" data-need="sales.delete" onclick="delInvoice(${i.id})">⛔ إلغاء الفاتورة</button><button class="btn wa noprint" onclick="shareInv(${i.id},'text')">💬 إرسال على واتساب العميل${ph?' ('+esc(ph)+')':''}</button><button class="btn sec noprint" onclick="shareInv(${i.id})">📎 إرسال الفاتورة PDF (اختار العميل في واتساب)</button><div class="row2 noprint"><button class="btn sec" onclick="invPrintCount(${i.id});window.print()">🖨️ طباعة</button><button class="btn sec" onclick="saveInvPdf(${i.id})">⬇️ حفظ PDF</button></div></div>`};
// نفس التخطيط على الكانفاس لملف الـPDF والمشاركة
function invCanvas(i){return new Promise(res=>{const m=invModel(i);const W=900,pad=40,R=W-pad,L=pad;const rh=50;
 const H=170+m.rows.length*rh+rh*2+480;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.direction='rtl';x.textBaseline='middle';x.fillStyle='#fff';x.fillRect(0,0,W,H);
 const t=(s,px,y,f,col,al)=>{x.font=f+' '+FONT;x.fillStyle=col||'#000';x.textAlign=al||'right';x.fillText(s,px,y)};
 const box=(x0,y0,w,h,fill)=>{if(fill){x.fillStyle=fill;x.fillRect(x0,y0,w,h)}x.strokeStyle='#222';x.lineWidth=1.5;x.strokeRect(x0,y0,w,h)};
 let y=50;t('*'+i.no+'*',R,y,'22px');t('فاتورة بيع',W/2,y,'bold 34px','#000','center');t('طباعة: '+m.pc,L,y,'22px','#000','left');
 y+=44;t('يرجاء مراجعة البضاعة المستلمة من المندوب قبل مغادرته',R,y,'bold 18px');
 y+=40;t(m.cl,R,y,'bold 22px');y+=40;t('التاريخ: '+i.date,R,y,'22px');t('السداد: '+m.pay,L+250,y,'22px','#000','right');
 y+=56;const w=W-2*pad;const cols=[['م',0.06],['اسم الصنف',0.40],['الكمية',0.12],['إجمالي',0.14],['السعر',0.14],['القيمة',0.14]];
 const rowD=(cells,hd,tot)=>{let cx=R;cols.forEach((c,k)=>{const cw=w*c[1];box(cx-cw,y-rh/2,cw,rh,hd?'#cfeef2':tot?'#cfeef2':null);t(cells[k],k===1&&!hd&&!tot?cx-10:cx-cw/2,y,(hd||tot?'bold ':'')+'21px','#000',k===1&&!hd&&!tot?'right':'center');cx-=cw});y+=rh};
 rowD(cols.map(c=>c[0]),1);m.rows.forEach(r=>rowD([String(r.n),r.name,r.pk,r.qty,r.price,r.val]));
 rowD(['','إجمالي الكميات',fmt(m.tp),fmt(m.tu),'','']);
 y+=34;const sw=w/7;m.strip.forEach((s,k)=>{const cx=R-sw*k;box(cx-sw,y-rh/2,sw,rh,'#cfeef2');t(s[0],cx-sw/2,y,'bold 17px','#000','center');box(cx-sw,y+rh/2,sw,rh);t(s[1],cx-sw/2,y+rh,'bold 16px','#000','center')});
 y+=rh*1.5+rh/2;box(L,y-rh/2,w,rh,'#fff9d8');t(m.words,W/2,y,'bold 21px','#000','center');
 y+=80;t('سياسة الاستبدال او الاسترجاع',W/2,y,'bold 22px','#000','center');
 const wrap=(s,fs)=>{x.font=fs+' '+FONT;const o=[];let c='';s.split(' ').forEach(q=>{const n=c?c+' '+q:q;if(x.measureText(n).width>W-100&&c){o.push(c);c=q}else c=n});if(c)o.push(c);return o};
 wrap(m.pol,'20px').forEach(s=>{y+=34;t(s,W/2,y,'20px','#000','center')});
 if(i.notes){y+=44;t('ملاحظات: '+i.notes,R,y,'20px','#444')}
 t('صفحة 1/1',W/2,H-30,'18px','#444','center');res(cv)})}

// ===== ملاحظات إلزامية (تغيير 19) =====
// المدير يكتب ملاحظة لكل المستخدمين أو لمستخدم محدد. أول ما يفتح البرنامج بيظهرله قدام كل حاجة ومينفعش يدخل غير لما يضغط "استلمت".
// المدير يشوف مين استلم ومين لسه. (الداتا على نفس الجهاز: ربط الأجهزة ببعض مرحلة السيرفر)
const mnList=()=>(db.mnotes=db.mnotes||[]);
const mnHas=(n,id)=>n.to==='all'||(Array.isArray(n.to)?n.to.includes(id):n.to==id);
const mnLive=n=>n.active!==false&&!(n.exp&&n.exp<=Date.now());
const mnTo=n=>db.users.filter(u=>u.active!==false&&u.id!=n.by&&mnHas(n,u.id));
const mnPending=u=>mnList().filter(n=>mnLive(n)&&n.by!=u.id&&mnHas(n,u.id)&&!(n.acks||{})[u.id]);
function mnGate(){const u=typeof me==='function'?me():null;let ov=document.getElementById('mnov');
 if(!u||document.body.classList.contains('authb')||!db.users){if(ov)ov.remove();return}
 const pend=mnPending(u);if(!pend.length){if(ov)ov.remove();return}
 const n=pend[0],by=db.users.find(x=>x.id==n.by);
 if(!ov){ov=document.createElement('div');ov.id='mnov';document.body.appendChild(ov)}
 ov.setAttribute('style','position:fixed;inset:0;z-index:99999;background:rgba(10,20,40,.92);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl');
 ov.innerHTML=`<div style="background:var(--card,#fff);color:var(--ink,#171d25);border-radius:18px;max-width:440px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:mnin .35s ease"><div style="font-size:34px;text-align:center">📌</div><h2 style="text-align:center;margin:6px 0">ملاحظة من الإدارة</h2><div style="font-size:12px;color:var(--mut);text-align:center">${esc(by?by.name:'الإدارة')} · ${esc(new Date(n.ts).toLocaleString('ar-EG'))}${pend.length>1?' · متبقي '+(pend.length-1)+' بعدها':''}</div><div style="margin:14px 0;padding:14px;background:rgba(127,127,127,.12);border-radius:12px;font-size:16px;line-height:1.9;white-space:pre-wrap">${esc(n.text)}</div><button class="btn" style="margin:0" onclick="mnAck(${n.id})">✅ استلمت</button></div><style>@keyframes mnin{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}</style>`}
function mnAck(id){const u=me(),n=mnList().find(x=>x.id==id);if(!n||!u)return;n.acks=n.acks||{};n.acks[u.id]=Date.now();save();mnGate()}
window.addEventListener('load',()=>{const _rt=route;route=function(){const r=_rt.apply(this,arguments);try{mnGate()}catch(e){}return r};try{mnGate()}catch(e){};setInterval(()=>{try{mnGate()}catch(e){}},15000)});
/* ===== إدارة الملاحظات الإلزامية (تغيير 34): توجيه لكل المستخدمين أو أكتر من شخص، مدة (لحد ما تتشال / تنتهي بعد وقت / تاريخ محدد)، تعديل، إيقاف، إعادة إظهار، مسح ===== */
let MNF={id:0,to:['all'],txt:'',dur:'none',dt:''},MNT='act';
const mnDurTxt=n=>!n.exp?'مفتوحة لحد ما تتشال':(n.exp<=Date.now()?'انتهت ':'تنتهي ')+new Date(n.exp).toLocaleString('ar-EG');
const mnWho=n=>n.to==='all'?'كل المستخدمين':(Array.isArray(n.to)?n.to:[n.to]).map(i=>((db.users.find(u=>u.id==i)||{}).name||'—')).join('، ');
const mnSt=n=>n.active===false?['متوقفة','off']:(n.exp&&n.exp<=Date.now()?['منتهية','off']:['شغالة','on']);
function mnRead(){const sel=[...document.querySelectorAll('.mn_u:checked')].map(x=>+x.value),all=$('#mn_all').checked;
 MNF.to=all?['all']:sel;MNF.txt=$('#mn_t').value;MNF.dur=$('#mn_d').value;MNF.dt=($('#mn_dt')||{}).value||''}
function mnExp(){const d=MNF.dur,H=36e5,n=Date.now();if(d==='none')return 0;if(d==='custom'){const t=MNF.dt?new Date(MNF.dt).getTime():0;return t>n?t:-1}return n+({h1:H,d1:24*H,d3:72*H,w1:168*H})[d]}
function mnSend(){if(!can('users.manage'))return toast('للمدير بس');mnRead();const t=(MNF.txt||'').trim();if(!t)return toast('اكتب الملاحظة');
 const ex=mnExp();if(ex<0)return toast('اختار تاريخ ووقت انتهاء في المستقبل');if(!MNF.to.length)return toast('اختار مستخدم واحد على الأقل أو كل المستخدمين');const to=MNF.to.includes('all')?'all':MNF.to;
 if(MNF.id){const n=mnList().find(x=>x.id==MNF.id);if(n){const ch=n.text!==t;n.text=t;n.to=to;n.exp=ex;n.ed=Date.now();if(ch)n.acks={}}}
 else{db.seq=db.seq||{};db.seq.mn=(db.seq.mn||0)+1;mnList().push({id:db.seq.mn,to,text:t,by:me().id,ts:Date.now(),exp:ex,active:true,acks:{}})}
 const ed=MNF.id;MNF={id:0,to:['all'],txt:'',dur:'none',dt:''};save();toast(ed?'اتعدلت ✅ (لو اتغير النص هتظهر لهم تاني)':'اتبعتت ✅ هتظهر لهم أول ما يفتحوا البرنامج');route()}
function mnEdit(id){const n=mnList().find(x=>x.id==id);if(!n)return;MNF={id:n.id,to:n.to==='all'?['all']:(Array.isArray(n.to)?n.to:[n.to]),txt:n.text,dur:n.exp?'custom':'none',dt:n.exp?new Date(n.exp-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):''};route();window.scrollTo(0,0)}
function mnCancel(){MNF={id:0,to:['all'],txt:'',dur:'none',dt:''};route()}
function mnTog(id){const n=mnList().find(x=>x.id==id);if(!n)return;n.active=n.active===false;save();route()}
function mnRe(id){const n=mnList().find(x=>x.id==id);if(!n||!confirm('تظهر للكل تاني (هيتمسح تأكيد الاستلام)؟'))return;n.acks={};n.active=true;if(n.exp&&n.exp<=Date.now())n.exp=0;save();route()}
function mnDel(id){if(!can('users.manage'))return;if(!confirm('تمسح الملاحظة؟'))return;db.mnotes=mnList().filter(n=>n.id!=id);save();route()}
function mnTab(k){MNT=k;route()}
R['/mnotes']=()=>{head('ملاحظات إلزامية',true);const us=db.users.filter(u=>u.active!==false&&u.id!=me().id),all=MNF.to.includes('all');
 const L=[...mnList()].reverse(),cnt={act:L.filter(mnLive).length,off:L.filter(n=>!mnLive(n)).length,all:L.length};
 const rows=L.filter(n=>MNT==='all'||(MNT==='act')===mnLive(n)).map(n=>{const to=mnTo(n),got=to.filter(u=>(n.acks||{})[u.id]),st=mnSt(n);
  return `<div class="card" style="margin:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>إلى: ${esc(mnWho(n))}</b><span class="pill ${st[1]==='on'?'':'bad'}">${st[0]}</span></div>
  <div style="font-size:12px;color:var(--mut);margin-top:2px">${esc(new Date(n.ts).toLocaleString('ar-EG'))} · ⏱ ${esc(mnDurTxt(n))}${n.ed?' · اتعدلت':''}</div><div style="margin:8px 0;white-space:pre-wrap">${esc(n.text)}</div>
  <div style="font-size:13px;margin-bottom:6px"><b>${got.length}/${to.length}</b> استلموا</div>${to.map(u=>{const a=(n.acks||{})[u.id];return `<div class="stat"><span>${esc(u.name)}</span><b class="${a?'':'neg'}">${a?'✅ '+esc(new Date(a).toLocaleString('ar-EG')):'⏳ لسه'}</b></div>`}).join('')||'<div class="empty">مفيش مستلمين</div>'}
  <div class="row2 noprint" style="margin-top:8px"><button class="btn sec" style="margin:0" onclick="mnEdit(${n.id})">✏️ تعديل</button><button class="btn sec" style="margin:0" onclick="mnTog(${n.id})">${n.active===false?'▶️ تفعيل':'⏸ إيقاف'}</button></div>
  <div class="row2 noprint" style="margin-top:6px"><button class="btn sec" style="margin:0" onclick="mnRe(${n.id})">🔁 إظهار تاني للكل</button><button class="btn del" style="margin:0" onclick="mnDel(${n.id})">🗑 مسح</button></div></div>`}).join('');
 return `<div class="card"><h2>${MNF.id?'✏️ تعديل ملاحظة':'📌 ملاحظة جديدة'}</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">بتظهر للمستخدم بملء الشاشة ومينفعش يكمل غير لما يضغط "استلمت".</div>
 <label>إلى</label><label class="chk"><input type="checkbox" id="mn_all" ${all?'checked':''} onchange="mnRead();route()"> كل المستخدمين</label>${all?'':`<div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0">${us.map(u=>`<label class="chk" style="margin:0"><input type="checkbox" class="mn_u" value="${u.id}" ${MNF.to.includes(u.id)?'checked':''} onchange="mnRead()"> ${esc(u.name)}</label>`).join('')}</div>`}
 <label>المدة</label><select id="mn_d" onchange="mnRead();route()">${[['none','لحد ما أشيلها'],['h1','تنتهي بعد ساعة'],['d1','تنتهي بعد يوم'],['d3','تنتهي بعد 3 أيام'],['w1','تنتهي بعد أسبوع'],['custom','تاريخ ووقت محدد']].map(([k,n])=>`<option value="${k}" ${MNF.dur===k?'selected':''}>${n}</option>`).join('')}</select>${MNF.dur==='custom'?`<input type="datetime-local" id="mn_dt" value="${esc(MNF.dt)}" oninput="MNF.dt=this.value" style="margin-top:6px">`:''}
 <label>الملاحظة</label><textarea id="mn_t" rows="4" placeholder="اكتب الملاحظة هنا" oninput="MNF.txt=this.value">${esc(MNF.txt)}</textarea>
 <div class="row2"><button class="btn" style="margin:0" onclick="mnSend()">${MNF.id?'💾 حفظ التعديل':'📤 إرسال'}</button>${MNF.id?'<button class="btn sec" style="margin:0" onclick="mnCancel()">إلغاء</button>':''}</div></div>
 <div class="seg noprint" style="margin:10px 0">${[['act','شغالة ('+cnt.act+')'],['off','منتهية / متوقفة ('+cnt.off+')'],['all','الكل ('+cnt.all+')']].map(([k,n])=>`<button class="${MNT===k?'on':''}" onclick="mnTab('${k}')">${n}</button>`).join('')}</div>${rows||'<div class="empty">مفيش ملاحظات هنا</div>'}`};
try{ROUTE_PERM['/mnotes']=['users.manage']}catch(e){}

// ===== تحديد موقع العميل + قفل الموقع (تغيير 20) =====
// خيارين مستقلين في الإعدادات: (1) إجبار المندوب يحدد موقع العميل الجديد على الخريطة (lat/lon)، (2) المندوب لازم يكون جوه نطاق موقع العميل عشان يفتح كشفه أو يعمل له فاتورة. المدير مستثنى.
const geoMgr=()=>can('users.manage');
const geoSet=k=>!!(db.settings||{})[k];
const geoR=()=>+((db.settings||{}).geoR)||150;
const GP={lat:0,lon:0};
const GOK={};
function geoDist(a,b,c,d){const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(h)))}
function geoNow(){return new Promise((ok,no)=>{if(!navigator.geolocation)return no('المتصفح مش بيدعم تحديد الموقع');navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}),e=>no(e.code===1?'لازم تسمح للبرنامج بالوصول للموقع (GPS)':'مقدرناش نحدد موقعك، جرب تاني'),{enableHighAccuracy:true,timeout:15000,maximumAge:0})})}
// فحص: هل المستخدم جوه نطاق العميل؟ بيرجع {ok,msg}
async function geoCheck(cid){if(!geoSet('geoFence')||geoMgr())return{ok:true};const c=cust(cid);if(!c)return{ok:true};
 if(GOK[cid]&&Date.now()-GOK[cid]<300000)return{ok:true};
 if(!c.lat||!c.lon)return{ok:false,msg:'العميل ده ملوش موقع متسجل على الخريطة. حدد موقعه الأول.',nopos:true};
 try{const p=await geoNow(),d=geoDist(p.lat,p.lon,c.lat,c.lon);if(d<=geoR()){GOK[cid]=Date.now();return{ok:true}}return{ok:false,msg:'انت بعيد عن العميل حوالي '+d+' متر. لازم تكون جوه '+geoR()+' متر من موقعه.'}}catch(e){return{ok:false,msg:String(e)}}}
async function geoGate(cid,cont){const r=await geoCheck(cid);if(r.ok)return cont();toast('🔒 '+r.msg)}
// الفاتورة: القفل وقت اختيار العميل وقبل الحفظ
{const _pc=pickC;pickC=function(id){if(!id||!geoSet('geoFence')||geoMgr())return _pc(id);geoGate(id,()=>_pc(id))};
 const _si=saveInvoice;saveInvoice=function(){const id=draft.cid;if(!id||!geoSet('geoFence')||geoMgr()||(GOK[id]&&Date.now()-GOK[id]<300000))return _si.apply(this,arguments);geoGate(id,()=>_si())}}
// تسجيل موقع العميل (من فورم العميل)
async function geoPin(cid){const st=$('#gp_st');if(st)st.textContent='⏳ بنحدد موقعك...';try{const p=await geoNow();GP.lat=p.lat;GP.lon=p.lon;GP.cid=cid;if(st)st.innerHTML='✅ اتحدد: '+p.lat.toFixed(5)+', '+p.lon.toFixed(5)+' (دقة ~'+Math.round(p.acc)+' م) · <a target="_blank" rel="noopener" href="https://www.google.com/maps?q='+p.lat+','+p.lon+'">افتح الخريطة</a>';
  if(cid!=='new'){const c=cust(cid);if(c&&(can('customers.edit')||geoMgr())){c.lat=p.lat;c.lon=p.lon;save();toast('اتسجل موقع العميل ✅')}}}catch(e){if(st)st.textContent='⚠️ '+e}}
window.addEventListener('load',()=>{const _rc=R['/customer'];R['/customer']=(id,qs)=>{
  if(id!=='new'&&geoSet('geoFence')&&!geoMgr()){const c=cust(id);if(c&&!(GOK[id]&&Date.now()-GOK[id]<300000)){
    if(!(GCS[id]&&GCS[id].t>Date.now()-4000)){GCS[id]={t:Date.now(),p:1};geoCheck(id).then(r=>{if(r.ok){GCS[id]=null;route()}else{GCS[id]={t:Date.now(),m:r.msg,np:r.nopos};route()}})}
    const s=GCS[id]||{};head('بيانات العميل',true);
    return `<div class="card" style="text-align:center"><div style="font-size:34px">🔒</div><h2>كشف العميل مقفول بالموقع</h2>${s.m?`<div style="margin:10px 0;font-size:15px">${esc(s.m)}</div><button class="btn" onclick="GCS[${+id}]=null;route()">🔄 جرّب تاني</button>${s.np&&(can('customers.edit'))?`<button class="btn sec" onclick="geoPin(${+id}).then(()=>route())">📌 سجّل موقع العميل دلوقتي</button>`:''}`:'<div style="margin:10px 0">⏳ بنتحقق من موقعك...</div>'}</div>`}}
  let h=_rc(id,qs);
  if(id==='new'||can('customers.edit')||geoMgr()){const c=id==='new'?{}:(cust(id)||{});if(id==='new'||GP.cid!==id){GP.lat=c.lat||0;GP.lon=c.lon||0;GP.cid=id}
   const card=`<div class="card"><h2>📌 موقع العميل على الخريطة</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">${geoSet('geoPin')&&!geoMgr()?'<b>إجباري:</b> ':''}وقّف عند العميل واضغط الزرار وهيتسجل موقعه بالظبط.</div><button class="btn sec" style="margin-top:0" onclick="geoPin('${id}')">📍 حدد موقعي الحالي كموقع العميل</button><div id="gp_st" style="margin-top:8px;font-size:13px">${c.lat?'✅ متسجل: '+(+c.lat).toFixed(5)+', '+(+c.lon).toFixed(5)+' · <a target="_blank" rel="noopener" href="https://www.google.com/maps?q='+c.lat+','+c.lon+'">افتح الخريطة</a>':'لسه ما اتحددش'}</div></div>`;
   const k='<button class="btn" data-need="'+(id==='new'?'customers.add':'customers.edit')+'"';const ix=h.indexOf(k);h=ix>=0?h.slice(0,ix)+card+h.slice(ix):h+card}
  return h};try{if(/#\/customer\//.test(location.hash))route()}catch(e){}});
const GCS={};
{const _sc=saveCustomer;saveCustomer=function(id){if(id==='new'&&geoSet('geoPin')&&!geoMgr()&&!(GP.lat&&GP.lon&&GP.cid==='new'))return toast('📌 لازم تحدد موقع العميل على الخريطة قبل الحفظ');
  const n0=db.customers.length;_sc(id);const cc=id==='new'?(db.customers.length>n0?db.customers[db.customers.length-1]:null):cust(id);if(cc&&GP.lat&&GP.lon&&GP.cid===id){cc.lat=GP.lat;cc.lon=GP.lon;save()}if(id==='new')GP.cid=null}}
// كارت الإعدادات: مفتاحين مستقلين (للمدير)
{const _rs=R['/settings'];R['/settings']=()=>_rs()+(can('users.manage')?`<div class="card"><h2>📍 قفل الموقع</h2><label class="chk" style="display:flex;gap:10px;align-items:center;margin:8px 0"><input type="checkbox" style="width:auto" ${geoSet('geoPin')?'checked':''} onchange="db.settings.geoPin=this.checked;save();toast(this.checked?'اتفعّل: المندوب لازم يحدد موقع العميل الجديد':'اتقفل')"> إجبار المندوب يحدد موقع العميل الجديد على الخريطة</label><label class="chk" style="display:flex;gap:10px;align-items:center;margin:8px 0"><input type="checkbox" style="width:auto" ${geoSet('geoFence')?'checked':''} onchange="db.settings.geoFence=this.checked;save();toast(this.checked?'اتفعّل: المندوب لازم يكون عند العميل':'اتقفل')"> المندوب لازم يكون عند موقع العميل عشان يفتح كشفه أو يعمل له فاتورة</label><label>النطاق المسموح (متر)</label><input type="number" inputmode="numeric" value="${geoR()}" onchange="db.settings.geoR=Math.max(30,+this.value||150);save()"><div style="font-size:12px;color:var(--mut);margin-top:6px">المدير مستثنى من القفل. المتصفح هيطلب إذن الموقع من المندوب.</div></div>`:'')}

/* ===== طباعة آمنة: تثبيت الصفحة قبل فتح المعاينة (يمنع تعليق "تحميل المعاينة" في بعض متصفحات ويندوز) ===== */
{const _np=window.print.bind(window);let busy=false;
 window.print=function(){if(busy)return;busy=true;const d=document.documentElement;d.classList.add('printing');
  const go=()=>{try{if(window.applyPaper)applyPaper()}catch(e){}try{_np()}catch(e){}setTimeout(()=>{d.classList.remove('printing');busy=false},400)};
  const fr=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve();
  fr.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(go,120))))};
 addEventListener('afterprint',()=>{document.documentElement.classList.remove('printing');busy=false})}

/* ===== مقاسات الورق (A4 / A5 / رول حراري 80 أو 58) + الطباعة أبيض وأسود ===== */
const PAPERS={A4:['A4','A4','8mm'],A5:['A5','A5','6mm'],r80:['رول 80 مم','80mm','2mm'],r58:['رول 58 مم','58mm','1.5mm']};
let PPO=null;
function curPaper(){const p=PPO||((db.settings.print||{}).paper)||'A4';return PAPERS[p]?p:'A4'}
function rollH(){const el=document.querySelector('#app .out');if(!el)return 297;const ln=el.innerText.split('\n').filter(x=>x.trim()).length;return Math.max(90,Math.min(1500,Math.round(ln*5.2*(curPaper()==='r58'?1.6:1.25)+35)))}
function applyPaper(){const p=curPaper(),d=PAPERS[p];let st=$('#pgst');if(!st){st=document.createElement('style');st.id='pgst';document.head.appendChild(st)}
 st.textContent='@page{size:'+(p[0]==='r'?d[1]+' '+rollH()+'mm':d[1])+';margin:'+d[2]+'}@page pl{size:'+(p==='A5'?'A5':'A4')+';margin:0}';const h=document.documentElement;Object.keys(PAPERS).forEach(k=>h.classList.toggle('pp-'+k,k===p))}
function setPaperNow(v){PPO=v;applyPaper();document.querySelectorAll('.ppsel').forEach(e=>e.value=v)}
{const _as=applySettings;applySettings=function(){_as();try{PPO=null;applyPaper()}catch(e){}}}
{const _oaP=outAuto;outAuto=function(){_oaP();try{document.querySelectorAll('#app .obar').forEach(b=>{if(b.querySelector('.ppsel'))return;
 const sel=document.createElement('select');sel.className='ppsel';sel.title='حجم الورق';sel.innerHTML=Object.keys(PAPERS).map(k=>`<option value="${k}">📄 ${PAPERS[k][0]}</option>`).join('');sel.value=curPaper();sel.onchange=()=>setPaperNow(sel.value);b.appendChild(sel)});applyPaper()}catch(e){}}}
try{applyPaper()}catch(e){}

/* ===== تغيير 28: إشعارات نشاط السيستم للمدير بس (بانر من فوق زي الواتساب) =====
   كل حدث (فاتورة جديدة، تسجيل دخول، وصول مندوب لموقع عميل، أي عملية متسجلة) بيتسجل في db.notes،
   والمدير بيشوف بانر فوق أي صفحة. على نفس الجهاز بيشتغل فورًا؛ بين الأجهزة بيشتغل لحظيًا أول ما السيرفر يتوصل (db.notes بتتزامن). */
function evt(txt){try{notify(txt);save()}catch(e){}}
{const _si=saveInvoice;saveInvoice=function(){const n=db.invoices.length;const r=_si.apply(this,arguments);setTimeout(()=>{try{if(db.invoices.length>n){const i=db.invoices[db.invoices.length-1],c=i.cid?cust(i.cid):null;evt('🧾 فاتورة جديدة '+(i.no||'')+(c?' - '+c.name:''))}}catch(e){}},80);return r}}
{const _gc=geoCheck,seen={};geoCheck=async function(cid){const r=await _gc.apply(this,arguments);try{if(r&&r.ok&&geoSet('geoFence')&&!geoMgr()&&!(seen[cid]>Date.now()-6e5)){seen[cid]=Date.now();const c=cust(cid);evt('📍 وصل لموقع العميل '+(c?c.name:''))}}catch(e){}return r}}
const evMuted=()=>localStorage.getItem('kt_evmute')==='1';
function evBanner(n){let h=$('#evBn');if(!h){h=document.createElement('div');h.id='evBn';h.className='noprint';document.body.appendChild(h)}
 const u=db.users.find(x=>x.id==n.by),el=document.createElement('div');el.className='evb';
 el.innerHTML=`<div class="eva">${esc(((u&&u.name)||'؟').slice(0,1))}</div><div class="evt"><b>${esc((u&&u.name)||'النظام')}</b><span>${esc(n.txt)}</span></div><button class="evx" aria-label="كتم">🔕</button>`;
 el.onclick=e=>{if(e.target.classList.contains('evx')){localStorage.setItem('kt_evmute','1');el.remove();toast('اتكتمت إشعارات النشاط على الجهاز ده (تقدر تشوفها من إشعارات المدير)');return}el.remove();location.hash='#/notifs'};
 h.appendChild(el);while(h.children.length>3)h.firstChild.remove();setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),350)},5500)}
function evPoll(){try{if(!db||!db.me||!can('users.manage')||document.hidden)return;const u=db.users.find(x=>x.id==db.me);if(!u)return;
 if(!u.evSeen){u.evSeen=Date.now();return}
 const nw=(db.notes||[]).filter(n=>n.ts>u.evSeen&&n.by!=db.me);if(!nw.length)return;u.evSeen=Math.max(...nw.map(n=>n.ts));save();
 if(evMuted())return;if(nw.length>3){evBanner({by:0,txt:'🔔 '+nw.length+' نشاط جديد في السيستم'})}else nw.forEach(evBanner)}catch(e){}}
window.addEventListener('load',()=>setInterval(evPoll,3000));

const IVTOP='يرجاء مراجعة البضاعة المستلمة من المندوب قبل مغادرته';

/* ===== تغيير 32/33: التاريخ قابل للتعديل في كل مستند (فاتورة، تحصيل، دفعة مورد، مصروف، حركة خزينة، مستندات المخزن، صرف عمولة) =====
   كل نموذج بيتحط فيه حقل "التاريخ" (الافتراضي النهاردة). وقت الحفظ بنثبّت التاريخ المختار لحد ما العملية تخلص،
   فيتسجل المستند بتاريخه الحقيقي (فاتورة قديمة نسيها أو فلوس اتقبضت قبل كده). السندات وفواتير البيع ليها حقل تاريخ أصلاً. */
let DOCDT='';
const DT_FORMS=[['pay_a','addPay'],['sp_a','addSupPay'],['cx_a','addCx'],['x_a','addExp'],['rp_a','payRep'],['py_a','addPay2']];
function withDate(fn,id){return function(){const e=id&&document.querySelector('#ktdt_'+id),v=e&&e.value;
 if(!v||!/^\d{4}-\d\d-\d\d$/.test(v))return fn.apply(this,arguments);window.__TD=v;try{return fn.apply(this,arguments)}finally{window.__TD=''}}}
DT_FORMS.forEach(([id,f])=>{if(typeof window[f]==='function'){const o=window[f];window[f]=withDate(o,id)}});
{const o=docSave;docSave=function(){const v=DOCDT;if(!v)return o.apply(this,arguments);window.__TD=v;try{return o.apply(this,arguments)}finally{window.__TD='';DOCDT=''}}}
{const _oaD=outAuto;outAuto=function(){_oaD();try{const A=$('#app');if(!A)return;
 DT_FORMS.forEach(([id])=>{const inp=A.querySelector('#'+id);if(!inp||A.querySelector('#ktdt_'+id)||(id==='x_a'&&A.querySelector('#x_d')))return;
  const w=document.createElement('div');w.className='ktdtw noprint';w.innerHTML=`<label>📅 التاريخ (غيّره لو المستند قديم)</label><input type="date" id="ktdt_${id}" value="${today()}">`;
  const row=inp.closest('.row2')||inp;row.parentElement.insertBefore(w,row)});
 if(/^#\/doc\//.test(location.hash)&&!A.querySelector('#ktdt_doc')){const w=document.createElement('div');w.className='card noprint ktdtw';w.innerHTML=`<label>📅 تاريخ المستند (غيّره لو المستند قديم)</label><input type="date" id="ktdt_doc" value="${DOCDT||today()}" oninput="DOCDT=this.value">`;A.insertBefore(w,A.children[1]||null)}
 }catch(e){}}}

/* ===== تغيير 21: أقسام الرئيسية قابلة للطي (سهم) وحالة كل مستخدم بتتحفظ على حسابه =====
   كل قسم (اختصارات سريعة، مؤشرات الأداء، الحركة المالية، آخر العمليات…) ليه سهم يقفله ويفتحه لوحده. */
function hkState(){const u=db.users.find(x=>x.id==db.me);if(!u)return{};if(!u.hc)u.hc={};return u.hc}
function hkApply(blk,head,on){blk.classList.toggle('hk-c',on);if(head.classList.contains('hk-bar')){head.classList.toggle('hk-c',on);blk.classList.toggle('hk-hid',on);return}for(let n=head;n&&n!==blk;n=n.parentElement)[...n.parentElement.children].forEach(x=>{if(x!==n)x.classList.toggle('hk-hid',on)})}
function hkToggle(k,blk,head){const st=hkState();if(st[k])delete st[k];else st[k]=1;hkApply(blk,head,!!st[k]);save()}
function hkTitle(h){return(h.dataset.hk||h.innerText||'').replace(/[▾▸\s]+/g,' ').trim().slice(0,40)}
{const _oaH=outAuto;outAuto=function(){_oaH();try{if(!/^#?\/?$/.test(location.hash.split('?')[0]))return;const A=$('#app');if(!A||!db.me)return;
 const st=hkState();[...A.children].forEach(c=>{if(c.dataset.hkd||c.tagName==='BUTTON'||c.tagName==='SCRIPT'||c.id==='demoBn'||c.classList.contains('noprint')&&!c.classList.contains('dw'))return;
  let blk=c,head=null;
  if(c.classList.contains('dw')){const f=c.firstElementChild;if(!f)return;if(f.classList.contains('dgreet'))return;
   if(f.classList.contains('dsec'))head=f;else if(c.children.length===1)blk=f}
  if(blk.classList.contains('dgreet'))return;
  if(!head)head=blk.querySelector('h2,h3,.dsec');
  if(head&&head.closest('.hk-blk')&&head.closest('.hk-blk')!==blk)head=null;
  if(!head){const nm=blk.dataset.hk||(blk.classList.contains('dq')?'اختصارات سريعة':blk.classList.contains('dhero')?'مبيعات اليوم':blk.classList.contains('dcnt')?'الأعداد':'');
   if(!nm||!blk.parentElement||!blk.parentElement.classList.contains('dw'))return;head=document.createElement('div');head.className='hk-bar';head.dataset.hk=nm;head.textContent=nm;blk.parentElement.insertBefore(head,blk)}
  const k=hkTitle(head);if(!k)return;c.dataset.hkd=1;head.classList.add('hk-head');blk.classList.add('hk-blk');
  const ar=document.createElement('button');ar.type='button';ar.className='hk-ar noprint';ar.setAttribute('aria-label','طي / فتح');ar.textContent='⌄';head.appendChild(ar);
  head.onclick=e=>{if(e.target.closest('a,input,select'))return;hkToggle(k,blk,head)};hkApply(blk,head,!!st[k])})}catch(e){console.warn(e)}}}

/* ===== تحديث لايف للرئيسية (تغيير 36): أي حفظ في البيانات يعيد رسم الرئيسية فورًا بدون ريفريش ===== */
(function(){const SI=Storage.prototype.setItem;let tm=0,busy=false;
 function liveHome(){tm=0;if(busy)return;const h=location.hash.slice(1)||'/';if(h.split('?')[0]!=='/'&&h!=='')return;
  const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;
  if(document.getElementById('mnov')||document.querySelector('.modal,.ov,.dlg'))return;
  busy=true;try{const y=window.scrollY;route();window.scrollTo(0,y)}finally{busy=false}}
 const poke=()=>{if(!tm)tm=setTimeout(liveHome,120)};
 Storage.prototype.setItem=function(k,v){SI.apply(this,arguments);if(k==='kt_db')poke()};
 try{if(typeof store!=='undefined'&&store.save&&!store.__lv){const o=store.save.bind(store);store.save=function(){const r=o.apply(null,arguments);poke();return r};store.__lv=1}}catch(e){}
 /* احتياطي: التحديث الدوري الخفيف لو في تغيير جه من مصدر تاني (مثلا مزامنة السيرفر بعدين) */
 window.ktLive=liveHome})();

/* ===== تغيير 37: إيقاف البيع (لكل المستخدمين / مستخدم / منتج / مجموعة) ===== */
function SS(){const s=db.sellStop=db.sellStop||{};s.users=s.users||[];s.prods=s.prods||[];s.secs=s.secs||[];s.all=!!s.all;s.msg=s.msg||'';return s}
function ssUserOff(){const s=SS();if(can('users.manage'))return false;return s.all||s.users.includes(+db.me)}
function ssProdOff(p){if(!p)return false;const s=SS();return s.prods.includes(p.id)||(!!p.sec&&s.secs.includes(p.sec))}
function ssCount(){const s=SS();return (s.all?1:0)+s.users.length+s.prods.length+s.secs.length}
function ssMsg(){return SS().msg||'البيع موقوف حاليًا'}
(function(){
 if(typeof pickP==='function'){const _p=pickP;pickP=function(k,v){const p=prod(v);if(p&&ssProdOff(p)){toast('🚫 '+p.name+': البيع موقوف للصنف ده');if(draft&&draft.lines&&draft.lines[k]&&draft.lines[k].pid===undefined){}return}return _p.apply(this,arguments)}}
 if(typeof saveInvoice==='function'){const _s=saveInvoice;saveInvoice=function(){if(ssUserOff())return toast('🚫 '+ssMsg());const bad=(draft.lines||[]).filter(l=>l.pid&&ssProdOff(prod(l.pid)));if(bad.length)return toast('🚫 صنف موقوف بيعه: '+prod(bad[0].pid).name);return _s.apply(this,arguments)}}
 const _r=R['/invoice'];R['/invoice']=function(id,qs){if(id==='new'&&ssUserOff()){head('فاتورة جديدة',true);return `<div class="card"><h2>🚫 البيع موقوف</h2><div class="alert credit">${esc(ssMsg())}</div><div style="color:var(--mut);font-size:13px">لو محتاج تبيع كلّم المدير.</div></div>`}return _r.apply(this,arguments)};
})();
let SSQ='';
function ssTog(k,v,on){const s=SS(),a=s[k];const i=a.indexOf(v);if(on&&i<0)a.push(v);if(!on&&i>=0)a.splice(i,1);save();route()}
function ssAll(on){SS().all=on;save();route()}
function ssSearch(q){SSQ=q;const s=SS(),L=q?db.products.filter(p=>!s.prods.includes(p.id)&&(p.name.includes(q)||String(p.code||'').includes(q))).slice(0,8):[];const d=$('#ss_res');if(d)d.innerHTML=L.map(p=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;gap:8px"><span>${esc(p.name)}</span><button class="btn sec" style="margin:0;width:auto;padding:4px 12px" onclick="ssTog('prods',${p.id},true)">🚫 إيقاف</button></div>`).join('')||(q?'<div class="empty">مفيش نتيجة</div>':'')}
R['/sellstop']=()=>{head('إيقاف البيع',true);if(!can('users.manage'))return '<div class="card">للمدير بس</div>';const s=SS(),us=db.users.filter(u=>u.active!==false&&!(u.id==me().id));
 const ck=(k,v,t)=>`<label class="chk" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" ${s[k].includes(v)?'checked':''} onchange="ssTog('${k}',${v},this.checked)"> ${esc(t)}</label>`;
 return `<div class="card"><h2>🛑 إيقاف البيع</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">المدير مش متأثر بإيقاف المستخدمين. الإيقاف بيسري فورًا وبيفضل لحد ما تشيله.</div>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" style="width:auto" ${s.all?'checked':''} onchange="ssAll(this.checked)"> <b>إيقاف البيع عن كل المستخدمين</b></label>
 <label>رسالة تظهر للمستخدم (اختياري)</label><input value="${esc(s.msg)}" placeholder="مثلا: الجرد شغال، البيع موقوف" onchange="SS().msg=this.value;save();toast('اتحفظت')"></div>
 <div class="card"><h2>👤 إيقاف مستخدم معين</h2>${us.map(u=>ck('users',u.id,u.name)).join('')||'<div class="empty">مفيش مستخدمين</div>'}</div>
 <div class="card"><h2>🗂 إيقاف مجموعة منتجات</h2>${db.sections.map(x=>ck('secs',x.id,x.name+' ('+db.products.filter(p=>p.sec===x.id).length+' صنف)')).join('')||'<div class="empty">مفيش مجموعات</div>'}</div>
 <div class="card"><h2>📦 إيقاف منتج معين</h2><input placeholder="🔍 ابحث باسم الصنف أو الكود" oninput="ssSearch(this.value)"><div id="ss_res"></div>
 <h3 style="margin:12px 0 4px;font-size:14px">الأصناف الموقوفة (${s.prods.length})</h3>${s.prods.map(id=>{const p=prod(id);return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd)"><span>${esc(p?p.name:'#'+id)}</span><button class="btn sec" style="margin:0;width:auto;padding:4px 12px" onclick="ssTog('prods',${id},false)">✖ شيل الإيقاف</button></div>`}).join('')||'<div class="empty">مفيش</div>'}</div>`};
{const _rs=R['/settings'];R['/settings']=()=>_rs()+(can('users.manage')?`<div class="card"><h2>🛑 إيقاف البيع</h2><div style="font-size:13px;color:var(--mut)">${ssCount()?'فيه '+ssCount()+' إيقاف شغال':'مفيش إيقاف شغال'}</div><button class="btn sec" onclick="location.hash='#/sellstop'">إدارة الإيقاف</button></div>`:'')}

/* ===== نبضة الحضور كل 15 ثانية + تحديث المؤشرات في مكانها (تغيير 39) ===== */
(function(){const tick=()=>{try{if(db&&db.me&&!document.hidden)prBeat(false);prPaint()}catch(e){}};
 window.addEventListener('load',()=>{tick();setInterval(tick,15000)});
 document.addEventListener('visibilitychange',()=>{try{if(!document.hidden){prBeat(false);prPaint()}}catch(e){}});
 window.addEventListener('pagehide',()=>{try{prBeat(true)}catch(e){}});
 window.addEventListener('storage',e=>{if(e.key==='kt_pres')try{prPaint()}catch(x){}});
 if(typeof logout==='function'){const _l=logout;logout=function(){try{prBeat(true)}catch(e){}return _l.apply(this,arguments)}}
 if(typeof route==='function'){const _r=route;route=function(){const r=_r.apply(this,arguments);setTimeout(()=>{try{prPaint()}catch(e){}},80);return r}}
})();


/* ===== MORE =====
   دفعة 4: بيع متنوع + أقساط، تحصيل المديونيات، حد ائتماني، أسعار خاصة للعميل،
   باركود، ملخص اليوم، نسخ احتياطي. كلها فوق نواة البرنامج بدون تغيير طبقة البيانات. */

/* ---------- أدوات التاريخ ---------- */
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const addMonths=(d,n)=>{const x=new Date(d+'T12:00:00Z'),day=x.getUTCDate();x.setUTCDate(1);x.setUTCMonth(x.getUTCMonth()+n);const last=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();x.setUTCDate(Math.min(day,last));return x.toISOString().slice(0,10)};
const daysTo=d=>Math.round((new Date(d+'T12:00:00Z')-new Date(today()+'T12:00:00Z'))/864e5);
const instLead=()=>+((db.settings||{}).instLead)>=0&&(db.settings||{}).instLead!==undefined&&(db.settings||{}).instLead!==''?+db.settings.instLead:3;

/* ---------- خطة الأقساط (على الفاتورة: inv.inst = [{id,due,amt,paid}]) ---------- */
const newInst=()=>({on:false,mode:'eq',n:3,first:addMonths(today(),1),per:'m',rows:[{amt:'',due:addMonths(today(),1)}]});
function genEq(rem,I){const n=Math.max(1,Math.min(60,+I.n||1)),each=Math.floor(rem/n*100)/100,out=[];let left=rem;
 for(let k=0;k<n;k++){const due=I.per==='m'?addMonths(I.first,k):addDays(I.first,k*(I.per==='w'?7:14));const a=k===n-1?+left.toFixed(2):each;left-=a;out.push({due,amt:a})}return out}
function planRows(rem){const I=draft.inst;if(!I||!I.on||!(rem>0))return null;return I.mode==='eq'?genEq(rem,I):I.rows.filter(r=>+r.amt>0).map(r=>({due:r.due,amt:+r.amt,paid:+r.paid||0}))}
function buildPlan(rem,old){const p=planRows(rem);if(!p||!p.length)return undefined;return p.map((r,k)=>({id:k+1,due:r.due,amt:+(+r.amt).toFixed(2),paid:r.paid||0}))}
function instOf(i){return i.inst||[]}
const instRem=x=>Math.max(0,+(x.amt-(x.paid||0)).toFixed(2));
function instAll(){const o=[];db.invoices.forEach(i=>(i.inst||[]).forEach((x,k)=>{if(instRem(x)>0)o.push({i,x,k,c:cust(i.cid),d:daysTo(x.due)})}));return o.sort((a,b)=>a.x.due.localeCompare(b.x.due))}
const instSt=d=>d<0?['bad','⚠️ متأخر '+(-d)+' يوم']:d===0?['warn','⏰ مستحق النهارده']:d<=instLead()?['warn','🔔 باقي '+d+' يوم']:['','🗓 قادم'];
/* الصلاحية: المندوب يشوف عملاءه بس */
const canRemind=(i)=>{if(!can('customers.collect'))return false;if(!me().emp)return true;const c=cust(i.cid);return (c&&c.rep==me().id)||i.by==me().id};

/* ---------- واجهة الدفع المتنوع + الأقساط في شاشة الفاتورة ---------- */
const _nis=newInvoiceScreen;newInvoiceScreen=function(qs){const h=_nis(qs);if(draft.q)return h;if(!draft.inst)draft.inst=newInst();
 return h.replace('<h2>الأصناف</h2>','<h2>الأصناف <button class="scanb" onclick="scanOpen()">📷 باركود</button></h2>')};
const _dtot=drawTot;drawTot=function(){_dtot();drawInst()};
const _drem=drawRem;drawRem=function(){_drem();drawInst()};
function drawInst(){if(!$('#tot'))return;let el=$('#inst');if(!el){el=document.createElement('div');el.id='inst';$('#tot').insertAdjacentElement('afterend',el)}
 if(draft.q){el.innerHTML='';return}
 const t=dTotal(),rem=t-paidOf(t),c=draft.cid?cust(draft.cid):null;let h='';
 if(c&&+c.limit>0&&rem>0){recalc(c);const old=draft.edit?(db.invoices.find(x=>x.id==draft.edit.id)||{}):{};const after=(c.balance||0)-((old.cid==c.id&&old.rem)||0)+rem;
  if(after>c.limit)h+=`<div class="alert" style="background:#fde3df;border:2px solid #c0392b;color:#8a1f12;font-weight:800">⛔ تحذير: الفاتورة هتخلي مديونية ${esc(c.name)} ${fmt(after)} ج.م وده أعلى من حده الائتماني ${fmt(c.limit)} ج.م (تقدر تكمل لو عايز)</div>`}
 if(draft.kind!=='كاش'&&rem>0){const I=draft.inst=draft.inst||newInst();
  h+=`<div class="card" style="margin-top:10px"><label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--txt);font-size:14px;font-weight:700"><input type="checkbox" style="width:auto" ${I.on?'checked':''} onchange="instOn(this.checked)"> 🗓 تقسيط الباقي (${fmt(rem)} ج.م) على أقساط</label>`;
  if(I.on){h+=`<div class="seg" style="margin-top:10px"><button class="${I.mode==='eq'?'on':''}" onclick="instMode('eq')">أقساط متساوية</button><button class="${I.mode==='cu'?'on':''}" onclick="instMode('cu')">أقساط مخصصة</button></div>`;
   if(I.mode==='eq'){const pl=genEq(rem,I);h+=`<div class="row2" style="margin-top:8px"><div><label>عدد الأقساط</label><input type="number" inputmode="numeric" min="1" max="60" value="${I.n}" oninput="instSet('n',this.value)"></div><div><label>أول قسط في</label><input type="date" value="${I.first}" onchange="instSet('first',this.value)"></div></div><label>كل</label><select onchange="instSet('per',this.value)"><option value="m" ${I.per==='m'?'selected':''}>شهر</option><option value="b" ${I.per==='b'?'selected':''}>أسبوعين</option><option value="w" ${I.per==='w'?'selected':''}>أسبوع</option></select>
    <div style="margin-top:8px">${pl.map((r,k)=>`<div class="stat"><span>قسط ${k+1} · ${r.due}</span><b>${fmt(r.amt)}</b></div>`).join('')}</div>`}
   else{h+=`<div style="margin-top:8px">${I.rows.map((r,k)=>`<div class="row2" style="margin-bottom:6px;grid-template-columns:1fr 1fr auto;align-items:center"><input type="number" inputmode="decimal" placeholder="المبلغ" value="${r.amt}" oninput="instRow(${k},'amt',this.value)"><input type="date" value="${r.due}" onchange="instRow(${k},'due',this.value)"><button class="back" style="background:#fbeae8;color:#c0392b;border:0;border-radius:10px;padding:10px" onclick="instDel(${k})">✕</button></div>`).join('')}</div>
    <div class="row2"><button class="btn sec" style="margin-top:4px" onclick="instAdd()">＋ قسط</button><button class="btn sec" style="margin-top:4px" onclick="instFill()">وزّع الباقي</button></div>`}
   h+=`<div class="alert" id="instsum" style="margin:10px 0 0"></div>`}
  h+='</div>'}
 el.innerHTML=h;instSum()}
function instSum(){const e=$('#instsum');if(!e)return;const I=draft.inst,t=dTotal(),rem=t-paidOf(t);if(I.mode==='eq'){e.className='alert';e.innerHTML='✅ الأقساط المتساوية مجموعها = '+fmt(rem)+' ج.م';return}
 const s=I.rows.reduce((a,r)=>a+(+r.amt||0),0),d=+(rem-s).toFixed(2);e.className='alert'+(d?' credit':'');e.innerHTML=d?`موزّع ${fmt(s)} من ${fmt(rem)} · ${d>0?'فاضل':'زيادة'} <b>${fmt(Math.abs(d))}</b> ج.م`:'✅ الأقساط مجموعها = '+fmt(rem)+' ج.م'}
function instOn(v){draft.inst.on=v;drawInst()}
function instMode(m){draft.inst.mode=m;drawInst()}
function instSet(k,v){draft.inst[k]=k==='n'?(+v||1):v;drawInst()}
function instRow(k,f,v){draft.inst.rows[k][f]=v;instSum()}
function instAdd(){const r=draft.inst.rows,l=r[r.length-1]||{};draft.inst.rows.push({amt:'',due:addMonths(l.due||today(),1)});drawInst()}
function instDel(k){draft.inst.rows.splice(k,1);if(!draft.inst.rows.length)draft.inst.rows.push({amt:'',due:today()});drawInst()}
function instFill(){const t=dTotal(),rem=t-paidOf(t),s=draft.inst.rows.reduce((a,r)=>a+(+r.amt||0),0),d=+(rem-s).toFixed(2);if(d<=0)return toast('مفيش باقي للتوزيع');const r=draft.inst.rows,l=r[r.length-1];if(l&&!(+l.amt>0))l.amt=d;else r.push({amt:d,due:addMonths(l?l.due:today(),1)});drawInst()}

/* حفظ: تحقق الأقساط + الحد الائتماني قبل الحفظ الأصلي */
const _si=saveInvoice;saveInvoice=function(){if(!draft.q){const L=draft.lines.filter(l=>l.pid&&l.qty>0);
  if(L.length){const t=dTotal(),paid=paidOf(t),rem=t-paid;
   if(draft.kind==='متنوع'&&!(paid>0&&paid<t))return toast('البيع المتنوع: اكتب المبلغ المدفوع دلوقتي (أقل من إجمالي الفاتورة)');
   if(draft.inst&&draft.inst.on&&rem>0){const p=planRows(rem),s=p.reduce((a,r)=>a+(+r.amt||0),0);if(!p.length)return toast('أضف قسط واحد على الأقل');
    if(Math.abs(s-rem)>0.5)return toast('مجموع الأقساط لازم يساوي الباقي ('+fmt(rem)+') — الفرق '+fmt(rem-s));if(p.some(r=>!r.due))return toast('اكتب تاريخ كل قسط')}
   const c=draft.cid&&cust(draft.cid);if(c&&+c.limit>0&&rem>0){recalc(c);const old=draft.edit&&db.invoices.find(x=>x.id==draft.edit.id);const after=(c.balance||0)-((old&&old.cid==c.id&&old.rem)||0)+rem;
    if(after>c.limit&&!confirm('⛔ تحذير: مديونية '+c.name+' هتبقى '+fmt(after)+' ج.م وده أكبر من الحد الائتماني '+fmt(c.limit)+' ج.م.\n\nتكمل الحفظ برضو؟'))return}}}
 return _si()};
const _ei=editInvoice;editInvoice=function(id){_ei(id);const i=db.invoices.find(x=>x.id==id);if(i&&draft.edit){draft.inst=newInst();if(i.inst&&i.inst.length){draft.inst.on=true;draft.inst.mode='cu';draft.inst.rows=i.inst.map(x=>({amt:x.amt,due:x.due,paid:x.paid||0}))}}};

function waRaw(c,txt){const n=c&&waNum(c.phone);if(!n)return toast('مفيش رقم تليفون مسجل للعميل ده');window.open('https://wa.me/'+n+'?text='+encodeURIComponent(txt),'_blank')}
const coName=()=>(db.settings&&db.settings.company)||'خالد تريد';
/* كشف الحساب: يضيف الأقساط المفتوحة (تتطبع مع الكشف) */
const _sh=stmtHtml;stmtHtml=function(c,f,t){const inv=db.invoices.filter(i=>i.cid==c.id&&i.inst&&i.inst.some(x=>instRem(x)>0));return _sh(c,f,t)+inv.map(i=>`<div style="margin-top:12px"><b>🗓 أقساط فاتورة #${i.no}</b>${instTable(i,false)}</div>`).join('')};
/* شاشة العميل: الأقساط + حد ائتماني + أسعار خاصة */
const R_CUST2=R['/customer'];R['/customer']=id=>{let h=R_CUST2(id);if(id==='new')return h;const c=cust(id);if(!c)return h;
 const ins=db.invoices.filter(i=>i.cid==c.id&&i.inst&&i.inst.some(x=>instRem(x)>0));
 const sp=c.sp||{},pids=Object.keys(sp);
 return h+`<div class="card"><h2>⛔ الحد الائتماني</h2><label>أقصى مديونية مسموحة (0 = بدون حد)</label><input id="f_limit" type="number" inputmode="decimal" value="${c.limit||''}" placeholder="0" onchange="setLimit(${c.id},this.value)"><div style="font-size:12px;color:var(--mut);margin-top:6px">المديونية الحالية: <b>${fmt(c.balance||0)}</b> ج.م. لو الفاتورة عدّته هيظهر تحذير أحمر (من غير منع).</div></div>
 <div class="card"><h2>🏷 أسعار خاصة للعميل</h2>${pids.length?pids.map(p=>`<div class="item"><div class="main"><div class="t">${esc((prod(p)||{}).name||'؟')}</div><div class="s">السعر العادي ${fmt((prod(p)||{}).price||0)}</div></div><div class="num">${fmt(sp[p])}</div><button class="chipb" onclick="spDel(${c.id},${p})">✕</button></div>`).join(''):'<div class="empty" style="padding:14px">مفيش أسعار خاصة. السعر العادي أو آخر سعر هو اللي بيتطبق.</div>'}
 <div class="row2" style="margin-top:8px"><div><label>الصنف</label><select id="sp_p"><option value="">— اختار —</option>${db.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div><label>السعر الخاص</label><input id="sp_v" type="number" inputmode="decimal" placeholder="0"></div></div><button class="btn sec" onclick="spAdd(${c.id})">＋ حفظ السعر الخاص</button></div>`
 +(ins.length?`<div class="card out"><h2>🗓 أقساط ${esc(c.name)} المفتوحة</h2>${ins.map(i=>`<div style="margin-bottom:10px"><b>فاتورة #${i.no}</b>${instTable(i,true)}</div>`).join('')}</div>`:'')};
function setLimit(id,v){const c=cust(id);c.limit=+v||0;save();toast('اتحفظ الحد الائتماني ✅');route()}
function spAdd(id){const p=+$('#sp_p').value,v=+$('#sp_v').value;if(!p||!(v>0))return toast('اختار الصنف واكتب السعر');const c=cust(id);c.sp=c.sp||{};c.sp[p]=v;save();toast('اتحفظ السعر الخاص ✅');route()}
function spDel(id,p){const c=cust(id);delete c.sp[p];save();route()}
/* السعر الخاص يغلب آخر سعر */
const _lp=lastPrice;lastPrice=function(cid,pid){const c=cid&&cust(cid);if(c&&c.sp&&+c.sp[pid]>0)return +c.sp[pid];return _lp(cid,pid)};

/* ---------- تحصيل المديونيات + تذكير واتساب ---------- */
function debtors(){return db.customers.filter(c=>{recalc(c);return c.balance>0.5&&(!me().emp||c.rep==me().id||db.invoices.some(i=>i.cid==c.id&&i.by==me().id))}).sort((a,b)=>b.balance-a.balance)}
function waCust(id){const c=cust(id);if(!c)return;const late=0;
 waRaw(c,`السلام عليكم ${c.name} 🌿\nمعاك ${coName()}. المتبقي على حضرتك ${fmt(c.balance)} جنيه.\nنرجو السداد في أقرب وقت. شكراً لتعاملك معانا`)}
R['/collect']=()=>{head('تحصيل المديونيات',true);const ds=debtors(),tot=ds.reduce((a,c)=>a+c.balance,0);
 return `<div class="card out"><h2>💰 العملاء المدينين (${ds.length})</h2><div class="stat"><span>إجمالي المديونيات</span><b class="neg">${fmt(tot)} ج.م</b></div>
 ${ds.length?ds.map(c=>{const o=0;return `<div class="item"><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.phone||'بدون رقم')}</div></div><div class="num neg">${fmt(c.balance)}</div><button class="chipb wa noprint" onclick="waCust(${c.id})">واتساب</button><button class="chipb noprint" onclick="location.hash='#/stmt/${c.id}'">كشف</button></div>`}).join(''):'<div class="empty">مفيش مديونيات 🎉</div>'}</div>
 `};

/* ---------- ملخص نهاية اليوم ---------- */
let eodD='';
R['/eod']=()=>{head('ملخص اليوم',true);const d=eodD||today(),inv=db.invoices.filter(i=>i.date===d),S=(l,f)=>l.reduce((a,x)=>a+f(x),0);
 const col=db.payments.filter(p=>p.date===d),ex=db.exps.filter(x=>x.date===d),pu=db.purchases.filter(p=>p.date===d),ev=cashEv().filter(e=>e.d===d),cin=S(ev,e=>e.in),cout=S(ev,e=>e.out);
 const row=(a,b,cls)=>`<div class="stat"><span>${a}</span><b class="${cls||''}">${b}</b></div>`;
 return `<div class="card noprint"><label>اليوم</label><input type="date" value="${d}" onchange="eodD=this.value;route()"></div>
 <div class="card out"><div style="text-align:center;font-weight:800;font-size:17px">ملخص يوم ${d}</div><div style="text-align:center;font-size:12px;color:var(--mut);margin-bottom:8px">${esc(coName())}</div>
 <h2>🧾 المبيعات</h2>${row('عدد الفواتير الجديدة',inv.length)}${row('إجمالي المبيعات',fmt(S(inv,i=>i.total))+' ج.م')}${row('مدفوع وقت البيع',fmt(S(inv,i=>i.paid))+' ج.م')}${row('آجل (على العملاء)',fmt(S(inv,i=>i.rem))+' ج.م')}
 <h2 style="margin-top:12px">💵 التحصيلات والمصروفات</h2>${row('تحصيلات من العملاء ('+col.length+')',fmt(S(col,p=>p.amount))+' ج.م')}${row('مصروفات ('+ex.length+')',fmt(S(ex,x=>x.amount))+' ج.م','neg')}${row('مشتريات ('+pu.length+')',fmt(S(pu,p=>p.total||0))+' ج.م')}
 <h2 style="margin-top:12px">🏦 حركة الخزنة</h2>${row('داخل',fmt(cin)+' ج.م')}${row('خارج',fmt(cout)+' ج.م','neg')}${row('صافي الحركة',fmt(cin-cout)+' ج.م')}${row('رصيد الخزنة الحالي',fmt(cashBal())+' ج.م')}</div>`};

/* ---------- باركود: حقل للمنتج + مسح بالكاميرا (BarcodeDetector أو مكتبة html5-qrcode) ---------- */
const R_PROD2=R['/product'];R['/product']=id=>{const h=R_PROD2(id);const p=id==='new'?{}:prod(id);return h+`<div class="card"><h2>▥ الباركود</h2><input id="f_bc" value="${esc((p&&p.barcode)||'')}" placeholder="اكتب أو امسح الباركود" inputmode="numeric"><div style="font-size:12px;color:var(--mut);margin-top:6px">الباركود بيتحفظ مع زرار «حفظ المنتج». لو الكاميرا مش شغالة اكتبه بإيدك.</div></div>`};
const _sp=saveProduct;saveProduct=function(id){const bc=($('#f_bc')||{}).value;const n=db.products.length;_sp(id);const p=id==='new'?db.products[db.products.length-1]:prod(id);if(p&&bc!==undefined&&(id!=='new'||db.products.length>n)){p.barcode=bc.trim();save()}};
let scanSt=null;
function scanOpen(){if($('#scan'))return;const o=document.createElement('div');o.id='scan';o.className='scanov';o.innerHTML=`<div class="scanbox"><div style="display:flex;justify-content:space-between;align-items:center"><b>📷 مسح باركود</b><button class="chipb" onclick="scanClose()">تم ✔</button></div><div id="scanv" style="margin:8px 0;border-radius:12px;overflow:hidden;background:#000;min-height:180px"><video id="scanvid" playsinline muted style="width:100%"></video></div><div id="scanmsg" class="alert" style="margin:0 0 8px">وجّه الكاميرا على الباركود</div><div class="row2" style="grid-template-columns:1fr auto"><input id="scanin" inputmode="numeric" placeholder="أو اكتب الباركود هنا" onkeydown="if(event.key==='Enter')scanCode(this.value)"><button class="chipb" onclick="scanCode($('#scanin').value)">إضافة</button></div></div>`;document.body.appendChild(o);scanStart()}
function scanClose(){const s=scanSt;scanSt=null;try{s&&s.stop&&s.stop()}catch(e){}const o=$('#scan');if(o)o.remove()}
async function scanStart(){const msg=t=>{const m=$('#scanmsg');if(m)m.innerHTML=t};
 try{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw 0;
  if('BarcodeDetector' in window){const det=new BarcodeDetector(),st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}),v=$('#scanvid');v.srcObject=st;await v.play();let on=true,last='',lt=0;
   scanSt={stop(){on=false;st.getTracks().forEach(t=>t.stop())}};(async function loop(){while(on){try{const r=await det.detect(v);if(r.length&&(r[0].rawValue!==last||Date.now()-lt>2500)){last=r[0].rawValue;lt=Date.now();scanCode(last)}}catch(e){}await new Promise(z=>setTimeout(z,250))}})();return}
  if(!window.Html5Qrcode){await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.integrity='sha384-c9d8RFSL+u3exBOJ4Yp3HUJXS4znl9f+z66d1y54ig+ea249SpqR+w1wyvXz/lk+';s.crossOrigin='anonymous';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
  const v=$('#scanv');v.innerHTML='<div id="scanr" style="width:100%"></div>';const q=new Html5Qrcode('scanr');let last='',lt=0;
  await q.start({facingMode:'environment'},{fps:8,qrbox:{width:260,height:140}},t=>{if(t!==last||Date.now()-lt>2500){last=t;lt=Date.now();scanCode(t)}});scanSt={stop(){q.stop().catch(()=>{})}}}
 catch(e){msg('⚠️ الكاميرا مش متاحة (اسمح للمتصفح بالكاميرا). اكتب الباركود بإيدك تحت.')}}
function scanCode(code){code=(code||'').trim();if(!code)return;const m=$('#scanmsg'),p=db.products.find(x=>(x.barcode||'').trim()===code);
 if(!p){if(m){m.className='alert credit';m.innerHTML='❌ مفيش صنف بالباركود '+esc(code)}return}
 const ex=draft.lines.findIndex(l=>l.pid==p.id);if(ex>=0){setL(ex,'qty',(+draft.lines[ex].qty||0)+(pkOf(p)>1?pkOf(p):1))}else{let k=draft.lines.findIndex(l=>!l.pid);if(k<0){draft.lines.push({});k=draft.lines.length-1}pickP(k,p.id);setL(k,'qty',pkOf(p)>1?pkOf(p):1)}
 drawLines();if(m){m.className='alert';m.innerHTML='✅ اتضاف: <b>'+esc(p.name)+'</b>'}const i=$('#scanin');if(i)i.value=''}

/* ---------- الإعدادات: مدة تنبيه الأقساط + نسخ احتياطي واستعادة ---------- */
const R_SET2=R['/settings'];R['/settings']=()=>{const h=R_SET2();return h+`
 <div class="card"><h2>💾 النسخ الاحتياطي</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">بياناتك محفوظة على الجهاز ده بس لحد مرحلة السيرفر. خد نسخة بشكل دوري.</div><button class="btn" style="margin-top:0" onclick="backupExport()">⬇️ تصدير كل البيانات (ملف)</button><label style="margin-top:12px">استعادة من ملف نسخة</label><input type="file" accept=".json,application/json" onchange="backupImport(this)"><div style="font-size:12px;color:var(--red);margin-top:6px">الاستعادة بتستبدل كل البيانات الحالية.</div></div>`};
function backupExport(){const b=new Blob([JSON.stringify(db)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='khaled-trade-backup-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();db.settings.lastBackup=today();save();toast('اتحمل ملف النسخة الاحتياطية ✅')}
function backupImport(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{let d;try{d=JSON.parse(r.result)}catch(e){return toast('الملف مش صالح')}
 if(!d||!Array.isArray(d.invoices)||!Array.isArray(d.products)||!Array.isArray(d.customers))return toast('ده مش ملف نسخة احتياطية للبرنامج');
 if(!confirm('هتستبدل كل البيانات الحالية بالنسخة اللي في الملف ('+d.invoices.length+' فاتورة، '+d.products.length+' صنف). متأكد؟'))return;
 localStorage.setItem('kt_db',JSON.stringify(d));toast('تمت الاستعادة ✅');setTimeout(()=>location.reload(),600)};r.readAsText(f)}

TILES.push(['💰','تحصيل المديونيات','#/collect','customers.collect'],['📅','ملخص اليوم','#/eod','reports.view']);
Object.assign(ROUTE_PERM,{'/collect':'customers.collect','/eod':'reports.view'});

// بيانات العمل الحقيقية خاصة: بتتحمل من ملف الاستيراد فقط، مش جوه البرنامج
const KT_SEED={groups:[],items:[]};


/* ===== قائمة الأسعار المطبوعة: عمود/عمودين، مجموعات، ترقيم (م)، فوتر بالتليفونات ===== */
PL.by='sec';PL.cols=2;PL.price=true;
const plPhones=()=>[db.settings.phone,db.settings.phone2].filter(Boolean).join(' - ');
const plRPC=()=>PL.cols===1?30:37;
function plPages(){const G=plSel(),flat=[];let n=0;
 G.forEach(g=>{if(g.n)flat.push({h:g.n,g:g.k});g.items.forEach(p=>flat.push({n:++n,name:p.name,unit:unitT(p),price:p.price,g:g.k,gn:g.n}))});
 const R=plRPC(),cols=[];let col=[],cg=null;
 const hdr=k=>{const g=G.find(x=>x.k===k);return g&&g.n?{h:g.n,g:k,rep:1}:null};
 for(let i=0;i<flat.length;i++){const r=flat[i];
  if(r.h)cg=r.g;else if(!col.length&&cg!==null){const h=hdr(r.g);if(h)col.push(h)}
  if(r.h&&col.length>=R-1){cols.push(col);col=[]}
  col.push(r);if(col.length>=R){cols.push(col);col=[]}}
 if(col.length)cols.push(col);
 const per=PL.cols===1?1:2,pages=[];for(let i=0;i<cols.length;i+=per)pages.push(cols.slice(i,i+per));return pages}
const plShowPrice=()=>PL.price&&plSel().some(g=>g.items.some(p=>+p.price>0));
function plHtml(){const pages=plPages(),sp=plShowPrice(),dt=new Date().toLocaleString('en-GB').replace(',','');
 if(!pages.length)return '<div class="empty">اختار قسم أو شركة</div>';
 return pages.map((pg,i)=>`<div class="plsheet c${PL.cols}"><div class="pltitle">عرض أسعار <small>${esc(db.settings.name||'')}</small></div><div class="plcols">${pg.map(col=>`<div class="plcol"><div class="plr plhd"><span class="n">م</span><span class="t">اسم الصنف</span>${sp?'<span class="p">السعر</span>':''}</div>${col.map(r=>r.h?`<div class="plr plg"><span>${esc(r.h)}</span></div>`:`<div class="plr"><span class="n">${r.n}</span><span class="t">${esc(r.name)}</span>${sp?`<span class="p">${+r.price>0?fmt(r.price):''}</span>`:''}</div>`).join('')}</div>`).join('')}</div><div class="plft"><span>${esc(plPhones())}</span><span>صفحة ${i+1} / ${pages.length}</span><span>${dt}</span></div></div>`).join('')}
function plFit(){const z=Math.min(1,(Math.min(innerWidth,1100)-28)/794);document.documentElement.style.setProperty('--plz',z)}
function plDraw(){const e=$('#plv');if(e){e.innerHTML=plHtml();plFit()}}
const plSetCols=n=>{PL.cols=n;route()};
R['/pricelist']=()=>{head('قائمة الأصناف',true);const g=plGroups();plFit();
 return `<div class="card noprint"><button class="btn sec" onclick="location.hash='#/itemsrep'">🖨️ طباعة بيانات الأصناف (تفصيلي)</button><label style="margin-top:12px">عدد الأعمدة عند الطباعة</label><div class="seg"><button class="${PL.cols===1?'on':''}" onclick="plSetCols(1)">▭ عمود واحد (مريح)</button><button class="${PL.cols===2?'on':''}" onclick="plSetCols(2)">▯▯ عمودين (مضغوط)</button></div>
 <label style="margin-top:12px">تقسيم القائمة حسب</label><div class="seg"><button class="${PL.by==='sec'?'on':''}" onclick="PL.by='sec';route()">المجموعة / القسم</button><button class="${PL.by==='co'?'on':''}" onclick="PL.by='co';route()">الشركة</button><button class="${PL.by==='none'?'on':''}" onclick="PL.by='none';route()">ترتيبي</button></div>
 ${PL.by==='none'?'':`<label style="margin-top:12px">اختار الأقسام اللي تتطبع</label><div class="bar"><button onclick="plAll(true)">الكل</button><button onclick="plAll(false)">ولا واحد</button></div>${g.map(x=>`<label class="chk"><input type="checkbox" ${PL.off[x.k]?'':'checked'} onchange="PL.off['${x.k}']=!this.checked;plDraw()"> ${esc(x.n)} <span class="s">(${x.items.length})</span></label>`).join('')}`}
 <label style="margin-top:12px">سعر الصنف في القائمة</label><div class="seg"><button class="${PL.price?'on':''}" onclick="PL.price=true;route()">💲 بالسعر</button><button class="${PL.price?'':'on'}" onclick="PL.price=false;route()">بدون سعر</button></div></div>
 <div class="card out plwrap" id="plv">${plHtml()}</div>`};
function plAll(on){plGroups().forEach(x=>PL.off[x.k]=!on);route()}
addEventListener('resize',plFit);
/* PDF متعدد الصفحات (A4) برسم الصفحات على canvas بنفس تخطيط الشاشة */
async function plPdf(){try{await document.fonts.load('22px Cairo');await document.fonts.load('bold 22px Cairo')}catch(e){}
 const pages=plPages(),sp=plShowPrice(),W=1240,H=1754,M=50,F="'Cairo',"+FONT,two=PL.cols!==1,R=plRPC(),dt=new Date().toLocaleString('en-GB').replace(',','');
 const top=120,bot=H-70,rh=(bot-top)/(R+1),fs=two?22:27;const imgs=[];
 pages.forEach((pg,pi)=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.direction='rtl';x.textBaseline='middle';x.fillStyle='#fff';x.fillRect(0,0,W,H);
  const t=(s,px,y,f,al,col)=>{x.font=f+' '+F;x.fillStyle=col||'#111';x.textAlign=al||'right';x.fillText(s,px,y)};
  t('عرض أسعار',W/2,56,'bold 34px','center');t(db.settings.name||'',W-M,56,'20px','right','#555');
  const gap=24,cw=two?(W-2*M-gap)/2:W-2*M;
  pg.forEach((col,ci)=>{const x0=M+ci*(cw+gap),xr=x0+cw,nw=62,pw=sp?130:0;const rows=[{hd:1},...col];
   rows.forEach((r,ri)=>{const y=top+ri*rh;x.strokeStyle='#777';x.lineWidth=1.2;
    if(r.hd||r.h){x.fillStyle=r.hd?'#e4e4e4':'#ececec';x.fillRect(x0,y,cw,rh)}
    x.strokeRect(x0,y,cw,rh);
    if(r.hd){t('م',xr-nw/2,y+rh/2,'bold '+(fs-2)+'px','center');t('اسم الصنف',x0+pw+(cw-nw-pw)/2,y+rh/2,'bold '+(fs-2)+'px','center');if(sp)t('السعر',x0+pw/2,y+rh/2,'bold '+(fs-2)+'px','center')}
    else if(r.h)t(r.h,x0+cw/2,y+rh/2,'bold '+fs+'px','center');
    else{x.beginPath();x.moveTo(xr-nw,y);x.lineTo(xr-nw,y+rh);x.stroke();if(sp){x.beginPath();x.moveTo(x0+pw,y);x.lineTo(x0+pw,y+rh);x.stroke()}
     t(String(r.n),xr-nw/2,y+rh/2,fs+'px','center');let f=fs;x.font='bold '+f+'px '+F;const mw=cw-nw-pw-16;while(f>12&&x.measureText(r.name).width>mw){f--;x.font='bold '+f+'px '+F}
     t(r.name,xr-nw-10,y+rh/2,'bold '+f+'px','right');if(sp&&+r.price>0)t(fmt(r.price),x0+pw/2,y+rh/2,fs+'px','center')}})});
  t(plPhones(),M,H-34,'20px','left','#333');t('صفحة '+(pi+1)+' / '+pages.length,W/2,H-34,'20px','center','#333');t(dt,W-M,H-34,'20px','right','#333');
  const d=atob(cv.toDataURL('image/jpeg',.9).split(',')[1]),jpg=new Uint8Array(d.length);for(let k=0;k<d.length;k++)jpg[k]=d.charCodeAt(k);imgs.push({jpg,w:W,h:H})});
 return new File([jpegPdfN(imgs)],'قائمة-الأسعار.pdf',{type:'application/pdf'})}
function jpegPdfN(pgs){const enc=new TextEncoder(),parts=[],offs=[];let off=0;const add=d=>{const u=typeof d==='string'?enc.encode(d):d;parts.push(u);off+=u.length};const n=pgs.length,pw=595,ph=842;
 add('%PDF-1.4\n');offs[1]=off;add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');offs[2]=off;add('2 0 obj<</Type/Pages/Kids['+pgs.map((_,i)=>(3+i*3)+' 0 R').join(' ')+']/Count '+n+'>>endobj\n');
 pgs.forEach((p,i)=>{const a=3+i*3;offs[a]=off;add(`${a} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw} ${ph}]/Resources<</XObject<</Im0 ${a+1} 0 R>>>>/Contents ${a+2} 0 R>>endobj\n`);
  offs[a+1]=off;add(`${a+1} 0 obj<</Type/XObject/Subtype/Image/Width ${p.w}/Height ${p.h}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${p.jpg.length}>>stream\n`);add(p.jpg);add('\nendstream endobj\n');
  const cs=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;offs[a+2]=off;add(`${a+2} 0 obj<</Length ${cs.length}>>stream\n${cs}\nendstream endobj\n`)});
 const tot=3+n*3,xo=off;let x=`xref\n0 ${tot}\n0000000000 65535 f \n`;for(let k=1;k<tot;k++)x+=String(offs[k]).padStart(10,'0')+' 00000 n \n';add(x+`trailer<</Size ${tot}/Root 1 0 R>>\nstartxref\n${xo}\n%%EOF`);return new Blob(parts,{type:'application/pdf'})}
const _opdf=outPDF;outPDF=async function(b,wa){if(/^#\/pricelist/.test(location.hash)){toast('جاري تجهيز الـ PDF…');dl(await plPdf());return}return _opdf(b,wa)};
const _owa=outWA;outWA=function(b){if(/^#\/pricelist/.test(location.hash))return sharePL();return _owa(b)};

/* ---------- استيراد أصناف (من قائمة الأسعار المرفقة أو من ملف JSON) ---------- */
function importProducts(list,groups){let add=0,skip=0;const nk=s=>s.replace(/\s+/g,'').toLowerCase(),have=new Set(db.products.map(p=>nk(p.name)));
 const secId={};groups.forEach(g=>{let s=db.sections.find(x=>x.name===g);if(!s){s={id:++db.seq.se,name:g};db.sections.push(s)}secId[g]=s.id});
 list.forEach(it=>{const name=(it.name||'').trim();if(!name)return;if(have.has(nk(name))){skip++;return}have.add(nk(name));
  const sec=secId[it.group]||0;db.products.push({id:++db.seq.p,name,sec,co:0,cat:it.group||'',unit:it.unit||'عبوة',pack:'',cost:+it.cost||0,price:+it.price||0,stock:0,min:5,exp:'',barcode:it.barcode||''});add++});
 save();return{add,skip}}
function fileImport(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{let d;try{d=JSON.parse(r.result)}catch(e){return toast('الملف مش صالح')}
 const L=Array.isArray(d)?d:d.products;if(!Array.isArray(L))return toast('صيغة الملف غير مناسبة');if(!confirm('هتستورد '+L.length+' صنف. تكمل؟'))return;
 const x=importProducts(L,[...new Set(L.map(i=>i.group).filter(Boolean))]);toast('اتضاف '+x.add+' وتجاهل '+x.skip+' مكرر');route()};r.readAsText(f)}
const R_SET3=R['/settings'];R['/settings']=()=>R_SET3()+(can('users.manage')?`<div class="card"><h2>📥 استيراد أصناف</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">استيراد ملف بيانات خالد تريد (أصناف + عملاء + موردين بأرصدتهم الافتتاحية). الاستيراد <b>بيستبدل</b> الأصناف والعملاء والموردين الموجودين على الجهاز ده، وبيتعمل نسخة أمان قبله.</div><label>ملف على الجهاز</label><input type="file" accept=".json,application/json" onchange="goLiveFile(this)"><div id="golive_st"></div></div>`:'')+`<div class="card"><h2>📄 استيراد أصناف فقط</h2><label>ملف JSON (بيضيف من غير ما يمسح)</label><input type="file" accept=".json,application/json" onchange="fileImport(this)"></div>`;
const R_DASH4=R['/'];R['/']=()=>{const h=R_DASH4();return (!db.products.length&&can('users.manage')?`<div class="card" style="border:2px dashed var(--leaf)"><h2>👋 أهلاً بيك</h2><div style="font-size:13px;color:var(--mut);margin-bottom:8px">مفيش أصناف على الجهاز ده لسه. استورد ملف البيانات (أصناف وعملاء وموردين) من الإعدادات.</div><button class="btn" style="margin-top:0" onclick="location.hash='#/settings'">📥 فتح الإعدادات</button></div>`:'')+h};

/* ---------- اختيار نوع المستخدم: بطاقات كبيرة بضغطة، وبعدها تعديل الصلاحيات بالتشغيل/الإيقاف ---------- */
const ROLE_UI={manager:['👑','كل الصلاحيات'],accountant:['🧮','فواتير وعملاء وتقارير'],keeper:['📦','مخزن وتحويلات وجرد'],rep:['🚚','يبيع ويحصّل من عملاءه']};
const R_USER2=R['/user'];R['/user']=(id,qs)=>{let h=R_USER2(id,qs);if(!uf||!uf.u)return h;const cur=uf.u.role;
 h=h.replace(/<div class="seg" style="grid-template-columns:1fr 1fr 1fr 1fr;margin-bottom:8px">[\s\S]*?<\/div><p class="s"[^>]*>اختار قالب جاهز[^<]*<\/p>/,'<p class="s" style="color:var(--mut);font-size:12.5px;margin:0">دوس على أي صلاحية تشغلها أو توقفها. نوع المستخدم فوق بيظبطها لك تلقائياً.</p>');
 const cards=`<div class="card"><h2>${id==='new'?'1️⃣ اختار نوع المستخدم':'نوع المستخدم'}</h2><div class="roles">${Object.entries(TEMPLATES).map(([k,t])=>`<button class="role ${cur===k?'on':''}" onclick="ufTpl('${k}')"><span>${(ROLE_UI[k]||['👤'])[0]}</span><b>${t.name}</b><small>${(ROLE_UI[k]||['','صلاحيات مخصصة'])[1]}</small></button>`).join('')}</div><p class="s" style="color:var(--mut);font-size:12.5px;margin:8px 0 0">بعد الاختيار زوّد أو شيل أي صلاحية من تحت (2️⃣).</p></div>`;
 return cards+h};

/* تحميل أصناف القائمة أوتوماتيك أول مرة على أي جهاز (مرة واحدة فقط، ومش بتتكرر لو اتحذفت) */
function autoSeed(){}


/* ---------- الثيم (فاتح/داكن): الاختيار بيتحفظ على الجهاز نفسه (localStorage) ومستقل عن بيانات النظام ---------- */
function applyMode(){const m=localStorage.getItem('kt_mode')||'light';document.documentElement.setAttribute('data-theme',m);const t=document.querySelector('meta[name=theme-color]');if(t)t.content=m==='dark'?'#0c1015':'#13233b'}
function toggleMode(){localStorage.setItem('kt_mode',(localStorage.getItem('kt_mode')||'light')==='dark'?'light':'dark');applyMode();const b=$('#modeb');if(b)b.textContent=modeIcon()}
const modeIcon=()=>(localStorage.getItem('kt_mode')||'light')==='dark'?'☀️':'🌙';
const _head0=head;head=function(t,b){_head0(t,b);const h=$('#hd');if(h&&!h.querySelector('#modeb')){const x=document.createElement('button');x.id='modeb';x.className='modeb';x.title='فاتح / داكن';x.textContent=modeIcon();x.onclick=toggleMode;h.appendChild(x)}if(window.__ksyP&&h&&!h.contains(window.__ksyP))h.appendChild(window.__ksyP)};
applyMode();

/* ---------- حجم الواجهة (الخط والأيقونات مع بعض): من 80% لـ 140%، بيتحفظ على الجهاز ---------- */
const getScale=()=>Math.min(140,Math.max(80,+localStorage.getItem('kt_scale')||100));
function applyScale(){const v=getScale();document.documentElement.style.zoom=v===100?'':v/100;const e=$('#scv');if(e)e.textContent=v+'%';const r=$('#scr');if(r)r.value=v}
function setScale(v){localStorage.setItem('kt_scale',Math.min(140,Math.max(80,Math.round(+v/5)*5)));applyScale()}
const _am=applyMode;applyMode=function(){_am();applyScale()};
const R_SET5=R['/settings'];R['/settings']=()=>`<div class="card"><h2>🔠 حجم الخط والأيقونات</h2><div class="scrow"><button class="btn sec" onclick="setScale(getScale()-5)">−</button><input id="scr" type="range" min="80" max="140" step="5" value="${getScale()}" oninput="setScale(this.value)"><button class="btn sec" onclick="setScale(getScale()+5)">＋</button><b id="scv">${getScale()}%</b></div><div class="row2" style="margin-top:8px"><button class="btn sec" onclick="setScale(90)">صغير</button><button class="btn sec" onclick="setScale(100)">عادي</button><button class="btn sec" onclick="setScale(120)">كبير</button></div><div class="s" style="font-size:12px;color:var(--mut);margin-top:6px">بيتطبق على النظام كله ويتحفظ على الجهاز ده بس.</div></div>`+R_SET5();
Object.assign(ROUTE_PERM,{'/dashset':'reports.view'});

/* ---------- قائمة المزيد بالأقسام: كل مجموعة أيقونة واحدة، وجواها الشاشات المرتبطة بيها ---------- */
const MORE_GROUPS=[
 {id:'inv',ic:'🧾',n:'الفواتير',d:'بيع وشراء ومرتجعات وعروض أسعار',it:[['🧾','فواتير البيع','#/invoices','sales.view'],['↩️','مرتجع مبيعات',"javascript:openDoc('sret')",'sales.return'],['🛒','فاتورة شراء',"javascript:openDoc('pur')",'purchases.add'],['↩️','مرتجع مشتريات',"javascript:openDoc('pret')",'purchases.return'],['📚','سجل المشتريات','#/log/pur','purchases.view'],['📝','عروض الأسعار','#/quotes','sales.view']]},
 {id:'stk',ic:'📦',n:'المخزون والأصناف',d:'أصناف ومخزون وجرد وتحويلات',it:[['📦','المنتجات','#/products','products.view,stock.view,sales.add,purchases.add'],['🧾','قائمة الأصناف والأسعار','#/pricelist','products.pricelist'],['📊','المخزون','#/stock','stock.view'],['🔁','تحويل / تحميل سيارة',"javascript:openDoc('tr')",'stock.transfer'],['⚖️','جرد وتسوية',"javascript:openDoc('adj')",'stock.adjust'],['🏭','المخازن والسيارات','#/places','stock.places'],['🎁','العروض التجارية','#/offers','products.edit']]},
 {id:'par',ic:'👥',n:'الحسابات',d:'عملاء وموردين في قائمة واحدة، رصيد وكشف حساب وتحصيل',it:[['👥','كل الحسابات','#/accounts','customers.view,suppliers.view,customers.statement,sales.add']]},
 {id:'fin',ic:'💰',n:'الخزينة والمصروفات',d:'الخزينة والمصروفات وملخص اليوم',it:[['💰','الخزينة','#/cash','cash.view'],['💸','المصروفات','#/expenses','expenses.add,cash.view'],]},
 {id:'rep',ic:'📈',n:'التقارير',d:'مبيعات وأرباح ومخزون وعملاء ومصروفات',grid:1,it:()=>RT.map(([k,n])=>{const ic=n.split(' ')[0],nm=n.slice(ic.length+1);return [ic,nm,"javascript:rpGo('"+k+"')",['profit','stockval'].includes(k)?'reports.profit':'reports.view',RPD[k]||'']}).concat([['📅','ملخص اليوم','#/eod','reports.view','إجمالي اليوم']])},
 {id:'hr',ic:'👔',n:'الموظفين',d:'كل موظف بحساب دخوله وصلاحياته ومرتبه وحضوره',it:[['👤','بطاقات الموظفين','#/hr/emps','hr.view'],['💵','المرتبات','#/hr/pay','hr.manage'],['➖','الخصومات والمكافآت','#/hr/ded','hr.manage'],['💳','السلف','#/hr/adv','hr.manage'],['🏖','الإجازات','#/hr/leave','hr.view'],['📍','الحضور والانصراف','#/hr/att','hr.view,hr.attendance'],['📌','ملاحظات إلزامية','#/mnotes','users.manage','ملاحظة للمندوب لازم يستلمها'],['💬','المحادثات','#/chat',null],['🔔','الإشعارات','#/notifs','users.manage']]},
 {id:'sys',ic:'⚙️',n:'النظام',d:'الإعدادات والرقابة والبحث',it:[['⚙️','الإعدادات','#/settings','settings.edit'],['🕵️','سجل الرقابة','#/audit','users.manage'],['📜','سجل النشاط (مين عمل إيه)','#/activity','users.manage'],['🔍','بحث شامل','#/search',null],['☁️','المزامنة السحابية','#/sync',null]]}];
const RPD={sales:'حسب الصنف أو المندوب أو العميل',profit:'ربح كل بند',top:'أعلى ٢٠ صنف',custs:'أعلى ٢٠ عميل',slow:'أصناف ما اتحركتش',stockval:'بالتكلفة وسعر البيع',expiry:'تواريخ انتهاء الأصناف',cashmv:'وارد ومنصرف الخزينة',perf:'مبيعات وتحصيل كل مندوب',comm:'عمولة كل مندوب',bal:'مديونيات العملاء',supbal:'اللي علينا للموردين',exps:'مصروفات حسب البند'};
const ITD={'بطاقات الموظفين':'بيانات وتواريخ كل موظف','المرتبات':'صرف مرتب الشهر','الخصومات والمكافآت':'خصم أو مكافأة لموظف','السلف':'سلف وخصم شهري','الإجازات':'طلبات واعتماد ورصيد','الحضور والانصراف':'بنطاق لوكيشن الشركة','فواتير البيع':'كل فواتير البيع','مرتجع مبيعات':'رجوع بضاعة من عميل','فاتورة شراء':'شراء من مورد','مرتجع مشتريات':'رجوع بضاعة لمورد','سجل المشتريات':'كل فواتير الشراء','عروض الأسعار':'عروض وتحويل لفاتورة','المنتجات':'الأصناف والأسعار','قائمة الأصناف والأسعار':'قائمة أسعار وبيانات أصناف للطباعة','المخزون':'الرصيد في كل مخزن','تحويل / تحميل سيارة':'نقل بضاعة بين الأماكن','جرد وتسوية':'مطابقة الرصيد الفعلي','المخازن والسيارات':'أماكن التخزين','العروض التجارية':'كميات وخصومات','العملاء وكشف الحساب':'بيانات وكشف حساب','تحصيل المديونيات':'تسجيل دفعات','الموردين':'بيانات وحسابات','الخزينة':'وارد ومنصرف','المصروفات':'تسجيل المصروفات','المستخدمين والصلاحيات':'أدوار وصلاحيات','المحادثات':'رسائل الفريق','الإشعارات':'تنبيهات المدير','الإعدادات':'بيانات الشركة والطباعة','سجل النشاط (مين عمل إيه)':'آخر العمليات والرقابة','بحث شامل':'دور في كل حاجة'};
function rpGo(k){RP.t=k;location.hash='#/reports'}
const moreItems=g=>(typeof g.it==='function'?g.it():g.it).filter(t=>canAny(t[3])&&!(t[2]==='#/hand'&&!handOn()));
R['/more']=()=>{head('المزيد');const G=MORE_GROUPS.filter(g=>moreItems(g).length);
 return `<a class="msearch" href="#/search">🔍 <span>بحث شامل في النظام</span></a><div class="mg">${G.map(g=>`<a class="mgc" href="#/grp/${g.id}"><i>${g.ic}</i><b>${g.n}</b><small>${g.d}</small><em>${moreItems(g).length}</em></a>`).join('')}</div>`};
R['/grp']=id=>{const g=MORE_GROUPS.find(x=>x.id===id);if(!g)return nf();head(g.n,true);
 if(1)return `<div class="mg">${moreItems(g).map(t=>`<a class="mgc" href="${t[2]}"><i>${t[0]}</i><b>${t[1]}</b><small>${t[4]||ITD[t[1]]||''}</small></a>`).join('')}</div>`;
 return `<div class="card mlist">${moreItems(g).map(t=>`<a class="mrow" href="${t[2]}"><i>${t[0]}</i><span>${t[1]}</span><em>‹</em></a>`).join('')}</div>`};


/* ---------- ترويسة الشركة (لوجو + اسم + عنوان) فوق كل مطبوع وPDF، وتتقفل من الإعدادات أو من زرار تحت المطبوع ---------- */
const _oaH=outAuto;
outAuto=function(){_oaH();const s=db.settings,pr=s.print||{},on=pr.head!==false;
 document.querySelectorAll('#app .out').forEach(e=>{
  [...e.children].forEach(x=>{if(x.classList&&x.classList.contains('phead'))x.remove()});
  e.classList.toggle('nohd',!on);
  if(!on||e.querySelector('.lh,.plsheet'))return;
  const ph=[s.phone,s.phone2].filter(Boolean).join(' - ');
  e.insertAdjacentHTML('afterbegin',`<div class="phead">${pr.logo===false?'':`<img src="${LOGO}" alt="">`}<div><b>${esc(s.name||'')}</b>${s.sub?`<span>${esc(s.sub)}</span>`:''}<small>${esc([s.addr,ph].filter(Boolean).join(' · '))}</small></div></div>`)});
 document.querySelectorAll('#app .obar').forEach(b=>{if(b.querySelector('.hdt'))return;
  b.insertAdjacentHTML('beforeend',`<label class="hdt"><input type="checkbox" ${on?'checked':''} onchange="togHead(this.checked)"> ترويسة الشركة في الطباعة</label>`)})};
function togHead(v){db.settings.print=Object.assign({},db.settings.print,{head:v});save();route()}


/* ---------- تقارير ملونة: مؤشرات + رسم أعمدة متحرك فوق الجدول (بتتبني من الجدول نفسه) ---------- */
const _oaR=outAuto;
outAuto=function(){_oaR();if(!location.hash.startsWith('#/reports'))return;
 const card=document.querySelector('#app .card.out');if(!card)return;const tb=card.querySelector('table');
 card.querySelectorAll('.rviz').forEach(x=>x.remove());if(!tb)return;
 const num=t=>{const v=parseFloat(String(t).replace(/[^\d.\-]/g,''));return isNaN(v)?null:v};
 const trs=[...tb.querySelectorAll('tr')],hd=[...trs[0].children].map(x=>x.textContent.trim());
 let rows=trs.slice(1),foot=null;const last=rows[rows.length-1];
 if(last&&last.style.fontWeight==='800'||(last&&/الإجمالي/.test(last.textContent))){foot=last;rows=rows.slice(0,-1)}
 const cols=hd.map((h,i)=>i).filter(i=>i>0&&rows.length&&rows.every(r=>num(r.children[i]&&r.children[i].textContent)!==null));
 if(!cols.length||!rows.length)return;
 const pref=['الربح','المبيعات','المشتريات','المبلغ','عليه','له عندنا','بالتكلفة','العمولة','الرصيد'];
 let ci=cols.find(i=>pref.includes(hd[i]));if(ci===undefined)ci=cols[cols.length-1];
 const PAL=['#1f6fd1','#17a2b8','#2b5aa1','#f0a500','#e4572e','#8e5bd6','#d6458f','#4c6a92'];
 const top=rows.slice(0,8).map(r=>({l:r.children[0].textContent.trim(),v:num(r.children[ci].textContent)}));
 const mx=Math.max(...top.map(x=>Math.abs(x.v)),1);
 let k='';
 if(foot){k=`<div class="kpis">${cols.slice(0,4).map((i,j)=>`<div class="kpi" style="--c:${PAL[j]}"><small>${hd[i]}</small><b>${foot.children[i].textContent}</b></div>`).join('')}</div>`}
 const bars=`<div class="rvb"><div class="rvt">${hd[ci]} (أعلى ${top.length})</div>${top.map((x,j)=>`<div class="rvr"><span>${esc(x.l)}</span><i style="--w:${Math.round(Math.abs(x.v)/mx*100)}%;--c:${x.v<0?'#d64545':PAL[j%8]};animation-delay:${j*70}ms"></i><em>${fmt(x.v)}</em></div>`).join('')}</div>`;
 tb.insertAdjacentHTML('beforebegin',`<div class="rviz">${k}${rows.length>1||!k?bars:''}</div>`);
 rows.forEach(r=>{[...r.children].forEach((c,i)=>{if(i===ci)c.classList.add('hl')})});
};

/* ---------- زر الرجوع فوق في كل شاشة (غير الرئيسية)، والهيدر ثابت مع السكرول ---------- */
const _hdB=head;
head=function(t,b){const h=location.hash.split('?')[0];_hdB(t,b||!(h===''||h==='#'||h==='#/'||h==='#/login'))};




/* =====================================================================
   الموارد البشرية: بطاقة موظف، مرتبات، خصومات، سلف، إجازات، حضور وانصراف بنطاق لوكيشن الشركة،
   ومراقبة التأخير والغياب. البيانات في db.staff / hrded / hradv / hrlv / hratt / hrpay (نفس طبقة البيانات).
   ===================================================================== */
function HRS(){['staff','hrded','hradv','hrlv','hratt','hrpay'].forEach(k=>db[k]=db[k]||[]);
 const s=db.settings;s.hr=s.hr||{start:'09:00',grace:15,end:'17:00',off:[5],radius:150,lat:'',lon:'',leaveDays:21};const h=s.hr;if(h.pen===undefined){h.pen=1;h.penLate=1;h.penAbs=1}if(h.useOut===undefined){h.useOut=1;h.acc=100}empSync(h);return h}
/* موظف واحد لكل شخص: كل مستخدم (مندوب، سواق، أمين مخزن، محاسب، مدير) له بطاقة موظف واحدة مربوطة بيه.
   المرتب والحضور والعمولة والسلف والخصومات كلها على بطاقة الموظف. بيشتغل مرة عند أول دخول للمدير وبيكمل أي مستخدم جديد. */
function empSync(h){if(typeof can!=='function'||!can('hr.manage')||!db.users)return;h.skip=h.skip||[];let n=0;
 if(!h.merged){try{const o=localStorage.getItem('kt_dbe');if(o)localStorage.setItem('kt_dbe_premerge',o)}catch(e){}}
 db.users.forEach(u=>{if(h.skip.includes(u.id)||db.staff.some(e=>e.uid==u.id))return;
  const same=db.staff.find(e=>!e.uid&&String(e.name||'').trim()===String(u.name||'').trim());if(same){same.uid=u.id;n++;return}
  db.staff.push({id:nid('hr'),name:u.name,job:u.emp||u.role==='rep'?'مندوب':({keeper:'أمين مخزن',accountant:'محاسب',manager:'مدير'})[u.role]||'',salary:+u.salary||0,allow:0,pen:'yes',st:'نشط',uid:u.id,field:(u.emp||u.role==='rep')?1:0});n++});
 if(!h.merged||n){h.merged=1;setTimeout(()=>{try{save()}catch(e){}},50)}}
const hrMin=t=>{const [h,m]=String(t||'0:0').split(':');return (+h||0)*60+(+m||0)};
const hrNow=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const hrEmp=id=>db.staff.find(x=>x.id==id)||{};
const hrOpts=(sel,all)=>(all?`<option value="">${all}</option>`:'')+db.staff.filter(e=>!hrOffE(e)).map(e=>`<option value="${e.id}" ${sel==e.id?'selected':''}>${esc(e.name)}</option>`).join('');
const hrDist=(a,b,c,d)=>{const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
let HRM=today().slice(0,7);
const hrDays=(m)=>{const [y,mo]=m.split('-').map(Number),n=new Date(y,mo,0).getDate(),o=[];for(let i=1;i<=n;i++)o.push(m+'-'+String(i).padStart(2,'0'));return o};
const onLeave=(eid,d)=>db.hrlv.some(l=>l.eid==eid&&l.st==='معتمدة'&&l.from<=d&&l.to>=d);
/* إحصائيات الحضور لموظف في فترة */
function attStats(e,from,to){const H=HRS(),td=today();let pres=0,late=0,lateMin=0,abs=0,early=0,leave=0,noOut=0;
 const dates=[];for(let t=new Date(from+'T12:00:00Z');t.toISOString().slice(0,10)<=to;t.setUTCDate(t.getUTCDate()+1))dates.push(t.toISOString().slice(0,10));
 dates.forEach(d=>{if(d>td||(e.hire&&d<e.hire)||hrSuspDay(e,d))return;const dow=new Date(d+'T12:00:00Z').getUTCDay();if((H.off||[]).includes(dow))return;
  const r=db.hratt.find(a=>a.eid==e.id&&a.date===d);
  if(r){pres++;const lm=hrMin(r.in)-hrMin(H.start);if(lm>(+H.grace||0)){late++;lateMin+=lm}if(H.useOut){if(r.out&&hrMin(r.out)<hrMin(H.end))early++;if(!r.out&&d<td)noOut++}}
  else if(onLeave(e.id,d))leave++;
  else if(d<td||hrMin(hrNow())>hrMin(H.end))abs++});
 return{pres,late,lateMin,abs,early,leave,noOut}}
function advLeft(a){return Math.max(0,+(a.amt-(a.repaid||0)).toFixed(2))}
/* حساب مرتب شهر: أساسي + بدلات − خصومات − خصم سلفة − خصم تأخير − خصم غياب (تلقائي من سجل الحضور) */
function payCalc(e,m){const H=HRS();const ded=db.hrded.filter(x=>x.eid==e.id&&x.k!=='bonus'&&x.date.startsWith(m)).reduce((s,x)=>s+x.amt,0);
 const inst=db.hradv.filter(a=>a.eid==e.id).reduce((s,a)=>s+Math.min(advLeft(a),+a.monthly||advLeft(a)),0);
 const base=+e.salary||0,allow=+e.allow||0,rec=db.hrpay.find(p=>p.eid==e.id&&p.month===m);
 let late=0,abs=0,lateMin=0,absDays=0;
 if(H.pen&&e.pen!=='no'&&!rec){const last=hrDays(m).slice(-1)[0],to=last>today()?today():last,st=attStats(e,m+'-01',to);
  const day=base/30,shift=Math.max(60,hrMin(H.end)-hrMin(H.start));lateMin=st.lateMin;absDays=st.abs;
  late=+(day/shift*lateMin*(+H.penLate||0)).toFixed(2);abs=+(day*absDays*(+H.penAbs||0)).toFixed(2)}
 if(rec){late=rec.late||0;abs=rec.abs||0;lateMin=rec.lateMin||0;absDays=rec.absDays||0}
 const X=hrExtra(e,m);
 if(rec){const fx=+rec.net||0,net=Math.max(0,+(fx+X.plus-X.minus).toFixed(2)),paid=hrPaid(rec)+X.paid,left=Math.max(0,+(net-paid).toFixed(2));return{base:rec.base,allow:rec.allow,ded:rec.ded,inst:rec.inst,late:rec.late||0,abs:rec.abs||0,lateMin:rec.lateMin||0,absDays:rec.absDays||0,net,fixed:fx,comm:X.comm,bonus:X.bonus,rec,paid,left}}
 const fx=Math.max(0,+(base+allow-ded-inst-late-abs).toFixed(2)),net=Math.max(0,+(fx+X.plus-X.minus).toFixed(2)),left=Math.max(0,+(net-X.paid).toFixed(2));return{base,allow,ded,inst,late,abs,lateMin,absDays,net,fixed:fx,comm:X.comm,bonus:X.bonus,rec,paid:X.paid,left}}
/* عمولة المندوب (من فواتيره) + المكافآت والإضافي. حركات المناديب القديمة (db.pay) بتتحسب هنا كمان: إضافي ومكافأة (+)، خصم (−)، صرف (اتصرف قبل كده) */
function hrExtra(e,m){let comm=0,plus=0,minus=0,paid=0,bonus=0;const u=e.uid&&db.users.find(x=>x.id==e.uid);
 if(u&&(u.emp||u.comm)&&typeof repComm==='function')comm=Math.max(0,+repComm(u,d=>d.startsWith(m)).comm.toFixed(2));
 db.hrded.filter(x=>x.eid==e.id&&x.k==='bonus'&&x.date.startsWith(m)).forEach(x=>bonus+=x.amt);
 if(u)(db.pay||[]).filter(x=>x.uid==u.id&&x.month===m).forEach(x=>{if(x.type==='ot'||x.type==='bonus')bonus+=x.amount;else if(x.type==='ded')minus+=x.amount;else if(x.type==='paid')paid+=x.amount});
 if(u)(db.rpay||[]).filter(x=>x.uid==u.id&&String(x.date||'').startsWith(m)).forEach(x=>paid+=x.amount);
 return{comm,bonus,plus:comm+bonus,minus,paid}}
/* المرتب ممكن يتصرف دفعة واحدة أو على دفعات. المتبقي بيتحسب لكل موظف وكل شهر. سجلات قديمة من غير دفعات = مصروفة كاملة */
const hrPaid=r=>r?(Array.isArray(r.pays)?r.pays.reduce((a,x)=>a+(+x.amt||0),0):(+r.net||0)):0;
const hrPill=(t,c)=>`<span class="pill ${c||''}">${t}</span>`;

/* ---------- مدخل الراوتر ---------- */
R['/hr']=(sub,id)=>{HRS();const sg=location.hash.slice(1).split('?')[0].split('/').filter(Boolean);if(sg[0]==='hr'&&sg[2])id=sg[2];const f={emps:hrEmps,emp:hrEmp1,ded:hrDed,adv:hrAdv,leave:hrLeave,att:hrAtt,pay:hrPay,attrep:hrAttRep,slip:hrSlip}[sub||'emps'];return f?f(id):nf()};
Object.assign(ROUTE_PERM,{'/hr':'hr.view'});

/* ---------- بطاقات الموظفين ---------- */
function hrEmps(){head('بطاقات الموظفين',true);const act=db.staff.filter(e=>!hrOffE(e));
 return `<button class="btn" data-need="hr.manage" onclick="location.hash='#/hr/emp/new'">＋ موظف جديد</button><div class="mg" style="margin-top:10px">${db.staff.map(e=>`<a class="mgc" href="#/hr/emp/${e.id}"><i>${esc((e.name||'?')[0])}</i><b>${esc(e.name)}</b><small>${esc(e.job||'')}${e.dept?' · '+esc(e.dept):''}</small><small>${e.hire?'📅 تعيين '+e.hire:''}</small><em>${e.st==='موقوف'?'موقوف':'نشط'}</em>${hrLoginBtn(e)}</a>`).join('')||'<div class="empty">لسه مفيش موظفين. دوس "موظف جديد".</div>'}</div>`}
function hrEmp1(id){head('بطاقة موظف',true);const H=HRS(),n=id==='new',e=n?{st:'نشط'}:hrEmp(id);if(!n&&!e.id)return nf();
 const m=today().slice(0,7),st=n?null:attStats(e,m+'-01',today()),pc=n?null:payCalc(e,m);
 const lv=n?0:db.hrlv.filter(l=>l.eid==e.id&&l.st==='معتمدة'&&l.type==='سنوية'&&l.from.startsWith(today().slice(0,4))).reduce((s,l)=>s+l.days,0);
 const adv=n?0:db.hradv.filter(a=>a.eid==e.id).reduce((s,a)=>s+advLeft(a),0);
 const F=(k,l,t)=>`<div><label>${l}</label><input id="e_${k}" type="${t||'text'}" value="${esc(e[k]||'')}"></div>`;
 const bd=e.birth?(()=>{const t=today(),b=t.slice(0,4)+e.birth.slice(4);const nb=b<t?(+t.slice(0,4)+1)+e.birth.slice(4):b;return daysTo(nb)})():null;
 return `${n?'':`<div class="card out"><h2>👤 ${esc(e.name)} ${hrPill(e.st==='موقوف'?'موقوف':'نشط',e.st==='موقوف'?'bad':'ok')}</h2><div class="s" style="color:var(--mut)">${esc(e.job||'')} ${e.dept?'· '+esc(e.dept):''} ${e.phone?'· '+esc(e.phone):''}</div>
 <div class="kpis" style="margin-top:10px"><div class="kpi" style="--c:#2b5aa1"><small>حضور الشهر</small><b>${st.pres} يوم</b></div><div class="kpi" style="--c:#f0a500"><small>تأخير</small><b>${st.late} مرة · ${st.lateMin} د</b></div><div class="kpi" style="--c:#e4572e"><small>غياب</small><b>${st.abs} يوم</b></div><div class="kpi" style="--c:#1f6fd1"><small>صافي مرتب الشهر</small><b>${fmt(pc.net)}</b></div></div>
 <div class="stat"><span>📅 تاريخ التعيين</span><b>${e.hire||'—'}${e.hire?' ('+Math.max(0,Math.floor((new Date()-new Date(e.hire))/864e5/30.4))+' شهر)':''}</b></div><div class="stat"><span>🎂 ميلاد</span><b>${e.birth||'—'}${bd!==null?' (بعد '+bd+' يوم)':''}</b></div><div class="stat"><span>📄 نهاية العقد</span><b>${e.contract||'—'}${e.contract&&daysTo(e.contract)<=30?' ⚠️':''}</b></div><div class="stat"><span>🏖 رصيد الإجازة السنوية</span><b>${(+H.leaveDays||21)-lv} من ${H.leaveDays||21} يوم</b></div><div class="stat"><span>💳 سلف متبقية</span><b>${fmt(adv)}</b></div>${e.loc?`<div class="stat"><span>🚚 العربية</span><b>${esc(locName(e.loc))}</b></div>`:''}${(()=>{const u=e.uid&&db.users.find(x=>x.id==e.uid);return u?`<div class="stat"><span>🔐 مستخدم التطبيق</span><b><a onclick="location.hash='#/user/${u.id}'" style="color:var(--g3)">${esc(u.username||u.name)} · ${esc(((db.roles||[]).find(r=>r.id===u.role)||{}).name||u.role||'')} ↗</a></b></div><div class="stat"><span>📍 الأماكن المسموحة</span><b>${(u.locs||[]).map(l=>esc(locName(l))).join('، ')||'كل الأماكن'}</b></div>${u.emp||u.comm?`<div class="stat"><span>💹 عمولة الشهر</span><b>${fmt(pc.comm||0)}</b></div>`:''}`:''})()}<div class="stat"><span>💰 المرتب الأساسي</span><b>${fmt(e.salary||0)}</b></div></div>`}
 <div class="card"><h2>${n?'موظف جديد':'تعديل البيانات'}</h2><div class="row2">${F('name','الاسم')}${F('job','الوظيفة')}</div><div class="row2">${F('dept','القسم')}${F('phone','التليفون','tel')}</div><div class="row2">${F('nid','الرقم القومي')}${F('birth','تاريخ الميلاد','date')}</div><div class="row2">${F('hire','تاريخ التعيين','date')}${F('contract','نهاية العقد','date')}</div><div class="row2">${F('salary','المرتب الأساسي','number')}${F('allow','بدلات شهرية (تضاف للمرتب)','number')}</div><div class="row2">${F('emerg','تليفون طوارئ','tel')}<div><label>خصم التأخير والغياب تلقائي</label><select id="e_pen"><option value="yes" ${e.pen!=='no'?'selected':''}>مفعّل</option><option value="no" ${e.pen==='no'?'selected':''}>لا (بدون حضور)</option></select></div></div>${F('addr','العنوان')}
 <div class="row2"><div><label>الحالة</label><select id="e_st"><option ${!hrOffE(e)?'selected':''}>نشط</option><option ${e.st==='موقوف'?'selected':''}>موقوف</option></select></div><div><label>العربية / المكان (للسواق)</label><select id="e_loc"><option value="">—</option>${db.wh.map(w=>`<option value="w${w.id}" ${e.loc==='w'+w.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div><div><label>تسجيل الحضور</label><select id="e_field"><option value="" ${e.field?'':'selected'}>جوه نطاق الشركة بس</option><option value="1" ${e.field?'selected':''}>من أي مكان (مندوب / سواق)</option></select></div><input type="hidden" id="e_uid" value="${e.uid||''}"><div></div></div>${F('notes','ملاحظات')}
 ${n?'':hrLoginCard(e)}${n?'':hrCarCard(e)}<button class="btn" data-need="hr.manage" onclick="hrSaveEmp('${id}')">💾 حفظ</button>${n?'':`<button class="btn del" data-need="hr.manage" onclick="hrDelEmp(${e.id})">🗑 حذف الموظف</button>`}</div>`}
function hrSaveEmp(id){const g=k=>($('#e_'+k)||{}).value||'';const name=g('name').trim();if(!name)return toast('اكتب اسم الموظف');
 const d={name,job:g('job').trim(),dept:g('dept').trim(),phone:g('phone').trim(),nid:g('nid').trim(),birth:g('birth'),hire:g('hire'),contract:g('contract'),salary:+g('salary')||0,allow:+g('allow')||0,pen:g('pen')||'yes',emerg:g('emerg').trim(),addr:g('addr').trim(),st:g('st'),uid:+g('uid')||0,field:g('field')?1:0,loc:g('loc'),notes:g('notes').trim()};
 if(id==='new'){if(!can('users.manage')){d.id=nid('hr');db.staff.push(d);save();toast('اتضاف ✅');location.hash='#/hr/emp/'+d.id;return}d.id=nid('hr');db.staff.push(d);d.uid=0;save();hrMkLogin(d.id,true)}else{Object.assign(hrEmp(id),d);save();toast('اتحفظ ✅');route()}}
function hrDelEmp(id){if(!confirm('حذف الموظف وكل سجلاته؟ حساب دخوله هيتوقف (والفواتير القديمة بإسمه تفضل).'))return;{const x=hrEmp(id);if(x.uid){const h=HRS();h.skip=h.skip||[];h.skip.push(x.uid);const u=db.users.find(z=>z.id==x.uid);if(u&&!(u.perms||[]).includes('*')&&u.id!=db.me)u.active=false}}db.staff=db.staff.filter(e=>e.id!=id);['hrded','hradv','hrlv','hratt','hrpay'].forEach(k=>db[k]=db[k].filter(x=>x.eid!=id));save();location.hash='#/hr/emps'}

/* ---------- الخصومات ---------- */
function hrDed(){head('الخصومات والمكافآت',true);const l=db.hrded.filter(x=>x.date.startsWith(HRM)).sort((a,b)=>b.date.localeCompare(a.date)),T=l.reduce((s,x)=>s+x.amt,0);
 return `<div class="card" data-need="hr.manage"><h2>＋ خصم أو مكافأة</h2><label>النوع</label><select id="d_k"><option value="">خصم (−)</option><option value="bonus">مكافأة / إضافي (+)</option></select><label>الموظف</label><select id="d_e">${hrOpts()}</select><div class="row2"><div><label>المبلغ</label><input id="d_a" type="number" inputmode="decimal"></div><div><label>التاريخ</label><input id="d_d" type="date" value="${today()}"></div></div><label>السبب</label><input id="d_r" placeholder="تأخير، غياب، تلفيات…"><button class="btn" onclick="hrAddDed()">حفظ</button></div>
 <div class="card out"><h2>خصومات ومكافآت شهر <input type="month" value="${HRM}" onchange="HRM=this.value;route()" style="width:auto;display:inline-block"></h2>${l.length?l.map(x=>`<div class="item"><div class="main"><div class="t">${esc(hrEmp(x.eid).name||'—')}</div><div class="s">${x.date} · ${x.k==='bonus'?'مكافأة · ':''}${esc(x.reason||'')}</div></div><div class="num ${x.k==='bonus'?'':'neg'}">${x.k==='bonus'?'+':''}${fmt(x.amt)}</div><button class="chipb" data-need="hr.manage" onclick="hrDel('hrded',${x.id})">✕</button></div>`).join('')+`<div class="stat"><span>الإجمالي</span><b>${fmt(T)}</b></div>`:'<div class="empty">مفيش خصومات أو مكافآت الشهر ده</div>'}</div>`}
function hrAddDed(){const a=+$('#d_a').value,e=+$('#d_e').value;if(!e)return toast('اختار موظف');if(!(a>0))return toast('اكتب المبلغ');db.hrded.push({id:nid('hr'),eid:e,amt:a,k:$('#d_k').value,date:$('#d_d').value||today(),reason:$('#d_r').value.trim()});save();toast('اتسجل ✅');route()}
function hrDel(k,id){if(!confirm('تأكيد الحذف؟'))return;db[k]=db[k].filter(x=>x.id!=id);save();route()}

/* ---------- السلف ---------- */
function hrAdv(){head('السلف',true);const l=[...db.hradv].sort((a,b)=>b.date.localeCompare(a.date)),T=l.reduce((s,a)=>s+advLeft(a),0);
 return `<div class="card" data-need="hr.manage"><h2>＋ سلفة جديدة</h2><label>الموظف</label><select id="a_e">${hrOpts()}</select><div class="row2"><div><label>المبلغ</label><input id="a_a" type="number" inputmode="decimal"></div><div><label>الخصم الشهري (بيتخصم من المرتب)</label><input id="a_m" type="number" inputmode="decimal"></div></div><label>ملاحظة</label><input id="a_n"><button class="btn" onclick="hrAddAdv()">حفظ السلفة</button></div>
 <div class="card out"><h2>السلف (المتبقي ${fmt(T)})</h2>${l.length?l.map(a=>`<div class="item"><div class="main"><div class="t">${esc(hrEmp(a.eid).name||'—')}</div><div class="s">${a.date} · خصم شهري ${fmt(a.monthly||0)} · سُدد ${fmt(a.repaid||0)} ${esc(a.note||'')}</div></div><div class="num ${advLeft(a)?'neg':''}">${advLeft(a)?fmt(advLeft(a)):'✅'}</div><button class="chipb" data-need="hr.manage" onclick="hrDel('hradv',${a.id})">✕</button></div>`).join(''):'<div class="empty">مفيش سلف</div>'}</div>`}
function hrAddAdv(){const a=+$('#a_a').value,e=+$('#a_e').value;if(!e)return toast('اختار موظف');if(!(a>0))return toast('اكتب المبلغ');db.hradv.push({id:nid('hr'),eid:e,amt:a,monthly:+$('#a_m').value||a,repaid:0,date:today(),note:$('#a_n').value.trim()});save();toast('اتسجلت ✅');route()}

/* ---------- الإجازات ---------- */
const lvDays=(a,b)=>Math.max(1,Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/864e5)+1);
function hrLeave(){head('الإجازات',true);const l=[...db.hrlv].sort((a,b)=>b.from.localeCompare(a.from));
 return `<div class="card" data-need="hr.manage"><h2>＋ إجازة جديدة</h2><label>الموظف</label><select id="l_e">${hrOpts()}</select><div class="row2"><div><label>النوع</label><select id="l_t"><option>سنوية</option><option>مرضي</option><option>عارضة</option><option>بدون مرتب</option></select></div><div><label>الحالة</label><select id="l_s"><option>معتمدة</option><option>معلقة</option></select></div></div><div class="row2"><div><label>من</label><input id="l_f" type="date" value="${today()}"></div><div><label>إلى</label><input id="l_to" type="date" value="${today()}"></div></div><label>ملاحظة</label><input id="l_n"><button class="btn" onclick="hrAddLv()">حفظ</button></div>
 <div class="card out"><h2>سجل الإجازات</h2>${l.length?l.map(x=>`<div class="item"><div class="main"><div class="t">${esc(hrEmp(x.eid).name||'—')} · ${x.type}</div><div class="s">${x.from} ← ${x.to} (${x.days} يوم) ${esc(x.note||'')}</div></div>${hrPill(x.st,x.st==='معتمدة'?'ok':x.st==='مرفوضة'?'bad':'warn')}${x.st==='معلقة'?`<button class="chipb" data-need="hr.manage" onclick="hrLvSt(${x.id},'معتمدة')">اعتماد</button><button class="chipb" data-need="hr.manage" onclick="hrLvSt(${x.id},'مرفوضة')">رفض</button>`:`<button class="chipb" data-need="hr.manage" onclick="hrDel('hrlv',${x.id})">✕</button>`}</div>`).join(''):'<div class="empty">مفيش إجازات</div>'}</div>`}
function hrAddLv(){const e=+$('#l_e').value,f=$('#l_f').value,t=$('#l_to').value;if(!e)return toast('اختار موظف');if(!f||!t||t<f)return toast('راجع التواريخ');db.hrlv.push({id:nid('hr'),eid:e,type:$('#l_t').value,st:$('#l_s').value,from:f,to:t,days:lvDays(f,t),note:$('#l_n').value.trim()});save();toast('اتسجلت ✅');route()}
function hrLvSt(id,s){db.hrlv.find(x=>x.id==id).st=s;save();route()}

/* ---------- الحضور والانصراف (بنطاق لوكيشن الشركة) ---------- */
let HAD='';
function hrAtt(){head('الحضور والانصراف',true);const H=HRS(),td=today(),mine=db.staff.find(e=>e.uid==db.me),canAll=can('hr.manage');if(!HAD)HAD=td;
 const stat=(e,d)=>{const r=db.hratt.find(a=>a.eid==e.id&&a.date===d),lm=r?hrMin(r.in)-hrMin(H.start):0,dow=new Date(d+'T12:00:00Z').getUTCDay();
  if(r)return lm>(+H.grace||0)?hrPill('متأخر '+lm+' د','warn'):hrPill('في الميعاد','ok');if(onLeave(e.id,d))return hrPill('إجازة');if((H.off||[]).includes(dow))return hrPill('عطلة');
  return d<td||hrMin(hrNow())>hrMin(H.start)+(+H.grace||0)?hrPill('غياب','bad'):hrPill('لسه')};
 const rows=(d)=>db.staff.filter(e=>!hrOffE(e)&&!hrSuspDay(e,d)&&(!e.hire||e.hire<=d)).map(e=>{const r=db.hratt.find(a=>a.eid==e.id&&a.date===d);
  return `<div class="item" style="flex-wrap:wrap"><div class="main"><div class="t">${esc(e.name)} ${r&&r.man?'<span class="pill">يدوي</span>':''}</div><div class="s">${r?'🟢 '+r.in+(H.useOut?(r.out?' · 🔴 '+r.out:(d<td?' · ⚠️ نسي الانصراف':' · لسه موجود')):'')+(r.inD!==undefined?' · '+r.inD+' م':''):'—'}</div></div>${stat(e,d)}${canAll&&r?`<div style="width:100%" class="noprint"><button class="chipb" onclick="hrDelAtt(${r.id})">🗑 مسح السجل</button>${H.useOut&&r.out?`<button class="chipb" onclick="hrClearOut(${r.id})">↩️ إلغاء الانصراف</button>`:''}</div>`:''}</div>`}).join('')||'<div class="empty">ضيف موظفين الأول</div>';
 const ready=H.lat!==''&&H.lon!=='';
 return `<div class="card"><h2>📍 تسجيل الآن · ${td} · ${hrNow()}</h2>${(mine&&!canAll)?`<div class="s">${esc(mine.name)}</div><input type="hidden" id="at_e" value="${mine.id}">`:`<label>الموظف</label><select id="at_e">${hrOpts(mine&&mine.id)}</select>`}
 <div class="row2"><button class="btn" onclick="hrCheck('in')">🟢 تسجيل حضور</button>${H.useOut?`<button class="btn sec" onclick="hrCheck('out')">🔴 تسجيل انصراف</button>`:''}</div><div id="at_msg" class="alert" style="margin-top:8px">${ready?`التسجيل بيشتغل بس وإنت جوه نطاق الشركة (${H.radius} متر). لازم تفعّل الموقع (GPS) على الموبايل. ميعاد الحضور ${H.start}.`:'<b>موقع الشركة لسه متحددش.</b> المدير يحدده من الإعدادات.'}${H.useOut?'':' (الانصراف متوقف: حضور بس)'}</div></div>
 <div class="card noprint"><label>📅 سجل يوم</label><input type="date" value="${HAD}" max="${td}" onchange="HAD=this.value;route()"></div>
 <div class="card out"><h2>🗓 سجل الحضور · ${HAD}${HAD===td?' (النهارده)':''}</h2>${rows(HAD)}</div>
 <a class="btn sec" href="#/hr/attrep" style="display:block;text-align:center;text-decoration:none">📊 تقرير الحضور والتأخير الشهري</a>
 <div class="card" data-need="hr.manage"><h2>✍️ تسجيل يدوي (لو موظف نسي أو الموبايل معطل)</h2><label>الموظف</label><select id="m_e">${hrOpts()}</select><div class="row2"><div><label>التاريخ</label><input id="m_d" type="date" value="${HAD}" max="${td}"></div><div><label>الحضور</label><input id="m_i" type="time" value="${H.start}"></div></div>${H.useOut?`<label>الانصراف (اختياري)</label><input id="m_o" type="time">`:''}<button class="btn" onclick="hrManual()">💾 حفظ السجل</button></div>
 <div class="card" data-need="hr.manage"><h2>⚙️ إجازات وخصومات</h2><label>أيام الإجازة الأسبوعية</label><div class="chips">${['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((n,i)=>`<label class="chk" style="margin:0"><input type="checkbox" class="h_off" value="${i}" ${(H.off||[]).includes(i)?'checked':''}> ${n}</label>`).join('')}</div>
 <div class="row2"><div><label>إجازة سنوية (يوم)</label><input id="h_ld" type="number" value="${H.leaveDays}"></div><div><label>خصم تلقائي للتأخير والغياب</label><select id="h_pen"><option value="1" ${H.pen?'selected':''}>مفعّل</option><option value="0" ${H.pen?'':'selected'}>متوقف</option></select></div></div><div class="row2"><div><label>معامل خصم التأخير</label><input id="h_pl" type="number" step="0.1" value="${H.penLate}"></div><div><label>خصم يوم الغياب (1 = يوم كامل)</label><input id="h_pa" type="number" step="0.5" value="${H.penAbs}"></div></div><button class="btn" onclick="hrSaveSet()">💾 حفظ</button><a class="btn sec" href="#/settings" style="display:block;text-align:center;text-decoration:none;margin-top:8px">🕘 وقت الحضور وموقع الشركة (من الإعدادات)</a></div>`}
function hrSaveSet(){const H=HRS();H.leaveDays=+$('#h_ld').value||21;H.pen=+$('#h_pen').value;H.penLate=+$('#h_pl').value;H.penAbs=+$('#h_pa').value;H.off=[...document.querySelectorAll('.h_off:checked')].map(x=>+x.value);save();toast('اتحفظت ✅');route()}
/* تحديد الموقع: بيراقب الإشارة ~12 ثانية ويختار أدق قراءة (أضمن من قراءة واحدة) */
function hrGeo(ok,no){if(!navigator.geolocation)return no('الجهاز مش بيدعم تحديد الموقع');let best=null,done=0,wid,tm;
 const fin=()=>{if(done)return;done=1;try{navigator.geolocation.clearWatch(wid)}catch(e){}clearTimeout(tm);best?ok(best):no('مقدرتش أجيب موقعك. فعّل الموقع (GPS) وسمح للمتصفح وجرّب تاني')};
 wid=navigator.geolocation.watchPosition(p=>{const c=p.coords;if(!best||c.accuracy<best.accuracy)best=c;if(c.accuracy<=25)fin()},e=>{if(e.code===1){done=1;clearTimeout(tm);try{navigator.geolocation.clearWatch(wid)}catch(x){}no('الموقع مرفوض. اسمح للمتصفح بالوصول للموقع من إعدادات الموبايل وجرّب تاني')}else if(!best)fin()},{enableHighAccuracy:true,maximumAge:0,timeout:15000});tm=setTimeout(fin,12000)}
let HRBUSY=0;
function hrCheck(kind){if(HRBUSY)return;const H=HRS(),e=+($('#at_e')||{}).value,msg=$('#at_msg'),fld=!!(hrEmp(e)||{}).field;if(!e)return toast('اختار الموظف');
 if(kind==='out'&&!H.useOut)return toast('الانصراف متوقف من الإعدادات');
 if(!fld&&(H.lat===''||H.lon===''))return toast('موقع الشركة لسه متحددش. المدير يحدده من الإعدادات');
 const td0=today(),r0=db.hratt.find(a=>a.eid==e&&a.date===td0);
 if(kind==='in'&&r0)return toast('الحضور متسجل النهارده الساعة '+r0.in);
 if(kind==='out'){if(!r0)return toast('مفيش حضور متسجل النهارده');if(r0.out)return toast('الانصراف متسجل الساعة '+r0.out)}
 HRBUSY=1;msg.style.display='block';msg.className='alert';msg.textContent='جاري تحديد موقعك… استنى ثواني';
 hrGeo(c=>{HRBUSY=0;const d=H.lat===''||H.lon===''?0:Math.round(hrDist(+H.lat,+H.lon,c.latitude,c.longitude)),acc=Math.round(c.accuracy||0),td=today();
  if(acc>(+H.acc||100)){msg.className='alert credit';msg.textContent='⚠️ دقة الموقع ضعيفة (±'+acc+' م). اطلع مكان مفتوح وفعّل GPS وجرّب تاني.';return}
  if(!fld&&d>(+H.radius||150)){msg.className='alert credit';msg.textContent='❌ إنت بعيد '+d+' متر عن الشركة (المسموح '+H.radius+' م). مينفعش تسجل من هنا.';return}
  const r=db.hratt.find(a=>a.eid==e&&a.date===td);
  if(kind==='in'){if(r)return toast('الحضور متسجل النهارده الساعة '+r.in);db.hratt.push({id:nid('hr'),eid:e,date:td,in:hrNow(),inD:d,inAcc:acc,by:db.me});const lm=hrMin(hrNow())-hrMin(H.start);save();toast(lm>(+H.grace||0)?'اتسجل حضور متأخر '+lm+' دقيقة':'اتسجل الحضور ✅');route()}
  else{if(!r)return toast('مفيش حضور متسجل النهارده');if(r.out)return toast('الانصراف متسجل الساعة '+r.out);r.out=hrNow();r.outD=d;save();toast('اتسجل الانصراف ✅');route()}},m=>{HRBUSY=0;msg.className='alert credit';msg.textContent=m})}
function hrManual(){const e=+$('#m_e').value,d=$('#m_d').value,i=$('#m_i').value,o=($('#m_o')||{}).value||'';if(!e||!d||!i)return toast('كمّل الموظف والتاريخ ووقت الحضور');if(o&&o<=i)return toast('وقت الانصراف لازم يكون بعد الحضور');
 let r=db.hratt.find(a=>a.eid==e&&a.date===d);if(r){r.in=i;if(o)r.out=o;r.man=1}else db.hratt.push({id:nid('hr'),eid:e,date:d,in:i,out:o||undefined,man:1,by:db.me});save();toast('اتحفظ ✅');route()}
function hrDelAtt(id){if(!confirm('مسح سجل الحضور ده؟'))return;db.hratt=db.hratt.filter(a=>a.id!=id);save();route()}
function hrClearOut(id){const r=db.hratt.find(a=>a.id==id);if(r){delete r.out;delete r.outD;save();toast('اتلغى الانصراف');route()}}
/* ---------- إعدادات الحضور وموقع الشركة (خريطة أو موقعي الحالي) ---------- */
const _rsH=R['/settings'];R['/settings']=()=>{const h=_rsH(),H=HRS(),ok=H.lat!==''&&H.lon!=='';
 const fr=ok?`<iframe title="map" style="width:100%;height:190px;border:0;border-radius:12px;margin-top:8px" src="https://www.openstreetmap.org/export/embed.html?bbox=${+H.lon-.004}%2C${+H.lat-.003}%2C${+H.lon+.004}%2C${+H.lat+.003}&layer=mapnik&marker=${H.lat}%2C${H.lon}"></iframe>`:'';
 return h+`<div class="card" data-need="settings.edit"><h2>🕘 الحضور والانصراف</h2><div class="row2"><div><label>وقت الحضور (بداية الدوام)</label><input id="s_s" type="time" value="${H.start}"></div><div><label>سماح التأخير (دقيقة)</label><input id="s_g" type="number" value="${H.grace}"></div></div>
 <div class="row2"><div><label>نهاية الدوام</label><input id="s_e" type="time" value="${H.end}"></div><div><label>تسجيل الانصراف</label><select id="s_out"><option value="1" ${H.useOut?'selected':''}>مفعّل</option><option value="0" ${H.useOut?'':'selected'}>متوقف (حضور بس)</option></select></div></div>
 <h2 style="margin-top:14px">📍 موقع الشركة</h2><div class="s" style="color:var(--mut)">${ok?'✅ متحدد: '+(+H.lat).toFixed(5)+' , '+(+H.lon).toFixed(5):'⚠️ لسه ما اتحددش'}</div>${fr}
 <div class="row2" style="margin-top:8px"><button class="btn" onclick="mapPick()">🗺 اختار من الخريطة</button><button class="btn sec" onclick="hrSetLoc()">📍 موقعي الحالي</button></div>
 <div class="row2"><div><label>خط العرض</label><input id="s_la" value="${H.lat}"></div><div><label>خط الطول</label><input id="s_lo" value="${H.lon}"></div></div>
 <label>المسافة المسموحة حوالين الشركة (متر)</label><input id="s_r" type="number" value="${H.radius}">
 <button class="btn" onclick="hrSaveLoc()">💾 حفظ إعدادات الحضور</button></div>`};
function hrSaveLoc(){const H=HRS(),la=$('#s_la').value.trim(),lo=$('#s_lo').value.trim();if((la||lo)&&(isNaN(+la)||isNaN(+lo)||Math.abs(+la)>90||Math.abs(+lo)>180))return toast('الإحداثيات غلط');
 const st=$('#s_s').value||'09:00',en=$('#s_e').value||'17:00';if(+$('#s_out').value&&en<=st)return toast('نهاية الدوام لازم تكون بعد وقت الحضور');
 H.start=st;H.end=en;H.grace=Math.max(0,+$('#s_g').value||0);H.lat=la;H.lon=lo;H.radius=Math.max(30,+$('#s_r').value||150);H.useOut=+$('#s_out').value;save();toast('اتحفظ ✅');route()}
function hrSetLoc(){hrGeo(c=>{if($('#s_la')){$('#s_la').value=c.latitude.toFixed(6);$('#s_lo').value=c.longitude.toFixed(6);toast('اتحدد موقعك (±'+Math.round(c.accuracy)+' م). دوس حفظ')}},m=>toast(m))}
function mapPick(){const H=HRS();const go=()=>{const o=document.createElement('div');o.id='mapov';o.style.cssText='position:fixed;inset:0;z-index:200;background:#fff;display:flex;flex-direction:column';
  o.innerHTML='<div style="padding:10px;display:flex;gap:8px;background:#0f2447"><button class="btn" id="mp_ok" style="margin:0;flex:1">✅ تأكيد الموقع</button><button class="btn sec" id="mp_me" style="margin:0;flex:1">📍 موقعي</button><button class="btn sec" id="mp_x" style="margin:0">✖</button></div><div id="kmap" style="flex:1"></div><div class="s" style="padding:6px;text-align:center">دوس على الخريطة (أو اسحب العلامة) عند مكان الشركة</div>';document.body.appendChild(o);
  const la=H.lat!==''?+H.lat:30.0444,lo=H.lon!==''?+H.lon:31.2357,m=L.map('kmap').setView([la,lo],H.lat!==''?17:12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);
  let mk=L.marker([la,lo],{draggable:true}).addTo(m),ci=L.circle([la,lo],{radius:+($('#s_r')||{}).value||+H.radius||150}).addTo(m);const mv=(a,b)=>{mk.setLatLng([a,b]);ci.setLatLng([a,b])};
  m.on('click',e=>mv(e.latlng.lat,e.latlng.lng));mk.on('drag',e=>ci.setLatLng(e.target.getLatLng()));
  $('#mp_me').onclick=()=>hrGeo(c=>{mv(c.latitude,c.longitude);m.setView([c.latitude,c.longitude],17)},mm=>toast(mm));
  $('#mp_x').onclick=()=>o.remove();$('#mp_ok').onclick=()=>{const p=mk.getLatLng();o.remove();if($('#s_la')){$('#s_la').value=p.lat.toFixed(6);$('#s_lo').value=p.lng.toFixed(6);toast('اتحدد. دوس حفظ')}};setTimeout(()=>m.invalidateSize(),200)};
 if(window.L)return go();const c=document.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';c.integrity='sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';c.crossOrigin='anonymous';document.head.appendChild(c);const sc=document.createElement('script');sc.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';sc.integrity='sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';sc.crossOrigin='anonymous';sc.onload=go;sc.onerror=()=>toast('الخريطة محتاجة إنترنت. استخدم موقعي الحالي أو اكتب الإحداثيات');document.body.appendChild(sc)}

/* ---------- تقرير الحضور والتأخير ---------- */
function attTable(from,to){const H=HRS(),U=!!H.useOut,rows=db.staff.filter(e=>!hrOffE(e)).map(e=>{const t=attStats(e,from,to);return[esc(e.name),t.pres,t.late,t.lateMin,t.abs,...(U?[t.early,t.noOut]:[]),t.leave]});
 if(!rows.length)return '<div class="empty">مفيش موظفين</div>';const sm=i=>rows.reduce((a,r)=>a+r[i],0);return rtbl(['الموظف','حضور','مرات تأخير','دقائق تأخير','غياب',...(U?['انصراف مبكر','نسي الانصراف']:[]),'إجازة'],rows,['الإجمالي','',sm(2),sm(3),sm(4),...(U?['','']:[]),''])}
function hrAttRep(){head('تقرير الحضور والتأخير',true);const f=HRM+'-01',t=hrDays(HRM).slice(-1)[0];
 return `<div class="card noprint"><label>الشهر</label><input type="month" value="${HRM}" onchange="HRM=this.value;route()"></div><div class="card out"><h2>⏱️ الحضور والتأخير · ${HRM}</h2>${attTable(f,t<today()?t:today())}</div>`}

/* ---------- المرتبات ---------- */
function hrPay(){head('المرتبات',true);const list=db.staff.filter(e=>!hrOffE(e)),rows=list.map(e=>({e,c:payCalc(e,HRM)})),T=rows.reduce((s,r)=>s+r.c.net,0),LT=rows.reduce((s,r)=>s+r.c.left,0);
 return `<div class="card noprint"><label>الشهر</label><input type="month" value="${HRM}" onchange="HRM=this.value;route()"></div>
 <div class="card out"><h2>💵 مرتبات ${HRM} (الإجمالي ${fmt(T)} · المتبقي ${fmt(LT)})</h2>${rows.length?rtbl(['الموظف','أساسي+بدلات','عمولة/مكافأة','خصومات','سلفة','تأخير','غياب','الصافي','المصروف','المتبقي','الحالة'],rows.map(({e,c})=>[esc(e.name),fmt(c.base+c.allow),fmt((c.comm||0)+(c.bonus||0)),fmt(c.ded),fmt(c.inst),fmt(c.late),fmt(c.abs),`<b>${fmt(c.net)}</b>`,fmt(c.paid),c.left>0?`<b class="neg">${fmt(c.left)}</b>`:'0',`<a class="chipb noprint" href="#/hr/slip/${e.id}">🧾</a> `+(c.rec&&c.left<=0?'✅ اتصرف كامل':`<button class="chipb noprint" data-need="hr.manage" onclick="hrPayOut(${e.id})">${c.rec?'صرف دفعة':'صرف'}</button>`)])):'<div class="empty">ضيف موظفين الأول</div>'}</div><div class="s" style="color:var(--mut);font-size:12px">تقدر تصرف المرتب كله مرة واحدة أو على دفعات، والمتبقي بيتحسب لكل موظف. كل دفعة بتتسجل مصروف مرتبات في الخزينة، وخصم السلفة بيتحسب مرة واحدة مع أول دفعة.</div>`}
function hrPayOut(id){const e=hrEmp(id),c=payCalc(e,HRM);if(c.rec&&c.left<=0)return toast('اتصرف كامل قبل كده');const left=c.left;
 if(left<=0){if(!confirm('صافي المرتب صفر. تسجيله كمصروف؟'))return;return hrPayDo(id,0)}
 const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:98;background:#0009;display:flex;align-items:center;justify-content:center;padding:20px';
 d.innerHTML=`<div class="card" style="width:100%;max-width:380px"><h2>💵 صرف مرتب ${esc(e.name)} · ${HRM}</h2><div class="stat"><span>الصافي</span><b>${fmt(c.net)}</b></div><div class="stat"><span>اتصرف</span><b>${fmt(c.paid)}</b></div><div class="stat"><span>المتبقي</span><b>${fmt(left)}</b></div><label>المبلغ اللي هيتصرف دلوقتي</label><input id="hp_a" type="number" inputmode="decimal" value="${left}"><div class="er" id="hp_e" style="color:#c0392b;font-size:13px;min-height:18px;margin-top:6px"></div><div class="row2"><button class="btn" style="margin:0" id="hp_ok">صرف</button><button class="btn sec" style="margin:0" id="hp_no">إلغاء</button></div></div>`;
 document.body.appendChild(d);document.getElementById('hp_no').onclick=()=>d.remove();
 document.getElementById('hp_ok').onclick=()=>{const a=+document.getElementById('hp_a').value;if(!(a>0))return document.getElementById('hp_e').textContent='اكتب مبلغ أكبر من صفر';if(a>left+0.001)return document.getElementById('hp_e').textContent='المبلغ أكبر من المتبقي ('+fmt(left)+')';d.remove();hrPayDo(id,a)}}
function hrPayDo(id,a){const e=hrEmp(id),c=payCalc(e,HRM);let rec=c.rec;
 if(!rec){db.hradv.filter(x=>x.eid==id).forEach(x=>{const p=Math.min(advLeft(x),+x.monthly||advLeft(x));x.repaid=(x.repaid||0)+p});
  rec={id:nid('hr'),eid:id,month:HRM,net:c.fixed,ded:c.ded,inst:c.inst,base:c.base,allow:c.allow,late:c.late,abs:c.abs,lateMin:c.lateMin,absDays:c.absDays,date:today(),pays:[]};db.hrpay.push(rec)}
 if(!Array.isArray(rec.pays))rec.pays=[{date:rec.date,amt:rec.net}];
 if(a>0){rec.pays.push({id:nid('hr'),date:today(),ts:Date.now(),amt:+a,by:db.me});const left=+(rec.net-hrPaid(rec)).toFixed(2);
  db.exps.push({id:nid('exp'),date:today(),ts:Date.now(),by:db.me,cat:'مرتبات',amount:+a,note:'مرتب '+e.name+' '+HRM+(left>0?' (دفعة، متبقي '+fmt(left)+')':'')})}
 save();toast('اتصرف ✅');route()}

/* ---------- ربط بالقوائم والتقارير والرئيسية ---------- */
RT.push(['attlate','⏱️ الحضور والتأخير']);
const _rbH=repBody;repBody=function(t,PR){if(t==='attlate'){HRS();return attTable(RP.from,RP.to)}return _rbH(t,PR)};
const _dashHR=R['/'];R['/']=()=>{let h=_dashHR();if(!can('hr.view'))return h;HRS();const td=today(),H=db.settings.hr,A=db.staff.filter(e=>!hrOffE(e));if(!A.length)return h;
 let p=0,l=0,a=0;const late=[];A.forEach(e=>{const r=db.hratt.find(x=>x.eid==e.id&&x.date===td);if(r){p++;const m=hrMin(r.in)-hrMin(H.start);if(m>(+H.grace||0)){l++;late.push(e.name+' '+m+'د')}}else if(!onLeave(e.id,td)&&hrMin(hrNow())>hrMin(H.start)+(+H.grace||0))a++});
 return `<div class="card"><h2>👔 الحضور النهارده</h2><div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi" style="--c:#2b5aa1"><small>حاضر</small><b>${p}</b></div><div class="kpi" style="--c:#f0a500"><small>متأخر</small><b>${l}</b></div><div class="kpi" style="--c:#e4572e"><small>لم يحضر</small><b>${a}</b></div></div>${late.length?`<div class="s" style="color:var(--mut);margin-top:6px">⏰ ${esc(late.join(' · '))}</div>`:''}<button class="btn sec" onclick="location.hash='#/hr/att'">الحضور والانصراف ›</button></div>`+h};

/* قسيمة مرتب قابلة للطباعة/PDF/واتساب (نفس أزرار الطباعة العامة) */
function hrSlip(id){head('قسيمة مرتب',true);const e=hrEmp(id);if(!e.id)return nf();const c=payCalc(e,HRM),R=(l,v,cl)=>v?`<div class="stat"><span>${l}</span><b class="${cl||''}">${fmt(v)}</b></div>`:'';
 return `<div class="card noprint"><label>الشهر</label><input type="month" value="${HRM}" onchange="HRM=this.value;route()"></div>
 <div class="card out"><h2>🧾 قسيمة مرتب · ${HRM}</h2><div class="stat"><span>الموظف</span><b>${esc(e.name)}</b></div><div class="stat"><span>الوظيفة</span><b>${esc(e.job||'—')}${e.dept?' · '+esc(e.dept):''}</b></div>
 ${R('المرتب الأساسي',c.base)}${R('بدلات',c.allow)}${R('عمولة المبيعات',c.comm)}${R('مكافآت وإضافي',c.bonus)}${R('خصومات',-c.ded&&c.ded,'neg')}${R('خصم سلفة',c.inst,'neg')}${R('خصم تأخير ('+c.lateMin+' دقيقة)',c.late,'neg')}${R('خصم غياب ('+c.absDays+' يوم)',c.abs,'neg')}
 <div class="tot"><div class="r grand"><span>الصافي</span><span>${fmt(c.net)} ج.م</span></div></div><div class="s" style="color:var(--mut)">${c.rec?(c.left>0?'⏳ اتصرف '+fmt(c.paid)+' والمتبقي '+fmt(c.left):'✅ اتصرف كامل'):'لسه ما اتصرفش'}${c.rec&&Array.isArray(c.rec.pays)&&c.rec.pays.length?'<div style="margin-top:6px">'+c.rec.pays.map(p=>'<div class="stat"><span>دفعة '+p.date+'</span><b>'+fmt(p.amt)+'</b></div>').join('')+'</div>':''}</div><div class="s" style="margin-top:22px;display:flex;justify-content:space-between"><span>توقيع الموظف: ________</span><span>المحاسب: ________</span></div></div>`}


/* السواقين: الموظف المربوط بعربية (e.loc) بيظهر في شاشة المخزون عند اختيار العربية، ومرتبه من كشف المرتبات */
function stDrvHtml(){HRS();const l=(typeof stLoc!=='undefined'&&stLoc!=='all')?[stLoc]:db.staff.filter(e=>e.loc&&!hrOffE(e)).map(e=>e.loc);
 const ds=db.staff.filter(e=>e.loc&&!hrOffE(e)&&l.includes(e.loc));
 return ds.length?'<div class="s" style="margin-top:8px;font-size:13px">'+ds.map(e=>'🧑‍✈️ السواق: <b>'+esc(e.name)+'</b> · '+esc(locName(e.loc))+(e.phone?' · '+esc(e.phone):'')).join('<br>')+'</div>':''}

/* حضور وانصراف سريع من الرئيسية لأي مستخدم مربوط ببطاقة موظف. التسجيل نفسه هو hrCheck (GPS + وقت + سينك) وبيدخل في تقرير التأخير والمرتبات */
const _dashAtt=R['/'];R['/']=()=>{const h=_dashAtt();HRS();const e=db.staff.find(x=>x.uid==db.me&&x.st!=='موقوف');if(!e)return h;const H=db.settings.hr,td=today(),r=db.hratt.find(a=>a.eid==e.id&&a.date===td);
 const st=!r?'لسه ما سجلتش حضور النهارده':'🟢 حضور '+r.in+(r.out?' · 🔴 انصراف '+r.out:'');
 const btn=!r?`<button class="btn" onclick="hrCheck('in')">🟢 تسجيل حضور</button>`:(H.useOut&&!r.out?`<button class="btn sec" onclick="hrCheck('out')">🔴 تسجيل انصراف</button>`:'<div class="s" style="color:#1c4b92">✅ تم تسجيل اليوم</div>');
 return `<div class="card"><h2>⏱️ حضوري · ${hrNow()}</h2><input type="hidden" id="at_e" value="${e.id}"><div class="s" style="margin-bottom:8px">${esc(e.name)} · ${st}</div>${btn}<div id="at_msg" class="alert" style="margin-top:8px;display:none"></div></div>`+h};

/* المناديب والموظفين شاشة واحدة: شاشات المناديب القديمة بتحوّل على بطاقة الموظف / كشف المرتبات */
window.addEventListener('load',()=>{
 R['/reps']=()=>{head('الموظفين',true);setTimeout(()=>{location.hash='#/hr/emps'},0);return ''};
 R['/rep']=id=>{head('الموظفين',true);const e=db.staff.find(x=>x.uid==id);setTimeout(()=>{location.hash=e?'#/hr/emp/'+e.id:'#/hr/emps'},0);return ''}});


/* ---------- إيقاف / تفعيل دخول الموظف من غير حذفه ----------
   الإيقاف بيقفل تسجيل الدخول (u.active=false) والبيانات والسجل كله زي ما هو. التفعيل بيرجعه. المدير الأساسي وحسابك أنت مينفعش يتوقفوا. */
const hrUsr=e=>e&&e.uid?db.users.find(u=>u.id==e.uid):null;
const hrCanSusp=e=>{const u=hrUsr(e);return !!u&&can('users.manage')&&!(u.perms||[]).includes('*')&&u.id!=db.me};
const hrOff=e=>{const u=hrUsr(e);return !!u&&u.active===false};
function hrLoginBtn(e){if(hrOff(e))return '<span class="pill bad" style="margin-top:4px">⛔ الدخول موقوف</span>'+(hrCanSusp(e)?`<button class="chipb" onclick="event.preventDefault();event.stopPropagation();hrSusp(${e.id})">▶ تفعيل</button>`:'');
 return hrCanSusp(e)?`<button class="chipb" onclick="event.preventDefault();event.stopPropagation();hrSusp(${e.id})">⏸ إيقاف الدخول</button>`:''}
function hrLoginCard(e){const u=hrUsr(e);
 if(!u)return can('users.manage')?`<div class="card noprint"><h2>🔐 حساب الدخول <span class="pill bad">مش متعمل</span></h2><div class="s" style="color:var(--mut);margin-bottom:8px">كل موظف لازم له حساب دخول. اعمله من هنا (اسم مستخدم وباسورد وصلاحيات).</div><button class="btn" onclick="hrMkLogin(${e.id})">➕ إنشاء حساب الدخول</button></div>`:'';
 const off=u.active===false,all=(u.perms||[]).includes('*');
 return `<div class="card noprint"><h2>🔐 حساب الدخول ${off?'<span class="pill bad">موقوف</span>':'<span class="pill ok">شغال</span>'}</h2>
 <div class="stat"><span>اسم المستخدم</span><b>${esc(u.username||'')}</b></div><div class="stat"><span>الصلاحيات</span><b>${all?'كل الصلاحيات':(u.perms||[]).length+' صلاحية'}</b></div>
 <div class="s" style="color:var(--mut);margin:6px 0">${off?'الموظف مش قادر يدخل. بياناته وسجله محفوظين.':'إيقاف الدخول بيمنعه من التطبيق من غير ما يتمسح أي حاجة.'}</div>
 ${can('users.manage')?`<button class="btn sec" onclick="uf=null;location.hash='#/user/${u.id}'">🔑 الباسورد والصلاحيات والأماكن</button>`:''}
 ${hrCanSusp(e)?`<button class="btn ${off?'':'del'}" onclick="hrSusp(${e.id})">${off?'▶ تفعيل الدخول':'⏸ إيقاف الدخول'}</button>`:''}</div>`}
/* إنشاء حساب دخول لموظف: بيفتح محرر الدخول والصلاحيات بالبيانات جاهزة، وبعد الحفظ الحساب بيتربط بالبطاقة لوحده */
function hrMkLogin(eid,fresh){const e=hrEmp(eid);if(!e.id)return;window.__pendEmp=e.id;const rep=!!(e.field||/مندوب/.test(e.job||''));
 const T=(typeof TEMPLATES!=='undefined'&&TEMPLATES.accountant)?TEMPLATES.accountant.perms:[];
 uf={key:'new',u:{name:e.name,phone:e.phone||'',addr:e.addr||'',username:'',role:rep?'rep':'accountant',perms:[...T],locs:[],emp:rep,salary:+e.salary||0,comm:0,commSec:{},commProd:{},maxDisc:0}};
 if(fresh)toast('اتحفظت بيانات الموظف. كمّل حساب الدخول');location.hash='#/user/new'}
function hrSusp(id){const e=hrEmp(id),u=hrUsr(e);if(!e||!u||!hrCanSusp(e))return toast('مش مسموح');const off=u.active===false;
 if(!confirm(off?'تفعّل دخول '+e.name+'؟':'توقف دخول '+e.name+'؟ مش هيعرف يدخل لحد ما ترجعه، والبيانات محفوظة.'))return;
 u.active=off?true:false;hrSuspMark(e,!off);try{audit(off?'تفعيل دخول':'إيقاف دخول',e.name)}catch(x){}save();toast(off?'اتفعّل ✅':'اتوقف الدخول ⏸');route()}
/* لو حسابي اتوقف من جهاز تاني، بيخرّجني عند أول مزامنة */
window.addEventListener('load',()=>{setInterval(()=>{try{const u=db&&db.users&&db.users.find(x=>x.id==db.me);if(u&&u.active===false&&window.Auth&&Auth.lock)Auth.lock()}catch(e){}},15000)});


/* ---------- الموظف والمستخدم واحد: ربط تلقائي وتوجيه ---------- */
window.addEventListener('load',()=>{
 R['/users']=()=>{head('الموظفين',true);setTimeout(()=>{location.hash='#/hr/emps'},0);return ''};
 const _su=saveUser;saveUser=async function(id){const n0=db.users.length,pend=window.__pendEmp;const k0=uf&&uf.u?uf.u.username:'';await _su(id);
  if(id==='new'&&db.users.length>n0){const u=db.users[db.users.length-1];let e=pend&&db.staff.find(x=>x.id==pend);
   if(!e){e=db.staff.find(x=>!x.uid&&String(x.name||'').trim()===String(u.name||'').trim())}
   if(e){e.uid=u.id;e.salary=e.salary||+u.salary||0;if(u.emp)e.field=e.field||1}else{HRS()}
   window.__pendEmp=0;save();if(e)location.hash='#/hr/emp/'+e.id;return}
  const e=db.staff.find(x=>x.uid==id);if(e)location.hash='#/hr/emp/'+e.id};
 const _ru=R['/user'];R['/user']=(id,qs)=>{const h=_ru(id,qs);const t=document.querySelector('#hd h1');if(t&&uf&&uf.u)t.textContent=id==='new'?'حساب دخول '+(uf.u.name||'الموظف'):'الدخول والصلاحيات · '+(uf.u.name||'');return h}});

/* رصيد سيارة الموظف (كان في صفحة المندوب): مخزن الموظف أو الأماكن المسموحة له */
function hrCarCard(e){const u=hrUsr(e);const L=e.loc?[e.loc]:((u&&u.locs)||[]).filter(l=>l[0]==='c'||l[0]==='w');if(!L.length)return '';
 return `<div class="card"><h2>🚚 رصيد السيارة / المخزن</h2>${L.map(l=>{const it=db.products.filter(p=>qtyAt(l,p.id)>0);return `<div class="s" style="margin:6px 0"><b>${esc(locName(l))}</b></div>`+(it.slice(0,40).map(p=>`<div class="stat"><span>${esc(p.name)}</span><b>${fmt(qtyAt(l,p.id))} ${esc(p.unit||'')}</b></div>`).join('')||'<div class="empty">فاضية</div>')+(it.length>40?`<div class="s">وأكتر (${it.length-40}). شوف شاشة المخزون.</div>`:'')}).join('')}</div>`}

/* ===== الموظف الموقوف دخوله: مفيش غياب ولا خصم تلقائي طول فترة الإيقاف، ويرجع الحساب لما يتفعّل (السجلات القديمة زي ما هي) =====
   e.susp = [{from,to}] فترات الإيقاف (to فاضية = لسه موقوف) */
function hrSuspMark(e,on){if(!e)return;e.susp=e.susp||[];const o=e.susp.find(p=>!p.to);if(on&&!o)e.susp.push({from:today()});if(!on&&o)o.to=today()}
function hrSuspDay(e,d){try{const u=e.uid?db.users.find(x=>x.id==e.uid):null;if(u&&u.active===false&&!(e.susp||[]).some(p=>!p.to)){hrSuspMark(e,true);setTimeout(()=>{try{save()}catch(x){}},0)}}catch(x){}
 return (e.susp||[]).some(p=>d>=p.from&&(!p.to||d<p.to))}

/* موظف مش بيدخل الحسابات: موقوف كحالة موظف أو دخوله متوقف (بياناته كلها محفوظة، بس مش بيتحسب في المرتبات والحضور والغياب والتقارير) */
function hrOffE(e){if(e.st==='موقوف')return true;const u=e.uid?db.users.find(x=>x.id==e.uid):null;return !!u&&u.active===false}

/* ===== الحسابات: قائمة واحدة للعملاء والموردين =====
   الحساب ممكن يبقى عميل ومورد في نفس الوقت (فاتحين على بعض): رصيد واحد صافي وكشف واحد.
   الربط محفوظ على السجلين: c.sid (المورد) و s.cid (العميل). الربط التلقائي بالاسم أو التليفون بيتحسب وقت العرض من غير ما يغير بيانات.
   طبقة البيانات (db.customers / db.suppliers) زي ما هي، والدمج على مستوى العرض والكشف. */
const aclDig=p=>String(p||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g,'');
const aclNm=n=>String(n||'').replace(/\s+/g,' ').trim().toLowerCase();
const aclPh=x=>[x.phone,x.phone2,x.phone3].map(aclDig).filter(p=>p.length>=8).map(p=>p.slice(-9));
/* أزواج الحسابات: [{c,s}] مع c أو s ممكن يبقى فاضي */
function aclList(){
 const C=db.customers||[],S=db.suppliers||[],used={},out=[];
 const sById=id=>S.find(s=>s.id==id),cById=id=>C.find(c=>c.id==id);
 C.forEach(c=>{let s=c.sid?sById(c.sid):null;if(s&&s.cid&&s.cid!=c.id)s=null;
  if(!s&&!c.nolink&&c.sid==null){const ph=aclPh(c);s=S.find(x=>!used['s'+x.id]&&!x.nolink&&(!x.cid||x.cid==c.id)&&((aclNm(x.name)&&aclNm(x.name)===aclNm(c.name))||(ph.length&&aclPh(x).some(p=>ph.includes(p)))))||null}
  if(s)used['s'+s.id]=1;used['c'+c.id]=1;out.push({c,s})});
 S.forEach(s=>{if(used['s'+s.id])return;const c=s.cid?cById(s.cid):null;if(c&&used['c'+c.id])return;out.push({c:null,s})});
 return out}
const aclKey=a=>a.c?'c'+a.c.id:'s'+a.s.id;
const aclName=a=>(a.c||a.s).name;
function aclNet(a){let n=0;if(a.c){recalc(a.c);n+=+a.c.balance||0}if(a.s)n-=supBal(a.s);return +n.toFixed(2)}
function aclFind(key){const m=String(key).match(/^([cs])(\d+)$/);if(!m)return null;return aclList().find(a=>(m[1]==='c'?a.c&&a.c.id==m[2]:a.s&&a.s.id==m[2]))||null}
let ACL={q:'',f:'all'};
function aclRows(){const q=ad(ACL.q).trim(),d=q.replace(/\D/g,'');
 let l=aclList().filter(a=>{if(!q)return true;const x=[a.c,a.s].filter(Boolean);return x.some(y=>y.name.includes(q)||(d.length>0&&[y.phone,y.phone2,y.phone3].filter(Boolean).some(p=>aclDig(p).includes(d))))});
 l=l.map(a=>({a,n:aclNet(a)}));
 if(ACL.f==='owe')l=l.filter(r=>r.n>0.5);else if(ACL.f==='due')l=l.filter(r=>r.n<-0.5);
 l.sort((x,y)=>Math.abs(y.n)-Math.abs(x.n)||aclName(x.a).localeCompare(aclName(y.a),'ar'));return l}
function aclDraw(){const e=$('#acl');if(!e)return;const l=aclRows();
 e.innerHTML=l.length?l.map(({a,n})=>{const ph=(a.c||a.s).phone||'',role=a.c&&a.s?'عميل ومورد':a.c?'عميل':'مورد';
  return `<div class="item" onclick="location.hash='#/account/${aclKey(a)}'"><div class="main"><div class="t">${esc(aclName(a))}</div><div class="s">${esc(ph)}${ph?' · ':''}${role}</div></div><div style="text-align:left"><div class="num ${n>0.5?'neg':''}">${fmt(Math.abs(n))}</div><div class="s">${n>0.5?'ج.م عليه':n<-0.5?'ج.م له':'متصفّر'}</div></div></div>`}).join(''):'<div class="empty">مفيش حسابات بالشكل ده</div>'}
function aclSet(k,v){ACL[k]=v;if(k==='f')route();else aclDraw()}
R['/accounts']=()=>{head('الحسابات');const L=aclList().map(a=>aclNet(a));const owe=L.filter(n=>n>0.5).reduce((a,n)=>a+n,0),due=-L.filter(n=>n<-0.5).reduce((a,n)=>a+n,0);
 const ch=(k,t)=>`<button class="${ACL.f===k?'on':''}" onclick="aclSet('f','${k}')">${t}</button>`;
 return `<input class="search" placeholder="🔍 ابحث بالاسم أو الرقم" value="${esc(ACL.q)}" oninput="aclSet('q',this.value)">
 <div class="seg" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:10px">${ch('all','الكل')}${ch('owe','عليهم')}${ch('due','لهم')}</div>
 <div class="card"><div class="stat"><span>إجمالي اللي علينا لهم</span><b>${fmt(due)}</b></div><div class="stat"><span>إجمالي اللي علينا منهم</span><b class="neg">${fmt(owe)}</b></div></div>
 <div class="card" id="acl"></div>
 ${can('customers.collect')?`<div class="bar"><button onclick="location.hash='#/collect'">💰 تحصيل المديونيات</button></div>`:''}
 <button class="fab" onclick="location.hash='#/account/new'">＋ حساب</button>`};
function aclEvents(a){const ev=[];if(a.c)custEv(a.c).forEach(e=>ev.push({...e}));
 if(a.s)supEv(a.s).forEach(e=>ev.push({d:e.d,t:e.t,desc:e.desc,db:e.cr,cr:e.db,link:e.link?(e.link.startsWith('pur')||e.link.startsWith('pret')?'rec/'+e.link:e.link):''}));
 ev.sort((x,y)=>(x.d||'').localeCompare(y.d||'')||(x.t||0)-(y.t||0));let b=0;ev.forEach(e=>{b+=e.db-e.cr;e.bal=b});return ev}
R['/account']=id=>{
 if(id==='new'){head('حساب جديد',true);return `<div class="card"><div style="margin-bottom:10px">الحساب ده هيبقى:</div><div class="bar"><button onclick="location.hash='#/customer/new'">👤 بنبيع له</button><button onclick="location.hash='#/supplier/new'">🏭 بنشتري منه</button></div><div class="s" style="margin-top:10px;color:var(--mut)">تقدر بعد كده تخليه الاتنين من صفحة الحساب.</div></div>`}
 const a=aclFind(id);if(!a){head('الحساب',true);return nf()}
 head(aclName(a),true);const n=aclNet(a),ev=aclEvents(a),x=a.c||a.s;
 const others=a.c&&!a.s?db.suppliers.filter(s=>!s.cid||!db.customers.some(c=>c.id==s.cid)):(!a.c&&a.s?db.customers.filter(c=>!c.sid||!db.suppliers.some(s=>s.id==c.sid)):[]);
 return `<div class="card"><div class="stat"><span>الرصيد</span><b class="${n>0.5?'neg':''}" style="font-size:20px">${fmt(Math.abs(n))} ج.م ${n>0.5?'عليه':n<-0.5?'له':''}</b></div>
 ${a.c&&a.s?`<div class="stat"><span>كعميل (عليه لينا)</span><b>${fmt(a.c.balance)}</b></div><div class="stat"><span>كمورد (علينا له)</span><b>${fmt(supBal(a.s))}</b></div><div class="s" style="color:var(--mut)">الرصيد الصافي = اللي عليه لينا ناقص اللي علينا له.</div>`:''}
 <div class="s" style="margin-top:6px">${esc(x.phone||'')} ${esc(x.addr||'')}</div></div>
 <div class="bar">${a.c?`<button onclick="location.hash='#/invoice/new';draft.cid=${a.c.id}">🧾 فاتورة بيع</button>`:''}${a.s?`<button onclick="openDoc('pur',{party:${a.s.id}})">🛒 فاتورة شراء</button>`:''}</div>
 <div class="bar">${a.c?`<button onclick="location.hash='#/customer/${a.c.id}'">💵 تحصيل وبيانات العميل</button>`:''}${a.s?`<button onclick="location.hash='#/supplier/${a.s.id}'">💸 دفع وبيانات المورد</button>`:''}</div>
 <div class="card out"><h2>كشف الحساب</h2><table><tr><th>التاريخ</th><th>البيان</th><th>عليه</th><th>له</th><th>الرصيد</th></tr>${ev.map(e=>`<tr${e.link?` onclick="location.hash='#/${e.link}'" style="cursor:pointer"`:''}><td>${esc(e.d||'')}</td><td>${e.desc}</td><td>${e.db?fmt(e.db):''}</td><td>${e.cr?fmt(e.cr):''}</td><td>${fmt(e.bal)}</td></tr>`).join('')||'<tr><td colspan="5">مفيش حركات</td></tr>'}</table></div>
 ${can('users.manage')||can('customers.edit')?`<div class="card noprint"><h2>الربط</h2>${a.c&&a.s?`<div class="s">الحساب ده عميل ومورد.</div><button class="btn sec" onclick="aclUnlink('${aclKey(a)}')">فك الربط</button>`
  :`<div class="s" style="margin-bottom:8px">${a.c?'الحساب ده عميل بس':'الحساب ده مورد بس'}.</div><button class="btn sec" onclick="aclMake('${aclKey(a)}')">${a.c?'خليه مورد كمان':'خليه عميل كمان'}</button>
  ${others.length?`<label style="margin-top:10px">أو اربطه بـ${a.c?'مورد':'عميل'} موجود</label><select id="acc_o">${others.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select><button class="btn sec" onclick="aclLink('${aclKey(a)}')">ربط</button>`:''}`}</div>`:''}`};
function aclLink2(c,s){c.sid=s.id;s.cid=c.id;delete c.nolink;delete s.nolink}
function aclLink(key){const a=aclFind(key);if(!a)return;const v=+$('#acc_o').value;if(!v)return;
 if(a.c){const s=sup(v);if(s)aclLink2(a.c,s)}else{const c=cust(v);if(c)aclLink2(c,a.s)}save();toast('اتربط ✅');route()}
function aclMake(key){const a=aclFind(key);if(!a)return;
 if(a.c){const c=a.c,s={id:nid('sup'),name:c.name,phone:c.phone||'',phone2:c.phone2||'',phone3:c.phone3||'',addr:c.addr||'',map:'',open:0};db.suppliers.push(s);aclLink2(c,s);save();toast('اتضاف كمورد ✅');location.hash='#/account/c'+c.id}
 else{const s=a.s,c={id:++db.seq.c,name:s.name,phone:s.phone||'',phone2:s.phone2||'',phone3:s.phone3||'',addr:s.addr||'',type:'كاش',balance:0,open:0};db.customers.push(c);aclLink2(c,s);save();toast('اتضاف كعميل ✅');location.hash='#/account/c'+c.id}}
function aclUnlink(key){const a=aclFind(key);if(!a||!a.c||!a.s)return;if(!confirm('تفك ربط الحساب؟ هيرجع عميل ومورد منفصلين.'))return;a.c.sid=null;a.c.nolink=1;a.s.cid=null;a.s.nolink=1;save();toast('اتفك الربط');location.hash='#/account/c'+a.c.id}
Object.assign(ROUTE_PERM,{'/accounts':['customers.view','suppliers.view','sales.add'],'/account':['customers.view','suppliers.view','sales.add']});
window.addEventListener('load',()=>{
 const go=(t)=>()=>{head('الحسابات');setTimeout(()=>{location.hash=t},0);return ''};
 R['/customers']=go('#/accounts');R['/suppliers']=go('#/accounts');
 const _ac=R['/accounts'];R['/accounts']=()=>{const h=_ac();setTimeout(aclDraw,0);return h}});


/* =====================================================================
   الدفعة الثانية: دورة الشيكات، حسابات وخزن متعددة وتحويلات، مصروفات متكررة وصورة إيصال،
   تقرير أعمار الديون، تصدير Excel، وجرد شامل. كل البيانات في db.chq / accts / xfers / rexp / rcpt
   (نفس طبقة البيانات: تتنقل للسيرفر لاحقًا من غير تغيير في الشاشات).
   ===================================================================== */
function V2(){['chq','accts','xfers','rexp'].forEach(k=>db[k]=db[k]||[]);db.rcpt=db.rcpt||{};return db}
const accName=a=>!a?'الخزنة الرئيسية':((db.accts.find(x=>x.id==a)||{}).name||'حساب');
const accOpts=(sel,main)=>(main===false?'':`<option value="">💰 الخزنة الرئيسية</option>`)+db.accts.map(a=>`<option value="${a.id}" ${sel==a.id?'selected':''}>${a.type==='بنك'?'🏦':'💼'} ${esc(a.name)}</option>`).join('');
/* ---------- الخزينة: الحركات اللي ليها حساب بنكي/خزنة تانية ما تدخلش الخزنة الرئيسية ---------- */
const _cashEv2=cashEv;cashEv=function(){V2();const P=db.payments,S=db.spay,X=db.exps;db.payments=P.filter(x=>!x.acct);db.spay=S.filter(x=>!x.acct);db.exps=X.filter(x=>!x.acct);
 try{return _cashEv2()}finally{db.payments=P;db.spay=S;db.exps=X}};
function accBal(a){V2();return +((+a.open||0)+db.payments.filter(x=>x.acct==a.id).reduce((s,x)=>s+x.amount,0)-db.spay.filter(x=>x.acct==a.id).reduce((s,x)=>s+x.amount,0)-db.exps.filter(x=>x.acct==a.id).reduce((s,x)=>s+x.amount,0)+db.xfers.filter(x=>x.to==a.id).reduce((s,x)=>s+x.amount,0)-db.xfers.filter(x=>x.from==a.id).reduce((s,x)=>s+x.amount,0)).toFixed(2)}
function accEv(a){const e=[];const I=(d,t,v,desc)=>e.push({d,t,v,desc});
 db.payments.filter(x=>x.acct==a.id).forEach(x=>I(x.date,x.ts,x.amount,x.note||'تحصيل '+cname(x.cid)));
 db.spay.filter(x=>x.acct==a.id).forEach(x=>I(x.date,x.ts,-x.amount,x.note||'دفع للمورد '+sname(x.sid)));
 db.exps.filter(x=>x.acct==a.id).forEach(x=>I(x.date,x.ts,-x.amount,'مصروف: '+x.cat+(x.note?' - '+x.note:'')));
 db.xfers.filter(x=>x.to==a.id||x.from==a.id).forEach(x=>I(x.date,x.ts,x.to==a.id?x.amount:-x.amount,'تحويل '+(x.to==a.id?'من ':'إلى ')+accName(x.to==a.id?x.from:x.to)));
 return e.sort((p,q)=>(q.d+q.t).toString().localeCompare((p.d+p.t).toString()))}
R['/accts']=()=>{head('الخزن والحسابات البنكية',true);V2();const main=cashBal();
 return `<div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi" style="--c:#1f6fd1"><small>💰 الخزنة الرئيسية</small><b>${fmt(main)}</b></div><div class="kpi" style="--c:#2b5aa1"><small>إجمالي الحسابات</small><b>${fmt(main+db.accts.reduce((s,a)=>s+accBal(a),0))}</b></div></div>
 <div class="card"><h2>الحسابات</h2>${db.accts.length?db.accts.map(a=>`<div class="item"><div class="main"><div class="t">${a.type==='بنك'?'🏦':'💼'} ${esc(a.name)}</div><div class="s">${esc(a.type)}${a.no?' · '+esc(a.no):''}</div></div><div class="num">${fmt(accBal(a))}</div><button class="chipb" onclick="location.hash='#/acct/${a.id}'">كشف</button></div>`).join(''):'<div class="empty">لسه مفيش حسابات. ضيف بنك أو خزنة من تحت</div>'}</div>
 <div class="card"><h2>＋ حساب جديد</h2><div class="row2"><input id="ac_n" placeholder="الاسم (بنك مصر، خزنة المحل...)"><select id="ac_t"><option>بنك</option><option>خزنة</option></select></div><div class="row2"><input id="ac_no" placeholder="رقم الحساب (اختياري)"><input id="ac_o" type="number" inputmode="decimal" placeholder="رصيد افتتاحي"></div><button class="btn" onclick="addAcct()">إضافة</button></div>
 <div class="card"><h2>🔁 تحويل بين الحسابات</h2><div class="row2"><div><label>من</label><select id="tf_f">${accOpts('')}</select></div><div><label>إلى</label><select id="tf_t">${accOpts('')}</select></div></div><div class="row2"><input id="tf_a" type="number" inputmode="decimal" placeholder="المبلغ"><input id="tf_n" placeholder="ملاحظة"></div><button class="btn" onclick="doXfer()">تحويل</button></div>
 <div class="card"><h2>آخر التحويلات</h2>${db.xfers.length?db.xfers.slice(-10).reverse().map(x=>`<div class="item"><div class="main"><div class="t">${esc(accName(x.from))} ← ${esc(accName(x.to))}</div><div class="s">${x.date}${x.note?' · '+esc(x.note):''}</div></div><div class="num">${fmt(x.amount)}</div></div>`).join(''):'<div class="empty">مفيش تحويلات</div>'}</div>`};
R['/acct']=id=>{const a=db.accts.find(x=>x.id==id);if(!a)return nf();head(a.name,true);let b=+a.open||0;const ev=accEv(a);
 return `<div class="kpis" style="grid-template-columns:1fr"><div class="kpi" style="--c:#1f6fd1"><small>رصيد ${esc(a.name)}</small><b>${fmt(accBal(a))}</b></div></div><div class="card out"><h2>كشف حساب ${esc(a.name)}</h2>${rtbl(['التاريخ','البيان','المبلغ'],[['افتتاحي','رصيد افتتاحي',fmt(a.open||0)],...ev.slice().reverse().map(x=>[x.d,esc(x.desc),`<span class="${x.v<0?'neg':''}">${x.v<0?'−':'+'}${fmt(Math.abs(x.v))}</span>`])])}</div><button class="btn del noprint" onclick="delAcct(${a.id})">🗑 حذف الحساب</button>`};
function addAcct(){V2();const n=$('#ac_n').value.trim();if(!n)return toast('اكتب اسم الحساب');db.accts.push({id:nid('acct'),name:n,type:$('#ac_t').value,no:$('#ac_no').value.trim(),open:+$('#ac_o').value||0});save();toast('اتضاف ✅');route()}
function delAcct(id){const a=db.accts.find(x=>x.id==id);if(Math.abs(accBal(a))>0.01||db.payments.some(x=>x.acct==id)||db.xfers.some(x=>x.to==id||x.from==id))return toast('الحساب عليه حركة، مينفعش يتحذف');if(confirm('حذف الحساب؟')){db.accts=db.accts.filter(x=>x.id!=id);save();location.hash='#/accts'}}
function doXfer(){V2();const f=$('#tf_f').value,t=$('#tf_t').value,a=+$('#tf_a').value,n=$('#tf_n').value.trim();if(f===t)return toast('اختار حسابين مختلفين');if(!(a>0))return toast('اكتب المبلغ');
 const fa=f?db.accts.find(x=>x.id==f):null;if(fa&&accBal(fa)<a&&!confirm('رصيد '+fa.name+' أقل من المبلغ. تكمل؟'))return;
 const d=today(),ts=Date.now();db.xfers.push({id:nid('xf'),from:f?+f:0,to:t?+t:0,amount:a,date:d,ts,by:db.me,note:n});
 if(!f)db.cashx.push({id:nid('cx'),dir:'out',amount:a,date:d,ts,by:db.me,note:'تحويل إلى '+accName(+t)+(n?' - '+n:''),xf:1});
 if(!t)db.cashx.push({id:nid('cx'),dir:'in',amount:a,date:d,ts,by:db.me,note:'تحويل من '+accName(+f)+(n?' - '+n:''),xf:1});
 notify('🔁 تحويل '+fmt(a)+' من '+accName(+f)+' إلى '+accName(+t));save();toast('اتحول ✅');route()}
const _cashPg=R['/cash'];R['/cash']=()=>{V2();const h=_cashPg();return `<div class="card noprint"><h2>🏦 الحسابات البنكية والخزن</h2>${db.accts.map(a=>`<div class="item"><div class="main"><div class="t">${a.type==='بنك'?'🏦':'💼'} ${esc(a.name)}</div></div><div class="num">${fmt(accBal(a))}</div></div>`).join('')}<button class="btn sec" onclick="location.hash='#/accts'">إدارة الحسابات والتحويلات ›</button></div>`+h};

/* ---------- دورة الشيكات ---------- */
const CHQ_S={in:['معلق','مودع','محصل','راجع'],out:['معلق','مدفوع','راجع']};
let CHQ={t:'in',s:''};
const chqParty=c=>c.t==='in'?cname(c.party):sname(c.party);
function chqPill(c){if(['محصل','مدفوع'].includes(c.st))return '<span class="pill ok">'+c.st+'</span>';if(c.st==='راجع')return '<span class="pill bad">راجع</span>';const d=daysTo(c.due);return d<0?`<span class="pill bad">متأخر ${-d} يوم</span>`:d<=3?`<span class="pill warn">بعد ${d} يوم</span>`:`<span class="pill">${c.st}</span>`}
R['/chq']=()=>{head('الشيكات',true);V2();const L=db.chq.filter(c=>c.t===CHQ.t),open=L.filter(c=>!['محصل','مدفوع','راجع'].includes(c.st)||c.st==='مودع'&&c.t==='in'),sum=a=>a.reduce((s,c)=>s+c.amount,0);
 const due=db.chq.filter(c=>!['محصل','مدفوع','راجع'].includes(c.st)&&daysTo(c.due)<=3);
 const sh=L.filter(c=>!CHQ.s||c.st===CHQ.s).sort((a,b)=>a.due.localeCompare(b.due));
 return `<div class="seg"><button class="${CHQ.t==='in'?'on':''}" onclick="CHQ.t='in';CHQ.s='';route()">📥 واردة (من العملاء)</button><button class="${CHQ.t==='out'?'on':''}" onclick="CHQ.t='out';CHQ.s='';route()">📤 صادرة (للموردين)</button></div>
 <div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi" style="--c:#f0a500"><small>${CHQ.t==='in'?'لسه ما اتحصلتش':'لسه ما اتدفعتش'}</small><b>${fmt(sum(L.filter(c=>!['محصل','مدفوع','راجع'].includes(c.st))))}</b></div><div class="kpi" style="--c:#e4572e"><small>مستحقة / خلال ٣ أيام</small><b>${due.filter(c=>c.t===CHQ.t).length}</b></div></div>
 <div class="card noprint"><h2>＋ شيك ${CHQ.t==='in'?'وارد':'صادر'}</h2><div class="row2"><input id="q_no" placeholder="رقم الشيك"><input id="q_bk" placeholder="البنك"></div><div class="row2"><input id="q_a" type="number" inputmode="decimal" placeholder="المبلغ"><div><label>تاريخ الاستحقاق</label><input id="q_d" type="date" value="${today()}"></div></div>
 <label>${CHQ.t==='in'?'العميل':'المورد'}</label><select id="q_p">${(CHQ.t==='in'?db.customers:db.suppliers).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><label>${CHQ.t==='in'?'يتحصل في حساب':'يتدفع من حساب'}</label><select id="q_ac">${accOpts('')}</select><input id="q_n" placeholder="ملاحظة (اختياري)" style="margin-top:8px"><button class="btn" onclick="addChq()">حفظ الشيك</button></div>
 <div class="chips noprint"><button class="${CHQ.s?'':'on'}" onclick="CHQ.s='';route()">الكل</button>${CHQ_S[CHQ.t].map(s=>`<button class="${CHQ.s===s?'on':''}" onclick="CHQ.s='${s}';route()">${s}</button>`).join('')}</div>
 <div class="card out"><h2>${CHQ.t==='in'?'📥 شيكات واردة':'📤 شيكات صادرة'}</h2>${sh.length?sh.map(c=>`<div class="item" style="flex-wrap:wrap"><div class="main"><div class="t">#${esc(c.no||'—')} · ${esc(chqParty(c))}</div><div class="s">${esc(c.bank||'')} · استحقاق ${c.due} · ${esc(accName(c.acct))}${c.note?' · '+esc(c.note):''}</div></div><div class="num">${fmt(c.amount)}</div><div style="width:100%" class="noprint">${chqPill(c)} ${chqBtns(c)}</div></div>`).join(''):'<div class="empty">مفيش شيكات</div>'}</div>`};
function chqBtns(c){const B=(s,t,k)=>`<button class="chipb ${k||''}" onclick="chqSet(${c.id},'${s}')">${t}</button>`,D=`<button class="chipb" onclick="delChq(${c.id})">🗑</button>`;
 if(c.t==='in'){if(c.st==='معلق')return B('مودع','🏦 إيداع')+B('محصل','✅ تحصيل')+B('راجع','↩️ راجع')+D;if(c.st==='مودع')return B('محصل','✅ اتحصل')+B('راجع','↩️ راجع')+D;return B('معلق','↺ رجّعه معلق')+D}
 if(c.st==='معلق')return B('مدفوع','✅ اتصرف')+B('راجع','↩️ راجع')+D;return B('معلق','↺ رجّعه معلق')+D}
function addChq(){V2();const a=+$('#q_a').value,p=+$('#q_p').value;if(!(a>0))return toast('اكتب المبلغ');if(!p)return toast('اختار '+(CHQ.t==='in'?'العميل':'المورد'));
 db.chq.push({id:nid('chq'),t:CHQ.t,no:$('#q_no').value.trim(),bank:$('#q_bk').value.trim(),amount:a,due:$('#q_d').value||today(),party:p,acct:+$('#q_ac').value||0,note:$('#q_n').value.trim(),st:'معلق',date:today(),by:db.me});save();toast('اتسجل ✅');route()}
function chqSet(id,st){V2();const c=db.chq.find(x=>x.id==id);if(!c)return;
 const undo=()=>{if(c.pay){db.payments=db.payments.filter(x=>x.id!==c.pay);c.pay=0}if(c.spay){db.spay=db.spay.filter(x=>x.id!==c.spay);c.spay=0}};
 if(c.st==='محصل'||c.st==='مدفوع')undo();
 if(st==='محصل'&&c.t==='in'){const p={id:nid('pay'),cid:c.party,date:today(),ts:Date.now(),by:db.me||1,amount:c.amount,note:'شيك #'+(c.no||'')+' '+(c.bank||''),chq:c.id};if(c.acct)p.acct=c.acct;db.payments.push(p);c.pay=p.id;notify('✅ تحصيل شيك '+fmt(c.amount)+' من '+cname(c.party))}
 if(st==='مدفوع'&&c.t==='out'){const p={id:nid('spay'),sid:c.party,date:today(),ts:Date.now(),by:db.me,amount:c.amount,note:'شيك #'+(c.no||'')+' '+(c.bank||''),chq:c.id};if(c.acct)p.acct=c.acct;db.spay.push(p);c.spay=p.id}
 if(st==='راجع')notify('⚠️ شيك راجع '+fmt(c.amount)+' - '+chqParty(c));
 c.st=st;save();toast('اتحدّث ✅');route()}
function delChq(id){if(!confirm('حذف الشيك؟'))return;chqSet(id,'معلق');db.chq=db.chq.filter(x=>x.id!=id);save();route()}
Object.assign(ROUTE_PERM,{'/chq':'cash.view','/accts':'cash.view','/acct':'cash.view','/rexp':'expenses.add','/stkall':'stock.adjust'});

/* ---------- مصروفات متكررة + صورة إيصال ---------- */
R['/rexp']=()=>{head('مصروفات متكررة',true);V2();return `<div class="card"><h2>＋ مصروف متكرر شهريًا</h2><label>النوع</label><select id="r_c">${expCats().map(c=>`<option>${esc(c)}</option>`).join('')}</select><div class="row2"><input id="r_a" type="number" inputmode="decimal" placeholder="المبلغ"><div><label>يوم الشهر (1-28)</label><input id="r_d" type="number" value="1"></div></div><input id="r_n" placeholder="بيان (إيجار المحل...)"><label>يتخصم من</label><select id="r_ac">${accOpts('')}</select><button class="btn" onclick="addRexp()">حفظ</button><div class="s" style="color:var(--mut);font-size:12px">بيتسجل لوحده في المصروفات كل شهر في اليوم ده.</div></div>
 <div class="card"><h2>المتكررة</h2>${db.rexp.length?db.rexp.map(r=>`<div class="item"><div class="main"><div class="t">🔁 ${esc(r.cat)} · ${esc(r.note||'')}</div><div class="s">يوم ${r.day} كل شهر · ${esc(accName(r.acct))} · آخر تسجيل ${r.last||'—'}</div></div><div class="num">${fmt(r.amount)}</div><button class="chipb" onclick="delRexp(${r.id})">🗑</button></div>`).join(''):'<div class="empty">مفيش مصروفات متكررة</div>'}</div>`};
function addRexp(){V2();const a=+$('#r_a').value;if(!(a>0))return toast('اكتب المبلغ');const d=Math.min(28,Math.max(1,+$('#r_d').value||1)),t=today(),pm=new Date(t.slice(0,4),+t.slice(5,7)-2,1);
 db.rexp.push({id:nid('rexp'),cat:$('#r_c').value,amount:a,day:d,note:$('#r_n').value.trim(),acct:+$('#r_ac').value||0,last:pm.getFullYear()+'-'+String(pm.getMonth()+1).padStart(2,'0')});save();checkRexp();toast('اتسجل ✅');route()}
function delRexp(id){if(confirm('إيقاف المصروف المتكرر؟')){db.rexp=db.rexp.filter(x=>x.id!=id);save();route()}}
/* تسجيل المستحق تلقائيًا (بيتشغل مرة كل يوم) */
let V2D='';function checkRexp(){V2();if(!db.rexp.length)return;let ch=0;const t=today(),cm=t.slice(0,7);
 db.rexp.forEach(r=>{for(let g=0;g<36;g++){let [y,m]=(r.last||cm).split('-').map(Number);m++;if(m>12){m=1;y++}const ym=y+'-'+String(m).padStart(2,'0'),dt=ym+'-'+String(r.day).padStart(2,'0');if(dt>t)break;
  r.last=ym;const x={id:nid('exp'),date:dt,ts:Date.now(),by:db.me||1,cat:r.cat,amount:r.amount,note:'🔁 '+(r.note||r.cat),rexp:r.id};if(r.acct)x.acct=r.acct;db.exps.push(x);ch++;notify('🔁 اتسجل مصروف متكرر: '+r.cat+' '+fmt(r.amount))}});
 if(ch)save()}
/* صورة الإيصال: بتتصغر قبل التخزين عشان ما تتقلش الذاكرة */
let XPH=null;
function pickRcpt(inp,cb){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,800/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.6))};im.src=r.result};r.readAsDataURL(f)}
const _addExp2=addExp;addExp=function(){V2();const n=db.exps.length,ac=($('#x_acct')||{}).value,rp=($('#x_rep')||{}).value;_addExp2();if(db.exps.length>n){const x=db.exps[db.exps.length-1];if(ac)x.acct=+ac;if(rp==='m'){const r={id:nid('rexp'),cat:x.cat,amount:x.amount,day:Math.min(28,+x.date.slice(8,10)||1),note:x.note||'',acct:x.acct||0,last:x.date.slice(0,7)};db.rexp.push(r);x.rexp=r.id;toast('اتسجل ومتكرر كل شهر 🔁')}if(XPH){db.rcpt[x.id]=XPH;XPH=null}save()}};
function viewRcpt(id){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#000d;z-index:99;display:flex;align-items:center;justify-content:center;padding:14px';o.onclick=()=>o.remove();o.innerHTML=`<img src="${db.rcpt[id]}" style="max-width:100%;max-height:100%;border-radius:10px">`;document.body.appendChild(o)}
function attRcpt(id){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>pickRcpt(i,d=>{db.rcpt[id]=d;save();route()});i.click()}
const _delExp2=delExp;delExp=function(id){_delExp2(id);if(!db.exps.some(e=>e.id==id))delete db.rcpt[id]};

/* ---------- أعمار الديون ---------- */
RT.push(['aging','⏳ مديونيات العملاء (أعمار الديون)']);RPD.aging='مديونيات العملاء حسب مدة التأخير';
function agingRows(){const rows=[];db.customers.forEach(c=>{recalc(c);let b=c.balance||0;if(b<=0.5)return;const B=[0,0,0,0];
 db.invoices.filter(i=>i.cid==c.id).sort((p,q)=>(q.date+q.ts).toString().localeCompare((p.date+p.ts).toString())).forEach(i=>{if(b<=0)return;const v=Math.min(b,i.total),d=-daysTo(i.date);B[d<=30?0:d<=60?1:d<=90?2:3]+=v;b-=v});if(b>0)B[3]+=b;rows.push({c,B,t:B.reduce((s,x)=>s+x,0)})});return rows.sort((p,q)=>q.t-p.t)}
const _rbV2=repBody;repBody=function(t,PR){if(t==='aging'){V2();const r=agingRows();if(!r.length)return '<div class="empty">مفيش مديونيات</div>';const S=[0,1,2,3].map(i=>r.reduce((s,x)=>s+x.B[i],0));
 return rtbl(['العميل','0-30 يوم','31-60','61-90','+90','الإجمالي'],r.map(x=>[esc(x.c.name),...x.B.map(v=>v?fmt(v):'—'),`<b>${fmt(x.t)}</b>`]),['الإجمالي',...S.map(fmt),fmt(S.reduce((a,b)=>a+b,0))])+'<p class="s" style="color:var(--mut);font-size:12px">الأعمار محسوبة من تاريخ الفواتير (الأحدث بيتسدد منه الأول لحد ما يتبقى المتأخر).</p>'}return _rbV2(t,PR)};

/* ---------- تصدير Excel ---------- */
function xlsOut(b){const el=b.closest('.obar').previousElementSibling;if(!el)return;const t=[...el.querySelectorAll('table')];if(!t.length)return toast('مفيش جدول للتصدير');
 const nm=(el.querySelector('h2')||{textContent:'تقرير'}).textContent.trim().replace(/[\\/:*?"<>|]/g,'').slice(0,40)||'تقرير';
 const h='\ufeff<html dir="rtl"><head><meta charset="utf-8"></head><body>'+t.map(x=>x.outerHTML).join('<br>')+'</body></html>';
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'}));a.download='خالد-تريد-'+nm+'.xls';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500)}
/* ---------- جرد شامل: كل الأصناف في شاشة واحدة (بيفتح مستند التسوية جاهز) ---------- */
function stkAll(){openDoc('adj');setTimeout(()=>{if(typeof doc==='undefined'||doc.k!=='adj')return;doc.lines=db.products.map(p=>({pid:p.id,qty:undefined,price:0}));doc.lines.push({});dLines()},250)}
R['/stkall']=()=>{head('الجرد الشامل',true);setTimeout(stkAll,0);return '<div class="empty">⏳ بيجهز قايمة الجرد...</div>'};

/* ---------- لمسات بعد رسم أي شاشة ---------- */
const _oaV2=outAuto;outAuto=function(){_oaV2();try{V2();if(V2D!==today()){V2D=today();checkRexp()}
 document.querySelectorAll('#app .obar').forEach(b=>{const el=b.previousElementSibling;if(el&&el.querySelector&&el.querySelector('table')&&!b.querySelector('.xlsb')){const x=document.createElement('button');x.className='btn sec xlsb';x.style.gridColumn='1/-1';x.textContent='📗 تصدير Excel';x.setAttribute('onclick','xlsOut(this)');const hd=b.querySelector('.hdt');hd?b.insertBefore(x,hd):b.appendChild(x)}});
 if(location.hash.startsWith('#/expenses')){const a=$('#x_a');if(a&&!$('#x_acct')){const card=a.closest('.card'),btn=card&&card.querySelector('button[onclick*="addExp"]');if(btn){const d=document.createElement('div');d.className='noprint';d.innerHTML=`<label>🔁 التكرار</label><select id="x_rep"><option value="">مرة واحدة</option><option value="m">كل شهر (يتسجل لوحده)</option></select><label>📷 صورة الإيصال (اختياري)</label><input type="file" accept="image/*" id="x_ph"><label>يتخصم من</label><select id="x_acct">${accOpts('')}</select>`;btn.before(d);$('#x_ph').onchange=function(){pickRcpt(this,u=>{XPH=u;toast('اتحفظت الصورة')})}}}
  document.querySelectorAll('#app button[onclick*="delExp("]').forEach(bt=>{const m=bt.getAttribute('onclick').match(/delExp\((\d+)\)/);if(!m)return;const id=+m[1];const s=document.createElement('button');s.className='chipb noprint';s.textContent=db.rcpt[id]?'📷':'＋📷';s.onclick=()=>db.rcpt[id]?viewRcpt(id):attRcpt(id);bt.before(s)})}}catch(e){console.warn(e)}};

/* ---------- لوحة الرئيسية: الشيكات المستحقة ---------- */
const _dashV2=R['/'];R['/']=()=>{let h=_dashV2();V2();if(!can('cash.view'))return h;const d=db.chq.filter(c=>!['محصل','مدفوع','راجع'].includes(c.st)&&daysTo(c.due)<=3).sort((a,b)=>a.due.localeCompare(b.due));if(!d.length)return h;
 return `<div class="card"><h2>🧾 شيكات مستحقة (${d.length})</h2>${d.slice(0,4).map(c=>`<div class="item"><div class="main"><div class="t">${c.t==='in'?'📥':'📤'} ${esc(chqParty(c))}</div><div class="s">#${esc(c.no||'')} · ${c.due}</div></div><div class="num">${fmt(c.amount)}</div>${chqPill(c)}</div>`).join('')}<button class="btn sec" onclick="location.hash='#/chq'">كل الشيكات ›</button></div>`+h};

/* ---------- القوائم ---------- */
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');g.it.push(['🧾','الشيكات','#/chq','cash.view','واردة وصادرة وتنبيه الاستحقاق'],['🏦','الخزن والحسابات','#/accts','cash.view','بنوك وخزن وتحويلات بينهم'],['🔁','مصروفات متكررة','#/rexp','expenses.add','إيجار ومرتبات بتتسجل لوحدها']);
 const s=MORE_GROUPS.find(x=>x.id==='stk');if(s)s.it.push(['📋','الجرد الشامل','#/stkall','stock.adjust','عد كل الأصناف وتسوية الفروق'])})();

/* ===== تغيير 40: أيقونة إيقاف البيع في المزيد من برا (للمدير) ===== */
{const _m=R['/more'];R['/more']=(...a)=>{const h=_m(...a);if(!can('users.manage'))return h;const n=ssCount();
 return h.replace('<div class="mg">',`<div class="mg"><a class="mgc" href="#/sellstop"><i>🛑</i><b>إيقاف البيع</b><small>${n?n+' إيقاف شغال':'لكل المستخدمين أو مستخدم أو منتج أو مجموعة'}</small>${n?'<em style="background:#dc2626;color:#fff">'+n+'</em>':''}</a>`)}}


/* =====================================================================
   مصروفات العربيات (بنزين/سولار/صيانة + صورة إيصال) + وضع البيانات التجريبية (تشغيل/مسح بضغطة)
   ===================================================================== */
['بنزين','سولار','غيار زيت','إطارات','غسيل وتشحيم'].forEach(c=>{if(!EXP_BUILTIN.includes(c))EXP_BUILTIN.splice(1,0,c)});
const CAR_CATS=['بنزين','سولار','صيانة سيارات','غيار زيت','إطارات','غسيل وتشحيم','مخالفة','أخرى'];
let CXS={car:'',m:''},CXPH=null;
Object.assign(ROUTE_PERM,{'/carexp':['carexp.add','expenses.add']});
R['/carexp']=()=>{head('مصروفات العربيات',true);V2();const cars=db.cars.filter(c=>myLocs().includes('c'+c.id));if(!CXS.m)CXS.m=today().slice(0,7);
 if(!cars.some(c=>c.id==CXS.car))CXS.car=(cars[0]||{}).id||'';CXPH=null;
 if(!cars.length)return '<div class="empty">مفيش عربيات متاحة ليك. المدير يضيف عربية من المخازن والسيارات</div>';
 const inM=db.exps.filter(x=>x.car&&x.date.startsWith(CXS.m)),sel=inM.filter(x=>x.car==CXS.car).sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts),sm=a=>a.reduce((s,x)=>s+x.amount,0);
 const byC={};sel.forEach(x=>byC[x.cat]=(byC[x.cat]||0)+x.amount);
 return `<div class="card noprint"><h2>🚗 تسجيل مصروف عربية</h2><label>العربية</label><select id="cx_car" onchange="CXS.car=this.value;route()">${cars.map(c=>`<option value="${c.id}" ${c.id==CXS.car?'selected':''}>${esc(c.name)}${c.driver?' · '+esc(c.driver):''}</option>`).join('')}</select>
 <label>نوع المصروف</label><select id="cx_cat">${CAR_CATS.map(c=>`<option>${c}</option>`).join('')}</select>
 <div class="row2"><div><label>المبلغ</label><input id="cx_amt" type="number" inputmode="decimal"></div><div><label>لترات (اختياري)</label><input id="cx_lit" type="number" inputmode="decimal"></div></div>
 <input id="cx_n" placeholder="ملاحظة (اختياري)"><label>📷 صورة الإيصال</label><input type="file" accept="image/*" capture="environment" onchange="pickRcpt(this,u=>{CXPH=u;$('#cx_pv').src=u;$('#cx_pv').style.display='block';toast('اتحفظت الصورة')})"><img id="cx_pv" style="display:none;max-width:100%;max-height:160px;border-radius:10px;margin-top:6px">
 <button class="btn" onclick="carSave()">＋ تسجيل المصروف</button></div>
 <div class="kpis" style="grid-template-columns:repeat(${Math.min(cars.length,2)||1},1fr)">${cars.map((c,i)=>`<div class="kpi" style="--c:${['#1f6fd1','#2b5aa1','#f0a500','#e4572e'][i%4]}" onclick="CXS.car=${c.id};route()"><small>🚗 ${esc(c.name)}</small><b>${fmt(sm(inM.filter(x=>x.car==c.id)))}</b></div>`).join('')}</div>
 <div class="card noprint"><label>الشهر</label><input type="month" value="${CXS.m}" onchange="CXS.m=this.value;route()"></div>
 <div class="card out"><h2>🚗 ${esc((cars.find(c=>c.id==CXS.car)||{}).name||'')} · ${CXS.m} · إجمالي ${fmt(sm(sel))}</h2>${Object.keys(byC).length?`<div class="s" style="color:var(--mut);margin-bottom:6px">${Object.entries(byC).map(([k,v])=>esc(k)+' '+fmt(v)).join(' · ')}</div>`:''}
 ${sel.length?sel.map(x=>`<div class="item"><div class="main"><div class="t">${esc(x.cat)}${x.liters?' · '+x.liters+' لتر':''}</div><div class="s">${x.date}${x.note?' · '+esc(x.note):''}${x.by?' · '+esc(uname(x.by)):''}</div></div><div class="num">${fmt(x.amount)}</div>${db.rcpt[x.id]?`<button class="chipb noprint" onclick="viewRcpt(${x.id})">📷</button>`:`<button class="chipb noprint" onclick="attRcpt(${x.id})">＋📷</button>`}${can('expenses.delete')?`<button class="chipb noprint" onclick="delExp(${x.id})">🗑</button>`:''}</div>`).join(''):'<div class="empty">مفيش مصروفات للعربية دي في الشهر ده</div>'}</div>`};
function carSave(){V2();const car=+$('#cx_car').value,a=+$('#cx_amt').value;if(!car)return toast('اختار العربية');if(!(a>0))return toast('اكتب المبلغ');
 const x={id:nid('exp'),date:today(),ts:Date.now(),by:db.me,cat:$('#cx_cat').value,amount:a,car,note:$('#cx_n').value.trim(),carexp:1};const l=+$('#cx_lit').value;if(l>0)x.liters=l;db.exps.push(x);if(CXPH){db.rcpt[x.id]=CXPH;CXPH=null}
 notify('🚗 مصروف عربية '+x.cat+' '+fmt(a)+' - '+((db.cars.find(c=>c.id==car)||{}).name||''));save();toast('اتسجل ✅');route()}
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');g.it.push(['🚗','مصروفات العربيات','#/carexp','carexp.add,expenses.add','بنزين وصيانة وصورة الإيصال لكل عربية'])})();
/* رابط سريع من شاشة العربيات */
const _plC=R['/places'];R['/places']=()=>_plC()+`<a class="btn sec" href="#/carexp" style="display:block;text-align:center;text-decoration:none;margin-top:10px">🚗 مصروفات العربيات (بنزين وصيانة)</a>`;

/* ---------- وضع البيانات التجريبية ---------- */
const _rsD=R['/settings'];R['/settings']=()=>{const on=DEMO;
 return _rsD()+`<div class="card" data-need="settings.edit"><h2>🧪 بيانات تجريبية</h2>${on?`<div class="s" style="color:var(--mut)">النظام شغال دلوقتي ببيانات تجريبية (موظفين، عملاء، فواتير، شيكات، مصروفات…). بياناتك الحقيقية محفوظة على جنب.</div><button class="btn del" onclick="endDemo()">🗑 مسح التجريبي والرجوع لبياناتي</button>`:`<div class="s" style="color:var(--mut)">حمّل نظام كامل بيانات واقعية تشوف بيها الشكل. بياناتك الحقيقية بتتحفظ ومش بتتمس، وترجعلها بضغطة.</div><button class="btn" onclick="startDemo()">🧪 حمّل البيانات التجريبية</button>`}</div>`};
function startDemo(){if(!confirm('هيتفتح نظام تجريبي كامل ببيانات وهمية. بياناتك الحقيقية مشفرة ومحفوظة ومش هتتمس. نكمل؟'))return;location.href=location.pathname+'?demo=1#/'}
function endDemo(){location.href=location.pathname+'#/'}
const _oaD=outAuto;outAuto=function(){_oaD();try{const A=$('#app');if(DEMO&&A&&!$('#demoBn'))A.insertAdjacentHTML('afterbegin','<div id="demoBn" class="noprint" style="background:#f0a500;color:#3a2600;padding:8px 12px;border-radius:12px;margin-bottom:10px;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:8px"><span>🧪 بيانات تجريبية</span><button class="chipb" onclick="endDemo()">مسح ورجوع لبياناتي</button></div>')}catch(e){}};

/* ---------- بيانات تجريبية واقعية لكل الأقسام ---------- */
function demoRcpt(t,a){try{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,300,400);x.fillStyle='#222';x.font='bold 20px sans-serif';x.textAlign='center';x.fillText('إيصال',150,40);x.font='16px sans-serif';x.fillText(t,150,90);x.fillText('المبلغ: '+a+' ج.م',150,130);x.fillText(today(),150,170);x.strokeStyle='#999';x.strokeRect(10,10,280,380);return c.toDataURL('image/jpeg',.5)}catch(e){return ''}}
function demoPlus(){try{demoBuild()}catch(e){console.warn('demo',e)}try{demoHand()}catch(e){console.warn('demoHand',e)}try{demoTiers()}catch(e){console.warn(e)}try{demoAreas()}catch(e){console.warn(e)}try{demoVch()}catch(e){console.warn('demoVch',e)}try{demoAlerts()}catch(e){console.warn('demoAlerts',e)}}
function demoBuild(){V2();HRS();let sd=7;const rnd=()=>(sd=(sd*9301+49297)%233280)/233280,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[ri(0,a.length-1)];
 const dd=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)},tsOf=(d,h)=>new Date(d+'T'+String(h||10).padStart(2,'0')+':00:00').getTime();
 /* أصناف */
 [['ميثوميل 90% (كجم)','مبيد','كيلو',420,480,0,10,dd(90)],['ايميدا 20% (لتر)','مبيد','لتر',210,250,0,15,dd(-10)],['سلفات نشادر 21%','سماد','شيكارة',560,610,0,20,''],['سلفات بوتاسيوم','سماد','شيكارة',1500,1650,0,10,''],['كبريت زراعي','مبيد','شيكارة',300,340,0,10,dd(300)],['مغذي ورقي ميكرو','مغذيات','لتر',130,170,0,10,dd(150)],['جلايفوسيت حشائش','مبيد','لتر',110,140,0,10,dd(40)],['بذور خيار هجين','بذور','علبة',350,420,0,8,dd(120)]].forEach(a=>db.products.push({id:++db.seq.p,name:a[0],cat:a[1],unit:a[2],cost:a[3],price:a[4],stock:0,min:a[6],exp:a[7],co:ri(1,3),pack:''}));
 const target={};db.products.forEach(p=>target[p.id]=ri(30,120));db.products.filter(p=>/ايميدا|جلايفوسيت|سوبر/.test(p.name)).forEach(p=>target[p.id]=ri(2,6));
 /* عملاء */
 const C0=db.customers.length;[['مزرعة الأمل (م. كريم)','01012000111','كفر الشيخ','آجل',50000],['عبد الرحمن السيد','01123000222','سيدي سالم','آجل',20000],['شركة النيل الزراعية','01234000333','دسوق','آجل',100000],['محمد عطية','01555000444','مطوبس','كاش',0],['الحاج رمضان','01066000555','الحامول','آجل',30000],['جمعية سيدي سالم الزراعية','01177000666','سيدي سالم','آجل',80000]].forEach(a=>db.customers.push({id:++db.seq.c,name:a[0],phone:a[1],addr:a[2],type:a[3],balance:0,open:0,limit:a[4]}));
 const custs=db.customers;
 /* فواتير بيع آخر 45 يوم */
 for(let k=0;k<34;k++){const d=dd(-ri(0,44)),c=pick([0,0,...custs.map(x=>x.id)]),n=ri(1,3),items=[];for(let j=0;j<n;j++){const p=pick(db.products);if(items.some(i=>i.pid===p.id))continue;items.push({pid:p.id,name:p.name,unit:p.unit,pack:p.pack||'',qty:ri(1,12),price:p.price,cost:p.cost})}
  const total=items.reduce((s,i)=>s+i.qty*i.price,0),cr=cust(c)&&cust(c).type==='آجل',paid=!c||!cr?total:pick([0,Math.round(total*.3),Math.round(total*.5),total]);
  const id=++db.seq.i;db.invoices.push({id,no:id,date:d,ts:tsOf(d,ri(9,18)),cid:c,items,total,paid,rem:total-paid,by:1,loc:'w1',notes:''});items.forEach(i=>target[i.pid]+=i.qty)}
 /* تحصيلات */
 custs.filter(c=>c.type==='آجل').forEach(c=>{if(rnd()>.3){const d=dd(-ri(1,20));db.payments.push({id:nid('pay'),cid:c.id,date:d,ts:tsOf(d,12),by:1,amount:ri(5,30)*100,note:'تحصيل'})}});
 /* مشتريات */
 const S=db.suppliers;[[0,-30,'كاش'],[1,-18,'آجل'],[0,-6,'آجل']].forEach(([si,off,kind])=>{const d=dd(off),n=ri(2,3),items=[];for(let j=0;j<n;j++){const p=pick(db.products);if(items.some(i=>i.pid===p.id))continue;items.push({pid:p.id,name:p.name,unit:p.unit,pack:'',qty:ri(20,60),price:p.cost})}
  const total=items.reduce((s,i)=>s+i.qty*i.price,0),paid=kind==='كاش'?total:Math.round(total*.4),id=nid('pur');db.purchases.push({id,no:id,k:'pur',date:d,ts:tsOf(d,11),by:1,party:S[si%S.length].id,loc:'w1',to:'',items,sub:total,adj:0,total,paid,rem:total-paid,kind:total-paid>0?'آجل':'كاش',notes:''});items.forEach(i=>target[i.pid]+=i.qty);
  if(paid&&kind!=='كاش'){}});
 db.spay.push({id:nid('spay'),sid:S[0].id,date:dd(-4),ts:tsOf(dd(-4),13),by:1,amount:5000,note:'دفعة'});
 db.products.forEach(p=>{const cur=qtyAt('w1',p.id),t=target[p.id];if(t!==undefined)mv('w1',p.id,t-cur-(db.invoices.filter(i=>i.items.some(x=>x.pid===p.id)).reduce((s,i)=>s+i.items.filter(x=>x.pid===p.id).reduce((a,x)=>a+x.qty,0),0))*0)});
 db.customers.forEach(c=>recalc(c));
 /* عربيات ومصروفات */
 if(db.cars.length<2)db.cars.push({id:nid('car'),name:'سيارة 2',driver:'عم حسين',dphone:'01088880000'});const cars=db.cars;
 const E=(off,cat,amt,note,car,extra)=>{const d=dd(off),x={id:nid('exp'),date:d,ts:tsOf(d,ri(8,17)),by:1,cat,amount:amt,note,car:car||0,...(extra||{})};db.exps.push(x);return x};
 [-44,-14].forEach(o=>{E(o,'إيجار',6000,'إيجار المخزن',0,{rexp:1});E(o+4,'كهرباء ومياه',450+ri(0,150),'فاتورة الكهرباء')});
 E(-9,'تسويق ودعاية',800,'بانر ولافتات');E(-3,'نقل وشحن',650,'شحن بضاعة من القاهرة');
 for(let k=0;k<9;k++){const car=cars[k%2].id,cat=pick(['بنزين','سولار','سولار','صيانة سيارات','غيار زيت']),amt=cat.startsWith('صيانة')?ri(4,12)*100:ri(3,8)*100,x=E(-ri(0,40),cat,amt,cat==='صيانة سيارات'?'صيانة دورية':'تموين',car,{carexp:1,...(cat==='بنزين'||cat==='سولار'?{liters:Math.round(amt/(cat==='بنزين'?19:17))}:{})});if(k%3!==2)db.rcpt[x.id]=demoRcpt(cat,amt)}
 db.rexp.push({id:nid('rexp'),cat:'إيجار',amount:6000,day:1,note:'إيجار المخزن',acct:0,last:today().slice(0,7)},{id:nid('rexp'),cat:'كهرباء ومياه',amount:500,day:5,note:'كهرباء المخزن',acct:0,last:today().slice(0,7)});
 /* خزن وحسابات وتحويلات */
 const A1={id:nid('acct'),name:'بنك مصر',type:'بنك',no:'1234 5678',open:25000},A2={id:nid('acct'),name:'خزنة المحل',type:'خزنة',no:'',open:8000};db.accts.push(A1,A2);
 db.xfers.push({id:nid('xf'),from:0,to:A1.id,amount:10000,date:dd(-7),ts:tsOf(dd(-7),15),by:1,note:'إيداع بنك'});db.cashx.push({id:nid('cx'),dir:'out',amount:10000,date:dd(-7),ts:tsOf(dd(-7),15),by:1,note:'تحويل إلى بنك مصر - إيداع بنك',xf:1});
 db.cashx.push({id:nid('cx'),dir:'in',amount:150000,date:dd(-44),ts:tsOf(dd(-44),9),by:1,note:'رأس مال'});
 /* شيكات */
 const CQ=(t,no,bk,amt,due,party,st,acct)=>{const c={id:nid('chq'),t,no,bank:bk,amount:amt,due,party,acct:acct||0,note:'',st,date:dd(-10),by:1};if(st==='محصل'){const p={id:nid('pay'),cid:party,date:due,ts:tsOf(due,12),by:1,amount:amt,note:'شيك #'+no,chq:c.id};if(acct)p.acct=acct;db.payments.push(p);c.pay=p.id}if(st==='مدفوع'){const p={id:nid('spay'),sid:party,date:due,ts:tsOf(due,12),by:1,amount:amt,note:'شيك #'+no,chq:c.id};db.spay.push(p);c.spay=p.id}db.chq.push(c)};
 CQ('in','458120','بنك مصر',12000,dd(1),custs[C0].id,'معلق',A1.id);CQ('in','458121','الأهلي',8000,dd(-3),custs[C0+2].id,'معلق',A1.id);CQ('in','771204','CIB',15000,dd(9),custs[C0+4].id,'مودع',A1.id);CQ('in','330982','بنك القاهرة',6000,dd(-12),custs[C0+1].id,'محصل',A1.id);CQ('in','330990','الأهلي',4000,dd(-20),custs[C0+3].id,'راجع',0);
 CQ('out','900301','بنك مصر',9000,dd(5),S[0].id,'معلق',A1.id);CQ('out','900288','بنك مصر',7000,dd(-8),S[1%S.length].id,'مدفوع',A1.id);
 db.customers.forEach(c=>recalc(c));
 /* موظفين وحضور */
 const H=db.settings.hr;H.lat='31.2940';H.lon='30.9701';H.radius=150;H.start='09:00';H.end='17:00';H.grace=15;H.off=[5];H.useOut=1;
 const staff=[['أحمد محمود','مندوب مبيعات','المبيعات',4500,'01011110001',-400],['منى إبراهيم','محاسبة','الحسابات',6000,'01022220002',-700],['سعد عبد الله','أمين مخزن','المخازن',4200,'01033330003',-300],['حسين علي','سائق','التوزيع',3800,'01044440004',-250],['ياسمين فتحي','سكرتارية','الإدارة',4000,'01055550005',-120],['كريم صلاح','مندوب مبيعات','المبيعات',4500,'01066660006',-60]];
 staff.forEach((s,i)=>{const e={id:nid('hr'),name:s[0],job:s[1],dept:s[2],salary:s[3],allow:i===1?500:0,phone:s[4],nid:'29'+ri(100000000000,999999999999),birth:'199'+ri(0,9)+'-0'+ri(1,9)+'-1'+ri(0,9),hire:dd(s[5]),contract:dd(i===3?20:300),emerg:'0100000000'+i,addr:'سيدي سالم',st:'نشط',pen:'yes',notes:''};db.staff.push(e);
  for(let k=44;k>=0;k--){const d=dd(-k),dow=new Date(d+'T12:00:00Z').getUTCDay();if(dow===5||d<e.hire)continue;if(k===0&&i>3)continue;const r=rnd();if(r<.07&&k>0)continue;const late=r>.78?ri(16,70):0,inn=hrMin(H.start)+(late||ri(-20,10));
   const f=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');db.hratt.push({id:nid('hr'),eid:e.id,date:d,in:f(inn),out:k===0?undefined:f(hrMin(H.end)+ri(-10,25)),inD:ri(5,90),inAcc:ri(5,30),by:1})}});
 const E0=db.staff;db.hrded.push({id:nid('hr'),eid:E0[2].id,amt:150,date:dd(-5),reason:'تلف بضاعة'},{id:nid('hr'),eid:E0[0].id,amt:100,date:dd(-12),reason:'مخالفة'});
 db.hradv.push({id:nid('hr'),eid:E0[3].id,amt:3000,monthly:500,repaid:1000,date:dd(-40),note:'سلفة ظروف'},{id:nid('hr'),eid:E0[0].id,amt:1000,monthly:1000,repaid:0,date:dd(-3),note:'سلفة'});
 db.hrlv.push({id:nid('hr'),eid:E0[1].id,type:'سنوية',from:dd(-20),to:dd(-18),days:3,st:'معتمدة',note:''},{id:nid('hr'),eid:E0[4].id,type:'سنوية',from:dd(5),to:dd(7),days:3,st:'معتمدة',note:''},{id:nid('hr'),eid:E0[5].id,type:'مرضية',from:dd(1),to:dd(2),days:2,st:'معلقة',note:'مرض'});
 save()}

/* ===== تغيير 41: ترتيب الإعدادات في مجموعات قابلة للطي (نفس الكروت ونفس الخانات، بس متجمعة منطقيًا) ===== */
{const SG=[
 ['co','🏢','الشركة والمظهر','بيانات الشركة واللغة والمظهر والخط',['بيانات الشركة','اللغة','المظهر','حجم الخط','إعدادات الأقسام'],1],
 ['pr','🖨️','الطباعة والفواتير','الورق والطباعة والضريبة وحماية الفواتير',['الطباعة','ضريبة','حماية الفواتير','تنبيهات الأقساط','تسليم الفلوس'],1],
 ['us','🛡️','المستخدمين والأمان','قفل الموقع وإيقاف البيع والحضور',['قفل الموقع','إيقاف البيع','الحضور والانصراف'],0],
 ['dt','💾','البيانات','نسخ احتياطي واستيراد وتنضيف وبيانات تجريبية',['النسخ الاحتياطي','استيراد','تنضيف','بيانات تجريبية'],0],
 ['sy','🔄','النظام','تحديث البرنامج',['تحديث البرنامج'],0]];
 const _st=R['/settings'];
 R['/settings']=function(){const html=_st.apply(this,arguments);const t=document.createElement('template');t.innerHTML=html;
  const kids=[...t.content.children],bk=SG.map(()=>[]),other=[];let save=null,pre=[];
  kids.forEach(c=>{if(c.tagName==='BUTTON'&&/حفظ الإعدادات/.test(c.innerText||c.textContent)){save=c;return}
   const h=(c.querySelector&&c.querySelector('h2'))?c.querySelector('h2').textContent:'';
   const gi=SG.findIndex(g=>g[4].some(k=>h.includes(k)));if(gi<0){if(!h)pre.push(c);else other.push(c)}else bk[gi].push(c)});
  const out=document.createElement('div');pre.forEach(c=>out.appendChild(c));
  const bar=`<div class="ssbar"><div style="font-size:13px;color:var(--mut)">الإعدادات متقسمة لمجموعات، دوس على المجموعة تفتحها.</div></div>`;
  out.insertAdjacentHTML('beforeend',bar);
  const mk=(id,ic,n,d,els,open)=>{if(!els.length)return;const dt=document.createElement('details');dt.className='ssg';dt.id='ssg_'+id;
   const key='kt_ssg_'+id;let o=open;try{const v=localStorage.getItem(key);if(v!==null)o=v==='1'}catch(e){}
   if(o)dt.setAttribute('open','');dt.setAttribute('ontoggle',"try{localStorage.setItem('kt_ssg_"+id+"',this.open?'1':'0')}catch(e){}");
   dt.innerHTML=`<summary><i>${ic}</i><span><b>${n}</b><small>${d}</small></span><em>${els.length}</em></summary><div class="ssb"></div>`;
   const bd=dt.querySelector('.ssb');els.forEach(e=>bd.appendChild(e));out.appendChild(dt)};
  SG.forEach((g,i)=>mk(g[0],g[1],g[2],g[3],bk[i],g[5]));mk('ot','🧩','أخرى','إعدادات إضافية',other,0);
  if(save){const w=document.createElement('div');w.className='ssave';w.appendChild(save);out.appendChild(w)}
  return out.innerHTML}}

/* ===== تغيير 42: الرئيسية والإعدادات أعمدة جنب بعض على الشاشات العريضة (بدون فراغات) ===== */
{const mas=()=>{try{const h=(location.hash.slice(1)||'/').split('?')[0],a=document.getElementById('app');if(a)a.classList.toggle('mas',h==='/'||h==='/settings')}catch(e){}};
 window.addEventListener('load',()=>{const a=document.getElementById('app');if(a)new MutationObserver(mas).observe(a,{childList:true});mas()});window.addEventListener('hashchange',()=>{mas();setTimeout(mas,100)})}

/* ===== تغيير 44: مرفقات (صورة / PDF) على الفواتير والمستندات والإيصالات =====
   الملفات نفسها في IndexedDB (مفيش حد 5MB زي التخزين العادي)، والبيانات الوصفية الصغيرة في db.att.
   الصور بتتضغط قبل الحفظ. لما السيرفر يجي، الملفات بتتنقل له من نفس الدوال. */
const ATT_MAX=6,ATT_PDF_MAX=4*1024*1024,ATD={};
const attDB=()=>new Promise((ok,no)=>{const q=indexedDB.open('kt_att',1);q.onupgradeneeded=()=>q.result.createObjectStore('a',{keyPath:'id'});q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
const attPut=async r=>{const d=await attDB();return new Promise((ok,no)=>{const t=d.transaction('a','readwrite');t.objectStore('a').put(r);t.oncomplete=ok;t.onerror=()=>no(t.error)})};
const attGet=async id=>{const d=await attDB();return new Promise((ok,no)=>{const q=d.transaction('a').objectStore('a').get(id);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})};
const attDelB=async id=>{const d=await attDB();return new Promise(ok=>{const t=d.transaction('a','readwrite');t.objectStore('a').delete(id);t.oncomplete=ok})};
function attList(key){return key.startsWith('d:')?(ATD[key]=ATD[key]||[]):((db.att=db.att||{})[key]=db.att[key]||[])}
function attImg(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const M=1600,s=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?ok(b):no('x'),'image/jpeg',.72)};im.onerror=()=>{URL.revokeObjectURL(u);no('x')};im.src=u})}
async function attAdd(key,inp){const fs=[...inp.files];inp.value='';const L=attList(key);
 for(const f of fs){if(L.length>=ATT_MAX){toast('أقصى عدد '+ATT_MAX+' مرفقات');break}
  try{let blob=f,type=f.type,name=f.name||'مرفق';
   if(/^image\//.test(type)){blob=await attImg(f);type='image/jpeg'}
   else if(type==='application/pdf'){if(f.size>ATT_PDF_MAX){toast('الـ PDF أكبر من 4 ميجا');continue}}
   else{toast('الصور أو PDF بس');continue}
   const id='at'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
   await attPut({id,blob});L.push({id,name,type,size:blob.size,ts:Date.now(),by:db.me});
  }catch(e){toast('معرفتش أقرأ الملف')}}
 if(!key.startsWith('d:'))save();attPaint()}
async function attDel(key,id){const L=attList(key),i=L.findIndex(x=>x.id===id);if(i<0)return;if(!key.startsWith('d:')&&!can('users.manage'))return toast('الحذف للمدير بس');
 if(!confirm('مسح المرفق؟'))return;L.splice(i,1);await attDelB(id);if(!key.startsWith('d:'))save();attPaint()}
function attMove(from,to){const L=ATD[from];if(!L||!L.length)return;(db.att=db.att||{})[to]=(db.att[to]||[]).concat(L);delete ATD[from];save()}
async function attView(id,name){const r=await attGet(id);if(!r)return toast('الملف مش موجود على الجهاز ده');const u=URL.createObjectURL(r.blob),pdf=r.blob.type==='application/pdf',o=document.createElement('div');
 o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;flex-direction:column';
 o.innerHTML=`<div style="display:flex;gap:8px;justify-content:space-between;padding:10px;color:#fff"><b style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name||'')}</b><span><a href="${u}" download="${esc(name||'attachment')}" style="color:#fff;margin-inline:10px">⬇ تحميل</a>${pdf?`<a href="${u}" target="_blank" style="color:#fff;margin-inline:10px">فتح</a>`:''}<button style="background:#fff;border:0;border-radius:8px;padding:4px 12px;font:inherit" id="atx">✖ إغلاق</button></span></div>${pdf?`<iframe src="${u}" style="flex:1;border:0;background:#fff"></iframe>`:`<div style="flex:1;overflow:auto;text-align:center"><img src="${u}" style="max-width:100%"></div>`}`;
 document.body.appendChild(o);o.querySelector('#atx').onclick=()=>{o.remove();URL.revokeObjectURL(u)}}
function attBox(key,title,ro){const L=attList(key);return `<div class="card attw" data-ak="${esc(key)}" ${ro?'data-ro=1':''}><h2>📎 ${title||'مرفقات'}${L.length?' ('+L.length+')':''}</h2><div class="atl" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:${ro?0:8}px"></div>${ro?'':`<div class="row2"><label class="btn sec" style="margin:0;text-align:center">📷 تصوير<input type="file" accept="image/*" capture="environment" hidden onchange="attAdd('${esc(key)}',this)"></label><label class="btn sec" style="margin:0;text-align:center">🖼 صورة أو PDF<input type="file" accept="image/*,application/pdf" multiple hidden onchange="attAdd('${esc(key)}',this)"></label></div>`}</div>`}
async function attPaint(){for(const w of document.querySelectorAll('.attw[data-ak]')){const key=w.dataset.ak,L=attList(key),box=w.querySelector('.atl');if(!box)continue;box.innerHTML='';
 const h=w.querySelector('h2');if(h)h.textContent='📎 '+(h.textContent.replace(/^📎\s*/,'').replace(/\s*\(\d+\)$/,''))+(L.length?' ('+L.length+')':'');
 if(!L.length&&w.dataset.ro){box.innerHTML='<div class="empty" style="margin:0;padding:14px">مفيش مرفقات</div>'}
 for(const m of L){const d=document.createElement('div');d.style.cssText='position:relative;width:84px';let th='';
  if(m.type==='application/pdf')th='<div style="height:84px;border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:30px;background:var(--card)">📄</div>';
  else{const r=await attGet(m.id);th=r?`<img src="${URL.createObjectURL(r.blob)}" style="width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">`:'<div style="height:84px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--mut);text-align:center">على جهاز تاني</div>'}
  d.innerHTML=th+`<div style="font-size:10.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.name)}</div>`+(!w.dataset.ro||can('users.manage')?`<button type="button" style="position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#b42318;color:#fff;font-size:12px;line-height:1;padding:0">✖</button>`:'');
  d.firstChild.style.cursor='pointer';d.firstChild.onclick=()=>attView(m.id,m.name);const x=d.querySelector('button');if(x)x.onclick=()=>attDel(key,m.id);box.appendChild(d)}}}
/* أماكن ظهور الودجت */
function attMount(){const A=document.getElementById('app');if(!A)return;const h=location.hash;
 if(!A.querySelector('.attw[data-ak="d:inv"]')&&/^#\/invoice\/new/.test(h)){const l=A.querySelector('#lines');const c=l&&l.closest('.card');if(c)c.insertAdjacentHTML('afterend',attBox('d:inv','مرفقات الفاتورة (صورة الفاتورة الورقية أو PDF)'))}
 if(/^#\/doc\//.test(h)&&!A.querySelector('.attw[data-ak="d:doc"]')){const l=A.querySelector('#lines');const c=l&&l.closest('.card');if(c)c.insertAdjacentHTML('afterend',attBox('d:doc','مرفقات المستند'))}
 [['pay_a','addPay'],['sp_a','addSupPay'],['cx_a','addCx'],['x_a','addExp'],['rp_a','payRep'],['py_a','addPay2']].forEach(([id,fn])=>{const i=A.querySelector('#'+id);if(!i||A.querySelector('.attw[data-ak="d:pay:'+id+'"]'))return;const c=i.closest('.card');if(c)c.insertAdjacentHTML('beforeend',attBox('d:pay:'+id,'مرفق الإيصال (اختياري)'))});
 attPaint()}
{const PAYS=[['addPay','pay_a','payments'],['addSupPay','sp_a','spay'],['addCx','cx_a','cashx'],['addExp','x_a','exps'],['payRep','rp_a','rpay'],['addPay2','py_a','pay']];
 PAYS.forEach(([f,id,arr])=>{if(typeof window[f]!=='function')return;const o=window[f];window[f]=function(){const n=(db[arr]||[]).length,r=o.apply(this,arguments);const A=db[arr]||[];if(A.length>n)attMove('d:pay:'+id,'pay:'+arr+':'+A[A.length-1].id);return r}});
 if(typeof saveInvoice==='function'){const o=saveInvoice;saveInvoice=function(){const n=db.invoices.length,r=o.apply(this,arguments);if(db.invoices.length>n)attMove('d:inv','inv:'+db.invoices[db.invoices.length-1].id);return r}}
 if(typeof docSave==='function'){const o=docSave;docSave=function(){const r=o.apply(this,arguments);const m=location.hash.match(/^#\/rec\/(\w+)\/(.+)$/);if(m)attMove('d:doc','doc:'+m[1]+':'+m[2]);return r}}
 const _inv=R['/invoice'];R['/invoice']=function(id){const h=_inv.apply(this,arguments);if(id==='new')return h;const L=attList('inv:'+id);return h+(L.length?attBox('inv:'+id,'مرفقات الفاتورة',1):'')};
 const _rec=R['/rec'];R['/rec']=function(k,qs){const h=_rec.apply(this,arguments);const id=location.hash.split('/')[3],L=attList('doc:'+k+':'+id);return h+(L.length?attBox('doc:'+k+':'+id,'مرفقات المستند',1):'')};
 const lbl=k=>{let m;if(m=k.match(/^inv:(.+)$/))return ['🧾 فاتورة #'+m[1],'#/invoice/'+m[1]];if(m=k.match(/^doc:(\w+):(.+)$/))return ['📄 '+((DOC_CFG[m[1]]||{}).t||'مستند')+' #'+m[2],'#/rec/'+m[1]+'/'+m[2]];if(m=k.match(/^pay:(\w+):(.+)$/)){const n={payments:'دفعة عميل',spay:'دفعة مورد',cashx:'حركة خزينة',exps:'مصروف',rpay:'صرف مندوب',pay:'مرتب'}[m[1]]||'إيصال';return ['🧾 '+n+' #'+m[2],null]}return [k,null]};
 R['/attach']=()=>{head('المرفقات',true);const ks=Object.keys(db.att||{}).filter(k=>(db.att[k]||[]).length).reverse();
  return ks.length?ks.map(k=>{const [t,l]=lbl(k);return `<div class="card attw" data-ak="${esc(k)}" data-ro="1"><h2 ${l?`onclick="location.hash='${l}'" style="cursor:pointer"`:''}>${esc(t)}</h2><div class="atl" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>`}).join(''):'<div class="empty">مفيش مرفقات لسه. بتضيفها من شاشة الفاتورة أو السند أو الإيصال.</div>'};
 if(typeof MORE_GROUPS!=='undefined'){const g=MORE_GROUPS.find(x=>x.id==='inv');if(g&&Array.isArray(g.it))g.it.push(['📎','المرفقات','#/attach','sales.view,customers.view,purchases.add'])}
 if(typeof ROUTE_PERM!=='undefined')ROUTE_PERM['/attach']=['sales.view','customers.view','purchases.add'];
 window.addEventListener('load',()=>{const a=document.getElementById('app');if(a)new MutationObserver(()=>{clearTimeout(attMount.t);attMount.t=setTimeout(attMount,60)}).observe(a,{childList:true});attMount()});
 window.addEventListener('hashchange',()=>setTimeout(attMount,150))}

/* ===== تغيير 10: شريط معلومات شاشة الفاتورة (زي النظام القديم، متكيف للموبايل): رقم الأذن والتاريخ باليوم + رصيد العميل + معلومات آخر صنف + ملخص الكمية والخصم والربحية ===== */
function invStripHtml(){const d=draft;if(!d||d.q)return '';const L=(d.lines||[]).filter(l=>l.pid&&+l.qty>0),mgr=can('reports.profit');
 const ids=db.invoices.map(i=>+i.id||0),next=Math.max(0,...ids)+1,dn=new Date((d.date||today())+'T12:00:00'),day=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][dn.getDay()];
 const t=dTotal(),paid=paidOf(t),rem=t-paid,qty=L.reduce((a,l)=>a+(+l.qty||0),0),gross=L.reduce((a,l)=>a+l.qty*l.price,0),ld=L.reduce((a,l)=>a+l.qty*l.price*(+l.disc||0)/100,0);
 const adj=dAdj(),disc=ld+(adj<0?-adj:0),add=adj>0?adj:0,cost=L.reduce((a,l)=>a+(+l.qty||0)*((prod(l.pid)||{}).cost||0),0);
 const c=d.cid?cust(d.cid):null,pb=c?(c.balance||0):0;
 const last=(d.lines||[]).filter(l=>l.pid).pop(),p=last&&prod(last.pid);
 const cell=(k,v,col)=>`<div style="flex:1;min-width:84px;text-align:center;padding:6px 4px"><div style="font-size:11px;color:var(--mut)">${k}</div><b style="font-size:14px;${col?'color:'+col:''}">${v}</b></div>`;
 return `<div class="card" id="invstrip"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;font-size:13px"><b>🧾 رقم الأذن #${next}</b><span>📅 ${day} ${(d.date||today()).split('-').reverse().join('/')}</span><span>${d.kind||''}</span></div>
 ${c?`<div style="display:flex;border-top:1px dashed var(--line);margin-top:8px">${cell('رصيد العميل السابق',fmt(pb),pb>0?'#b42318':'')}${cell('قيمة الفاتورة',fmt(t))}${cell('الرصيد بعد الفاتورة',fmt(pb+rem),(pb+rem)>0?'#b42318':'')}</div>`:''}
 ${p?`<div style="border-top:1px dashed var(--line);margin-top:6px;padding-top:6px;font-size:12.5px;color:var(--mut)">📦 <b style="color:var(--txt)">${esc(p.name)}</b> · رصيد ${fmt(qtyAt(dLoc(),p.id))}${d.cid&&lastPrice(d.cid,p.id)!=null?' · آخر بيع للعميل '+fmt(lastPrice(d.cid,p.id)):''}${mgr?' · <b style="color:#1f6fb3">'+fmt(p.cost||0)+'</b>'+(p.lastSup?' · <b style="color:#1f6fb3">'+fmt(p.lastSup)+'</b>':''):''}</div>`:''}
 ${L.length?`<div style="display:flex;flex-wrap:wrap;border-top:1px dashed var(--line);margin-top:6px">${cell('الكمية',fmt(qty))}${cell('الإجمالي',fmt(gross))}${cell('الخصم',fmt(disc))}${add?cell('الإضافة',fmt(add)):''}${cell('المدفوع',fmt(paid))}${cell('الباقي',fmt(rem),rem>0?'#b42318':'')}${mgr?cell('ربحية الأصناف',fmt(t-cost),(t-cost)<0?'#b42318':'#122f5b'):''}</div>`:''}</div>`}
{const _r=R['/invoice'];R['/invoice']=function(id){const h=_r.apply(this,arguments);if(id!=='new')return h;return h.replace(/(<div class="invn">(?:<div class="alert">.*?<\/div>)?)/,'$1<div id="invstripw"></div>')};
 setInterval(()=>{const w=document.getElementById('invstripw');if(!w||!/^#\/invoice\/new/.test(location.hash))return;try{const h=invStripHtml();if(w.dataset.h!==h){w.dataset.h=h;w.innerHTML=h}}catch(e){}},500)}

/* ===== تغيير 48: ترقيم صفحات حقيقي للتقارير (مقاس الورق) + PDF متعدد الصفحات =====
   الجدول الطويل بيتقسم لصفحات منفصلة بنفس رأس الجدول في كل صفحة، وبعد كل صفحة فاصل طباعة.
   ده بيمنع الجدول الواحد الضخم (مئات الصفوف) اللي كان بيعلّق المعاينة، وبيمنع صورة الـPDF العملاقة اللي كانت بتطلع فاضية. */
const PGN={A4:[26,20],A5:[16,11]};
function ktUnpag(){document.querySelectorAll('#app .pgw').forEach(w=>{if(w._o)w.replaceWith(w._o)})}
function ktPag(){try{ktUnpag();const pp=curPaper();if(!PGN[pp])return;const n=PGN[pp][0],n1=PGN[pp][1];
 document.querySelectorAll('#app .out table').forEach(t=>{if(t.closest('.ivp,.pgw,.ivp-sc'))return;
  const trs=[...t.rows];if(trs.length<=n1+2)return;
  const hd=trs.filter(r=>r.parentElement.tagName==='THEAD'||(r.rowIndex===0&&r.querySelector('th')));const bd=trs.filter(r=>!hd.includes(r));
  const w=document.createElement('div');w.className='pgw';w._o=t;let i=0,first=true;
  while(i<bd.length){const k=first?n1:n,c=t.cloneNode(false),tb=document.createElement('tbody');
   hd.forEach(h=>{const th=document.createElement('thead');th.appendChild(h.cloneNode(true));c.appendChild(th)});
   bd.slice(i,i+k).forEach(r=>tb.appendChild(r.cloneNode(true)));c.appendChild(tb);
   const pg=document.createElement('div');pg.className='pgp';pg.appendChild(c);w.appendChild(pg);i+=k;first=false}
  t.replaceWith(w)})}catch(e){console.warn(e)}}
{const _oaG=outAuto;outAuto=function(){_oaG();ktPag()}}
{const _spn=setPaperNow;setPaperNow=function(v){_spn(v);ktPag()}}
{const _wp=window.print;window.print=function(){ktPag();return _wp.apply(this,arguments)}}
{const _op=outPDF;outPDF=async function(b,wa){const el=b.parentElement.previousElementSibling;
 if(!el||!el.querySelector('.pgp')||/^#\/pricelist/.test(location.hash))return _op(b,wa);
 toast('جاري تجهيز الـ PDF…');
 try{const x=outCtx(),np=el.querySelectorAll('.pgp').length,W=794,H=1123,pgs=[];
  const css=[...document.styleSheets].map(ss=>{try{return [...ss.cssRules].map(r=>r.cssText).join('\n')}catch(e){return ''}}).join('\n');
  for(let i=0;i<np;i++){const c=el.cloneNode(true);c.querySelectorAll('.noprint,button,.acl').forEach(e=>e.remove());
   c.querySelectorAll('input,select').forEach(e=>{const s=document.createElement('span');s.textContent=e.value;e.replaceWith(s)});
   [...c.querySelectorAll('.pgp')].forEach((p,j)=>{if(j!==i)p.remove()});
   const w=c.querySelector('.pgw');
   if(i>0&&w){let n=w;while(n&&n!==c){while(n.previousSibling)n.previousSibling.remove();n=n.parentNode}}
   if(i<np-1&&w){let n=w;while(n&&n!==c){while(n.nextSibling)n.nextSibling.remove();n=n.parentNode}}
   const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:0;width:'+(W-48)+'px';holder.appendChild(c);document.body.appendChild(holder);
   const hh=holder.offsetHeight,z=hh>H-60?(H-60)/hh:1;holder.remove();c.style.zoom=z;
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="width:${W}px;height:${H}px;box-sizing:border-box;background:#fff;padding:24px;font-family:${FONT}"><style><![CDATA[${css}]]></style>${new XMLSerializer().serializeToString(c)}</div></foreignObject></svg>`;
   const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
   const cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,0,0,cv.width,cv.height);
   const d=atob(cv.toDataURL('image/jpeg',.9).split(',')[1]),jpg=new Uint8Array(d.length);for(let k=0;k<d.length;k++)jpg[k]=d.charCodeAt(k);pgs.push({jpg,w:cv.width,h:cv.height})}
  const f=new File([jpegPdfN(pgs)],(x.name||'تقرير')+'.pdf',{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[f]})&&/Android|iPhone|iPad/.test(navigator.userAgent)){try{await navigator.share({files:[f],title:f.name});return}catch(e){if(e.name==='AbortError')return}}
  dl(f);
  if(wa){toast(x.ph?'اتحفظ الـ PDF ✅ - دوس إرفاق في واتساب واختار الملف':'اتحفظ الـ PDF ✅ - اختار جهة الاتصال وأرفقه');setTimeout(()=>window.open('https://wa.me/'+(x.ph?waNum(x.ph):'')+'?text='+encodeURIComponent('📎 '+(x.name||'ملف')+' (PDF مرفق)'),'_blank'),700);return}
  toast('اتحفظ ملف الـ PDF ✅ ('+np+' صفحة)')}catch(e){toast('تعذر تجهيز الـ PDF، استخدم طباعة / حفظ')}}}

/* ===== تغيير 49: توزيع عرض الأعمدة حسب المحتوى =====
   الأعمدة القصيرة (المسلسل، الكود، الوحدة، الأرقام) بتتقلص على قد محتواها، والمساحة الفاضية بتروح لأعمدة النص الطويل (اسم الصنف...).
   بيتطبق على كل جداول التقارير (شاشة + طباعة + PDF) قبل التقسيم لصفحات. */
function ktFit(root){try{(root||document).querySelectorAll('#app .out table, #app .card table').forEach(t=>{
 if(t.closest('.ivp,.ivp-sc')||t._fit)return;const rows=[...t.rows];if(rows.length<2)return;
 const nc=Math.max(...rows.slice(0,5).map(r=>r.cells.length));if(nc<2||nc>14)return;
 if(rows.slice(0,40).some(r=>r.cells.length===1&&nc>1&&0))return;
 const mx=new Array(nc).fill(0);const smp=rows.slice(0,90);
 smp.forEach(r=>{if(r.cells.length!==nc)return;[...r.cells].forEach((c,j)=>{if(c.colSpan>1)return;const L=(c.textContent||'').trim().length;if(L>mx[j])mx[j]=L})});
 const narrow=mx.map(L=>L>0&&L<=11);if(narrow.every(x=>x)||!narrow.some(x=>x))return;
 t._fit=1;t.style.width='100%';t.style.tableLayout='auto';
 rows.forEach(r=>{if(r.cells.length!==nc)return;[...r.cells].forEach((c,j)=>{if(narrow[j]){c.style.width='1%';c.style.whiteSpace='nowrap'}else{c.style.minWidth='90px'}})})})}catch(e){console.warn(e)}}
{const _kp=ktPag;ktPag=function(){ktFit();_kp()}}
{let _ft=0;new MutationObserver(()=>{clearTimeout(_ft);_ft=setTimeout(()=>ktFit(),60)}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})}

/* =====================================================================
   تغيير 46 (دفعة 1): المزامنة السحابية عبر Firebase (خطة Spark المجانية)
   ---------------------------------------------------------------------
   - من غير مكتبات: بنكلم Firebase بالـREST (تسجيل الدخول + Firestore) بـfetch عادي، فالكود محمول.
   - البيانات بتتضغط وبتتشفر على الجهاز (AES-256-GCM) بمفتاح مشتق من "باسورد البيانات" قبل ما تتبعت. جوجل مش بيشوف أي حاجة مقروءة.
   - التخزين: sync/meta (رقم النسخة) + sync/d{النسخة}_{رقم القطعة} (البيانات المشفرة مقسمة قطع).
   - تلقائي: بعد كل حفظ (بعد 5 ثواني) ولما النت يرجع ولما التبويب يفتح وكل دقيقة. التطبيق شغال أوفلاين عادي.
   - الأمان من الضياع: الرفع بشرط إن نسخة السحابة هي نفسها اللي سحبناها (precondition). لو الجهازين اتغيروا: بيظهر "تعارض"
     ومفيش حاجة بتتمسح من غير ما تختار، وبنحفظ نسخة أمان على الجهاز قبل أي استبدال.
   - الدمج الذكي لكل سجل (مناديب على أجهزة مختلفة) والأرقام المحجوزة: الدفعة الجاية. */
const KSY=(()=>{
 const FB={key:'AIzaSyDEGj7_RG_1E60A34c_cGmkTUKksutHDeo',pid:'khaled-trade'};
 const FS='https://firestore.googleapis.com/v1/projects/'+FB.pid+'/databases/(default)/documents/sync';
 const te=new TextEncoder(),td=new TextDecoder(),S=crypto.subtle;
 const b64=u=>{u=new Uint8Array(u);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
 const unb=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const CH=600000;
 let tok='',tokExp=0,busy=false,applying=false,deb=0,st={s:'off',t:0,m:''};
 const cfg=()=>(typeof db!=='undefined'&&db&&db.sync)||null;
 const raw=()=>{try{if(typeof Auth!=='undefined'&&Auth.persist)Auth.persist(db)}catch(e){}};
 const gz=async b=>new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 const gun=async b=>new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 const dkey=async(pw,salt)=>{const k=await S.importKey('raw',te.encode(String(pw).normalize('NFKC').trim()),'PBKDF2',false,['deriveBits']);return new Uint8Array(await S.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},k,256))};
 const ckey=r=>S.importKey('raw',r,'AES-GCM',false,['encrypt','decrypt']);
 const seal=async(r,bytes)=>{const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await S.encrypt({name:'AES-GCM',iv},await ckey(r),bytes)),o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return b64(o)};
 const open=async(r,s)=>{const o=unb(s);try{return new Uint8Array(await S.decrypt({name:'AES-GCM',iv:o.slice(0,12)},await ckey(r),o.slice(12)))}catch(e){throw new Error('باسورد البيانات غلط. اكتب نفس الباسورد اللي اتشفرت بيها البيانات')}};
 const ERR={INVALID_LOGIN_CREDENTIALS:'الإيميل أو الباسورد غلط',EMAIL_NOT_FOUND:'الإيميل أو الباسورد غلط',INVALID_PASSWORD:'الإيميل أو الباسورد غلط',USER_DISABLED:'الحساب ده موقوف',TOO_MANY_ATTEMPTS_TRY_LATER:'محاولات كتير. استنى شوية وحاول تاني'};
 const jf=async(url,o)=>{let r;try{r=await fetch(url,o)}catch(e){throw new Error('مفيش اتصال بسيرفر المزامنة. اتأكد من النت وحاول تاني')}let j=null;try{j=await r.json()}catch(e){}if(!r.ok){const m=(j&&j.error&&(j.error.message||j.error.status))||('HTTP '+r.status);const e=new Error(ERR[String(m).split(' ')[0]]||m);e.code=r.status;e.st=j&&j.error&&j.error.status;throw e}return j};
 async function signIn(email,pw){const j=await jf('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+FB.key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(email).trim(),password:pw,returnSecureToken:true})});tok=j.idToken;tokExp=Date.now()+(+j.expiresIn-120)*1000;return j}
 async function auth(){if(tok&&Date.now()<tokExp)return;const c=cfg();if(!c||!c.rt)throw new Error('سجّل دخول المزامنة تاني');const j=await jf('https://securetoken.googleapis.com/v1/token?key='+FB.key,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(c.rt)});tok=j.id_token;tokExp=Date.now()+(+j.expires_in-120)*1000;if(j.refresh_token){c.rt=j.refresh_token;raw()}}
 const H=()=>({Authorization:'Bearer '+tok,'Content-Type':'application/json'});
 async function get(n){try{return await jf(FS+'/'+n,{headers:H()})}catch(e){if(e.code===404)return null;throw e}}
 const num=f=>f&&f.integerValue!==undefined?+f.integerValue:0;
 async function put(n,fields,pre){let q='';if(pre===false)q='?currentDocument.exists=false';else if(pre)q='?currentDocument.updateTime='+encodeURIComponent(pre);
  return jf(FS+'/'+n+q,{method:'PATCH',headers:H(),body:JSON.stringify({fields})})}
 const del=async n=>{try{await fetch(FS+'/'+n,{method:'DELETE',headers:H()})}catch(e){}};
 /* تحويل البيانات لنص مشفر مقسم قطع */
 async function pack(){const o=JSON.parse(JSON.stringify(db));delete o.sync;delete o.me;const z=await gz(te.encode(JSON.stringify(o)));return seal(b64Raw(),z)}
 const b64Raw=()=>unb(cfg().kb);
 const eh=async u=>Array.from(new Uint8Array(await S.digest('SHA-256',te.encode('kt-env:'+String(u).trim().toLowerCase())))).map(x=>x.toString(16).padStart(2,'0')).join('');
 async function unpack(str,kb){return JSON.parse(td.decode(await gun(await open(kb,str))))}
 async function readAll(m,kb){const ver=num(m.fields.ver),n=num(m.fields.n);let s='';for(let i=0;i<n;i++){const d=await get('d'+ver+'_'+i);if(!d)throw new Error('قطعة ناقصة في السحابة');s+=d.fields.d.stringValue}return unpack(s,kb)}
 function setS(s,m){st={s,t:s==='ok'?Date.now():st.t,m:m||''};pill();try{if(location.hash==='#/sync'&&!KSY._ed)KSY.draw()}catch(e){}}
 function pill(){let p=document.getElementById('ksy_pill');const c=cfg();if(!c||typeof DEMO!=='undefined'&&DEMO){if(p)p.remove();window.__ksyP=null;return}
  if(!p){p=window.__ksyP;if(!p){p=document.createElement('button');p.id='ksy_pill';p.className='modeb';p.onclick=()=>{location.hash='#/sync'};window.__ksyP=p}const h=document.getElementById('hd');if(h)h.appendChild(p)}
  const I={ok:['☁️','متزامن','#1c4b92'],sync:['🔄','بيتزامن…','#2f5fa8'],dirty:['⏳','في انتظار المزامنة','#b07a00'],off:['📴','أوفلاين','#6b727c'],err:['⚠️','مشكلة في المزامنة','#c0392b'],conflict:['⚠️','تعارض: اضغط','#c0392b']};
  const k=(st.s==='ok'&&c.dirty)?'dirty':st.s,x=I[k]||I.ok;p.textContent=x[0];p.title=x[1];p.style.background=x[2]}
 /* نسخة أمان محلية قبل أي استبدال */
 function safety(){try{localStorage.setItem('kt_presync',JSON.stringify({t:Date.now(),n:(db.invoices||[]).length}))}catch(e){}}
 async function apply(d){applying=true;try{const old=db.users,keep={sync:db.sync,me:db.me};db=d;ensure();try{Auth.mergeRestore(db,old)}catch(e){}db.sync=keep.sync;db.me=Auth.uid||keep.me;raw();}finally{applying=false}try{route()}catch(e){}}
 async function pull(m){const c=cfg();const d=await readAll(m,b64Raw());await apply(d);const c2=cfg();c2.base=num(m.fields.ver);c2.dirty=false;c2.seq=0;raw()}
 async function push(m){const c=cfg(),seq0=c.seq||0;const ver=(m?num(m.fields.ver):0)+1;let salt=m&&m.fields.salt?m.fields.salt.stringValue:c.salt;
  const str=await pack(),n=Math.ceil(str.length/CH)||1;
  for(let i=0;i<n;i++)await put('d'+ver+'_'+i,{d:{stringValue:str.slice(i*CH,(i+1)*CH)}});
  try{await put('meta',{ver:{integerValue:String(ver)},n:{integerValue:String(n)},salt:{stringValue:salt},by:{stringValue:c.dev||''},ts:{integerValue:String(Date.now())}},m?m.updateTime:false)}
  catch(e){if(e.code===409||e.code===400||e.st==='FAILED_PRECONDITION'||e.st==='ALREADY_EXISTS'){for(let i=0;i<n;i++)del('d'+ver+'_'+i);const er=new Error('conflict');er.conflict=1;throw er}throw e}
  c.base=ver;c.dirty=(c.seq||0)!==seq0;raw();
  if(m){const pn=num(m.fields.n),pv=num(m.fields.ver);for(let i=0;i<pn;i++)del('d'+pv+'_'+i)}}
 async function sync(manual){const c=cfg();if(busy||!c||(typeof DEMO!=='undefined'&&DEMO))return;if(!navigator.onLine){setS('off');return}
  if(typeof Auth!=='undefined'&&Auth.ok&&!Auth.ok())return;busy=true;setS('sync');
  try{await auth();const m=await get('meta');
   if(!m){if(c.base>0&&!c.dirty)throw new Error('ملف السحابة اتمسح');await push(null)}
   else{const rv=num(m.fields.ver);
    if(rv>c.base){if(c.dirty&&!c.force){setS('conflict');return}safety();await pull(m)}
    else if(c.dirty||c.force){c.force=0;await push(m)}}
   setS('ok')}
  catch(e){if(e.conflict)setS('conflict');else if(!navigator.onLine||/Failed to fetch|NetworkError|Load failed/i.test(e.message))setS('off');else setS('err',e.message)}
  finally{busy=false;pill()}}
 const later=()=>{clearTimeout(deb);deb=setTimeout(()=>sync(),5000)};
 try{const o=store.save;store.save=d=>{KSY.mark();o(d)}}catch(e){}
 addEventListener('online',()=>sync());addEventListener('offline',()=>setS('off'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 setInterval(()=>sync(),60000);setTimeout(()=>{pill();sync()},4000);
 const api={
  _ed:0,get st(){return st},
  /* ظرف الدخول: بيانات حساب المزامنة + مفتاح البيانات، مشفرين بباسورد المستخدم (PBKDF2 600 ألف + AES-GCM). الاسم على السحابة هاش، فمحدش يعدّد المستخدمين */
  async mkEnv(un,pw,email,apw){const c=cfg();if(!c||!c.kb)throw new Error('المزامنة مش مربوطة على الجهاز ده');await auth();
   const salt=crypto.getRandomValues(new Uint8Array(16)),pl=JSON.stringify({e:email,p:apw,kb:c.kb,s:c.salt});
   await put('env_'+await eh(un),{s:{stringValue:b64(salt)},w:{stringValue:await seal(await dkey(pw,salt),te.encode(pl))}})},
  /* نسخ ظرف الدخول لاسم مستخدم جديد (لما اسم المستخدم يتغير من غير ما الباسورد يتكتب). الظرف مفيهوش الاسم، فبينفع نفس الباسورد */
  async cpEnv(oldUn,newUn){if(String(oldUn).trim().toLowerCase()===String(newUn).trim().toLowerCase())return false;await auth();const m=await jf(FS+'/env_'+await eh(oldUn)+'?key='+FB.key);
   await put('env_'+await eh(newUn),{s:{stringValue:m.fields.s.stringValue},w:{stringValue:m.fields.w.stringValue}});return true},
  /* تغيير باسورد المستخدم لنفسه: نعيد تغليف الظرف بالباسورد الجديد */
  async reEnv(un,oldPw,newPw){await auth();const h=await eh(un),m=await jf(FS+'/env_'+h+'?key='+FB.key);
   const pl=td.decode(await open(await dkey(oldPw,unb(m.fields.s.stringValue)),m.fields.w.stringValue)),salt=crypto.getRandomValues(new Uint8Array(16));
   await put('env_'+h,{s:{stringValue:b64(salt)},w:{stringValue:await seal(await dkey(newPw,salt),te.encode(pl))}})},
  async rmEnv(un){await auth();await del('env_'+await eh(un))},
  async envLogin(un,pw){const h=await eh(un);let m;
   try{m=await jf(FS+'/env_'+h+'?key='+FB.key)}catch(e){if(e.code===404||e.code===403)throw new Error('اسم المستخدم أو الباسورد غلط. اكتب اسم المستخدم بالظبط (حروف إنجليزي من غير مسافات) والباسورد (الحروف الكبيرة والصغيرة مهمة)');throw e}
   let pl;try{pl=JSON.parse(td.decode(await open(await dkey(pw,unb(m.fields.s.stringValue)),m.fields.w.stringValue)))}catch(x){throw new Error('اسم المستخدم أو الباسورد غلط. اكتب اسم المستخدم بالظبط (حروف إنجليزي من غير مسافات) والباسورد (الحروف الكبيرة والصغيرة مهمة)')}
   const j=await signIn(pl.e,pl.p),mm=await get('meta');if(!mm)throw new Error('مفيش بيانات على السحابة لسه');const data=await readAll(mm,unb(pl.kb));
   return{data,sync:{email:pl.e,rt:j.refreshToken,kb:pl.kb,salt:pl.s,base:num(mm.fields.ver),dirty:false,seq:0,dev:'d'+Math.random().toString(36).slice(2,8)}}},
  mark(){const c=cfg();if(!c||applying)return;c.dirty=true;c.seq=(c.seq||0)+1;later();pill()},
  sync,
  async connect(email,pw,dpw){if(typeof DEMO!=='undefined'&&DEMO)throw new Error('مش متاحة في النسخة التجريبية');if(!email||!pw||!dpw)throw new Error('املا كل الخانات');
   const j=await signIn(email,pw);const m=await get('meta');let salt,kb;
   if(m){salt=m.fields.salt.stringValue;kb=await dkey(dpw,unb(salt));try{await readAll(m,kb)}catch(e){if(e.message==='conflict'||/قطعة|اتصال|باسورد/.test(e.message))throw e;throw new Error('باسورد البيانات غلط. اكتب نفس الباسورد اللي اتشفرت بيها البيانات')}}
   else{const s=crypto.getRandomValues(new Uint8Array(16));salt=b64(s);kb=await dkey(dpw,s)}
   db.sync={email:String(email).trim(),rt:j.refreshToken,kb:b64(kb),salt,base:0,dirty:false,seq:0,dev:'d'+Math.random().toString(36).slice(2,8)};
   if(m){if(((db.products||[]).length||(db.customers||[]).length)&&!confirm('بيانات الجهاز ده هتتستبدل ببيانات السحابة. تكمل؟')){delete db.sync;raw();return}safety();await pull(m);setS('ok')}
   else{db.sync.dirty=true;raw();await sync(true)}
   pill()},
  disconnect(){delete db.sync;tok='';raw();pill();api.draw()},
  async keepMine(){const c=cfg();if(!c)return;if(!confirm('هترفع نسخة الجهاز ده وتستبدل نسخة السحابة. تكمل؟'))return;c.force=1;c.dirty=true;await sync(true);api.draw()},
  async takeCloud(){const c=cfg();if(!c)return;if(!confirm('هتاخد نسخة السحابة وتمسح تغييرات الجهاز ده اللي ما اترفعتش. تكمل؟'))return;c.dirty=false;c.base=0;await sync(true);api.draw()},
  draw(){const a=document.getElementById('app');if(a&&location.hash==='#/sync')a.innerHTML=R['/sync']()}
 };
 return api})();
function ksyAgo(t){if(!t)return 'لسه';const s=Math.round((Date.now()-t)/1000);return s<60?'من ثواني':s<3600?'من '+Math.round(s/60)+' دقيقة':'من '+Math.round(s/3600)+' ساعة'}
R['/sync']=()=>{head('المزامنة السحابية',true);const c=db.sync,s=KSY.st;
 if(typeof DEMO!=='undefined'&&DEMO)return `<div class="card"><h2>☁️ المزامنة السحابية</h2><div class="s" style="color:var(--mut)">مش متاحة في النسخة التجريبية.</div></div>`;
 if(!c)return `<div class="card"><h2>☁️ المزامنة السحابية</h2><div class="s" style="color:var(--mut);line-height:1.8">بتخلي بياناتك على كل أجهزتك. مشفرة على جهازك قبل ما تتبعت، وجوجل مش بيشوف أي حاجة مقروءة. التطبيق بيفضل شغال أوفلاين وبيزامن لوحده لما النت يرجع.</div>
  <label>إيميل المزامنة</label><input id="ky_e" type="email" autocapitalize="none" autocomplete="off" placeholder="khaledtrade1@khaled-trade.app">
  <label>باسورد الحساب</label><input id="ky_p" type="password" autocomplete="off">
  <label>باسورد البيانات (بتتكتب مرة واحدة على كل جهاز)</label><input id="ky_d" type="password" autocomplete="off">
  <div class="er" id="ky_er" style="color:#c0392b;min-height:18px;font-size:13px;margin-top:6px"></div><button class="btn" id="ky_b" onclick="ksyConnect()">ربط المزامنة</button></div>`;
 const lbl={ok:'✅ متزامن',sync:'🔄 بيتزامن…',off:'📴 أوفلاين (التغييرات محفوظة وهتترفع لما النت يرجع)',err:'⚠️ '+(s.m||'مشكلة'),conflict:'⚠️ تعارض: الجهاز والسحابة اتغيروا'}[s.s]||'…';
 return `<div class="card"><h2>☁️ المزامنة السحابية</h2><div class="stat"><span>الحالة</span><b>${lbl}</b></div><div class="stat"><span>آخر مزامنة</span><b>${ksyAgo(s.t)}</b></div><div class="stat"><span>الحساب</span><b dir="ltr">${esc(c.email)}</b></div><div class="stat"><span>تغييرات لسه ما اترفعتش</span><b>${c.dirty?'فيه':'مفيش'}</b></div>
  ${s.s==='conflict'?`<div class="note" style="margin:8px 0">الجهاز ده وسحابة جوجل اتغيروا الاتنين من آخر مزامنة. اختار نسخة واحدة. مفيش حاجة بتتمسح من غير اختيارك.</div><button class="btn" onclick="KSY.keepMine()">ارفع نسخة الجهاز ده</button><button class="btn sec" onclick="KSY.takeCloud()">خد نسخة السحابة</button>`:`<button class="btn" onclick="KSY.sync(true).then(()=>KSY.draw())">🔄 زامن دلوقتي</button>`}
  <button class="btn sec" onclick="if(confirm('هتفصل المزامنة عن الجهاز ده. البيانات هتفضل عليه. تكمل؟'))KSY.disconnect()">فصل المزامنة</button></div>`};
async function ksyConnect(){const b=document.getElementById('ky_b'),e=document.getElementById('ky_er');e.textContent='';b.disabled=true;b.textContent='جارِ الربط…';KSY._ed=1;
 try{await KSY.connect(document.getElementById('ky_e').value,document.getElementById('ky_p').value,document.getElementById('ky_d').value);KSY._ed=0;toast('اتربطت المزامنة ✅');route()}
 catch(x){KSY._ed=0;b.disabled=false;b.textContent='ربط المزامنة';e.textContent=x.message||'حصلت مشكلة'}}
(()=>{const s=document.createElement('style');s.textContent='#ksy_pill{margin-inline-start:6px;font-size:15px!important;padding:5px 8px!important;color:#fff}@media print{#ksy_pill{display:none!important}}';document.head.appendChild(s)})();

/* ===== تغيير 50: الوحدة وعدد الوحدات + الرصيد بوحدات كاملة وعبوات ناقصة =====
   الرصيد المخزّن = عدد العبوات الداخلية. بنعرضه: (وحدات كاملة) و(عبوات ناقصة) عشان أي وحدة ناقصة تبان. */
function qBrk(p,q){q=+q||0;const n=pkOf(p),u=(p&&p.unit)||'وحدة',a=Math.abs(q),sg=q<0?'-':'';
 if(!(n>1))return sg+fmt(a)+' '+esc(u);
 const w=Math.floor(a/n),r=+(a-w*n).toFixed(3),pt=[];if(w>0)pt.push(fmt(w)+' '+esc(u));if(r>0)pt.push(fmt(r)+' عبوة');
 return sg+(pt.join(' و ')||'0')}
const qInfo=p=>esc((p&&p.unit)||'')+(pkOf(p)>1?' · '+pkOf(p)+' عبوة بالوحدة':'');
function stDraw(){const el=$('#stl');if(!el)return;const q=stQ.trim();
 const l=db.products.filter(p=>p.name.includes(q)).map(p=>({p,q:stLoc==='all'?allLocs().filter(x=>x[0]==='w').reduce((a,x)=>a+qtyAt(x,p.id),0):qtyAt(stLoc,p.id)}));
 el.innerHTML=l.length?l.map(({p,q})=>{const e=expState(p);return `<div class="item"><div class="main"><div class="t">${esc(p.name)}</div><div class="s">${qInfo(p)}${e?` · <span class="pill ${e.c}">${e.t}</span>`:''}${p.exp?' · '+p.exp:''}</div></div><div class="num ${q<=p.min&&stLoc==='all'?'neg':''}" style="text-align:left;line-height:1.35">${qBrk(p,q)}${pkOf(p)>1?`<div style="font-size:11px;font-weight:600;color:var(--mut)">(${fmt(q)} عبوة)</div>`:''}</div></div>`}).join(''):'<div class="empty">مفيش أصناف</div>'}
R['/stocktake']=()=>{head('ورقة الجرد',1);const ls=myLocs();
 const rows=db.products.map(p=>{const q=skL==='all'?Object.keys(db.stk).reduce((a,l)=>a+qtyAt(l,p.id),0):qtyAt(skL,p.id);return [esc(p.name),esc(p.unit||''),pkOf(p)>1?pkOf(p):'-',qBrk(p,q)+(pkOf(p)>1?' ('+fmt(q)+')':''),'','']});
 return `<div class="card"><label>المكان</label><select onchange="skL=this.value;route()"><option value="all">كل المخازن</option>${locOpts(skL,ls)}</select></div>
 <div class="card out"><div style="text-align:center;font-weight:800">ورقة جرد - ${esc(db.settings.company||'خالد تريد')}</div><div style="text-align:center;font-size:12px">${skL==='all'?'كل المخازن':esc(locName(skL))} · ${new Date().toLocaleDateString('en-GB')}</div>
 ${rtbl(['الصنف','الوحدة','عدد الوحدة','رصيد البرنامج','الجرد الفعلي','الفرق'],rows)}</div>`};
R['/cntsheet']=loc=>{if(!loc||!allLocs().includes(loc))return R['/cnt']();head('ورقة جرد',true);
 const L=db.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(p=>!CSONLY||qtyAt(loc,p.id)!==0);
 return `<div class="card noprint"><label>المكان</label><select onchange="location.hash='#/cntsheet/'+this.value">${locOpts(loc)}</select><label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" ${CSONLY?'checked':''} onchange="CSONLY=this.checked;route()"> الأصناف اللي ليها رصيد بس</label><button class="btn sec" onclick="cdSheetPdf('${loc}')">⬇️ PDF متعدد الصفحات (A4)</button></div>
 <div class="card out"><h2>📋 ورقة جرد - ${esc(locName(loc))}</h2><div class="stat"><span>التاريخ</span><b>${today()}</b></div><table><tr><th>م</th><th>الصنف</th><th>الوحدة</th><th>عدد الوحدة</th><th>بالبرنامج</th><th style="min-width:80px">الجرد الفعلي</th></tr>${L.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td>${esc(p.unit||'')}</td><td>${pkOf(p)>1?pkOf(p):'-'}</td><td>${qBrk(p,qtyAt(loc,p.id))}</td><td style="border-bottom:1px solid #999"></td></tr>`).join('')}</table></div>`};
function cdSheetPdf(loc){const L=db.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(p=>!CSONLY||qtyAt(loc,p.id)!==0);
 const tx=s=>String(s).replace(/&[a-z]+;/g,'');
 dl(tablePdf('ورقة جرد - '+locName(loc),[{h:'م',w:.06,n:1},{h:'الصنف',w:.34},{h:'الوحدة',w:.11},{h:'عدد الوحدة',w:.09,n:1},{h:'بالبرنامج',w:.2},{h:'الجرد الفعلي',w:.2}],L.map((p,i)=>[i+1,p.name,p.unit||'',pkOf(p)>1?pkOf(p):'-',tx(qBrk(p,qtyAt(loc,p.id))),'']),'عدد الأصناف: '+L.length+'  ·  '+today(),'ورقة-جرد'));toast('اتحمل ملف الـ PDF ✅')}

/* ===== تغيير 51: شيل القسط خالص. الفاتورة نقدي أو آجل بس، والآجل بيروح على رصيد الحساب مباشرة ===== */
function drawInst(){const e=$('#inst');if(e)e.remove()}
function drawDInst(){const e=$('#dinst');if(e)e.remove()}
function instAll(){return[]}
function instOf(){return[]}
(()=>{const purge=()=>{try{(db.invoices||[]).forEach(i=>{if(i.inst)delete i.inst});(db.purchases||[]).forEach(i=>{if(i.inst)delete i.inst})}catch(e){}};window.addEventListener('hashchange',purge);purge()})();


/* ===== تغيير 52: دخول المستخدم باسمه وباسورده بس (ظرف مشفر على السحابة) =====
   المدير بيعمل مستخدم + باسورد. التطبيق بيختار له حساب مزامنة khaledtradeN بالترتيب، وبيرفع "ظرف" مشفر بباسورد المستخدم.
   الجهاز الجديد بيكتب الاسم والباسورد بس: بيفك الظرف، بيدخل حساب المزامنة، بينزل البيانات، وبيعمل حساب محلي. */
async function envAcct(u){const c=db.sync;if(!c)return null;let a=u.acct;
 if(!a){const used=db.users.filter(x=>x.id!==u.id&&x.acct).map(x=>x.acct);for(let n=1;n<=10;n++){const e='khaledtrade'+n+'@khaled-trade.app';if(!used.includes(e)){a=e;break}}}
 if(!a){toast('حسابات المزامنة العشرة اتستخدمت كلها');return null}
 c.pool=c.pool||{};if(!c.pool[a]){const p=await askPass('باسورد حساب المزامنة '+a+' (بتتكتب مرة واحدة على جهازك بس)');if(!p)return null;c.pool[a]=p;try{Auth.persist(db)}catch(e){}}
 u.acct=a;return{email:a,pw:c.pool[a]}}
const hook52=()=>{if(window._h52)return;window._h52=1;const _up=userPass;userPass=async function(u,pw,isNew){const ok=await _up(u,pw,isNew);if(!ok)return false;
 if(pw&&!DEMO&&db.sync&&u.id!==Auth.uid){try{const a=await envAcct(u);if(a){await KSY.mkEnv(u.username,pw,a.email,a.pw);save();toast('✅ '+u.name+' يقدر يدخل من أي جهاز باسمه وباسورده')}}catch(e){toast('اتحفظ بس مش اتربط بالسحابة: '+(e.message||''))}}
 try{if(!DEMO&&db.sync&&u.acct){if(pw){u.envu=u.username}else if(u.envu&&u.envu.toLowerCase()!==String(u.username).toLowerCase()){await KSY.cpEnv(u.envu,u.username);u.envu=u.username;save();toast('✅ '+u.name+' يدخل دلوقتي باسمه الجديد وبنفس الباسورد')}else if(!u.envu){u.envu=u.username}}}catch(e){toast('اسم الدخول الجديد مش اتربط بالسحابة: '+(e.message||''))}
 return true};
 try{const _co=Auth.changeOwn;Auth.changeOwn=async function(old,nw){const un=(db.users.find(x=>x.id==Auth.uid)||{}).username;const r=await _co.apply(this,arguments);try{if(!DEMO&&db.sync&&un)await KSY.reEnv(un,old,nw)}catch(e){}return r}}catch(e){}
 const _du=delUser;delUser=function(id){const u=db.users.find(x=>x.id==id),r=_du(id);if(u&&db.sync&&!db.users.some(x=>x.id==id)){KSY.rmEnv(u.username).catch(()=>{});toast('اتحذف المستخدم. لو كان معاه جهاز، غيّر باسورد البيانات')}return r}};
if(document.readyState==='complete')setTimeout(hook52,0);else addEventListener('load',()=>setTimeout(hook52,0));

