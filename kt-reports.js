/* خالد تريد - التقارير · كشف الحساب · أزرار الطباعة/PDF/واتساب الموحدة
   جزء من برنامج حسابات خالد تريد. شوف README.md لتوزيع الملفات. */
/* =====================================================================
   مخرجات موحّدة: أي تقرير/مطبوع في البرنامج تحته نفس الأزرار التلاتة
   (حفظ PDF · واتساب · طباعة). بتتضاف أوتوماتيك بعد كل رسم للشاشة (outAuto).
   ===================================================================== */
const OUT_BTNS='<button class="btn sec" onclick="outPDF(this)">⬇️ حفظ PDF</button><button class="btn wa" onclick="outWA(this)">💬 واتساب</button><button class="btn sec" onclick="window.print()">🖨️ طباعة / حفظ</button>';
function outAuto(){const A=$('#app');if(!A)return;
 const old=[...A.querySelectorAll('button[onclick*="window.print"],button[onclick*="shareInv"],button[onclick*="saveInvPdf"],button[onclick*="sharePL"],button[onclick*="savePLPdf"]')];
 const els=new Set();A.querySelectorAll('.out').forEach(e=>els.add(e));
 old.forEach(b=>{const el=b.closest('.card')||A.querySelector('#plv');if(el)els.add(el)});
 old.forEach(b=>{const r=b.parentElement;b.remove();if(r&&r.classList.contains('row2')&&!r.children.length)r.remove()});
 A.querySelectorAll('.obar').forEach(x=>x.remove());
 els.forEach(el=>{el.classList.add('out');const b=document.createElement('div');b.className='obar noprint';b.innerHTML=OUT_BTNS;el.after(b)})}
function outCtx(){const s=location.hash.slice(1).split('?')[0].split('/').filter(Boolean),k=s[0],id=s[1];
 if(k==='invoice'&&id!=='new'){const i=db.invoices.find(x=>x.id==id),c=i&&i.cid?cust(i.cid):null;return{ph:c&&phones(c)[0],text:i&&invText(i),name:'فاتورة-'+(i&&i.no)}}
 if(k==='customer'){const c=cust(id);return{ph:c&&phones(c)[0],name:'كشف-'+(c&&c.name)}}
 if(k==='stmt'){const c=cust(ST.cid);return{ph:c&&phones(c)[0],name:'كشف-'+(c&&c.name)}}
 if(k==='supplier'){const x=db.suppliers.find(y=>y.id==id);return{ph:x&&x.phone,name:'كشف-'+(x&&x.name)}}
 if(k==='rec'){const c=DOC_CFG[id],r=c&&db[c.db].find(x=>x.id==s[2]);const ph=r&&r.party?(c.party==='sup'?(db.suppliers.find(x=>x.id==r.party)||{}).phone:phones(cust(r.party)||{})[0]):'';return{ph,name:(c?c.t:'مستند')+'-'+(r&&r.no)}}
 if(k==='rep'){const u=db.users.find(x=>x.id==id);return{ph:u&&u.phone,name:'مرتب-'+(u&&u.name)}}
 return{name:'خالد-تريد-'+(k||'تقرير')}}
/* نص عادي من عنصر الصفحة (للواتساب) */
function plain(el){const o=[];(function w(n){if(n.nodeType!==1)return;const c=n.classList;if(c.contains('noprint')||/^(BUTTON|SELECT|INPUT|SCRIPT|STYLE|IMG)$/.test(n.tagName))return;
 const cells=()=>[...n.children].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
 if(n.tagName==='TR'){o.push(cells().join(' | '));return}
 if(c.contains('stat')||c.contains('item')){o.push(cells().join(' : '));return}
 if(!n.children.length){const t=n.textContent.replace(/\s+/g,' ').trim();if(t)o.push(/^H\d$/.test(n.tagName)?'*'+t+'*':t);return}
 [...n.children].forEach(w)})(el);return o.join('\n')}
function outWA(b){return outPDF(b,true)}
/* (قديم: واتساب كنص) اتشال - الواتساب دلوقتي بيبعت ملف PDF */
function outWAtext(b){const el=b.parentElement.previousElementSibling,x=outCtx();const st=db.settings;
 let t=x.text||('*'+st.name+'*\n'+plain(el));if(t.length>1700)t=t.slice(0,1700)+'\n…(باقي التفاصيل في ملف الـ PDF)';
 if(!x.ph)toast('مفيش رقم مسجل - اختار جهة الاتصال في واتساب');
 window.open('https://wa.me/'+(x.ph?waNum(x.ph):'')+'?text='+encodeURIComponent(t),'_blank')}
