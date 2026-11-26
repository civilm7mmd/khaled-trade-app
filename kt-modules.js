/* خالد تريد - الوحدات: المخازن والسيارات · الموردين · المشتريات والمرتجعات · الخزينة والمصروفات · المناديب والمستخدمين
   جزء من برنامج حسابات خالد تريد. شوف README.md لتوزيع الملفات. */
/* =============== الموديولات: المخازن · الموردين · المستندات · المناديب · الخزينة · التقارير =============== */
/* =====================================================================
   وحدات النظام الكاملة: المخازن، السيارات، المشتريات، الموردين، المرتجعات،
   التسويات، التحويلات، الخزينة، المصروفات، المناديب، المستخدمين، التقارير
   ملاحظة للمبرمج: كل البيانات بتتحفظ في الكائن db (دالة save). عند الانتقال
   للسيرفر يتم استبدال load/save فقط بنداء API (راجع README.md).
   ===================================================================== */

/* ---------- المخازن والمخزون: كل مكان (مخزن 'w1' أو سيارة 'c1') له أرصدة منفصلة ---------- */
function nid(k){db.seq[k]=(db.seq[k]||0)+1;return db.seq[k]}
function qtyAt(l,pid){return ((db.stk[l]||{})[pid])||0}
function syncStock(){db.products.forEach(p=>{p.stock=db.wh.reduce((a,w)=>a+qtyAt('w'+w.id,p.id),0)})} // p.stock = إجمالي المخازن (بدون السيارات)
function mv(l,pid,d){(db.stk[l]=db.stk[l]||{})[pid]=qtyAt(l,pid)+d;syncStock()}
function locName(l){const id=l.slice(1);return l[0]==='w'?((db.wh.find(w=>w.id==id)||{}).name||'مخزن'):'🚚 '+((db.cars.find(c=>c.id==id)||{}).name||'سيارة')}
const allLocs=()=>[...db.wh.map(w=>'w'+w.id),...db.cars.map(c=>'c'+c.id)];
/* الأماكن المسموحة للمستخدم الحالي: المندوب = سيارته فقط، أمين المخزن = مخزنه فقط */
function myLocs(){const u=me();if(can('stock.all')||!(u.locs||[]).length)return allLocs();return allLocs().filter(l=>u.locs.includes(l))}
const defLoc=()=>myLocs()[0]||'w'+db.wh[0].id;
const locOpts=(sel,list)=>(list||myLocs()).map(l=>`<option value="${l}" ${l===sel?'selected':''}>${esc(locName(l))}</option>`).join('');
const uname=id=>(db.users.find(u=>u.id==id)||{}).name||'—';
const sup=id=>db.suppliers.find(s=>s.id==id);
const sname=id=>sup(id)?sup(id).name:'—';
const nf=()=>'<div class="empty">الصفحة مش موجودة</div>';

/* ---------- حسابات المورد: رصيد = اللي علينا للمورد ---------- */
function supEv(s){const e=[];if(s.open)e.push({d:'',t:0,desc:'رصيد سابق',db:s.open>0?s.open:0,cr:s.open<0?-s.open:0});
 db.purchases.filter(p=>p.party==s.id).forEach(p=>{e.push({d:p.date,t:p.ts,desc:`فاتورة شراء #${p.no}`,db:p.total,cr:0,link:'pur/'+p.id});if(p.paid>0)e.push({d:p.date,t:p.ts+.5,desc:'مدفوع عند الشراء',db:0,cr:p.paid})});
 db.rets.filter(r=>r.k==='pret'&&r.party==s.id).forEach(r=>{e.push({d:r.date,t:r.ts,desc:`مرتجع مشتريات #${r.no}`,db:0,cr:r.total,link:'pret/'+r.id});if(r.paid>0)e.push({d:r.date,t:r.ts+.5,desc:'مستلم نقدًا من المورد',db:r.paid,cr:0})});
 db.spay.filter(p=>p.sid==s.id).forEach(p=>e.push({d:p.date,t:p.ts,desc:'💸 دفعة للمورد'+(p.note?' · '+esc(p.note):''),db:0,cr:p.amount}));
 e.sort((x,y)=>(x.d||'').localeCompare(y.d||'')||x.t-y.t);let b=0;e.forEach(x=>{b+=x.db-x.cr;x.bal=b});return e}
const supBal=s=>{const e=supEv(s);return e.length?e[e.length-1].bal:0};

/* ---------- المستندات العامة: شراء / مرتجع شراء / مرتجع بيع / جرد / تحويل ----------
   شاشة الشراء نسخة من شاشة فاتورة البيع: نفس البحث التلقائي ونفس الخصم والإجمالي.
   البحث عن الصنف بالاسم أو الكود. */
const DOC_CFG={
 pur:{t:'فاتورة شراء',perm:'purchases.add',party:'sup',pf:'cost',lab:'سعر الشراء',locL:'الاستلام في',pay:'المدفوع للمورد',db:'purchases',ic:'🛒'},
 pret:{t:'مرتجع مشتريات (للمورد)',perm:'purchases.return',party:'sup',pf:'cost',lab:'سعر الشراء',locL:'الإرجاع من',pay:'المستلم نقدًا من المورد',db:'rets',ic:'↩️'},
 sret:{t:'مرتجع مبيعات (من عميل)',perm:'sales.return',party:'cust',pf:'price',lab:'سعر البيع',locL:'الإرجاع إلى',pay:'المدفوع للعميل نقدًا',db:'rets',ic:'↩️'},
 adj:{t:'جرد وتسوية مخزون',perm:'stock.adjust',locL:'المكان',db:'adjs',ic:'⚖️'},
 tr:{t:'تحويل بين المخازن والسيارات',perm:'stock.transfer',locL:'من',db:'trans',ic:'🔁'}};
const pmatch=(p,q)=>{q=ad(q).trim();return !q||p.name.includes(q)||(p.code||'').toLowerCase()===q.toLowerCase()||(p.code||'').toLowerCase().startsWith(q.toLowerCase())};
let doc=null;
const docNew=(k,pre)=>({k,party:0,loc:defLoc(),to:'',lines:[{}],paid:0,kind:'كاش',notes:'',adjT:'خصم',adjM:'amt',adjV:0,...(pre||{})});
function openDoc(k,pre){doc=docNew(k,pre);location.hash='#/doc/'+k}
const xSub=()=>doc.lines.reduce((a,l)=>a+(l.pid?(+l.qty||0)*(+l.price||0):0),0);
const dAdjV=()=>{const sb=xSub(),v=+doc.adjV||0;const a=doc.adjM==='pct'?sb*v/100:v;return doc.adjT==='خصم'?-Math.min(a,sb):a};
const dTot=()=>DOC_CFG[doc.k].pf?xSub()+dAdjV():0;
R['/doc']=k=>{const c=DOC_CFG[k];if(!c)return nf();if(!doc||doc.k!==k)doc=docNew(k);head(c.t,true);
 const pn=doc.party?(c.party==='sup'?sname(doc.party):cname(doc.party)):'';
 return `<div class="card">${c.party?`<label>${c.party==='sup'?'المورد':'العميل'} (اكتب أول حرف أو رقم التليفون)</label><div class="ac"><input id="d_pq" autocomplete="off" placeholder="🔍 ابحث" value="${esc(pn)}" oninput="doc.party=0;acParty(this.value)" onfocus="this.select();acParty(this.value)"><div class="acl" id="d_pl"></div></div>`:''}
 <label>${c.locL}</label><select onchange="doc.loc=this.value;dLines()">${locOpts(doc.loc,(doc.k==='tr'&&can('stock.all'))||doc.k!=='tr'?undefined:undefined)}</select>
 ${k==='tr'?`<label>إلى (أي مخزن أو سيارة)</label><select onchange="doc.to=this.value"><option value="">— اختار —</option>${locOpts(doc.to,allLocs().filter(l=>l!==doc.loc))}</select><p class="s" style="color:var(--mut);font-size:12.5px;margin:6px 0 0">مخزن ← مخزن، مخزن ← سيارة (تحميل)، سيارة ← مخزن (مرتجع)، سيارة ← سيارة.</p>`:''}</div>
 <div class="card"><h2>الأصناف</h2><div class="lines" id="dl"></div><button class="btn sec" style="margin-top:0" onclick="doc.lines.push({});dLines()">＋ إضافة صنف</button></div>
 ${c.pf?`<div class="card"><label>خصم أو زيادة على الفاتورة (اختياري)</label><div class="adj"><select onchange="doc.adjT=this.value;dTotals()"><option ${doc.adjT==='خصم'?'selected':''}>خصم</option><option ${doc.adjT==='زيادة'?'selected':''}>زيادة</option></select><input type="number" inputmode="decimal" placeholder="0" value="${doc.adjV||''}" oninput="doc.adjV=+this.value||0;dTotals()"><div class="seg2"><button class="${doc.adjM==='amt'?'on':''}" onclick="doc.adjM='amt';route()">ج.م</button><button class="${doc.adjM==='pct'?'on':''}" onclick="doc.adjM='pct';route()">%</button></div></div></div>
 <div class="card"><div id="dt"></div><div id="dpay">${dPayHtml()}</div><div id="dinst"></div></div>`:''}
 <div class="card"><label>ملاحظات (اختياري)</label><input id="d_notes" value="${esc(doc.notes)}" oninput="doc.notes=this.value"><button class="btn" onclick="docSave()">✅ حفظ</button></div><script>setTimeout(()=>{dLines();dTotals()},0)<\/script>`};