async function outPDF(b,wa){const el=b.parentElement.previousElementSibling,x=outCtx();toast('جاري تجهيز الـ PDF…');
 try{const c=el.cloneNode(true);c.querySelectorAll('.noprint,button,.acl').forEach(e=>e.remove());c.querySelectorAll('input,select').forEach(e=>{const s=document.createElement('span');s.textContent=e.value;e.replaceWith(s)});
  const w=Math.max(el.offsetWidth,340);const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:0;width:'+w+'px';holder.appendChild(c);document.body.appendChild(holder);const h=Math.ceil(holder.offsetHeight)+30;holder.remove();
  const css=[...document.styleSheets].map(ss=>{try{return [...ss.cssRules].map(x=>x.cssText).join('\n')}catch(e){return ''}}).join('\n');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="width:${w}px;background:#fff;padding:0;font-family:${FONT}"><style><![CDATA[${css}]]></style>${new XMLSerializer().serializeToString(c)}</div></foreignObject></svg>`;
  const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
  const cv=document.createElement('canvas');cv.width=w*2;cv.height=h*2;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,0,0,cv.width,cv.height);
  const d=atob(cv.toDataURL('image/jpeg',.92).split(',')[1]),jpg=new Uint8Array(d.length);for(let k=0;k<d.length;k++)jpg[k]=d.charCodeAt(k);
  const f=new File([jpegPdf(jpg,cv.width,cv.height)],(x.name||'تقرير')+'.pdf',{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[f]})&&/Android|iPhone|iPad/.test(navigator.userAgent)){try{await navigator.share({files:[f],title:f.name});return}catch(e){if(e.name==='AbortError')return}}
  dl(f);
  if(wa){/* واتساب ويب مبيقبلش مرفقات من لينك: الملف اتحفظ، وبنفتح المحادثة على نفس الرقم علشان تسحب الملف فيها */
   toast(x.ph?'اتحفظ الـ PDF ✅ - دوس إرفاق في واتساب واختار الملف':'اتحفظ الـ PDF ✅ - اختار جهة الاتصال وأرفقه');
   setTimeout(()=>window.open('https://wa.me/'+(x.ph?waNum(x.ph):'')+'?text='+encodeURIComponent('📎 '+(x.name||'ملف')+' (PDF مرفق)'),'_blank'),700);return}
  toast('اتحفظ ملف الـ PDF ✅')}catch(e){toast('تعذر تجهيز الـ PDF، استخدم طباعة / حفظ');}}

/* =====================================================================
   كشف حساب العميل: بحث بالاسم + من تاريخ / إلى تاريخ، والكشف يظهر فورًا
   ===================================================================== */
let ST={cid:0,from:'',to:today(),q:''};
function custEv(c){const ev=[];if(c.open)ev.push({d:'',t:0,desc:'رصيد سابق',db:c.open>0?c.open:0,cr:c.open<0?-c.open:0});
 db.invoices.filter(i=>i.cid==c.id).forEach(i=>{ev.push({d:i.date,t:i.ts||i.id,desc:`فاتورة #${i.no} <span class="pill ${i.rem>0?'bad':''}">${i.rem>0?'آجل':'كاش'}</span>`,db:i.total,cr:0,link:'invoice/'+i.id});if(i.paid>0)ev.push({d:i.date,t:(i.ts||i.id)+.5,desc:'مدفوع عند البيع',db:0,cr:i.paid})});
 db.payments.filter(p=>p.cid==c.id).forEach(p=>ev.push({d:p.date,t:p.ts,desc:'💵 تحصيل'+(p.note?' · '+esc(p.note):''),db:0,cr:p.amount}));
 db.rets.filter(r=>r.k==='sret'&&r.party==c.id).forEach(r=>{ev.push({d:r.date,t:r.ts,desc:'↩ مرتجع #'+r.no+(r.ref?' (على فاتورة #'+r.ref.no+')':''),db:0,cr:r.total,link:'rec/sret/'+r.id});if(r.paid>0)ev.push({d:r.date,t:r.ts+.5,desc:'رد نقدية للعميل',db:r.paid,cr:0})});
 ev.sort((x,y)=>(x.d||'').localeCompare(y.d||'')||x.t-y.t);let bal=0;ev.forEach(e=>{bal+=e.db-e.cr;e.bal=bal});return ev}
function stmtHtml(c,from,to){const all=custEv(c);let open=0;let rows=[];
 all.forEach(e=>{if(from&&e.d&&e.d<from)open=e.bal;else if(!(to&&e.d&&e.d>to))rows.push(e)});
 if(from&&all.some(e=>e.d&&e.d<from)&&!rows.some(e=>!e.d))rows.unshift({d:'',desc:'رصيد قبل '+from,db:open>0?open:0,cr:open<0?-open:0,bal:open});
 if(ST.sum){const M={};rows.forEach(e=>{const k=e.d?e.d.slice(0,7):'';const m=M[k]=M[k]||{d:k,desc:k?'حركة شهر '+k:'رصيد سابق',db:0,cr:0,bal:0};m.db+=e.db;m.cr+=e.cr;m.bal=e.bal});rows=Object.values(M)}
 const sd=rows.filter(e=>e.d).reduce((a,e)=>a+e.db,0),sc=rows.filter(e=>e.d).reduce((a,e)=>a+e.cr,0),end=rows.length?rows[rows.length-1].bal:open;
 return `<div class="card stm out"><h2>كشف حساب: ${esc(c.name)}</h2><div class="s" style="color:var(--mut);margin-bottom:6px">${from?'من '+from:'من البداية'} إلى ${to||today()}</div>
 <div class="stat"><span>إجمالي عليه في الفترة</span><b>${fmt(sd)}</b></div><div class="stat"><span>إجمالي دفع / مرتجع</span><b>${fmt(sc)}</b></div><div class="stat"><span>الرصيد المطلوب منه</span><b class="${end>0?'neg':''}">${fmt(end)} ج.م</b></div>
 ${rows.length?`<table><tr><th>التاريخ</th><th>البيان</th><th>عليه</th><th>دفع</th><th>الرصيد</th></tr>${rows.map(e=>`<tr ${e.link?`onclick="location.hash='#/${e.link}'"`:''}><td>${(e.d||'').slice(5)}</td><td style="text-align:right">${e.desc}</td><td>${e.db?fmt(e.db):''}</td><td style="color:#1d437c">${e.cr?fmt(e.cr):''}</td><td class="${e.bal>0?'neg':''}"><b>${fmt(e.bal)}</b></td></tr>`).join('')}</table>`:'<div class="empty">مفيش حركات في الفترة دي</div>'}</div>`}
const presets=(fn)=>`<div class="seg" style="grid-template-columns:repeat(4,1fr);margin-top:8px">${[['اليوم',0],['٧ أيام',7],['الشهر',30],['السنة',365]].map(([t,n])=>`<button style="padding:8px 2px;font-size:12.5px" onclick="${fn}(${n})">${t}</button>`).join('')}</div>`;
const daysAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)};
const stmtBox=(c,id)=>`<div class="card noprint"><div class="seg" style="margin-bottom:8px"><button class="${ST.sum?'':'on'}" onclick="ST.sum=0;stRedraw()">كشف تفصيلي</button><button class="${ST.sum?'on':''}" onclick="ST.sum=1;stRedraw()">كشف مختصر (شهري)</button></div><div class="row2"><div><label>من تاريخ</label><input type="date" id="st_f" value="${ST.from}" onchange="stRange()"></div><div><label>إلى تاريخ</label><input type="date" id="st_t" value="${ST.to}" onchange="stRange()"></div></div>${presets('stPre')}</div><div id="stbody">${stmtHtml(c,ST.from,ST.to)}</div>`;
function stRange(){ST.from=$('#st_f').value;ST.to=$('#st_t').value;stRedraw()}
function stPre(n){ST.from=n?daysAgo(n):today();ST.to=today();$('#st_f').value=ST.from;$('#st_t').value=ST.to;stRedraw()}
function stRedraw(){const c=cust(ST.cid);if(!c)return;$('#stbody').innerHTML=stmtHtml(c,ST.from,ST.to);outAuto()}
const stmt=(c)=>{if(ST.cid!=c.id){ST.cid=c.id;ST.from='';ST.to=today()}return stmtBox(c)};
R['/stmt']=id=>{head('كشف حساب عميل',true);if(id){const c=cust(id);if(c){if(ST.cid!=c.id){ST.cid=c.id;ST.from='';ST.to=today()}return `<div class="card noprint"><b>${esc(c.name)}</b> <a style="float:left;color:var(--g3)" onclick="ST.cid=0;location.hash='#/stmt'">تغيير العميل</a></div>`+stmtBox(c)}}
 return `<div class="card"><label>ابحث عن العميل بالاسم أو التليفون</label><input class="search" id="st_q" autocomplete="off" placeholder="🔍 اكتب أول حرف…" oninput="stSearch(this.value)"><div id="st_l">${stList('')}</div></div>`};
function stList(q){const l=db.customers.filter(c=>cmatch(c,q)).slice(0,30);return l.length?l.map(c=>`<div class="item" onclick="location.hash='#/stmt/${c.id}'"><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(phones(c)[0]||'')}</div></div><div class="num ${c.balance>0?'neg':''}">${fmt(c.balance)}</div></div>`).join(''):'<div class="empty">مفيش عميل بالاسم ده</div>'}
function stSearch(q){$('#st_l').innerHTML=stList(q)}

/* =====================================================================
   قسم التقارير: كل تقرير بفلتر تاريخ، وتحته الأزرار التلاتة أوتوماتيك
   ===================================================================== */
const RP={t:'sales',g:'prod',from:today().slice(0,8)+'01',to:today(),loc:'',rep:'',sec:'',co:'',pid:'',cid:''};
const inR=d=>d>=RP.from&&d<=RP.to;
const RT=[['sales','📊 مبيعات حسب…'],['profit','💹 الأرباح'],['top','🏆 الأكثر مبيعًا'],['custs','👑 أفضل العملاء'],['slow','🐌 راكد (ما اتباعش)'],['stockval','🏷️ قيمة المخزون'],['expiry','⏳ الصلاحية'],['cashmv','💰 حركة الخزينة'],['perf','🏅 أداء المناديب'],['comm','🧮 عمولات المناديب'],['bal','🧾 العملاء اللي عليهم فلوس'],['supbal','🏭 مستحقات الموردين'],['exps','💸 المصروفات']];
const GROUPS=[['day','اليوم'],['prod','الصنف'],['rep','المندوب'],['loc','المخزن/السيارة'],['sec','القسم'],['co','الشركة'],['cust','العميل'],['all','الإجمالي']];
function saleLines(){const o=[];const P=id=>prod(id)||{};
 db.invoices.forEach(i=>{if(!inR(i.date))return;const k=i.sub?i.total/i.sub:1;i.items.forEach(it=>{const p=P(it.pid);o.push({d:i.date,pid:it.pid,name:it.name,sec:p.sec,co:p.co,loc:i.loc||'w1',rep:i.by,cid:i.cid,qty:it.qty,amt:it.qty*it.price*k,cost:it.qty*(it.cost!=null?it.cost:(p.cost||0))})})});
 db.rets.forEach(r=>{if(r.k!=='sret'||!inR(r.date))return;r.items.forEach(it=>{const p=P(it.pid);o.push({d:r.date,pid:it.pid,name:it.name,sec:p.sec,co:p.co,loc:r.loc||'w1',rep:r.by,cid:r.party,qty:-it.qty,amt:-it.qty*it.price,cost:-it.qty*(it.cost!=null?it.cost:(p.cost||0))})})});
 return o.filter(x=>(!RP.loc||x.loc===RP.loc)&&(!RP.rep||x.rep==RP.rep)&&(!RP.sec||x.sec==RP.sec)&&(!RP.co||x.co==RP.co)&&(!RP.pid||x.pid==RP.pid)&&(!RP.cid||x.cid==RP.cid))}
function grp(l,g){const M={};l.forEach(x=>{const k={day:x.d,prod:x.pid,rep:x.rep,loc:x.loc,sec:x.sec,co:x.co,cust:x.cid||0,all:'all'}[g];const r=M[k]=M[k]||{k,qty:0,amt:0,cost:0,n:0};r.qty+=x.qty;r.amt+=x.amt;r.cost+=x.cost;r.n++;r.name=x.name});
 const lab={day:k=>k,prod:(k,r)=>r.name,rep:k=>uname(k),loc:k=>locName(k),sec:k=>secN(k)||'بدون قسم',co:k=>coN(k)||'بدون شركة',cust:k=>cname(k),all:()=>'إجمالي المبيعات'}[g];
 return Object.values(M).map(r=>({...r,label:lab(r.k,r),profit:r.amt-r.cost}))}
const rtbl=(h,rows,foot)=>`<table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td ${i===0?'style="text-align:right"':''}>${c}</td>`).join('')}</tr>`).join('')}${foot?`<tr style="font-weight:800;background:var(--g0,#eef1f6)">${foot.map((c,i)=>`<td ${i===0?'style="text-align:right"':''}>${c}</td>`).join('')}</tr>`:''}</table>`;
const selOpts=(a,v,all)=>`<option value="">${all}</option>`+a.map(([k,n])=>`<option value="${k}" ${v==k?'selected':''}>${esc(n)}</option>`).join('');
function rFilters(t){const f=[];const need={sales:1,profit:1,top:1,custs:1,slow:1};
 if(need[t]){f.push(`<div><label>المخزن/السيارة</label><select onchange="RP.loc=this.value;route()">${selOpts(allLocs().map(l=>[l,locName(l)]),RP.loc,'الكل')}</select></div>`,
 `<div><label>المندوب</label><select onchange="RP.rep=this.value;route()">${selOpts(db.users.filter(u=>u.emp||db.invoices.some(i=>i.by==u.id)).map(u=>[u.id,u.name]),RP.rep,'الكل')}</select></div>`,
 `<div><label>القسم</label><select onchange="RP.sec=this.value;route()">${selOpts(db.sections.map(s=>[s.id,s.name]),RP.sec,'الكل')}</select></div>`,
 `<div><label>الشركة</label><select onchange="RP.co=this.value;route()">${selOpts(db.companies.map(s=>[s.id,s.name]),RP.co,'الكل')}</select></div>`,
 `<div style="grid-column:1/-1"><label>صنف معين</label><select onchange="RP.pid=this.value;route()">${selOpts(db.products.map(p=>[p.id,p.name]),RP.pid,'كل الأصناف')}</select></div>`)}
 return f.length?`<div class="row2" style="margin-top:8px">${f.join('')}</div>`:''}
R['/reports']=()=>{head('التقارير',true);const t=RP.t,PR=can('reports.profit');
 if(!PR&&['profit','stockval'].includes(t))RP.t=t='sales';
 if(t==='profit')return profitPage();
 const bar=`<div class="card noprint"><b style="font-size:15px">${RT.find(x=>x[0]===t)[1]}</b>
 <div class="row2" style="margin-top:10px"><div><label>من</label><input type="date" value="${RP.from}" onchange="RP.from=this.value;route()"></div><div><label>إلى</label><input type="date" value="${RP.to}" onchange="RP.to=this.value;route()"></div></div>${presets('rpPre')}
 ${t==='sales'?`<label style="margin-top:8px">تقسيم حسب</label><div class="chips">${GROUPS.map(([k,n])=>`<button class="${RP.g===k?'on':''}" onclick="RP.g='${k}';route()">${n}</button>`).join('')}</div>`:''}${t==='profit'?`<label style="margin-top:8px">أرباح لـ</label><div class="chips">${GROUPS.map(([k,n])=>`<button class="${RP.g===k?'on':''}" onclick="RP.g='${k}';route()">${n}</button>`).join('')}</div>`:''}
 ${rFilters(t)}</div>`;
 return bar+`<div class="card out"><h2>${RT.find(x=>x[0]===t)[1]}</h2><div class="s" style="color:var(--mut);margin-bottom:8px">${esc(db.settings.name)} · من ${esc(RP.from)} إلى ${esc(RP.to)}</div>${repBody(t,PR)}</div>`};
/* ===== صفحة الأرباح المبسطة: يومي / أسبوعي / شهري (أو فترة مخصصة). كل الأرقام من الفواتير والمصروفات والخزينة ===== */
const PP={m:'month',off:0,det:0,from:'',to:''};
const ppAdd=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
function ppRange(){const t=today();
 if(PP.m==='custom')return[PP.from||t,PP.to||t];
 if(PP.m==='day'){const d=ppAdd(t,PP.off);return[d,d]}
 if(PP.m==='week'){const dow=(new Date(t+'T12:00:00Z').getUTCDay()+1)%7;const a=ppAdd(t,-dow+7*PP.off);return[a,ppAdd(a,6)]}
 const x=new Date(t.slice(0,7)+'-01T12:00:00Z');x.setUTCMonth(x.getUTCMonth()+PP.off);const a=x.toISOString().slice(0,10);x.setUTCMonth(x.getUTCMonth()+1);x.setUTCDate(0);return[a,x.toISOString().slice(0,10)]}
function ppSet(m){PP.m=m;PP.off=0;if(m==='custom'){PP.from=PP.from||today().slice(0,8)+'01';PP.to=PP.to||today()}route()}
function ppNums(a,b){const keep=[RP.from,RP.to,RP.loc,RP.rep,RP.sec,RP.co,RP.pid,RP.cid];RP.from=a;RP.to=b;RP.loc=RP.rep=RP.sec=RP.co=RP.pid=RP.cid='';
 const l=saleLines();[RP.from,RP.to,RP.loc,RP.rep,RP.sec,RP.co,RP.pid,RP.cid]=keep;
 const sales=l.reduce((x,r)=>x+r.amt,0),cogs=l.reduce((x,r)=>x+r.cost,0),inn=d=>d>=a&&d<=b;
 const ex=db.exps.filter(x=>inn(x.date)),sal=ex.filter(x=>x.cat==='مرتبات').reduce((x,r)=>x+r.amount,0)+db.pay.filter(x=>x.type==='paid'&&inn(x.date)).reduce((x,r)=>x+r.amount,0)+(db.rpay||[]).filter(x=>inn(x.date)).reduce((x,r)=>x+r.amount,0),oth=ex.filter(x=>x.cat!=='مرتبات').reduce((x,r)=>x+r.amount,0);
 return{sales,cogs,gross:sales-cogs,oth,sal,net:sales-cogs-oth-sal,n:db.invoices.filter(i=>inn(i.date)).length}}