function acParty(q){const c=DOC_CFG[doc.k];q=q.trim();let l;
 if(c.party==='sup')l=db.suppliers.filter(s=>!q||s.name.includes(q)||[s.phone,s.phone2,s.phone3].some(p=>p&&ad(p).includes(ad(q)))).slice(0,8).map(s=>`<div class="aco" onclick="pickParty(${s.id})"><b>${esc(s.name)}</b><span>${supBal(s)>0?'علينا '+fmt(supBal(s)):esc(s.phone||s.addr||'')}</span></div>`);
 else l=db.customers.filter(x=>cmatch(x,q)).slice(0,8).map(x=>`<div class="aco" onclick="pickParty(${x.id})"><b>${esc(x.name)}</b><span>${x.balance>0?'عليه '+fmt(x.balance):esc(x.phone||x.addr||'')}</span></div>`);
 l=l.concat(c.party==='sup'?aclOnly('c',q).map(x=>`<div class="aco" onclick="pickPS(${x.id})"><b>${esc(x.name)}</b><span>${esc(x.phone||x.addr||'')}</span></div>`):aclOnly('s',q).map(x=>`<div class="aco" onclick="pickPC(${x.id})"><b>${esc(x.name)}</b><span>${esc(x.phone||x.addr||'')}</span></div>`));showAc('d_pl',l)}
function pickParty(id){doc.party=id;const c=DOC_CFG[doc.k];$('#d_pq').value=c.party==='sup'?sname(id):cname(id);hideAc();if($('#dl'))dLines()}
const adjTxt=(l,cur)=>{if(l.qty===undefined||l.qty==='')return '';const d=(+l.qty)-cur;return d===0?'مطابق ✔':(d>0?'زيادة +':'نقص −')+fmt(Math.abs(d))};
function lastCost(sid,pid){for(let i=db.purchases.length-1;i>=0;i--){const v=db.purchases[i];if(v.party==sid){const it=v.items.find(x=>x.pid==pid);if(it)return it.price}}return null}
function dLines(){const c=DOC_CFG[doc.k],adj=doc.k==='adj',el=$('#dl');if(!el)return;
 el.innerHTML=doc.lines.map((l,k)=>{const p=prod(l.pid);const cur=p?qtyAt(doc.loc,p.id):0;
  return `<div class="ln"><div class="top"><div class="ac" style="flex:1"><input autocomplete="off" placeholder="🔍 اسم الصنف أو الكود" value="${p?esc(p.name):''}" oninput="doc.lines[${k}]={};acDP(${k},this.value)" onfocus="this.select();acDP(${k},this.value)"><div class="acl" id="dpl${k}"></div></div>${doc.lines.length>1?`<button class="x" onclick="dDel(${k})">×</button>`:''}</div>
  ${p&&pkOf(p)>1?dPkRow(k,doc.lines[k],p):''}${p?(adj?`<div class="row2"><div><label>الرصيد بالبرنامج</label><b style="display:block;padding:12px 0">${fmt(cur)} ${esc(unitT(p))}</b></div><div><label>${pkOf(p)>1?'الجرد الفعلي (إجمالي)':'الجرد الفعلي'}</label><input id="dq${k}" type="number" inputmode="decimal" value="${l.qty??''}" oninput="dSet(${k},'qty',this.value)"></div></div><div class="sub"><span id="df${k}">${adjTxt(l,cur)}</span></div>`
   :`<div class="row2"><div><label>الكمية (${esc(unitT(p))})</label><input id="dq${k}" type="number" inputmode="decimal" placeholder="الكمية" value="${l.qty||''}" oninput="dSet(${k},'qty',this.value)"></div>${c.pf?`<div><label>${c.lab}</label><input type="number" inputmode="decimal" value="${l.price??''}" oninput="dSet(${k},'price',this.value)"></div>`:'<div></div>'}</div>${l.hint?`<div class="note">${l.hint}</div>`:''}<div class="sub"><span>${(doc.k==='tr'||doc.k==='pret')||true?'المتاح: '+fmt(cur)+' '+esc(unitT(p)):''}</span>${c.pf?`<b id="lt${k}">${fmt((l.qty||0)*(l.price||0))} ج.م</b>`:''}</div>`):''}</div>`}).join('')}
function acDP(k,q){q=q.trim();showAc('dpl'+k,db.products.filter(p=>pmatch(p,q)).slice(0,8).map(p=>`<div class="aco" onclick="dPick(${k},${p.id})"><b>${esc(p.name)}${p.code?' · '+esc(p.code):''}</b><span>${fmt(qtyAt(doc.loc,p.id))} ${esc(unitT(p))} · ${fmt(p.price)} ج.م</span></div>`))}
function dPick(k,pid){const p=prod(pid),c=DOC_CFG[doc.k];let pr=c.pf?p[c.pf]:0,hint='';
 if(doc.k==='pur'&&doc.party){const lc=lastCost(doc.party,pid);if(lc!=null){pr=lc;hint='✔ آخر سعر شراء من المورد ده'}}
 doc.lines[k]={pid,qty:doc.k==='adj'?undefined:(pkOf(p)>1?pkOf(p):''),u:pkOf(p)>1&&doc.k!=='adj'?1:undefined,o:pkOf(p)>1&&doc.k!=='adj'?0:undefined,price:pr,hint};if(k===doc.lines.length-1)doc.lines.push({});hideAc();dLines();dTotals();const q=document.querySelectorAll('#dl .ln input[type=number]')[k*(c.pf?2:1)+(pkOf(p)>1?2:0)];q&&q.focus()}
function dDel(k){doc.lines.splice(k,1);if(!doc.lines.length)doc.lines=[{}];dLines();dTotals()}
/* خانتين وحدات + عبوات لكل شاشات المستندات (شراء، مرتجع، تحويل، تحميل عربية، جرد) */
function dPkRow(k,l,p){return `<div class="row2 pkr"><div><label>عدد ${esc(p.unit)} (×${fmt(pkOf(p))})</label><input id="du${k}" type="number" inputmode="decimal" placeholder="0" value="${pkU(l,p)||''}" oninput="dSetU(${k},'u',this.value)"></div><div><label>عبوات / فرادى</label><input id="do${k}" type="number" inputmode="decimal" placeholder="0" value="${pkO(l,p)||''}" oninput="dSetU(${k},'o',this.value)"></div></div>`}
function dSetU(k,f,v){const l=doc.lines[k],p=prod(l.pid);if(!p)return;const n=pkOf(p),u=f==='u'?(+v||0):pkU(l,p),o=f==='o'?(+v||0):pkO(l,p);l.u=u;l.o=o;const q=+(u*n+o).toFixed(3);const e=$('#dq'+k);if(e)e.value=q;dSet(k,'qty',q,true)}
function dSet(k,f,v,keep){doc.lines[k][f]=v===''?'':+v;if(f==='qty'&&!keep){const l=doc.lines[k],p=prod(l.pid),n=pkOf(p);if(n>1){const q=+l.qty||0;l.u=Math.floor(q/n);l.o=+(q-l.u*n).toFixed(3);const a=$('#du'+k),b=$('#do'+k);if(a)a.value=l.u||'';if(b)b.value=l.o||''}}if(f==='price')doc.lines[k].hint='';dTotals();const e=$('#df'+k);if(e)e.textContent=adjTxt(doc.lines[k],qtyAt(doc.loc,doc.lines[k].pid));const t=$('#lt'+k);if(t)t.textContent=fmt((doc.lines[k].qty||0)*(doc.lines[k].price||0))+' ج.م'}
/* ---------- طريقة الدفع في فاتورة الشراء (كاش / آجل / متنوع) زي فاتورة البيع ---------- */
function dTotPaid(){const t=dTot();if(doc.k!=='pur')return doc.paid||0;return doc.kind==='كاش'?t:doc.kind==='آجل'?0:Math.min(doc.paid||0,t)}
function dPayHtml(){const c=DOC_CFG[doc.k];if(doc.k!=='pur')return `<label>${c.pay}</label><input type="number" inputmode="decimal" id="d_paid" value="${doc.paid||''}" placeholder="0" oninput="doc.paid=+this.value||0;dTotals()">`;
 const K=doc.kind||'كاش';
 return `<div class="seg"><button class="${K==='كاش'?'on':''}" onclick="setDKind('كاش')">💵 كاش</button><button class="${K==='آجل'?'on credit':''}" onclick="setDKind('آجل')">🕒 آجل</button><button class="${K==='متنوع'?'on credit':''}" onclick="setDKind('متنوع')">🔀 متنوع</button></div>`+
 (K==='كاش'?`<div class="alert" style="margin:10px 0 0">💵 شراء كاش: المدفوع كامل للمورد</div>`:K==='آجل'?`<div class="alert credit" style="margin:10px 0 0">🕒 شراء آجل: كله دين للمورد</div>`:`<label>المدفوع دلوقتي (الباقي دين للمورد)</label><input type="number" inputmode="decimal" id="d_paid" value="${doc.paid||''}" placeholder="0" oninput="doc.paid=+this.value||0;dTotals()">`)}
function setDKind(k){doc.kind=k;if(k!=='متنوع')doc.paid=0;const e=$('#dpay');if(e)e.innerHTML=dPayHtml();dTotals()}