function ppDetail(a,b){RP.from=a;RP.to=b;const PR=can('reports.profit');
 const f=rFilters('profit');
 return `<div class="card noprint"><b>تفاصيل الربح</b><label style="margin-top:8px">أرباح لـ</label><div class="chips">${GROUPS.map(([k,n])=>`<button class="${RP.g===k?'on':''}" onclick="RP.g='${k}';route()">${n}</button>`).join('')}</div>${f}</div><div class="card out"><h2>تفاصيل الربح · ${esc(a)} إلى ${esc(b)}</h2>${repBody('profit',PR)}</div>`}
function profitPage(){const[a,b]=ppRange(),n=ppNums(a,b),M=PP.m,lab=M==='day'?(PP.off===0?'النهارده':'يوم '+a):M==='week'?'من '+a+' إلى '+b:M==='month'?'شهر '+a.slice(0,7):'من '+a+' إلى '+b;
 const btn=(k,t)=>`<button class="${M===k?'on':''}" onclick="ppSet('${k}')" style="min-height:54px;font-size:17px;font-weight:800;border-radius:14px;${M===k?'background:var(--leaf);border-color:var(--leaf);color:#fff;box-shadow:0 2px 8px #0003':''}">${t}</button>`,row=(t,v,c,bold)=>`<div class="stat"><span>${bold?'<b>'+t+'</b>':t}</span><b class="${c||''}" ${bold?'style="font-size:18px"':''}>${fmt(v)}${bold?' ج.م':''}</b></div>`;
 return `<div class="card noprint"><div class="seg" style="grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">${btn('day','يومي')}${btn('week','أسبوعي')}${btn('month','شهري')}</div>
 ${M==='custom'?`<div class="row2"><div><label>من</label><input type="date" value="${PP.from}" onchange="PP.from=this.value;route()"></div><div><label>إلى</label><input type="date" value="${PP.to}" onchange="PP.to=this.value;route()"></div></div>`:`<div style="display:flex;align-items:center;justify-content:space-between"><button class="chipb" onclick="PP.off--;route()">▶ السابق</button><b>${lab}</b><button class="chipb" ${PP.off>=0?'disabled style="opacity:.4"':''} onclick="PP.off++;route()">التالي ◀</button></div>`}
 <div style="text-align:center;margin-top:8px"><a class="s" style="color:var(--mut);font-size:12.5px" onclick="ppSet('custom')">فترة مخصصة</a></div></div>
 <div class="card out"><h2>💹 الأرباح · ${lab}</h2><div class="s" style="color:var(--mut);margin-bottom:8px">${esc(db.settings.name)} · ${n.n} فاتورة</div>
 ${row('المبيعات (بعد الخصم والمرتجعات)',n.sales)}${row('تكلفة البضاعة المباعة',-n.cogs)}${row('مجمل الربح',n.gross,'',0)}${row('المصروفات',-n.oth)}${row('المرتبات والعمولات',-n.sal)}<hr style="border:0;border-top:1px dashed var(--line);margin:8px 0">${row('صافي الربح',n.net,n.net<0?'neg':'',1)}
 <p class="s" style="color:var(--mut);font-size:12px;margin-top:10px">الأرقام من الفواتير والمصروفات والخزينة. التكلفة بسعر الصنف وقت البيع.</p></div>
 ${ppDetail(a,b)}`}
function rpPre(n){RP.from=n?daysAgo(n):today();RP.to=today();route()}
function repBody(t,PR){const E='<div class="empty">مفيش بيانات في الفترة دي</div>';
 if(t==='sales'||t==='profit'){const l=saleLines(),g=RP.g,rows=grp(l,g).sort((a,b)=>g==='day'?a.k.localeCompare(b.k):t==='profit'?b.profit-a.profit:b.amt-a.amt);if(!rows.length)return E;
  const T=rows.reduce((a,r)=>({q:a.q+r.qty,a:a.a+r.amt,c:a.c+r.cost}),{q:0,a:0,c:0});
  if(t==='profit')return rtbl(['البند','المبيعات','التكلفة','الربح','%'],rows.map(r=>[esc(r.label),fmt(r.amt),fmt(r.cost),`<b class="${r.profit<0?'neg':''}">${fmt(r.profit)}</b>`,r.amt?Math.round(r.profit/r.amt*100)+'%':'']),['الإجمالي',fmt(T.a),fmt(T.c),fmt(T.a-T.c),T.a?Math.round((T.a-T.c)/T.a*100)+'%':''])+'<p class="s" style="color:var(--mut);font-size:12px">الربح = البيع (بعد الخصم والمرتجعات) − تكلفة الأصناف وقت البيع.</p>';
  return rtbl(['البند','الكمية','المبيعات'].concat(PR?['الربح']:[]),rows.map(r=>[esc(r.label),fmt(r.qty),fmt(r.amt)].concat(PR?[fmt(r.profit)]:[])),['الإجمالي',fmt(T.q),fmt(T.a)].concat(PR?[fmt(T.a-T.c)]:[]))}
 if(t==='top'){const rows=grp(saleLines(),'prod').sort((a,b)=>b.qty-a.qty).slice(0,20);return rows.length?rtbl(['#','الصنف','الكمية','المبيعات'],rows.map((r,i)=>[i+1,esc(r.label),fmt(r.qty),fmt(r.amt)])):E}
 if(t==='custs'){const rows=grp(saleLines(),'cust').sort((a,b)=>b.amt-a.amt).slice(0,20);return rows.length?rtbl(['#','العميل','عدد البنود','المشتريات'],rows.map((r,i)=>[i+1,esc(r.label),r.n,fmt(r.amt)])):E}
 if(t==='slow'){const sold=new Set(saleLines().map(x=>x.pid));const rows=db.products.filter(p=>!sold.has(p.id)&&p.stock>0&&(!RP.sec||p.sec==RP.sec)&&(!RP.co||p.co==RP.co));return rows.length?rtbl(['الصنف','القسم','الرصيد'],rows.map(p=>[esc(p.name),esc(secN(p.sec)),fmt(p.stock)+' '+esc(unitT(p))])):'<div class="empty">كل الأصناف اتباعت في الفترة دي 👌</div>'}
 if(t==='stockval'){let tc=0,tp=0;const rows=db.products.map(p=>{const q=allLocs().reduce((a,l)=>a+qtyAt(l,p.id),0),c=q*(p.cost||0),s=q*(p.price||0);tc+=c;tp+=s;return[esc(p.name),fmt(q),fmt(c),fmt(s)]});return rtbl(['الصنف','الكمية','بالتكلفة','بسعر البيع'],rows,['الإجمالي','',fmt(tc),fmt(tp)])+`<div class="stat"><span>الربح المتوقع من المخزون</span><b>${fmt(tp-tc)} ج.م</b></div>`}
 if(t==='expiry'){const rows=db.products.filter(p=>p.exp).sort((a,b)=>a.exp.localeCompare(b.exp));return rows.length?rtbl(['الصنف','الصلاحية','الحالة','الرصيد'],rows.map(p=>{const s=expState(p);return[esc(p.name),p.exp,s?`<span class="${s.c==='bad'?'neg':''}">${s.t}</span>`:'',fmt(p.stock)]})):'<div class="empty">مفيش أصناف عليها تاريخ صلاحية</div>'}
 if(t==='cashmv'){const all=cashEv().sort((a,b)=>a.d.localeCompare(b.d)||a.t-b.t);let op=0;all.forEach(e=>{if(e.d<RP.from)op+=e.in-e.out});const rows=all.filter(e=>inR(e.d));const ti=rows.reduce((a,e)=>a+e.in,0),to=rows.reduce((a,e)=>a+e.out,0);
  return `<div class="stat"><span>رصيد أول الفترة</span><b>${fmt(op)}</b></div>`+(rows.length?rtbl(['التاريخ','البيان','وارد','منصرف'],rows.map(e=>[e.d.slice(5),esc(e.desc),e.in?fmt(e.in):'',e.out?fmt(e.out):'']),['الإجمالي','',fmt(ti),fmt(to)]):E)+`<div class="stat"><span>رصيد آخر الفترة</span><b>${fmt(op+ti-to)} ج.م</b></div>`}
 if(t==='perf'){const rows=db.users.filter(u=>u.emp).map(u=>{const c=repComm(u,inR),n=db.invoices.filter(i=>i.by==u.id&&inR(i.date)).length,col=db.payments.filter(x=>x.by==u.id&&inR(x.date)).reduce((a,x)=>a+x.amount,0),debt=db.customers.filter(x=>x.rep==u.id).reduce((a,x)=>a+Math.max(0,x.balance||0),0);return{u,c,n,col,debt}}).sort((a,b)=>b.c.base-a.c.base);return rows.length?rtbl(['المندوب','صافي المبيعات','فواتير','تحصيلات','ديون عملائه','العمولة'],rows.map(x=>[esc(x.u.name),fmt(x.c.base),x.n,fmt(x.col),`<span class="${x.debt>0?'neg':''}">${fmt(x.debt)}</span>`,fmt(x.c.comm)])):'<div class="empty">مفيش مناديب</div>'}
 if(t==='comm'){const rows=db.users.filter(u=>u.emp).map(u=>{const c=repComm(u,inR);return[esc(u.name),fmt(c.base),fmt(c.comm)]});return rows.length?rtbl(['المندوب','صافي مبيعاته','العمولة'],rows,['الإجمالي','',fmt(db.users.filter(u=>u.emp).reduce((a,u)=>a+repComm(u,inR).comm,0))]):'<div class="empty">مفيش مناديب</div>'}
 if(t==='bal'){const l=db.customers.filter(c=>c.balance>0).sort((a,b)=>b.balance-a.balance);return l.length?rtbl(['العميل','التليفون','عليه'],l.map(c=>[esc(c.name),esc(phones(c)[0]||''),`<b class="neg">${fmt(c.balance)}</b>`]),['الإجمالي','',fmt(l.reduce((a,c)=>a+c.balance,0))]):'<div class="empty">مفيش عملاء عليهم فلوس 👌</div>'}
 if(t==='supbal'){const l=db.suppliers.map(s=>({s,b:supBal(s)})).filter(x=>x.b!==0).sort((a,b)=>b.b-a.b);return l.length?rtbl(['المورد','التليفون','له عندنا'],l.map(x=>[esc(x.s.name),esc(x.s.phone||''),fmt(x.b)]),['الإجمالي','',fmt(l.reduce((a,x)=>a+x.b,0))]):'<div class="empty">مفيش مستحقات للموردين</div>'}
 if(t==='exps'){const l=db.exps.filter(x=>inR(x.date)),M={};l.forEach(x=>M[x.cat]=(M[x.cat]||0)+x.amount);db.pay.filter(x=>x.type==='paid'&&inR(x.date)).forEach(x=>M['مرتبات']=(M['مرتبات']||0)+x.amount);const rows=Object.entries(M).sort((a,b)=>b[1]-a[1]);return rows.length?rtbl(['البند','المبلغ'],rows.map(([k,v])=>[esc(k),fmt(v)]),['الإجمالي',fmt(rows.reduce((a,r)=>a+r[1],0))]):E}
 return E}

/* =====================================================================
   لوحة المدير (الرئيسية للمدير العام): مؤشرات + آخر العمليات + تنبيهات
   ===================================================================== */
const R_HOME=R['/'];
const sumBy=(a,f,p)=>a.filter(f).reduce((s,x)=>s+(+x[p]||0),0);
function dashStats(){const t=today(),m=t.slice(0,7),y=t.slice(0,4);
 const net=f=>sumBy(db.invoices,i=>f(i.date),'total')-sumBy(db.rets.filter(r=>r.k==='sret'),r=>f(r.date),'total');
 const profit=f=>{const keep=[RP.from,RP.to,RP.loc,RP.rep,RP.sec,RP.co,RP.pid,RP.cid];RP.from='0000';RP.to='9999';RP.loc=RP.rep=RP.sec=RP.co=RP.pid=RP.cid='';const l=saleLines().filter(x=>f(x.d));[RP.from,RP.to,RP.loc,RP.rep,RP.sec,RP.co,RP.pid,RP.cid]=keep;return l.reduce((a,x)=>a+x.amt-x.cost,0)};
 const D=d=>d===t,M=d=>d.startsWith(m),Y=d=>d.startsWith(y);
 const stockVal=db.products.reduce((a,p)=>a+allLocs().reduce((b,l)=>b+qtyAt(l,p.id),0)*(p.cost||0),0);
 return{sD:net(D),sM:net(M),sY:net(Y),pM:profit(M),pY:profit(Y),
  pur:sumBy(db.purchases,i=>M(i.date),'total'),exp:sumBy(db.exps,x=>M(x.date),'amount')+sumBy(db.pay.filter(x=>x.type==='paid'),x=>M(x.date),'amount'),
  col:sumBy(db.payments,p=>M(p.date),'amount')+sumBy(db.invoices,i=>M(i.date),'paid'),
  debt:db.customers.reduce((a,c)=>a+Math.max(0,c.balance||0),0),stockVal,
  low:(()=>{const sold=new Set();db.invoices.forEach(i=>i.items.forEach(x=>sold.add(x.pid)));return db.products.filter(p=>p.min>0&&p.stock<=p.min&&(p.stock>0||sold.has(p.id)))})()}}
function activity(){const e=[];const U=id=>uname(id);
 db.invoices.forEach(i=>e.push({ts:i.ts||new Date(i.date).getTime(),by:i.by,ic:'🧾',t:`فاتورة بيع #${i.no} - ${cname(i.cid)}`,a:i.total,h:'invoice/'+i.id}));
 db.purchases.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'🛒',t:`فاتورة شراء #${i.no} - ${sname(i.party)}`,a:i.total,h:'rec/pur/'+i.id}));
 db.rets.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'↩️',t:`${i.k==='sret'?'مرتجع مبيعات':'مرتجع مشتريات'} #${i.no}`,a:i.total,h:'rec/'+i.k+'/'+i.id}));
 db.trans.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'🔁',t:`تحويل ${locName(i.loc)} ← ${locName(i.to)}`,a:0,h:'rec/tr/'+i.id,tr:1}));
 db.exps.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'💸',t:`مصروف: ${i.cat}`,a:i.amount,ex:1}));
 db.payments.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'💵',t:`تحصيل من ${cname(i.cid)}`,a:i.amount}));
 db.audit.forEach(i=>e.push({ts:i.ts,by:i.by,ic:'🛡️',t:`${i.act}: ${i.detail||''}`,a:0,au:1}));
 return e.sort((a,b)=>b.ts-a.ts)}