function dTotals(){const e=$('#dt');if(!e)return;const t=dTot(),a=dAdjV();e.innerHTML=`<div class="tot">${a?`<div class="r"><span>مجموع الأصناف</span><span>${fmt(xSub())}</span></div><div class="r"><span>${doc.adjT}</span><span>${a<0?'−':'+'}${fmt(Math.abs(a))}</span></div>`:''}<div class="r grand"><span>الإجمالي</span><span>${fmt(t)} ج.م</span></div><div class="r"><span>المتبقي</span><span>${fmt(Math.max(0,t-dTotPaid()))} ج.م</span></div></div>`}
function docSave(){const c=DOC_CFG[doc.k],k=doc.k;const adj=k==='adj';
 const L=doc.lines.filter(l=>l.pid&&(adj?(l.qty!==undefined&&l.qty!==''):l.qty>0));if(!L.length)return toast('أضف صنف واحد على الأقل');
 if(c.party&&!doc.party)return toast('اختار '+(c.party==='sup'?'المورد':'العميل')+' من القائمة');
 if(k==='tr'&&(!doc.to||doc.to===doc.loc))return toast('اختار مكان الوجهة');
 if(doc.ref)for(const l of L){if(l.max!==undefined&&l.qty>l.max)return toast('الكمية أكبر من المتبقي للمرتجع: '+prod(l.pid).name)}
 if(k==='tr'||k==='pret')for(const l of L){if(l.qty>qtyAt(doc.loc,l.pid))return toast('الكمية أكبر من المتاح: '+prod(l.pid).name)}
 const sub=xSub(),adjv=c.pf?dAdjV():0,tot=dTot(),paid=Math.min(dTotPaid(),tot);
 if(k==='pur'&&doc.inst&&doc.inst.on&&tot>paid){const p=dPlan(tot-paid),sm=p.reduce((a,r)=>a+(+r.amt||0),0);if(!p.length)return toast('أضف قسط واحد على الأقل');if(Math.abs(sm-(tot-paid))>0.5)return toast('مجموع الأقساط لازم يساوي الباقي ('+fmt(tot-paid)+')');if(p.some(r=>!r.due))return toast('اكتب تاريخ كل قسط')}
 if(k==='pur'&&doc.kind!=='كاش'&&tot>paid&&!doc.party)return toast('الشراء الآجل أو المتنوع لازم تختار مورد');
 const items=L.map(l=>{const p=prod(l.pid);const it={pid:p.id,name:p.name,unit:p.unit,pack:p.pack||'',qty:+l.qty,price:+l.price||0};if(adj){it.cur=qtyAt(doc.loc,p.id);it.diff=it.qty-it.cur}return it});
 items.forEach(it=>{const p=prod(it.pid);
  if(k==='pur'){mv(doc.loc,it.pid,it.qty);if(it.price>0)p.cost=it.price}
  else if(k==='pret')mv(doc.loc,it.pid,-it.qty);
  else if(k==='sret')mv(doc.loc,it.pid,it.qty);
  else if(k==='adj')mv(doc.loc,it.pid,it.diff);
  else if(k==='tr'){mv(doc.loc,it.pid,-it.qty);mv(doc.to,it.pid,it.qty)}});
 const id=nid(k),rec={id,no:id,k,date:today(),ts:Date.now(),by:doc.repBy||db.me,ref:doc.ref,st:k==='tr'?'sent':undefined,party:doc.party||0,loc:doc.loc,to:doc.to||'',items,sub,adj:adjv,total:tot,paid,rem:tot-paid,inst:(k==='pur'&&doc.inst&&doc.inst.on&&tot>paid)?dPlan(tot-paid).map((r,j)=>({id:j+1,due:r.due,amt:+(+r.amt).toFixed(2),paid:0})):undefined,kind:k==='pur'?(tot-paid>0?'آجل':'كاش'):undefined,mixed:k==='pur'&&doc.kind==='متنوع'&&paid>0&&tot>paid,notes:(doc.notes||'').trim()};
 db[c.db].push(rec);if(k==='sret'&&rec.party)recalc(cust(rec.party));
 save();doc=null;toast('تم الحفظ ✅');location.hash='#/rec/'+k+'/'+id}

/* ---------- مرتجع مرتبط بالفاتورة الأصلية (كلي أو جزئي) ----------
   بيعكس المخزون وحساب العميل/المورد والخزينة، والعمولة بتتخصم من المندوب صاحب البيعة الأصلية */
const origOf=(kind,id)=>kind==='inv'?db.invoices.find(x=>x.id==id):db.purchases.find(x=>x.id==id);
function retLeft(kind,id,pid){const o=origOf(kind,id);if(!o)return 0;const q=(a,x)=>a+x.items.filter(i=>i.pid==pid).reduce((b,i)=>b+i.qty,0);
 return o.items.filter(i=>i.pid==pid).reduce((a,i)=>a+i.qty,0)-db.rets.filter(r=>r.ref&&r.ref.k===kind&&r.ref.id==id).reduce(q,0)}
function retFrom(kind,id){const o=origOf(kind,id);if(!o)return;const k=o.sub?o.total/o.sub:1;
 const lines=o.items.map(it=>({pid:it.pid,qty:'',price:+(it.price*k).toFixed(2),max:retLeft(kind,id,it.pid)})).filter(l=>l.max>0);
 if(!lines.length)return toast('كل أصناف الفاتورة اتعمل لها مرتجع');
 openDoc(kind==='inv'?'sret':'pret',{party:kind==='inv'?o.cid:o.party,loc:o.loc||defLoc(),lines,ref:{k:kind,id:o.id,no:o.no},repBy:o.by})}
const retBtns=(kind,o)=>{const rs=db.rets.filter(r=>r.ref&&r.ref.k===kind&&r.ref.id==o.id);
 return `<button class="btn sec noprint" data-need="${kind==='inv'?'sales.return':'purchases.return'}" onclick="retFrom('${kind}',${o.id})">↩ مرتجع من هذه الفاتورة (كلي أو جزئي)</button>${rs.length?`<div class="card"><h2>المرتجعات على هذه الفاتورة</h2>${rs.map(r=>`<div class="item" onclick="location.hash='#/rec/${r.k}/${r.id}'"><div class="main"><div class="t">↩ مرتجع #${r.no}</div><div class="s">${r.date}</div></div><div class="num">${fmt(r.total)}</div></div>`).join('')}</div>`:''}`};