const actRow=e=>`<div class="item" ${e.h?`onclick="location.hash='#/${e.h}'"`:''}><div class="main"><div class="t">${e.ic} ${esc(e.t)}</div><div class="s">${esc(uname(e.by))} · ${new Date(e.ts).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</div></div>${e.a?`<div class="num">${fmt(e.a)}</div>`:''}</div>`;
const kpi=(l,v,c)=>`<div class="kpi ${c||''}"><span>${l}</span><b>${v}</b></div>`;
R['/']=()=>{if(!can('reports.view'))return R_HOME();
 head('لوحة المدير');setTimeout(()=>{const h=document.querySelector('#hd');if(h&&!h.querySelector('.gear')&&can('settings.edit'))h.insertAdjacentHTML('beforeend','<button class="back gear" onclick="location.hash=\'#/settings\'">⚙️ الشركة</button>')},0);
 const s=dashStats(),PR=can('reports.profit'),A=activity();
 const cars=db.cars.length,whs=db.wh.length,reps=db.users.filter(u=>u.emp).length;
 const notes=[];
 s.low.slice(0,5).forEach(p=>notes.push(`📉 نواقص: ${p.name} (${fmt(p.stock)})`));
 db.products.filter(p=>{const x=expState(p);return x&&x.c}).slice(0,5).forEach(p=>notes.push(`⏳ صلاحية: ${p.name} (${expState(p).t})`));
 db.invoices.filter(i=>(i.adj<0)&&-i.adj>i.sub*.1).slice(-3).forEach(i=>notes.push(`🏷️ خصم كبير على فاتورة #${i.no}`));
 db.rets.slice(-3).forEach(r=>notes.push(`↩️ مرتجع #${r.no} بقيمة ${fmt(r.total)}`));
 db.audit.slice(-3).forEach(a=>notes.push(`🛡️ ${a.act}: ${a.detail||''}`));
 /* آخر 7 أيام مبيعات (أعمدة صغيرة) */
 const pad=n=>String(n).padStart(2,'0'),dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return{k:dk(d),n:d.getDate()}});
 days.forEach(x=>x.v=db.invoices.filter(i=>i.date===x.k).reduce((a,i)=>a+(i.total||0),0));
 const mx=Math.max(1,...days.map(x=>x.v));
 const bars=days.map((x,i)=>`<div class="bc"><i class="${i===6?'on':''}" style="height:${Math.max(4,Math.round(x.v/mx*46))}px"></i><span>${x.n}</span></div>`).join('');
 const hr=new Date().getHours(),greet=hr<12?'صباح الخير':hr<18?'مساء الخير':'مساء النور';
 const kp=(ic,l,v,c)=>`<div class="kpi2 ${c||''}"><div class="ki">${ic}</div><span>${l}</span><b>${v}</b></div>`;
 /* مقارنة الشهر الحالي بالشهر اللي فات + المؤشرات (حلقات ونسب) */
 const ym=d=>d.getFullYear()+'-'+pad(d.getMonth()+1),nowD=new Date(),pm=new Date(nowD.getFullYear(),nowD.getMonth()-1,1);
 const lastM=db.invoices.filter(i=>(i.date||'').startsWith(ym(pm))).reduce((a,i)=>a+(i.total||0),0);
 const trend=lastM>0?Math.round((s.sM-lastM)/lastM*100):null;
 const pc=(a,b)=>b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):0;
 const ring=(v,l,c)=>`<div class="rg"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" class="rt"/><circle cx="32" cy="32" r="26" class="rv ${c||''}" data-p="${v}"/></svg><b>${v}%</b><span>${l}</span></div>`;
 const lowP=pc(s.low.length,db.products.length);
 const prog=(l,v,c,t)=>`<div class="pg"><div class="pgh"><span>${l}</span><b>${t}</b></div><div class="pgt"><i class="${c||''}" data-w="${v}"></i></div></div>`;
 const S={};
 S.greet=`<div class="dgreet"><div><small>${greet}</small><b>${esc((me()&&me().name)||'')}</b></div><span class="dd">${today()}</span></div>`;
 S.hero=`<div class="dhero"><div class="dh1"><span>مبيعات اليوم</span><b>${fmt(s.sD)}<small> ج.م</small></b>${trend!==null?`<em class="tr ${trend>=0?'u':'d'}">${trend>=0?'▲':'▼'} ${Math.abs(trend)}% عن الشهر اللي فات</em>`:''}</div><div class="bars">${bars}</div>
  <div class="dh2"><div><span>الشهر</span><b>${fmt(s.sM)}</b></div><div><span>السنة</span><b>${fmt(s.sY)}</b></div>${PR?`<div class="pf"><span>ربح الشهر</span><b>${fmt(s.pM)}</b></div>`:''}</div></div>`;
 S.quick=`<div class="dq"><button class="gold" data-need="sales.add" onclick="location.hash='#/invoice/new'"><i>🧾</i>فاتورة</button><button onclick="location.hash='#/collect'"><i>💰</i>تحصيل</button><button onclick="location.hash='#/customers'"><i>👥</i>عملاء</button><button onclick="location.hash='#/products'"><i>📦</i>أصناف</button></div>`;
 S.gauges=`<div class="dsec">مؤشرات الأداء (الشهر)</div><div class="card gaug"><div class="rings">${PR?ring(pc(s.pM,s.sM),'هامش الربح'):''}${ring(pc(s.col,s.sM),'التحصيل من المبيعات','b')}${ring(pc(s.exp,s.sM),'المصروفات من المبيعات','r')}</div>
  ${prog('مديونية العملاء من مبيعات السنة',pc(s.debt,s.sY),'r',pc(s.debt,s.sY)+'%')}${prog('أصناف تحت حد الطلب',lowP,'g',s.low.length+' من '+db.products.length)}</div>`;
 S.kpis=`<div class="dsec">الحركة المالية</div><div class="kpis2">${kp('💰','تحصيلات الشهر',fmt(s.col),'up')}${kp('🧾','مديونيات العملاء',fmt(s.debt),'rd')}${kp('🛒','مشتريات الشهر',fmt(s.pur))}${kp('💸','مصروفات الشهر',fmt(s.exp))}${PR?kp('📈','ربح السنة',fmt(s.pY),'up'):''}${PR?kp('📦','قيمة المخزون',fmt(s.stockVal)):''}${can('cash.view')?kp('🏦','رصيد الخزينة',fmt(cashBal()),'gd'):''}</div>`;
 S.counts=`<div class="dcnt"><div><b>${db.invoices.length}</b><span>فاتورة</span></div><div><b>${db.customers.length}</b><span>عميل</span></div><div><b>${reps}</b><span>مندوب</span></div><div><b>${whs}/${cars}</b><span>مخزن/سيارة</span></div></div>`;
 S.notes=`<div class="card"><h2>🔔 إشعارات المدير</h2>${notes.length?notes.map(n=>`<div class="item"><div class="main"><div class="t" style="font-weight:500">${esc(n)}</div></div></div>`).join(''):'<div class="empty">مفيش إشعارات 👌</div>'}</div>`;
 S.recent=`<div class="card"><h2>آخر العمليات</h2>${A.slice(0,8).map(actRow).join('')||'<div class="empty">لسه مفيش عمليات</div>'}</div>`;
 S.trans=`<div class="card"><h2>آخر تحويلات المخازن</h2>${A.filter(e=>e.tr).slice(0,4).map(actRow).join('')||'<div class="empty">مفيش تحويلات</div>'}</div>`;
 S.exps=`<div class="card"><h2>آخر المصروفات</h2>${A.filter(e=>e.ex).slice(0,4).map(actRow).join('')||'<div class="empty">مفيش مصروفات</div>'}</div>`;
 S.staff=`<div class="card"><h2>👥 نشاط الموظفين</h2>${prSum()}${db.users.filter(u=>u.active!==false).map(u=>({u,n:A.filter(e=>e.by==u.id&&!e.au).length,l:A.find(e=>e.by==u.id)})).map(x=>`<div class="item"><div class="main"><div class="t"><span class="pd" data-pu="${x.u.id}"></span> ${esc(x.u.name)} <span class="pt" data-pt="${x.u.id}" style="font-size:12px;color:var(--mut);font-weight:400"></span></div><div class="s">${x.l?'آخر عملية: '+esc(x.l.t):'لسه مفيش عمليات'}</div></div><div class="num">${x.n}</div></div>`).join('')||'<div class="empty">مفيش مستخدمين</div>'}</div>`;
 S.low=`<div class="card"><h2>الأصناف الناقصة</h2>${s.low.length?s.low.map(p=>`<div class="item" onclick="location.hash='#/product/${p.id}'"><div class="main"><div class="t">${esc(p.name)}</div></div><div class="num neg">${fmt(p.stock)}</div></div>`).join(''):'<div class="empty">كله تمام 👌</div>'}</div>`;
 setTimeout(animDash,60);
 const D=dashPrefs();
 return D.o.filter(k=>!D.h.includes(k)&&S[k]).map((k,i)=>`<div class="dw" style="animation-delay:${i*45}ms">${S[k]}</div>`).join('')+`<button class="btn sec noprint" onclick="location.hash='#/dashset'">⚙️ ترتيب وإظهار أقسام اللوحة</button>`};

/* ---------- ترتيب وإخفاء أقسام اللوحة (بيتحفظ على الجهاز) ---------- */
/* ===== الحضور (أونلاين/أوفلاين) - مفتاح منفصل عشان نبضات القلب متعملش إعادة رسم ===== */
const PRES_ON=45000;
function prRead(){try{return JSON.parse(localStorage.getItem('kt_pres')||'{}')}catch(e){return {}}}
function prBeat(off){if(!db||!db.me)return;const p=prRead();p[db.me]={ts:Date.now(),off:!!off};try{localStorage.setItem('kt_pres',JSON.stringify(p))}catch(e){}}
function prOn(id){const x=prRead()[id];return !!x&&!x.off&&Date.now()-x.ts<PRES_ON}
function prAgo(ts){const d=Math.max(0,Date.now()-ts),m=Math.floor(d/6e4);if(m<1)return 'من لحظات';if(m<60)return 'من '+m+' دقيقة';const h=Math.floor(m/60);if(h<24)return 'من '+h+' ساعة';return 'من '+Math.floor(h/24)+' يوم'}
function prSum(){const U=db.users.filter(u=>u.active!==false),n=U.filter(u=>prOn(u.id)).length;return `<div class="prs" style="font-size:13px;margin-bottom:6px"><span style="color:hsl(142,70%,36%)">● ${n} أونلاين</span> &nbsp; <span style="color:var(--mut)">○ ${U.length-n} أوفلاين</span></div>`}
function prPaint(){const p=prRead();document.querySelectorAll('[data-pu]').forEach(e=>{const id=e.dataset.pu,on=prOn(id);e.style.cssText='display:inline-block;width:10px;height:10px;border-radius:50%;background:'+(on?'hsl(142,70%,36%)':'#9ca3af')+';'+(on?'box-shadow:0 0 0 3px hsla(142,70%,36%,.25)':'')});
 document.querySelectorAll('[data-pt]').forEach(e=>{const id=e.dataset.pt,on=prOn(id),x=p[id];e.textContent=on?'أونلاين':(x?'أوفلاين · آخر ظهور '+prAgo(x.ts):'أوفلاين')});
 document.querySelectorAll('.prs').forEach(e=>{e.outerHTML=prSum()})}
const DASH_SECS={greet:'👋 التحية',hero:'📊 مبيعات اليوم والرسم',quick:'⚡ اختصارات سريعة',gauges:'🎯 مؤشرات الأداء',kpis:'💰 الحركة المالية',counts:'🔢 الأعداد',notes:'🔔 إشعارات المدير',recent:'🕘 آخر العمليات',trans:'🚚 آخر تحويلات المخازن',exps:'💸 آخر المصروفات',staff:'👥 نشاط الموظفين',low:'📉 الأصناف الناقصة'};
function dashPrefs(){let d={};try{d=JSON.parse(localStorage.getItem('kt_dash')||'{}')}catch(e){}const all=Object.keys(DASH_SECS);const o=(d.o||[]).filter(k=>all.includes(k));all.forEach(k=>{if(!o.includes(k))o.push(k)});return{o,h:(d.h||[]).filter(k=>all.includes(k))}}
const dashSave=d=>localStorage.setItem('kt_dash',JSON.stringify(d));
function dashMove(k,dir){const d=dashPrefs(),i=d.o.indexOf(k),j=i+dir;if(j<0||j>=d.o.length)return;[d.o[i],d.o[j]]=[d.o[j],d.o[i]];dashSave(d);route()}
function dashTog(k){const d=dashPrefs();d.h=d.h.includes(k)?d.h.filter(x=>x!==k):[...d.h,k];dashSave(d);route()}
function dashReset(){localStorage.removeItem('kt_dash');route()}
function animDash(){document.querySelectorAll('.rv[data-p]').forEach(e=>{e.style.strokeDashoffset=163.4*(1-e.dataset.p/100)});document.querySelectorAll('.pgt i[data-w]').forEach(e=>{e.style.width=e.dataset.w+'%'})}
R['/dashset']=()=>{head('ترتيب لوحة المدير',true);const D=dashPrefs();
 return `<div class="card"><div class="s" style="font-size:12.5px;color:var(--mut);margin-bottom:8px">رتّب الأقسام بالأسهم، وشغّل أو اقفل أي قسم. بيتحفظ على الجهاز ده.</div>${D.o.map((k,i)=>`<div class="dsr ${D.h.includes(k)?'off':''}"><label class="sw"><input type="checkbox" ${D.h.includes(k)?'':'checked'} onchange="dashTog('${k}')"><i></i></label><span>${DASH_SECS[k]}</span><button onclick="dashMove('${k}',-1)" ${i?'':'disabled'}>▲</button><button onclick="dashMove('${k}',1)" ${i<D.o.length-1?'':'disabled'}>▼</button></div>`).join('')}<button class="btn sec" onclick="dashReset()">↩ رجوع للترتيب الأصلي</button><button class="btn" onclick="location.hash='#/'">تمام ✔</button></div>`};



/* =====================================================================
   المخازن: حركة الصنف (وارد / منصرف / رصيد) + إذن التحويل وتأكيد الاستلام
   ===================================================================== */
function pEvents(pid,loc){const e=[];const q=(l,x)=>x.items.filter(i=>i.pid==pid).reduce((a,i)=>a+i.qty,0);const ok=l=>!loc||l===loc;
 const add=(d,t,desc,i,o,l)=>{if(ok(l)&&(i||o))e.push({d,t,desc,in:i,out:o})};
 db.purchases.forEach(x=>add(x.date,x.ts,'شراء #'+x.no,q(0,x),0,x.loc));
 db.invoices.forEach(x=>add(x.date,x.ts||x.id,'بيع #'+x.no,0,q(0,x),x.loc||'w1'));
 db.rets.forEach(x=>x.k==='sret'?add(x.date,x.ts,'مرتجع مبيعات #'+x.no,q(0,x),0,x.loc):add(x.date,x.ts,'مرتجع مشتريات #'+x.no,0,q(0,x),x.loc));
 db.adjs.forEach(x=>x.items.filter(i=>i.pid==pid).forEach(i=>add(x.date,x.ts,'جرد/تسوية #'+x.no,i.diff>0?i.diff:0,i.diff<0?-i.diff:0,x.loc)));
 db.trans.forEach(x=>{const n=q(0,x);add(x.date,x.ts,'تحويل #'+x.no+' إلى '+locName(x.to),0,n,x.loc);add(x.date,x.ts,'تحويل #'+x.no+' من '+locName(x.loc),n,0,x.to)});
 e.sort((a,b)=>(a.d||'').localeCompare(b.d||'')||a.t-b.t);return e}