/* عرض/طباعة أي مستند محفوظ */
const recList=k=>k==='pur'?db.purchases:k==='adj'?db.adjs:k==='tr'?db.trans:db.rets.filter(r=>r.k===k);
const lhHtml=()=>{const st=db.settings;return `<div class="lh"><img src="${LOGO}"><div><div class="co">${esc(st.name)}</div><div class="sub2">${esc(st.sub||'')}</div>${st.phone?`<div class="sub2">📞 ${esc(st.phone)}</div>`:''}${st.addr?`<div class="sub2">📍 ${esc(st.addr)}</div>`:''}</div></div>`};
R['/rec']=(k,qs)=>{const id=location.hash.split('/')[3];const c=DOC_CFG[k];const r=c&&recList(k).find(x=>x.id==id);if(!r)return nf();head(c.t+' #'+r.no,true);
 const party=c.party?(c.party==='sup'?sname(r.party):cname(r.party)):'';
 return `<div class="card inv">${lhHtml()}<div class="meta"><span>${c.t} رقم <b>#${r.no}</b></span><span>${r.date}</span></div>
 ${party?`<div class="cu"><div><span>${c.party==='sup'?'المورد':'العميل'}:</span> <b>${esc(party)}</b></div></div>`:''}
 ${r.ref?`<div class="cu"><div><span>مرتجع على فاتورة:</span> <a onclick="location.hash='#/${r.ref.k==='inv'?'invoice/'+r.ref.id:'rec/pur/'+r.ref.id}'"><b>#${r.ref.no}</b></a></div></div>`:''}<div class="cu"><div><span>${c.locL}:</span> ${esc(locName(r.loc))}${r.to?` ← ${esc(locName(r.to))}`:''}</div><div><span>بواسطة:</span> ${esc(uname(r.by))}</div></div>
 <table><tr><th>الصنف</th><th>${k==='adj'?'كان':'الكمية'}</th><th>${k==='adj'?'الفعلي':(c.pf?'السعر':'')}</th><th>${k==='adj'?'الفرق':(c.pf?'الإجمالي':'')}</th></tr>
 ${r.items.map(x=>k==='adj'?`<tr><td>${esc(x.name)}</td><td>${fmt(x.cur)}</td><td>${fmt(x.qty)}</td><td class="${x.diff<0?'neg':''}">${x.diff>0?'+':''}${fmt(x.diff)}</td></tr>`:`<tr><td>${esc(x.name)}</td><td>${fmt(x.qty)} ${esc(unitT(x))}</td><td>${c.pf?fmt(x.price):''}</td><td>${c.pf?fmt(x.qty*x.price):''}</td></tr>`).join('')}</table>
 ${c.pf?`<div class="stat"><span>الإجمالي</span><b>${fmt(r.total)} ج.م</b></div><div class="stat"><span>${c.pay}</span><b>${fmt(r.paid)} ج.م</b></div><div class="stat"><span>الباقي</span><b>${fmt(r.rem)} ج.م</b></div>`:''}
 ${r.notes?`<div class="notes"><span>ملاحظات:</span> ${esc(r.notes)}</div>`:''}</div>
 ${k==='pur'?retBtns('pur',r):''}<button class="btn sec noprint" onclick="window.print()">🖨️ طباعة</button><button class="btn sec noprint" onclick="location.hash='#/log/${k}'">كل ${c.t}</button>`};
R['/log']=k=>{const c=DOC_CFG[k];if(!c)return nf();head('سجل: '+c.t,true);const l=[...recList(k)].reverse();
 return `<div class="card">${l.length?l.map(r=>`<div class="item" onclick="location.hash='#/rec/${k}/${r.id}'"><div class="main"><div class="t">${c.ic} #${r.no} ${c.party?'· '+esc(c.party==='sup'?sname(r.party):cname(r.party)):(k==='tr'?'· '+esc(locName(r.loc))+' ← '+esc(locName(r.to)):'· '+esc(locName(r.loc)))}</div><div class="s">${r.date} · ${r.items.length} صنف</div></div>${c.pf?`<div class="num">${fmt(r.total)}</div>`:''}</div>`).join(''):'<div class="empty">مفيش سجلات</div>'}</div>
 <button class="fab" onclick="openDoc('${k}')">＋ جديد</button>`};

/* ---------- الموردين ---------- */
R['/suppliers']=()=>{head('الموردين');const l=db.suppliers;
 return `<div class="card">${l.length?l.map(s=>{const b=supBal(s);return `<div class="item" onclick="location.hash='#/supplier/${s.id}'"><div class="main"><div class="t">${esc(s.name)}</div><div class="s">${esc(s.phone||'')} ${esc(s.addr||'')}</div></div><div class="num ${b>0?'neg':''}">${b>0?'علينا '+fmt(b):fmt(b)}</div></div>`}).join(''):'<div class="empty">مفيش موردين. دوس ＋ مورد</div>'}</div>
 <div class="bar"><button onclick="openDoc('pur')">🛒 فاتورة شراء</button><button onclick="openDoc('pret')">↩️ مرتجع مشتريات</button></div><div class="bar"><button onclick="location.hash='#/log/pur'">سجل المشتريات</button><button onclick="location.hash='#/log/pret'">سجل المرتجعات</button></div>
 <button class="fab" onclick="location.hash='#/supplier/new'">＋ مورد</button>`};
R['/supplier']=id=>{const s=id==='new'?{name:'',phone:'',phone2:'',phone3:'',addr:'',map:'',open:0}:sup(id);if(!s)return nf();head(id==='new'?'إضافة مورد':'بيانات المورد',true);
 const ev=id==='new'?[]:supEv(s),b=id==='new'?0:supBal(s);
 return `<div class="card"><label>اسم المورد / الشركة</label><input id="f_name" value="${esc(s.name)}">
 <label>أرقام التليفون (لحد 3)</label><input id="f_phone" type="tel" inputmode="tel" value="${esc(s.phone)}" placeholder="الرقم الأول"><div class="row2" style="margin-top:8px"><input id="f_phone2" type="tel" value="${esc(s.phone2||'')}" placeholder="رقم تاني"><input id="f_phone3" type="tel" value="${esc(s.phone3||'')}" placeholder="رقم تالت"></div>
 <label>العنوان</label><input id="f_addr" value="${esc(s.addr||'')}"><label>الموقع على الخريطة (اختياري)</label><input id="f_map" value="${esc(s.map||'')}" placeholder="رابط أو إحداثيات">
 <label>رصيد سابق (علينا) قبل البرنامج</label><input id="f_open" type="number" inputmode="decimal" value="${s.open||0}">
 <button class="btn" onclick="saveSup('${id}')">حفظ المورد</button>${id!=='new'?`<button class="btn del" onclick="delSup(${s.id})">حذف المورد</button>`:''}</div>
 ${id!=='new'?`<div class="card noprint"><h2>تسجيل دفعة للمورد</h2><div class="row2"><div><label>المبلغ</label><input id="sp_a" type="number" inputmode="decimal"></div><div><label>ملاحظة</label><input id="sp_n"></div></div><button class="btn" onclick="addSupPay(${s.id})">💸 تسجيل الدفعة</button>
 <div class="bar" style="margin-top:10px"><button onclick="openDoc('pur',{party:${s.id}})">🛒 فاتورة شراء</button><button onclick="openDoc('pret',{party:${s.id}})">↩️ مرتجع</button></div></div>
 <div class="card stm"><h2>كشف حساب: ${esc(s.name)}</h2><div class="stat"><span>الرصيد (علينا)</span><b class="${b>0?'neg':''}">${fmt(b)} ج.م</b></div>
 ${ev.length?`<table><tr><th>التاريخ</th><th>البيان</th><th>علينا</th><th>دفعنا</th><th>الرصيد</th></tr>${ev.map(e=>`<tr ${e.link?`onclick="location.hash='#/rec/${e.link}'"`:''}><td>${(e.d||'').slice(5)}</td><td style="text-align:right">${e.desc}</td><td>${e.db?fmt(e.db):''}</td><td style="color:#1d437c">${e.cr?fmt(e.cr):''}</td><td class="${e.bal>0?'neg':''}"><b>${fmt(e.bal)}</b></td></tr>`).join('')}</table>`:'<div class="empty">مفيش حركات</div>'}
 <button class="btn sec noprint" onclick="window.print()">🖨️ طباعة</button></div>`:''}`};
function saveSup(id){const g=k=>$('#f_'+k).value.trim();if(!g('name'))return toast('اكتب اسم المورد');const o={name:g('name'),phone:g('phone'),phone2:g('phone2'),phone3:g('phone3'),addr:g('addr'),map:g('map'),open:+g('open')||0};
 if(id==='new')db.suppliers.push({id:nid('sup'),...o});else Object.assign(sup(id),o);save();toast('تم الحفظ ✅');location.hash='#/suppliers'}
function delSup(id){if(db.purchases.some(p=>p.party==id))return toast('عليه حركات، مينفعش يتحذف');if(confirm('تحذف المورد؟')){db.suppliers=db.suppliers.filter(s=>s.id!=id);save();location.hash='#/suppliers'}}
function addSupPay(sid){const a=+$('#sp_a').value;if(!(a>0))return toast('اكتب مبلغ صحيح');db.spay.push({id:nid('spay'),sid,date:today(),ts:Date.now(),by:db.me,amount:a,note:$('#sp_n').value.trim()});save();toast('تم ✅');route()}

/* ---------- المخزون والأماكن (مخازن + سيارات توزيع) ---------- */
let stLoc='all',stQ='';
R['/stock']=()=>{head('المخزون');const ls=myLocs();
 return `<div class="card"><label>عرض رصيد</label><select onchange="stLoc=this.value;stDraw();$('#stdrv').innerHTML=stDrvHtml()"><option value="all">كل المخازن (إجمالي)</option>${locOpts(stLoc,ls)}</select><div id="stdrv">${stDrvHtml()}</div></div>
 <input class="search" placeholder="🔍 ابحث عن صنف" oninput="stQ=this.value;stDraw()"><div class="card" id="stl"></div>
 <div class="bar"><button onclick="openDoc('tr',{to:'${(allLocs().filter(l=>l!==defLoc())[0])||''}'})">🔁 تحويل / تحميل سيارة</button><button onclick="openDoc('adj')">⚖️ جرد وتسوية</button><button onclick="location.hash='#/stocktake'">🖨 ورقة جرد</button></div>
 <div class="bar"><button onclick="location.hash='#/log/tr'">سجل التحويلات</button><button onclick="location.hash='#/log/adj'">سجل التسويات</button></div>
 <div class="bar"><button onclick="location.hash='#/places'">🏭 المخازن والسيارات</button></div><script>setTimeout(stDraw,0)<\/script>`};
function stDraw(){const el=$('#stl');if(!el)return;const q=stQ.trim();
 const l=db.products.filter(p=>p.name.includes(q)).map(p=>({p,q:stLoc==='all'?db.products&&allLocs().filter(x=>x[0]==='w').reduce((a,x)=>a+qtyAt(x,p.id),0):qtyAt(stLoc,p.id)}));
 el.innerHTML=l.length?l.map(({p,q})=>{const e=expState(p);return `<div class="item"><div class="main"><div class="t">${esc(p.name)}</div><div class="s">${esc(unitT(p))}${e?` · <span class="pill ${e.c}">${e.t}</span>`:''}${p.exp?' · '+p.exp:''}</div></div><div class="num ${q<=p.min&&stLoc==='all'?'neg':''}">${fmt(q)}</div></div>`}).join(''):'<div class="empty">مفيش أصناف</div>'}
R['/places']=()=>{head('المخازن والسيارات',true);
 return `<div class="card"><h2>المخازن</h2>${db.wh.map(w=>`<div class="item"><div class="main"><div class="t">🏭 ${esc(w.name)}</div></div><button class="mvb" onclick="delPlace('w',${w.id})">حذف</button></div>`).join('')}<div class="row2" style="margin-top:10px"><input id="n_w" placeholder="اسم مخزن جديد"><button class="btn" style="margin:0" onclick="addPlace('w')">＋ إضافة</button></div></div>
 <div class="card"><h2>سيارات التوزيع</h2>${db.cars.map(c=>`<div class="item"><div class="main"><div class="t">🚚 ${esc(c.name)}</div><div class="s">المندوب: ${esc(uname((db.users.find(u=>u.car==c.id)||{}).id)||'—')}</div></div><button class="mvb" onclick="delPlace('c',${c.id})">حذف</button></div>`).join('')||'<div class="empty">مفيش سيارات</div>'}<div class="row2" style="margin-top:10px"><input id="n_c" placeholder="اسم / رقم السيارة"><button class="btn" style="margin:0" onclick="addPlace('c')">＋ إضافة</button></div></div>`};
function addPlace(t){const n=$('#n_'+t).value.trim();if(!n)return;(t==='w'?db.wh:db.cars).push({id:nid(t==='w'?'wh':'car'),name:n});save();route()}
function delPlace(t,id){const l=t+id;if(Object.values(db.stk[l]||{}).some(v=>v))return toast('فيه رصيد جواه. حوّله الأول');if(t==='w'&&db.wh.length<2)return toast('لازم يفضل مخزن واحد');if(confirm('تحذف؟')){if(t==='w')db.wh=db.wh.filter(w=>w.id!=id);else db.cars=db.cars.filter(c=>c.id!=id);delete db.stk[l];save();route()}}

/* ---------- الخزينة والمصروفات ---------- */
const EXP_CATS=['إيجار','مرتبات','وقود ونقل','كهرباء ومياه','صيانة','تسويق','مصروفات أخرى'];
function cashEv(){const e=[];const I=(d,t,a,desc)=>a>0&&e.push({d,t,in:a,out:0,desc}),O=(d,t,a,desc)=>a>0&&e.push({d,t,in:0,out:a,desc});
 db.invoices.forEach(i=>I(i.date,i.ts||i.id,i.paid,'مبيعات فاتورة #'+i.no+' - '+cname(i.cid)));
 db.payments.forEach(p=>I(p.date,p.ts,p.amount,'تحصيل من '+cname(p.cid)));
 db.purchases.forEach(p=>O(p.date,p.ts,p.paid,'مشتريات #'+p.no+' - '+sname(p.party)));
 db.spay.forEach(p=>O(p.date,p.ts,p.amount,'دفعة للمورد '+sname(p.sid)));
 db.rets.forEach(r=>r.k==='sret'?O(r.date,r.ts,r.paid,'مرتجع مبيعات #'+r.no):I(r.date,r.ts,r.paid,'مرتجع مشتريات #'+r.no));
 db.exps.forEach(x=>O(x.date,x.ts,x.amount,'مصروف: '+x.cat+(x.note?' - '+x.note:'')));
 db.pay.filter(x=>x.type==='paid').forEach(x=>O(x.date,x.ts,x.amount,'مرتب/عمولة '+uname(x.uid)));
 (db.pay||[]).filter(x=>x.type==='paid').forEach(x=>O(x.date,x.ts||x.id,x.amount,'مرتب مندوب '+uname(x.uid)));
 db.cashx.forEach(x=>x.dir==='in'?I(x.date,x.ts,x.amount,x.note||'إيداع'):O(x.date,x.ts,x.amount,x.note||'سحب'));
 e.sort((a,b)=>(a.d||'').localeCompare(b.d||'')||a.t-b.t);let b=0;e.forEach(x=>{b+=x.in-x.out;x.bal=b});return e}
const cashBal=()=>{const e=cashEv();return e.length?e[e.length-1].bal:0};
let cashAll=false;
R['/cash']=()=>{head('الخزينة');const all=cashEv(),t=today();const e=(cashAll?all:all.filter(x=>x.d===t)).slice().reverse();
 const ti=all.filter(x=>x.d===t).reduce((a,x)=>a+x.in,0),to=all.filter(x=>x.d===t).reduce((a,x)=>a+x.out,0);
 return `<div class="tot" style="margin-bottom:12px"><div class="r"><span>رصيد الخزينة الحالي</span></div><div class="r grand"><span></span><span>${fmt(cashBal())} ج.م</span></div><div class="r"><span>داخل النهارده</span><span>${fmt(ti)}</span></div><div class="r"><span>خارج النهارده</span><span>${fmt(to)}</span></div></div>
 <div class="card noprint" data-need="cash.add"><h2>حركة يدوية</h2><div class="row2"><div><label>المبلغ</label><input id="cx_a" type="number" inputmode="decimal"></div><div><label>البيان</label><input id="cx_n" placeholder="مثال: رأس مال / إيداع بنك"></div></div><div class="row2"><button class="btn" onclick="addCx('in')">⬇ إيداع</button><button class="btn del" onclick="addCx('out')">⬆ سحب</button></div></div>
 ${cashSettleHtml()}<div class="seg" style="margin-bottom:10px"><button class="${cashAll?'':'on'}" onclick="cashAll=false;route()">النهارده</button><button class="${cashAll?'on':''}" onclick="cashAll=true;route()">كل الحركات</button></div>
 <div class="card">${e.length?e.map(x=>`<div class="item"><div class="main"><div class="t">${esc(x.desc)}</div><div class="s">${x.d}</div></div><div class="num ${x.out?'neg':''}" style="color:${x.in?'#1d437c':''}">${x.in?'+'+fmt(x.in):'−'+fmt(x.out)}</div></div>`).join(''):'<div class="empty">مفيش حركات</div>'}</div>`};
function addCx(dir){const a=+$('#cx_a').value;if(!(a>0))return toast('اكتب مبلغ صحيح');db.cashx.push({id:nid('cx'),dir,amount:a,date:today(),ts:Date.now(),by:db.me,note:$('#cx_n').value.trim()});save();toast('تم ✅');route()}
R['/expenses']=()=>{head('المصروفات');const l=[...db.exps].reverse(),m=today().slice(0,7),tm=db.exps.filter(x=>x.date.startsWith(m)).reduce((a,x)=>a+x.amount,0);
 return `<div class="card"><h2>تسجيل مصروف</h2><label>النوع</label><select id="x_c">${EXP_CATS.map(c=>`<option>${c}</option>`).join('')}</select><div class="row2"><div><label>المبلغ</label><input id="x_a" type="number" inputmode="decimal"></div><div><label>ملاحظة</label><input id="x_n"></div></div><button class="btn" onclick="addExp()">＋ تسجيل المصروف (من الخزينة)</button></div>
 <div class="stat" style="padding:0 6px 10px"><span>مصروفات الشهر</span><b>${fmt(tm)} ج.م</b></div>
 <div class="card">${l.length?l.map(x=>`<div class="item"><div class="main"><div class="t">${esc(x.cat)}</div><div class="s">${x.date} ${esc(x.note||'')}</div></div><div class="num neg">${fmt(x.amount)}</div><button class="mvb" onclick="delExp(${x.id})">✕</button></div>`).join(''):'<div class="empty">مفيش مصروفات</div>'}</div>`};
function addExp(){const a=+$('#x_a').value;if(!(a>0))return toast('اكتب المبلغ');db.exps.push({id:nid('exp'),date:today(),ts:Date.now(),by:db.me,cat:$('#x_c').value,amount:a,note:$('#x_n').value.trim()});save();toast('تم ✅');route()}
function delExp(id){if(confirm('تحذف المصروف؟')){db.exps=db.exps.filter(x=>x.id!=id);save();route()}}

/* ---------- المناديب والمرتبات والعمولات ----------
   العمولة: سعر المنتج (الأعلى أولوية) ← سعر القسم ← النسبة العامة للمندوب.
   المرتب الشهري = الأساسي + العمولة + إضافي + مكافأة − خصومات. والمصروف بيتسجل في الخزينة. */
function repRule(u,pid){const p=prod(pid)||{},cp=(u.commProd||{})[pid],cs=(u.commSec||{})[p.sec];
 if(cp!==undefined&&cp!=='')return{v:+cp,t:(u.commProdT||{})[pid]||'pct'};
 if(cs!==undefined&&cs!=='')return{v:+cs,t:(u.commSecT||{})[p.sec]||'pct'};
 return{v:+u.comm||0,t:u.commT||'pct'}}
const repRate=(u,pid)=>repRule(u,pid).v;
/* العمولة: نسبة % من قيمة البيع، أو مبلغ ثابت لكل وحدة مباعة. الأصناف المجانية (هدايا) مالهاش عمولة */
const rcOf=(u,it,a)=>{const r=repRule(u,it.pid);return r.t==='fix'?(it.free?0:it.qty*r.v):a*r.v/100};
function repComm(u,pred){let base=0,comm=0;
 db.invoices.filter(i=>i.by==u.id&&pred(i.date)).forEach(i=>{const k=i.sub?i.total/i.sub:1;i.items.forEach(it=>{const a=it.qty*it.price*k;comm+=rcOf(u,it,a);base+=a})});
 db.rets.filter(r=>r.k==='sret'&&r.by==u.id&&pred(r.date)).forEach(r=>r.items.forEach(it=>{const a=it.qty*it.price;comm-=rcOf(u,it,a);base-=a}));
 return{base,comm}}
function sheet(u,m){const c=repComm(u,d=>d.startsWith(m)),E=db.pay.filter(x=>x.uid==u.id&&x.month===m);const s=t=>E.filter(x=>x.type===t).reduce((a,x)=>a+x.amount,0);
 const base=+u.salary||0,ot=s('ot'),bonus=s('bonus'),ded=s('ded'),paid=s('paid'),net=base+c.comm+ot+bonus-ded;return{base,comm:c.comm,sales:c.base,ot,bonus,ded,paid,net,rem:net-paid,E}}
let repM=today().slice(0,7);
R['/reps']=()=>{head('المناديب والمرتبات');const reps=db.users.filter(u=>u.emp);
 return `<input type="month" value="${repM}" onchange="repM=this.value;route()" style="margin-bottom:10px"><div class="card">${reps.length?reps.map(u=>{const s=sheet(u,repM);return `<div class="item" onclick="location.hash='#/rep/${u.id}'"><div class="main"><div class="t">${esc(u.name)}</div><div class="s">${(u.locs||[]).map(l=>esc(locName(l))).join('، ')||'كل الأماكن'}</div></div><div style="text-align:left"><div class="num ${s.rem>0?'neg':''}">${fmt(s.rem)}</div><div class="s">متبقي</div></div></div>`}).join(''):'<div class="empty">مفيش مناديب. دوس ＋ مندوب</div>'}</div><button class="fab" data-need="reps.manage" onclick="location.hash='#/user/new?emp=1'">＋ مندوب</button>`};
R['/rep']=id=>{const u=db.users.find(x=>x.id==id);if(!u)return nf();head('مرتب ومستحقات '+u.name,true);const s=sheet(u,repM);
 return `<input type="month" value="${repM}" onchange="repM=this.value;route()" style="margin-bottom:10px">
 <div class="card"><h2>${esc(u.name)}</h2><div class="stat"><span>صافي مبيعات الشهر</span><b>${fmt(s.sales)}</b></div><div class="stat"><span>المرتب الأساسي</span><b>${fmt(s.base)}</b></div><div class="stat"><span>+ العمولة</span><b>${fmt(s.comm)}</b></div><div class="stat"><span>+ إضافي (أوفر تايم)</span><b>${fmt(s.ot)}</b></div><div class="stat"><span>+ مكافآت</span><b>${fmt(s.bonus)}</b></div><div class="stat"><span>− خصومات</span><b class="neg">${fmt(s.ded)}</b></div><div class="stat"><span><b>الصافي المستحق</b></span><b style="font-size:18px">${fmt(s.net)} ج.م</b></div><div class="stat"><span>اللي اتصرف</span><b>${fmt(s.paid)}</b></div><div class="stat"><span>المتبقي</span><b class="${s.rem>0?'neg':''}">${fmt(s.rem)} ج.م</b></div></div>
 <div class="card noprint" data-need="reps.pay"><h2>تسجيل حركة</h2><select id="py_t"><option value="ot">إضافي / أوفر تايم (+)</option><option value="bonus">مكافأة (+)</option><option value="ded">خصم / جزاء (−)</option><option value="paid">صرف مبلغ للمندوب (من الخزينة)</option></select><div class="row2"><div><label>المبلغ</label><input id="py_a" type="number" inputmode="decimal"></div><div><label>ملاحظة</label><input id="py_n"></div></div><button class="btn" onclick="addPay2(${u.id})">تسجيل</button></div>
 <div class="card"><h2>حركات الشهر</h2>${s.E.map(x=>`<div class="item"><div class="main"><div class="t">${{ot:'إضافي',bonus:'مكافأة',ded:'خصم',paid:'صرف'}[x.type]}</div><div class="s">${x.date} ${esc(x.note||'')}</div></div><div class="num ${x.type==='ded'?'neg':''}">${fmt(x.amount)}</div><button class="mvb" data-need="reps.pay" onclick="delPay2(${x.id})">✕</button></div>`).join('')||'<div class="empty">مفيش حركات</div>'}</div>
 <button class="btn sec noprint" onclick="window.print()">🖨️ طباعة كشف المرتب</button>
 <div class="card"><h2>رصيد سياراته</h2>${(u.locs||[]).filter(l=>l[0]==='c').map(l=>db.products.filter(p=>qtyAt(l,p.id)>0).map(p=>`<div class="stat"><span>${esc(p.name)}</span><b>${fmt(qtyAt(l,p.id))} ${esc(p.unit)}</b></div>`).join('')||'<div class="empty">السيارة فاضية</div>').join('')||'<div class="empty">مفيش سيارة</div>'}</div>`};
function addPay2(uid){const a=+$('#py_a').value;if(!(a>0))return toast('اكتب المبلغ');db.pay.push({id:nid('pay2'),uid,month:repM,type:$('#py_t').value,amount:a,note:$('#py_n').value.trim(),date:today(),ts:Date.now(),by:db.me});save();toast('تم ✅');route()}
function delPay2(id){if(confirm('تحذف الحركة؟')){db.pay=db.pay.filter(x=>x.id!=id);save();route()}}

/* ---------- المستخدمين والصلاحيات التفصيلية (يديرها المدير العام) ---------- */
const PERM_GROUPS=[
 ['🧾 المبيعات',{'sales.view':'عرض فواتير البيع','sales.add':'إنشاء فاتورة بيع','sales.discount':'عمل خصم على الفاتورة','sales.date':'تغيير تاريخ الفاتورة','sales.anyrep':'اختيار أي مندوب على الفاتورة','sales.price':'تعديل سعر البيع','sales.belowcost':'البيع بأقل من التكلفة','sales.nostock':'بيع بدون رصيد (البيع حتى لو الكمية أكبر من المتاح)','sales.return':'مرتجع مبيعات','sales.edit':'تعديل فاتورة بعد ما تتحفظ','sales.delete':'حذف / إلغاء فاتورة بعد ما تتحفظ'}],
 ['📦 المنتجات',{'products.view':'عرض المنتجات','products.add':'إضافة منتج','products.edit':'تعديل منتج','products.delete':'حذف منتج','products.cost':'رؤية سعر الشراء (التكلفة)','products.pricelist':'قائمة الأصناف والأسعار'}],
 ['👥 العملاء',{'customers.view':'عرض العملاء','customers.add':'إضافة عميل','customers.edit':'تعديل عميل','customers.delete':'حذف عميل','customers.statement':'كشف حساب العميل','customers.collect':'تحصيل من العميل'}],
 ['🏭 الموردين والمشتريات',{'suppliers.view':'عرض الموردين','suppliers.add':'إضافة وتعديل مورد','suppliers.delete':'حذف مورد','suppliers.pay':'دفع للمورد','purchases.view':'عرض المشتريات','purchases.add':'فاتورة شراء','purchases.return':'مرتجع مشتريات'}],
 ['🔒 التعديل والحذف',{'data.edit':'تعديل أي مستند بعد ما يتحفظ','data.delete':'حذف أو إلغاء أي حاجة (سند، مصروف، عميل، صنف، شيك، ملاحظة...)'}],
 ['📊 المخزون',{'stock.view':'عرض المخزون','stock.transfer':'تحويل / تحميل سيارة','stock.adjust':'جرد وتسوية','stock.places':'إدارة المخازن والسيارات','stock.all':'رؤية كل الأماكن (مش المسموح له بس)'}],
 ['💰 الخزينة والمصروفات',{'cash.view':'عرض الخزينة','cash.add':'إيداع وسحب يدوي','expenses.add':'تسجيل مصروف','carexp.add':'تسجيل مصروف عربية (بنزين/صيانة)','expenses.delete':'حذف مصروف'}],
 ['🚚 المناديب',{'reps.view':'عرض المناديب','reps.manage':'إضافة وتعديل مناديب','reps.pay':'مرتبات وخصومات وصرف'}],
 ['📈 التقارير',{'reports.view':'عرض التقارير','reports.profit':'رؤية الأرباح','reports.export':'نسخة احتياطية وتصدير'}],
 ['👔 الموارد البشرية',{'hr.view':'عرض الموارد البشرية','hr.manage':'إدارة الموظفين والمرتبات والخصومات والسلف والإجازات','hr.attendance':'تسجيل الحضور والانصراف'}],
 ['🔐 النظام',{'users.manage':'إدارة المستخدمين والصلاحيات','settings.edit':'تعديل بيانات الشركة'}]];
const PERMS=Object.assign({},...PERM_GROUPS.map(g=>g[1]));
const TEMPLATES={manager:{name:'مدير عام',perms:['*']},
 accountant:{name:'محاسب',perms:['sales.date','sales.anyrep','sales.view','sales.add','sales.return','customers.view','customers.statement','customers.collect','products.view','products.pricelist']},
 keeper:{name:'أمين مخزن',perms:['stock.view','stock.transfer','stock.adjust','products.view','purchases.view']},
 rep:{name:'مندوب مبيعات',perms:['carexp.add','sales.view','sales.add','sales.return','customers.view','customers.add','customers.statement','customers.collect','products.view','products.pricelist','stock.view','stock.adjust']}};
let uf=null;
R['/users']=()=>{head('المستخدمين والصلاحيات',true);
 return `<div class="card"><h2>المستخدمين</h2>${db.users.map(u=>`<div class="item" onclick="location.hash='#/user/${u.id}'"><div class="main"><div class="t">${esc(u.name)} ${u.id==db.me?'<span class="pill">أنت</span>':''}${u.emp?' <span class="pill warn">مندوب</span>':''}</div><div class="s">${esc((TEMPLATES[u.role]||{}).name||'مخصص')} · ${esc(u.username)} · ${(u.perms||[]).includes('*')?'كل الصلاحيات':(u.perms||[]).length+' صلاحية'}</div></div></div>`).join('')}</div>
 <button class="fab" onclick="location.hash='#/user/new'">＋ مستخدم</button><p class="s" style="color:var(--mut);font-size:12.5px">الدخول بالباسورد على نفس الجهاز بس دلوقتي. الحماية الحقيقية وتعدد الأجهزة في مرحلة السيرفر.</p>`};
R['/user']=(id,qs)=>{if(!uf||uf.key!==id){const u=id==='new'?{name:'',username:'',role:'accountant',perms:[...TEMPLATES.accountant.perms],locs:[],emp:/emp=1/.test(qs||''),salary:0,comm:0,commSec:{},commProd:{},maxDisc:0}:JSON.parse(JSON.stringify(db.users.find(x=>x.id==id)||null));if(!u)return nf();if(u.emp===undefined)u.emp=false;u.commSec=u.commSec||{};u.commProd=u.commProd||{};u.locs=u.locs||[];u.perms=u.perms||[];uf={key:id,u}}
 const u=uf.u,all=u.perms.includes('*');head(id==='new'?'مستخدم جديد':'بيانات المستخدم',true);
 return `<div class="card"><label>الاسم</label><input value="${esc(u.name)}" oninput="uf.u.name=this.value"><label>التليفون</label><input type="tel" value="${esc(u.phone||'')}" oninput="uf.u.phone=this.value"><label>العنوان</label><input value="${esc(u.addr||'')}" oninput="uf.u.addr=this.value"><label>اسم المستخدم (للدخول)</label><input value="${esc(u.username)}" autocomplete="off" oninput="uf.u.username=this.value"><label>الباسورد ${id==='new'?'':'(سيبه فاضي لو مش هتغيره)'}</label><input id="u_pw" type="password" autocomplete="new-password">
 <label class="chk"><input type="checkbox" ${u.emp?'checked':''} onchange="uf.u.emp=this.checked;ufDraw()"> مندوب مبيعات (له عمولة وسيارة)</label></div>
 <div class="card"><h2>الأماكن المسموحة</h2><p class="s" style="color:var(--mut);font-size:12.5px;margin:0">المندوب يبيع ويجرد من مكانه بس. سيبها فاضية = كل الأماكن.</p>${allLocs().map(l=>`<label class="chk"><input type="checkbox" ${u.locs.includes(l)?'checked':''} onchange="ufLoc('${l}',this.checked)"> ${esc(locName(l))}</label>`).join('')}</div>
 <div class="card"><h2>الصلاحيات</h2><div class="seg" style="grid-template-columns:1fr 1fr 1fr 1fr;margin-bottom:8px">${Object.entries(TEMPLATES).map(([k,t])=>`<button style="padding:8px 2px;font-size:12px" onclick="ufTpl('${k}')">${t.name}</button>`).join('')}</div><p class="s" style="color:var(--mut);font-size:12.5px;margin:0">اختار قالب جاهز وبعدين زوّد أو شيل أي صلاحية.</p>
 ${all?'<div class="alert">المدير العام عنده كل الصلاحيات.</div>':PERM_GROUPS.map(([t,g])=>`<div style="margin-top:10px"><b>${t}</b> <a style="font-size:12px;color:var(--g3)" onclick="ufGrp('${t}',1)">الكل</a> · <a style="font-size:12px;color:var(--g3)" onclick="ufGrp('${t}',0)">مفيش</a>${Object.entries(g).map(([k,v])=>`<label class="chk"><input type="checkbox" ${u.perms.includes(k)?'checked':''} onchange="ufPerm('${k}',this.checked)"> ${v}</label>`).join('')}</div>`).join('')}
 <label>أقصى خصم مسموح على الفاتورة % (0 = بدون حد)</label><input type="number" inputmode="decimal" value="${u.maxDisc||0}" oninput="uf.u.maxDisc=+this.value||0"></div>
 ${u.emp?`<div class="card"><h2>عمولة المندوب</h2><div class="s" style="color:var(--mut);margin-bottom:6px">المرتب الأساسي من بطاقة الموظف.</div>
 <label>العمولة العامة</label><div class="row2"><input type="number" inputmode="decimal" value="${u.comm||0}" oninput="uf.u.comm=+this.value||0"><select onchange="uf.u.commT=this.value">${ctOpts(u.commT)}</select></div>
 <label>عمولة مختلفة لكل قسم (فاضي = العامة)</label>${db.sections.map(s=>`<div style="margin-bottom:6px"><b>${esc(s.name)}</b><div class="row2"><input type="number" inputmode="decimal" placeholder="عامة" value="${u.commSec[s.id]??''}" oninput="ufSec(${s.id},this.value)"><select onchange="ufSecT(${s.id},this.value)">${ctOpts((u.commSecT||{})[s.id])}</select></div></div>`).join('')}
 <label>عمولة خاصة لمنتجات معينة (الأعلى أولوية)</label>${Object.entries(u.commProd).map(([pid,v])=>`<div style="margin-bottom:6px"><b>${esc((prod(pid)||{}).name||'—')}</b><div class="row2"><div style="display:flex;gap:6px"><input type="number" inputmode="decimal" value="${v}" oninput="uf.u.commProd[${pid}]=this.value"><button class="x" style="border:0;background:#fbe3df;color:#c0392b;border-radius:10px;width:42px" onclick="delete uf.u.commProd[${pid}];ufDraw()">×</button></div><select onchange="ufProdT(${pid},this.value)">${ctOpts((u.commProdT||{})[pid])}</select></div></div>`).join('')}
 <div class="row2"><input list="dl_pp" id="cp_n" placeholder="اسم المنتج"><input id="cp_v" type="number" inputmode="decimal" placeholder="القيمة"></div><select id="cp_t" style="margin-top:6px">${ctOpts('')}</select><datalist id="dl_pp">${db.products.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist><button class="btn sec" onclick="ufAddProd()">＋ إضافة عمولة لمنتج</button></div>`:''}
 <button class="btn" onclick="saveUser('${id}')">💾 حفظ المستخدم</button>${id!=='new'&&DEMO?`<button class="btn sec" onclick="db.me=${+u.id};route()">🔄 جرّب النظام بحساب ده (تجريبي فقط)</button>`:''}`};
function ufDraw(){const y=window.scrollY;route();window.scrollTo(0,y)}
function ufPerm(k,on){const p=uf.u.perms.filter(x=>x!==k);if(on)p.push(k);uf.u.perms=p}
function ufGrp(t,on){const g=PERM_GROUPS.find(x=>x[0]===t)[1];uf.u.perms=uf.u.perms.filter(x=>!(x in g));if(on)uf.u.perms.push(...Object.keys(g));ufDraw()}
function ufTpl(k){uf.u.perms=[...TEMPLATES[k].perms];uf.u.role=k;if(k==='rep')uf.u.emp=true;ufDraw()}
function ufLoc(l,on){const a=uf.u.locs.filter(x=>x!==l);if(on)a.push(l);uf.u.locs=a}
function ufSec(id,v){if(v==='')delete uf.u.commSec[id];else uf.u.commSec[id]=+v}
const ctOpts=t=>`<option value="pct" ${t!=='fix'?'selected':''}>٪ نسبة من البيع</option><option value="fix" ${t==='fix'?'selected':''}>ج.م ثابت لكل وحدة</option>`;
function ufSecT(id,t){(uf.u.commSecT=uf.u.commSecT||{})[id]=t}
function ufProdT(id,t){(uf.u.commProdT=uf.u.commProdT||{})[id]=t}
function ufAddProd(){const p=db.products.find(x=>x.name===$('#cp_n').value.trim());if(!p||$('#cp_v').value==='')return toast('اختار المنتج واكتب القيمة');uf.u.commProd[p.id]=+$('#cp_v').value;(uf.u.commProdT=uf.u.commProdT||{})[p.id]=$('#cp_t').value;ufDraw()}
async function saveUser(id){const u=uf.u;if(!u.name.trim()||!u.username.trim())return toast('اكتب الاسم واسم المستخدم');if(db.users.some(x=>x.username===u.username.trim()&&x.id!=id))return toast('اسم المستخدم مستخدم قبل كده');
 u.name=u.name.trim();u.username=u.username.trim();const pw=$('#u_pw').value;u.active=(id==='new')||((db.users.find(x=>x.id==id)||{}).active!==false);if(pw){const e=Auth.pwErr(pw,u.username);if(e)return toast(e)}
 if(id==='new'){u.id=nid('user')+1;db.users.push(u)}else{const i=db.users.findIndex(x=>x.id==id);u.id=db.users[i].id;delete u.ph;db.users[i]=u}
 save();uf=null;if(!(await userPass(u,pw)))return;toast(pw||DEMO||Auth.hasPass(u.id)?'تم الحفظ ✅':'اتحفظ. حدد له باسورد علشان يقدر يدخل');location.hash=u.emp?'#/reps':'#/users'}
function delUser(id){if(!DEMO&&id==Auth.uid)return toast('مينفعش تحذف حسابك وانت داخل بيه');if(confirm('تحذف المستخدم؟')){Auth.removeUser(id);db.users=db.users.filter(u=>u.id!=id);if(db.me==id)db.me=1;uf=null;save();location.hash='#/users'}}

/* ---------- سجل الرقابة: كل عملية حساسة بتتسجل بالمستخدم والوقت والسبب ---------- */
function audit(act,detail){db.audit.push({ts:Date.now(),by:db.me,act,detail})}

/* ---------- المخازن والسيارات (السيارة = مخزن) مع المندوب والسواق ---------- */
R['/places']=()=>{head('المخازن والسيارات',true);const ex=id=>db.exps.filter(x=>x.car==id).reduce((a,x)=>a+x.amount,0);
 return `<div class="card"><h2>المخازن</h2>${db.wh.map(w=>`<div class="item"><div class="main"><div class="t">🏭 ${esc(w.name)}</div><div class="s">${db.products.filter(p=>qtyAt('w'+w.id,p.id)>0).length} صنف</div></div><button class="mvb" onclick="delPlace('w',${w.id})">حذف</button></div>`).join('')}<div class="row2" style="margin-top:10px"><input id="n_w" placeholder="اسم مخزن جديد"><button class="btn" style="margin:0" onclick="addPlace('w')">＋ إضافة</button></div></div>
 <div class="card"><h2>سيارات التوزيع</h2>${db.cars.map(c=>{const reps=db.users.filter(u=>(u.locs||[]).includes('c'+c.id)).map(u=>u.name);return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="t"><b>🚚 ${esc(c.name)}</b> <a style="float:left;color:var(--red);font-size:13px" onclick="delPlace('c',${c.id})">حذف</a></div><div class="s" style="font-size:12.5px;color:var(--mut)">المندوب: ${esc(reps.join('، ')||'لسه مفيش (حدده من شاشة المستخدم)')} · مصروفات السيارة: ${fmt(ex(c.id))} ج.م</div><div class="row2" style="margin-top:6px"><input placeholder="اسم السواق" value="${esc(c.driver||'')}" onchange="carF(${c.id},'driver',this.value)"><input type="tel" placeholder="تليفون السواق" value="${esc(c.dphone||'')}" onchange="carF(${c.id},'dphone',this.value)"></div></div>`}).join('')||'<div class="empty">مفيش سيارات</div>'}<div class="row2" style="margin-top:10px"><input id="n_c" placeholder="اسم / رقم السيارة"><button class="btn" style="margin:0" onclick="addPlace('c')">＋ إضافة</button></div></div>`};
function carF(id,f,v){db.cars.find(c=>c.id==id)[f]=v.trim();save()}

/* ---------- المصروفات (أنواع جاهزة + أنواع بيحطها المدير + ربط بالسيارة) ---------- */
const EXP_BUILTIN=['رواتب ومرتبات','وقود','صيانة سيارات','إيجار','كهرباء ومياه','تسويق ودعاية','نقل وشحن','مصروفات أخرى'];
const expCats=()=>[...EXP_BUILTIN,...db.expCats];
let xF={m:today().slice(0,7),cat:''};
R['/expenses']=()=>{head('المصروفات');
 const pays=db.pay.filter(x=>x.type==='paid').map(x=>({id:'p'+x.id,date:x.date,cat:'رواتب ومرتبات',amount:x.amount,note:uname(x.uid)+' - '+x.note,ro:1}));
 let all=[...db.exps,...pays].filter(x=>x.date.startsWith(xF.m)).sort((a,b)=>b.date.localeCompare(a.date));const byCat={};all.forEach(x=>byCat[x.cat]=(byCat[x.cat]||0)+x.amount);const total=all.reduce((a,x)=>a+x.amount,0);
 const l=xF.cat?all.filter(x=>x.cat===xF.cat):all;
 return `<div class="card" data-need="expenses.add"><h2>تسجيل مصروف</h2><label>النوع</label><select id="x_c" onchange="addNew2(this)">${expCats().map(c=>`<option>${esc(c)}</option>`).join('')}<option value="__new">＋ نوع جديد (اكتب اسمه)</option></select>
 <div class="row2"><div><label>المبلغ</label><input id="x_a" type="number" inputmode="decimal"></div><div><label>التاريخ</label><input id="x_d" type="date" value="${today()}"></div></div>
 <label>السيارة (للوقود والصيانة وغيرها، اختياري)</label><select id="x_car"><option value="0">— بدون —</option>${db.cars.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><label>ملاحظة</label><input id="x_n"><button class="btn" onclick="addExp()">＋ تسجيل المصروف (يتخصم من الخزينة)</button></div>
 <input type="month" value="${xF.m}" onchange="xF.m=this.value;route()" style="margin-bottom:10px">
 <div class="card"><h2>إجمالي الشهر: ${fmt(total)} ج.م</h2>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="stat" onclick="xF.cat='${escJs(c)}';route()"><span>${esc(c)}</span><b>${fmt(v)}</b></div>`).join('')||'<div class="empty">مفيش مصروفات</div>'}${xF.cat?`<button class="btn sec" onclick="xF.cat='';route()">عرض كل الأنواع</button>`:''}</div>
 <div class="card">${l.map(x=>`<div class="item"><div class="main"><div class="t">${esc(x.cat)}${x.car?' · 🚚 '+esc(locName('c'+x.car)):''}</div><div class="s">${x.date} ${esc(x.note||'')}</div></div><div class="num neg">${fmt(x.amount)}</div>${x.ro?'':`<button class="mvb" data-need="expenses.delete" onclick="delExp(${x.id})">✕</button>`}</div>`).join('')||'<div class="empty">مفيش مصروفات</div>'}</div>
 ${db.expCats.length?`<div class="card"><h2>الأنواع اللي ضفتها</h2>${db.expCats.map(c=>`<div class="item"><div class="main">${esc(c)}</div><button class="mvb" onclick="delCat('${escJs(c)}')">حذف</button></div>`).join('')}</div>`:''}`};
function addNew2(el){if(el.value!=='__new')return;const n=(prompt('اسم نوع المصروف الجديد')||'').trim();if(!n){el.selectedIndex=0;return}if(!expCats().includes(n)){db.expCats.push(n);save()}const o=document.createElement('option');o.textContent=n;el.insertBefore(o,el.querySelector('[value=__new]'));el.value=n}
function delCat(c){if(db.exps.some(x=>x.cat===c))return toast('فيه مصروفات بالنوع ده');db.expCats=db.expCats.filter(x=>x!==c);save();route()}
function addExp(){const a=+$('#x_a').value;if(!(a>0))return toast('اكتب المبلغ');const cat=$('#x_c').value;db.exps.push({id:nid('exp'),date:$('#x_d').value||today(),ts:Date.now(),by:db.me,cat,amount:a,car:+$('#x_car').value||0,note:$('#x_n').value.trim()});save();toast('تم ✅');route()}
function delExp(id){if(confirm('تحذف المصروف؟')){const x=db.exps.find(e=>e.id==id);audit('حذف مصروف',x.cat+' '+x.amount);db.exps=db.exps.filter(x=>x.id!=id);save();route()}}

/* ---------- تسوية الخزينة (عجز / زيادة) بصلاحية وسبب وسجل ---------- */
function cashSettle(){const act=+$('#cs_a').value,r=$('#cs_r').value.trim();if($('#cs_a').value==='')return toast('اكتب الفلوس الفعلية اللي في الخزينة');if(!r)return toast('اكتب السبب');
 const diff=act-cashBal();if(Math.abs(diff)<0.005)return toast('الخزينة مطابقة، مفيش تسوية');
 if(!confirm((diff<0?'عجز ':'زيادة ')+fmt(Math.abs(diff))+' ج.م. تسجّل التسوية؟'))return;
 db.cashx.push({id:nid('cx'),dir:diff>0?'in':'out',amount:Math.abs(diff),date:today(),ts:Date.now(),by:db.me,note:(diff>0?'تسوية زيادة: ':'تسوية عجز: ')+r,settle:1});
 audit('تسوية خزينة',(diff>0?'زيادة ':'عجز ')+fmt(Math.abs(diff))+' - '+r);save();toast('تمت التسوية ✅');route()}
const cashSettleHtml=()=>`<div class="card noprint" data-need="cash.settle"><h2>⚖️ تسوية الخزينة (جرد)</h2><p class="s" style="color:var(--mut);font-size:12.5px;margin:0">عدّ الفلوس اللي في الدرج واكتبها. البرنامج يحسب العجز أو الزيادة ويسجّلها باسمك ووقتها.</p><div class="row2"><div><label>الفعلي في الخزينة</label><input id="cs_a" type="number" inputmode="decimal"></div><div><label>السبب (إجباري)</label><input id="cs_r" placeholder="مثال: فرق فكة"></div></div><button class="btn" onclick="cashSettle()">تسجيل التسوية</button></div>`;
R['/audit']=()=>{head('سجل الرقابة',true);const l=[...db.audit].reverse();return `<div class="card">${l.map(a=>`<div class="item"><div class="main"><div class="t">${esc(a.act)}</div><div class="s">${esc(a.detail||'')}</div><div class="s">${esc(uname(a.by))} · ${new Date(a.ts).toLocaleString('ar-EG')}</div></div></div>`).join('')||'<div class="empty">مفيش سجلات</div>'}</div>`};

/* ---------- نسخة احتياطية واستعادة (للمدير) ---------- */
function backup(){const f=new File([JSON.stringify(db)],'khaled-trade-backup-'+today()+'.json',{type:'application/json'});dl(f);audit('نسخة احتياطية','')}
function restore(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.products||!d.users)throw 0;if(!confirm('هتستبدل كل البيانات الحالية بالنسخة دي. تكمل؟'))return;audit('استعادة نسخة',f.name);const a=db.audit;db=d;ensure();db.audit=(db.audit||[]).concat(a);save();toast('تمت الاستعادة ✅');location.hash='#/'}catch(e){toast('الملف مش صالح')}};r.readAsText(f)}

/* ---------- شاشة "المزيد" وصلاحيات الصفحات ---------- */
const TILES=[['🧾','فواتير البيع','#/invoices','sales.view'],['↩️','مرتجع مبيعات',"javascript:openDoc('sret')",'sales.return'],['📦','المنتجات','#/products',['products.view','stock.view','sales.add','purchases.add']],['🧾','قائمة الأصناف','#/pricelist','products.pricelist'],['👥','العملاء وكشف الحساب','#/customers',['customers.view','customers.statement','sales.add']],['🏭','الموردين','#/suppliers','suppliers.view'],['🛒','فاتورة شراء',"javascript:openDoc('pur')",'purchases.add'],['📚','سجل المشتريات','#/log/pur','purchases.view'],['📊','المخزون','#/stock','stock.view'],['🔁','تحويل / تحميل سيارة',"javascript:openDoc('tr')",'stock.transfer'],['⚖️','جرد وتسوية',"javascript:openDoc('adj')",'stock.adjust'],['🏭','المخازن والسيارات','#/places','stock.places'],['🚚','المناديب والمرتبات','#/reps','reps.view'],['💰','الخزينة','#/cash','cash.view'],['💸','المصروفات','#/expenses',['expenses.add','cash.view']],['📈','التقارير والأرباح','#/reports','reports.view'],['🔐','المستخدمين والصلاحيات','#/users','users.manage'],['🕵️','سجل الرقابة','#/audit','users.manage'],['⚙️','بيانات الشركة','#/settings','settings.edit']];
const canAny=p=>Array.isArray(p)?p.some(can):can(p);
R['/more']=()=>{head('كل الأقسام');return `<div class="tiles">${TILES.filter(t=>canAny(t[3])).map(t=>`<a class="tile" href="${t[2]}"><span>${t[0]}</span>${t[1]}</a>`).join('')}</div>
 <div class="card" style="margin-top:12px"><div class="stat"><span>المستخدم الحالي</span><b>${esc(me().name)}</b></div>${Auth.on()?'<button class="btn sec" onclick="logout()">تسجيل الخروج</button>':''}${can('reports.export')?`<button class="btn sec" onclick="backup()">⬇ نسخة احتياطية (ملف)</button><label class="btn sec" style="display:block;text-align:center;margin-top:10px">⬆ استعادة نسخة<input type="file" accept=".json" style="display:none" onchange="restore(this)"></label>`:''}</div>`};
const ROUTE_PERM={'/invoice':['sales.view','sales.add'],'/invoices':'sales.view','/products':['products.view','stock.view','sales.add','purchases.add'],'/product':['products.view','stock.view','sales.add','purchases.add'],'/lists':'products.edit','/pricelist':'products.pricelist','/customers':['customers.view','customers.statement','sales.add'],'/customer':['customers.view','customers.statement','sales.add'],'/suppliers':'suppliers.view','/supplier':'suppliers.view','/stock':'stock.view','/places':'stock.places','/cash':'cash.view','/expenses':['expenses.add','cash.view'],'/reports':'reports.view','/users':'users.manage','/user':'users.manage','/audit':'users.manage','/reps':'reps.view','/rep':'reps.view','/settings':'settings.edit'};
function routeAllowed(key,seg){if(key==='/doc'){const c=DOC_CFG[seg[1]];return !c||can(c.perm)}if(key==='/rec'||key==='/log'){return true}const p=ROUTE_PERM[key];return !p||canAny(p)}

/* ---------- بيانات تجريبية للموديولات الجديدة (?demo=1) ---------- */
function demoMore(){db.suppliers.push({id:nid('sup'),name:'شركة جرين لايف للمستلزمات',phone:'01155550001',phone2:'',phone3:'',addr:'القاهرة',map:'',open:0},{id:nid('sup'),name:'الدلتا للأسمدة',phone:'01155550002',phone2:'0482223344',phone3:'',addr:'كفر الشيخ',map:'',open:15000});
 db.cars.push({id:nid('car'),name:'سيارة 1',driver:'عم صلاح',dphone:'01099990000'});db.wh.push({id:nid('wh'),name:'مخزن سيدي سالم 2'});
 const T=TEMPLATES;db.users.push({id:nid('user')+1,name:'أحمد (مندوب)',username:'ahmed',role:'rep',perms:[...T.rep.perms],locs:['c1'],emp:true,salary:3000,comm:2,commSec:{1:3},commProd:{4:5},maxDisc:5,active:true},{id:nid('user')+1,name:'منى (محاسبة)',username:'mona',role:'accountant',perms:[...T.accountant.perms],locs:[],emp:false,salary:0,comm:0,commSec:{},commProd:{},maxDisc:0,active:true},{id:nid('user')+1,name:'سعد (أمين المخزن)',username:'saad',role:'keeper',perms:[...T.keeper.perms],locs:['w1'],emp:false,salary:0,comm:0,commSec:{},commProd:{},maxDisc:0,active:true});
 const P=db.products;mv('w1',P[0].id,-30);mv('c1',P[0].id,30);mv('w1',P[3].id,-10);mv('c1',P[3].id,10);
 const id=nid('tr');db.trans.push({id,no:id,k:'tr',date:today(),ts:Date.now(),by:1,party:0,loc:'w1',to:'c1',items:[{pid:P[0].id,name:P[0].name,unit:P[0].unit,pack:P[0].pack||'',qty:30,price:0},{pid:P[3].id,name:P[3].name,unit:P[3].unit,pack:P[3].pack||'',qty:10,price:0}],total:0,paid:0,rem:0,notes:'تحميل صباحي'});
 db.exps.push({id:nid('exp'),date:today(),ts:Date.now(),by:1,cat:'وقود',amount:250,car:1,note:'بنزين السيارة'});save()}