let PM={loc:'',from:'',to:''};
R['/pmove']=id=>{const p=prod(id);if(!p)return nf();head('حركة صنف',true);const cur=PM.loc?qtyAt(PM.loc,p.id):allLocs().reduce((a,l)=>a+qtyAt(l,p.id),0);
 const evAll=pEvents(p.id,PM.loc),sm=a=>a.reduce((t,x)=>t+x.in-x.out,0),ev=evAll.filter(x=>(!PM.from||x.d>=PM.from)&&(!PM.to||x.d<=PM.to));let bal=cur-sm(evAll)+sm(evAll.filter(x=>PM.from&&x.d<PM.from));const op=bal;
 return `<div class="card noprint"><div class="row2"><div><label>من تاريخ</label><input type="date" value="${PM.from||''}" onchange="PM.from=this.value;route()"></div><div><label>إلى تاريخ</label><input type="date" value="${PM.to||''}" onchange="PM.to=this.value;route()"></div></div><label>المخزن / السيارة</label><select onchange="PM.loc=this.value;route()">${selOpts(allLocs().map(l=>[l,locName(l)]),PM.loc,'كل الأماكن')}</select></div>
 <div class="card out"><h2>حركة: ${esc(p.name)}</h2><div class="s" style="color:var(--mut)">${PM.loc?esc(locName(PM.loc)):'كل الأماكن'} · الرصيد الحالي ${fmt(cur)} ${esc(unitT(p))}</div>
 ${rtbl(['التاريخ','البيان','وارد','منصرف','الرصيد'],[['',"رصيد افتتاحي",'','',fmt(op)]].concat(ev.map(x=>{bal+=x.in-x.out;return[x.d.slice(5),esc(x.desc),x.in?fmt(x.in):'',x.out?fmt(x.out):'',fmt(bal)]})))}</div>`};
const R_REC=R['/rec'];
R['/rec']=(k,qs)=>{let h=R_REC(k,qs);if(k!=='tr')return h;const id=location.hash.split('/')[3],r=db.trans.find(x=>x.id==id);if(!r)return h;
 const st=r.st==='received'?`<span class="pill">✅ تم الاستلام</span> ${esc(uname(r.rcv.by))} · ${new Date(r.rcv.ts).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}`:`<span class="pill bad">⏳ في انتظار تأكيد الاستلام</span>`;
 return `<div class="card noprint"><h2>إذن تحويل #${r.no}</h2><div class="stat"><span>حالة التحويل</span><b>${st}</b></div><div class="stat"><span>أمر بالتحويل</span><b>${esc(uname(r.by))}</b></div>${r.st==='received'?'':`<button class="btn" data-need="stock.transfer" onclick="rcvTr(${r.id})">✅ تأكيد الاستلام في ${esc(locName(r.to))}</button>`}</div>`+h.replace('<table>',`<div class="s" style="margin:6px 0">الحالة: ${r.st==='received'?'تم الاستلام':'في انتظار الاستلام'} · المنفذ: ${esc(uname(r.by))}</div><table>`)};
function rcvTr(id){const r=db.trans.find(x=>x.id==id);if(!r||r.st==='received')return;r.st='received';r.rcv={by:db.me,ts:Date.now()};audit('استلام تحويل','#'+r.no+' في '+locName(r.to));save();route()}

/* ---------- إجماليات العميل + كل فواتيره ---------- */
function custTotals(c,inv){const buy=inv.reduce((a,i)=>a+i.total,0),paid=inv.reduce((a,i)=>a+i.paid,0)+db.payments.filter(p=>p.cid==c.id).reduce((a,p)=>a+p.amount,0);
 return `<div class="card" data-need="customers.statement"><h2>إجماليات ${esc(c.name)}</h2>${c.gov||c.area?`<div class="stat"><span>المحافظة / المنطقة</span><b>${esc([c.gov,c.area].filter(Boolean).join(' - '))}</b></div>`:''}${c.rep?`<div class="stat"><span>المندوب المسؤول</span><b>${esc(uname(c.rep))}</b></div>`:''}${c.notes?`<div class="stat"><span>ملاحظات</span><b>${esc(c.notes)}</b></div>`:''}
 <div class="stat"><span>إجمالي المشتريات</span><b>${fmt(buy)} ج.م</b></div><div class="stat"><span>إجمالي المدفوع</span><b>${fmt(paid)} ج.م</b></div><div class="stat"><span>المتبقي عليه</span><b class="${c.balance>0?'neg':''}">${fmt(c.balance)} ج.م</b></div>
 <h2 style="margin-top:12px">فواتير العميل (${inv.length})</h2>${inv.map(i=>`<div class="item" onclick="location.hash='#/invoice/${i.id}'"><div class="main"><div class="t">فاتورة #${i.no}</div><div class="s">${i.date} · ${i.rem>0?'آجل':'كاش'}</div></div><div class="num">${fmt(i.total)}</div></div>`).join('')||'<div class="empty">مفيش فواتير</div>'}</div>`}

/* ---------- شاشة أداء المندوب: مبيعاته وفواتيره وتحصيلاته وديون عملائه ---------- */
const R_REP=R['/rep'];
R['/rep']=id=>{let h=R_REP(id);const u=db.users.find(x=>x.id==id);if(!u)return h;const m=repM,inM=d=>d.startsWith(m);
 const inv=db.invoices.filter(i=>i.by==u.id&&inM(i.date)).reverse(),cols=db.payments.filter(x=>x.by==u.id&&inM(x.date)),cs=db.customers.filter(c=>c.rep==u.id);
 return h+`<div class="card"><h2>📈 أداء ${esc(u.name)} - ${m}</h2>${u.phone?`<div class="stat"><span>التليفون</span><b>${esc(u.phone)}</b></div>`:''}${u.addr?`<div class="stat"><span>العنوان</span><b>${esc(u.addr)}</b></div>`:''}<div class="stat"><span>المكان المسؤول عنه</span><b>${esc((u.locs||[]).map(locName).join('، ')||'كل الأماكن')}</b></div>
 <div class="stat"><span>عدد الفواتير</span><b>${inv.length}</b></div><div class="stat"><span>إجمالي مبيعاته</span><b>${fmt(inv.reduce((a,i)=>a+i.total,0))}</b></div><div class="stat"><span>تحصيلاته من العملاء</span><b>${fmt(cols.reduce((a,x)=>a+x.amount,0))}</b></div><div class="stat"><span>ديون عملائه</span><b class="neg">${fmt(cs.reduce((a,c)=>a+Math.max(0,c.balance||0),0))}</b></div></div>
 <div class="card"><h2>فواتيره</h2>${inv.map(i=>`<div class="item" onclick="location.hash='#/invoice/${i.id}'"><div class="main"><div class="t">فاتورة #${i.no} - ${esc(cname(i.cid))}</div><div class="s">${i.date}</div></div><div class="num">${fmt(i.total)}</div></div>`).join('')||'<div class="empty">مفيش فواتير في الشهر ده</div>'}</div>
 <div class="card"><h2>عملاؤه وديونهم (${cs.length})</h2>${cs.map(c=>`<div class="item" onclick="location.hash='#/customer/${c.id}'"><div class="main"><div class="t">${esc(c.name)}</div></div><div class="num ${c.balance>0?'neg':''}">${fmt(c.balance)}</div></div>`).join('')||'<div class="empty">مفيش عملاء مربوطين بالمندوب. اربطهم من شاشة العميل.</div>'}</div>`};

