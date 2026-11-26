/* خالد تريد - الدخول · التوجيه (route) · تشغيل البرنامج
   جزء من برنامج حسابات خالد تريد. شوف README.md لتوزيع الملفات. */
/* ---------- شاشة الدخول (لما يتحط باسورد لأي مستخدم) ---------- */
/* =====================================================================
   تسليم الفلوس (عهدة): المندوب بيسجل إنه سلّم فلوس لمستخدم (مدير/محاسب/أي حد)،
   بتظهر "في انتظار التأكيد"، والمستلم بيأكد الاستلام من السيستم (أو يرفض مع السبب).
   db.hand = [{id,date,ts,from,to,amount,note,st:'pending|received|rejected',cts,cnote}]
   دلوقتي: التأكيد جوه نفس الجهاز/النظام. للسيرفر: كل التغييرات بتعدي على handSend/handOk/handNo
   (نقطة واحدة)، فالإشعار على جهاز المستلم والمزامنة بيتضافوا هناك من غير تغيير في الشاشات.
   ===================================================================== */
const HSTAT={pending:['⏳ في انتظار التأكيد','warn'],received:['✅ تم الاستلام',''],rejected:['❌ مرفوض','bad']};
const handOn=()=>!!(db.settings&&db.settings.hand);
const hList=()=>(db.hand=db.hand||[]);
const hUsers=()=>db.users.filter(u=>u.active!==false);
const hRow=(h,me_)=>{const s=HSTAT[h.st]||HSTAT.pending,mine=h.to==me_&&h.st==='pending';
 return `<div class="item" style="align-items:flex-start"><div class="main"><div class="t">${fmt(h.amount)} ج.م <span class="pill ${s[1]}">${s[0]}</span></div><div class="s">من ${esc(uname(h.from))} إلى ${esc(uname(h.to))} · ${esc(h.date)}${h.note?' · '+esc(h.note):''}</div>${h.st==='received'?`<div class="s">اتأكد ${esc(fdt(h.cts))}</div>`:''}${h.st==='rejected'?`<div class="s" style="color:var(--red)">السبب: ${esc(h.cnote||'—')}</div>`:''}</div>
 ${mine?`<div style="display:flex;flex-direction:column;gap:6px"><button class="mvb" style="background:#dee7f5;color:#1d437c" onclick="handOk(${+h.id})">✅ استلمت</button><button class="mvb" onclick="handNo(${+h.id})">❌ رفض</button></div>`:(h.st==='pending'&&(h.from==me_||can('users.manage'))?`<button class="mvb" onclick="handDel(${+h.id})">إلغاء</button>`:'')}</div>`};
const _rH=R['/hand']=()=>{if(!handOn())return head('تسليم الفلوس'),`<div class="card"><h2>الخدمة متوقفة</h2><div class="s" style="color:var(--mut)">${can('users.manage')?'فعّلها من الإعدادات ← تسليم الفلوس.':'المدير موقّف الخدمة دي دلوقتي.'}</div></div>`;head('تسليم الفلوس');const m=db.me,adm=can('users.manage'),L=hList().filter(h=>adm||h.from==m||h.to==m).slice().reverse(),pend=L.filter(h=>h.st==='pending'),pa=pend.reduce((a,h)=>a+h.amount,0),td=L.filter(h=>h.st==='received'&&h.date===today()).reduce((a,h)=>a+h.amount,0);
 const others=hUsers().filter(u=>u.id!=m);
 return `<div class="kpis"><div class="kpi"><span>معلق</span><b>${fmt(pa)}</b></div><div class="kpi"><span>اتأكد النهارده</span><b>${fmt(td)}</b></div></div>
 <div class="card"><h2>🤝 تسجيل تسليم فلوس</h2>${adm?`<label>من (المسلّم)</label><select id="h_f">${hUsers().map(u=>`<option value="${+u.id}" ${u.id==m?'selected':''}>${esc(u.name)}</option>`).join('')}</select>`:''}<label>إلى (المستلم)</label><select id="h_t">${others.map(u=>`<option value="${+u.id}">${esc(u.name)}</option>`).join('')||'<option value="">مفيش مستخدمين تانيين</option>'}</select>
 <div class="row2"><div><label>المبلغ</label><input id="h_a" type="number" inputmode="decimal" min="0"></div><div><label>ملاحظة</label><input id="h_n" placeholder="اختياري"></div></div><button class="btn" onclick="handSend()">إرسال للتأكيد</button><div class="s" style="font-size:12px;color:var(--mut);margin-top:8px">المستلم بيأكد الاستلام من حسابه. التنبيه على موبايله هيشتغل في مرحلة السيرفر.</div></div>
 <div class="card"><h2>السجل</h2>${L.map(h=>hRow(h,m)).join('')||'<div class="empty">مفيش تسليمات</div>'}</div>`};
function handSend(){const m=db.me,f=can('users.manage')&&$('#h_f')?+$('#h_f').value:m,t=+$('#h_t').value,a=+$('#h_a').value;if(!t||t===f)return toast('اختار المستلم');if(!(a>0))return toast('اكتب المبلغ');
 const h={id:(db.seq.hand=(db.seq.hand||0)+1),date:today(),ts:Date.now(),from:f,to:t,amount:a,note:($('#h_n').value||'').trim().slice(0,200),st:'pending'};hList().push(h);try{notify('💵 تسليم فلوس '+fmt(a)+' من '+uname(f)+' إلى '+uname(t)+' (في انتظار التأكيد)');audit('تسليم فلوس',fmt(a)+' → '+uname(t))}catch(e){}save();toast('اتبعت للمستلم ✅');route()}
function handOk(id){const h=hList().find(x=>x.id==id);if(!h||h.to!=db.me||h.st!=='pending')return toast('مش مسموح');h.st='received';h.cts=Date.now();try{notify('✅ '+uname(h.to)+' استلم '+fmt(h.amount)+' من '+uname(h.from));audit('تأكيد استلام فلوس',fmt(h.amount))}catch(e){}save();toast('اتأكد الاستلام ✅');route()}
function handNo(id){const h=hList().find(x=>x.id==id);if(!h||h.to!=db.me||h.st!=='pending')return toast('مش مسموح');const r=prompt('سبب الرفض (اختياري):');if(r===null)return;h.st='rejected';h.cts=Date.now();h.cnote=String(r).slice(0,200);try{notify('❌ '+uname(h.to)+' رفض استلام '+fmt(h.amount)+' من '+uname(h.from));audit('رفض استلام فلوس',fmt(h.amount))}catch(e){}save();route()}
function handDel(id){const h=hList().find(x=>x.id==id);if(!h||h.st!=='pending'||(h.from!=db.me&&!can('data.delete')))return toast('مش مسموح');if(!confirm('تلغي التسليم ده؟'))return;db.hand=db.hand.filter(x=>x.id!=id);save();route()}
/* متابعات الشاشة الرئيسية: العهدة المنتظرة تأكيدي (وتسليماتي المعلقة) */
const _dHd=R['/'];R['/']=()=>{const h=_dHd(),m=db.me,inc=hList().filter(x=>x.to==m&&x.st==='pending'),out=hList().filter(x=>x.from==m&&x.st==='pending');if(!handOn()||(!inc.length&&!out.length))return h;
 const c=`<div class="card" style="border:1.5px solid #f0c36b;background:#fffaf0"><h2>🤝 متابعة: تسليم الفلوس</h2>${inc.map(x=>hRow(x,m)).join('')}${out.length?`<div class="s" style="color:var(--mut);padding-top:6px">عندك ${out.length} تسليم مستني تأكيد المستلم (${fmt(out.reduce((a,x)=>a+x.amount,0))} ج.م)</div>`:''}<a class="btn sec" href="#/hand" style="display:block;text-align:center;text-decoration:none">فتح كل التسليمات</a></div>`;
 /* بعد لوحة الملاحظات لو موجودة: نحطها في أول الصفحة والملاحظات بتتحط فوقها بعدين */
 return c+h};
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['🤝','تسليم الفلوس','#/hand','sales.add,cash.view,expenses.add,customers.collect,reports.view','المندوب يسلّم والمستلم يأكد'])})();
ROUTE_PERM['/hand']=null;
function demoHand(){const dd=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)},tsOf=(d,h)=>new Date(d+'T'+String(h).padStart(2,'0')+':00:00').getTime();const us=db.users;db.settings.hand=true;if(us.length<2)return;const a=us.find(u=>u.emp)||us[1],b=us[0];[[a,b,4500,'تحصيل يوم السبت','received',-3],[a,b,2800,'تحصيل النهارده','pending',0],[us[2]||a,b,1200,'مبيعات كاش','rejected',-1]].forEach(([f,t,m,n,st,d])=>{if(f.id===t.id)return;const dt=dd(d);hList().push({id:(db.seq.hand=(db.seq.hand||0)+1),date:dt,ts:tsOf(dt,15),from:f.id,to:t.id,amount:m,note:n,st,cts:st==='pending'?undefined:tsOf(dt,17),cnote:st==='rejected'?'الرقم ناقص':''})})}

/* إعداد تفعيل/إيقاف تسليم الفلوس (للمدير فقط) */
const _rsHd=R['/settings'];R['/settings']=()=>{const h=_rsHd();if(!can('users.manage'))return h;const on=handOn();
 return h+`<div class="card"><h2>🤝 تسليم الفلوس</h2><div class="stat"><span>الخدمة دلوقتي</span><b style="color:${on?'#1c4b92':'#b33'}">${on?'شغّالة':'موقوفة'}</b></div><div class="s" style="color:var(--mut);padding:6px 0">لما تتوقف: بتختفي من المزيد ومن متابعات الرئيسية، والبيانات القديمة بتفضل محفوظة.</div><button class="btn ${on?'del':'sec'}" onclick="handToggle()">${on?'⏸ إيقاف الخدمة':'▶ تفعيل الخدمة'}</button></div>`};
function handToggle(){if(!can('users.manage'))return toast('للمدير فقط');db.settings.hand=!handOn();try{audit(db.settings.hand?'تفعيل تسليم الفلوس':'إيقاف تسليم الفلوس','')}catch(e){}save();toast(db.settings.hand?'اتفعّلت ✅':'اتوقفت');route()}


/* ---------- تنبيهات ذكية في الرئيسية + تذكير النسخة الاحتياطية ----------
   كارت واحد قدام عين المدير: نواقص/إعادة طلب، صلاحية قربت، عميل عدّى الحد الائتماني.
   تنبيه فقط (من غير إنشاء أمر شراء). النسخة الاحتياطية: db.settings.bk = أيام الدورة (0 = موقوف). */
const alRow=(ic,t,n,names,href)=>`<a href="${href}" class="item" style="text-decoration:none;color:inherit"><div class="main"><div class="t">${ic} ${t} <b style="color:#c0392b">(${n})</b></div><div class="s">${names.slice(0,3).map(esc).join('، ')}${names.length>3?' …':''}</div></div><span class="s">›</span></a>`;
function alertsCard(){
 const rows=[],stk=can('reports.view')||can('stock.adjust')||can('products.edit');
 if(stk){
  const low=db.products.filter(p=>+p.min>0&&+p.stock<=+p.min);
  if(low.length)rows.push(alRow('📉','وصل للحد الأدنى: محتاج إعادة طلب',low.length,low.map(p=>p.name+' ('+fmt(p.stock)+')'),'#/reports" onclick="RP.t=\'low\''));
  let ex=[];try{ex=db.products.filter(p=>{const x=expState(p);return x&&x.c})}catch(e){}
  if(ex.length)rows.push(alRow('⏳','صلاحية قربت أو خلصت',ex.length,ex.map(p=>p.name+' ('+expState(p).t+')'),'#/reports" onclick="RP.t=\'expiry\''))}
 if(can('customers.collect')||can('reports.view')){
  const ov=db.customers.filter(c=>{recalc(c);return +c.limit>0&&c.balance>c.limit});
  if(ov.length)rows.push(alRow('⛔','عملاء عدّوا الحد الائتماني',ov.length,ov.map(c=>c.name+' ('+fmt(c.balance)+')'),'#/customers'))}
 return rows.length?`<div class="card" style="border:1.5px solid #e8a0a0;background:#fff7f6"><h2>🔔 متابعات وتنبيهات</h2>${rows.join('')}</div>`:''}
const bkDays=()=>+((db.settings||{}).bk)||0;
function bkDue(){const d=bkDays();if(!d||DEMO||!Auth.on())return null;const l=db.settings.lastBackup;if(!l)return{late:true,txt:'لسه ماعملتش نسخة احتياطية'};const n=Math.floor((new Date(today()+'T12:00:00')-new Date(l+'T12:00:00'))/864e5);return n>=d?{late:n>d,txt:'آخر نسخة من '+n+' يوم ('+l+')'}:null}
function bkCard(){const b=bkDue();if(!b||!can('users.manage'))return '';return `<div class="card" style="border:1.5px solid #f0c36b;background:#fffaf0"><h2>💾 وقت النسخة الاحتياطية</h2><div class="s" style="padding:4px 0 8px;color:var(--mut)">${b.txt}${b.late?' ⚠️ اتأخرت':''}</div><button class="btn" onclick="backupExport()">⬇️ نزّل النسخة المشفرة دلوقتي</button></div>`}
const _dAl=R['/'];R['/']=()=>{const h=_dAl();return bkCard()+alertsCard()+h};
const _rsAl=R['/settings'];R['/settings']=()=>{const h=_rsAl();if(!can('users.manage')||DEMO)return h;const d=bkDays();
 return h+`<div class="card"><h2>💾 تذكير النسخة الاحتياطية</h2><label>كل قد إيه يفكّرك؟</label><select onchange="db.settings.bk=+this.value;save();toast('اتحفظ ✅');route()">${[[0,'موقوف'],[1,'كل يوم'],[7,'كل أسبوع'],[30,'كل شهر']].map(([v,t])=>`<option value="${v}" ${d==v?'selected':''}>${t}</option>`).join('')}</select><div class="s" style="color:var(--mut);padding-top:6px">المتصفح مايقدرش ينزّل ملف لوحده والتطبيق مقفول، فبيظهر كارت في الرئيسية بزرار واحد. النسخة التلقائية على سيرفر جاية في مرحلة السيرفر.</div></div>`};
function demoAlerts(){const p=db.products;if(p[0]){p[0].min=Math.max(+p[0].min||0,(+p[0].stock||0)+5)}if(p[1]&&!p[1].exp){const x=new Date();x.setDate(x.getDate()+12);p[1].exp=x.toISOString().slice(0,10)}const c=db.customers[0];if(c&&!(+c.limit>0)){recalc(c);c.limit=Math.max(1,Math.floor((c.balance||0)/2))}}


/* ---------- سند قبض وسند صرف ----------
   db.vch = [{id,no,k:'in'|'out',date,ts,by(المستلم/الدافع),pk:'c'|'s',pid,amount,acct,note}]
   السند بيسجّل نفسه في دفتر العميل (payments) أو المورد (spay) بنفس الخزنة، فالأرصدة بتتظبط لوحدها. */
const vTaf=n=>{n=Math.round(+n||0);if(!n)return 'صفر';const U=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'],T=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'],H=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
 const b=x=>{const p=[],h=Math.floor(x/100),r=x%100;if(h)p.push(H[h]);if(r){if(r<20)p.push(U[r]);else{const o=r%10;p.push((o?U[o]+' و':'')+T[Math.floor(r/10)])}}return p.join(' و')};
 const g=[[1e9,'مليار','ملياران','مليارات'],[1e6,'مليون','مليونان','ملايين'],[1e3,'ألف','ألفان','آلاف']],o=[];let x=n;
 g.forEach(([v,s,d,m])=>{const q=Math.floor(x/v);if(q){x%=v;o.push(q===1?s:q===2?d:q<=10?b(q)+' '+m:b(q)+' '+s)}});if(x)o.push(b(x));return o.join(' و')};
const vPlace=(v)=>v.pk==='s'?sname(v.pid):cname(v.pid);
const vNo=v=>(v.k==='in'?'ق-':'ص-')+String(v.no).padStart(4,'0');
const vOK=k=>k==='in'?['customers.collect','cash.view','sales.add'].some(can):['cash.view','expenses.add','suppliers.view'].some(can);
const vList=()=>(db.vch=db.vch||[]);
R['/vchs']=()=>{head('سندات القبض والصرف',true);const L=vList().slice().reverse();
 return `<div class="card noprint" style="display:flex;gap:8px">${vOK('in')?'<button class="btn" style="flex:1" onclick="location.hash=\'#/vchnew/in\'">＋ سند قبض</button>':''}${vOK('out')?'<button class="btn sec" style="flex:1" onclick="location.hash=\'#/vchnew/out\'">＋ سند صرف</button>':''}</div>
 <div class="card"><h2>آخر السندات</h2>${L.length?L.slice(0,80).map(v=>`<div class="item" onclick="location.hash='#/vch/${v.id}'"><div class="main"><div class="t">${v.k==='in'?'📥 قبض':'📤 صرف'} ${vNo(v)} · ${esc(vPlace(v))}</div><div class="s">${v.date} · ${esc(accName(v.acct||0))}</div></div><div class="num">${fmt(v.amount)}</div></div>`).join(''):'<div class="empty">مفيش سندات لسه</div>'}</div>`};
R['/vchnew']=k=>{k=k==='out'?'out':'in';if(!vOK(k))return nf();head(k==='in'?'سند قبض جديد':'سند صرف جديد',true);V2();
 const ps=k==='in'?db.customers:db.suppliers,us=db.users.filter(u=>u.active!==false);
 return `<div class="card"><label>التاريخ</label><input type="date" id="v_d" value="${today()}">
 <label>${k==='in'?'استلمنا من (العميل)':'دفعنا إلى (المورد)'}</label><input id="v_p" list="v_pl" autocomplete="off" placeholder="اكتب اسم ${k==='in'?'العميل':'المورد'}"><datalist id="v_pl">${ps.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
 <label>المبلغ (ج.م)</label><input type="number" inputmode="decimal" id="v_a" placeholder="0">
 <label>${k==='in'?'الخزنة اللي دخل فيها':'الخزنة اللي خرج منها'}</label><select id="v_t">${accOpts('')}</select>
 <label>${k==='in'?'اللي استلم':'اللي دفع'}</label><select id="v_u">${us.map(u=>`<option value="${u.id}" ${u.id==db.me?'selected':''}>${esc(u.name)}</option>`).join('')}</select>
 <label>البيان (اختياري)</label><input id="v_n" placeholder="مثال: دفعة من الحساب">
 <button class="btn" onclick="vSave('${k}')">حفظ السند</button></div>`};
function vSave(k){if(!vOK(k))return toast('مش مسموح');const ps=k==='in'?db.customers:db.suppliers,nm=$('#v_p').value.trim(),p=ps.find(x=>x.name===nm),a=+$('#v_a').value;
 if(!p)return toast('اختار '+(k==='in'?'العميل':'المورد')+' من القايمة');if(!(a>0))return toast('اكتب مبلغ صحيح');
 const acct=+$('#v_t').value||0,by=+$('#v_u').value||db.me,date=$('#v_d').value||today(),note=$('#v_n').value.trim(),id=nid('vch'),no=nid(k==='in'?'vin':'vout');
 if(k==='out'&&acct){const A=db.accts.find(x=>x.id==acct);if(A&&accBal(A)<a&&!confirm('رصيد '+A.name+' أقل من المبلغ. تكمل؟'))return}
 const v={id,no,k,date,ts:Date.now(),by,pk:k==='in'?'c':'s',pid:p.id,amount:a,acct,note};vList().push(v);
 const n=(k==='in'?'سند قبض ':'سند صرف ')+vNo(v)+(note?' - '+note:'');
 if(k==='in'){const r={id:++db.seq.pay,cid:p.id,date,ts:v.ts,by,amount:a,note:n,vch:id};if(acct)r.acct=acct;db.payments.push(r);recalc(p)}
 else{const r={id:nid('spay'),sid:p.id,date,ts:v.ts,by,amount:a,note:n,vch:id};if(acct)r.acct=acct;db.spay.push(r)}
 try{audit('إنشاء '+(k==='in'?'سند قبض':'سند صرف'),vNo(v)+' '+fmt(a))}catch(e){}save();toast('اتحفظ ✅');location.hash='#/vch/'+id}
R['/vch']=id=>{const v=vList().find(x=>x.id==id);if(!v)return nf();head((v.k==='in'?'سند قبض ':'سند صرف ')+vNo(v),true);const st=db.settings,u=db.users.find(x=>x.id==v.by);
 const row=(l,t)=>`<div class="stat"><span>${l}</span><b>${t}</b></div>`;
 return `<div class="card out" id="vdoc" style="text-align:center"><h2 style="margin:12px 0;border:2px solid var(--g3);border-radius:10px;padding:6px">${v.k==='in'?'سند قبض نقدية':'سند صرف نقدية'}</h2>
 <div style="text-align:right">${row('رقم السند',vNo(v))}${row('التاريخ',v.date)}${row(v.k==='in'?'استلمنا من':'دفعنا إلى',esc(vPlace(v)))}${row('المبلغ',fmt(v.amount)+' ج.م')}<div class="s" style="padding:4px 0">فقط ${vTaf(v.amount)} جنيهًا مصريًا لا غير</div>${row(v.k==='in'?'دخلت خزنة':'خرجت من خزنة',esc(accName(v.acct||0)))}${row(v.k==='in'?'المستلم':'الدافع',esc(u?u.name:'—'))}${v.note?row('البيان',esc(v.note)):''}</div>
 <div style="display:flex;justify-content:space-around;padding:26px 0 6px"><div>${v.k==='in'?'توقيع المستلم':'توقيع الدافع'}<br><br>……………</div><div>${v.k==='in'?'توقيع المسلِّم':'توقيع المستلِم'}<br><br>……………</div></div></div>
 ${can('users.manage')?`<button class="btn del noprint" onclick="vDel(${+v.id})">🗑️ إلغاء السند (بيتشال من الحسابات)</button>`:''}`};
function vDel(id){if(!can('data.delete'))return toast('🔒 إلغاء السند محتاج صلاحية من المدير');const v=vList().find(x=>x.id==id);if(!v||!confirm('تلغي السند ده وتشيله من الحسابات؟'))return;
 db.payments=db.payments.filter(x=>x.vch!=id);db.spay=db.spay.filter(x=>x.vch!=id);db.vch=db.vch.filter(x=>x.id!=id);if(v.k==='in'){const c=cust(v.pid);if(c)recalc(c)}
 try{audit('إلغاء سند',vNo(v))}catch(e){}save();toast('اتلغى');location.hash='#/vchs'}
const _ocV=outCtx;outCtx=function(){const s=location.hash.slice(1).split('?')[0].split('/').filter(Boolean);if(s[0]==='vch'){const v=vList().find(x=>x.id==s[1]);if(v){const c=v.pk==='c'?cust(v.pid):sup(v.pid);return{ph:c&&phones(c)[0],name:'سند-'+vNo(v),text:(v.k==='in'?'سند قبض ':'سند صرف ')+vNo(v)+'\n'+(db.settings.name||'')+'\n'+v.date+'\n'+(v.k==='in'?'استلمنا من: ':'دفعنا إلى: ')+vPlace(v)+'\nالمبلغ: '+fmt(v.amount)+' ج.م ('+vTaf(v.amount)+' جنيهًا)\nالخزنة: '+accName(v.acct||0)}}}return _ocV()};
ROUTE_PERM['/vchs']=null;ROUTE_PERM['/vchnew']=null;ROUTE_PERM['/vch']=null;
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['📥','سند قبض','#/vchnew/in','customers.collect,cash.view,sales.add','استلام نقدية من عميل'],['📤','سند صرف','#/vchnew/out','cash.view,expenses.add,suppliers.view','دفع نقدية لمورد'],['🗂️','سجل السندات','#/vchs','customers.collect,cash.view,expenses.add','كل سندات القبض والصرف'])})();
function demoVch(){if(!db.customers[0]||!db.suppliers[0])return;vList();const mk=(k,p,a,acct,d)=>{const id=nid('vch'),no=nid(k==='in'?'vin':'vout'),dt=(()=>{const x=new Date();x.setDate(x.getDate()+d);return x.toISOString().slice(0,10)})();db.vch.push({id,no,k,date:dt,ts:Date.now()+d*864e5,by:1,pk:k==='in'?'c':'s',pid:p.id,amount:a,acct,note:'تجريبي'})};mk('in',db.customers[0],3000,0,-2);mk('out',db.suppliers[0],5000,0,-1)}


/* ---------- مناطق وخطوط سير العملاء ----------
   c.area = اسم المنطقة/الخط (نص حر مع اقتراح من المناطق الموجودة). شاشة #/areas بتجمّع العملاء بالمنطقة مع مديونياتهم والمندوب. */
const areaList=()=>[...new Set(db.customers.map(c=>(c.area||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
const _rcAr=R['/customer'];R['/customer']=id=>{const h=_rcAr(id);if(id==='new'||!['customers.edit','customers.add','users.manage','customers.collect'].some(can))return h;const c=cust(id);if(!c)return h;
 return h+`<div class="card noprint"><h2>📍 المنطقة / خط السير</h2><input id="f_area" list="ar_l" value="${esc(c.area||'')}" placeholder="مثال: سيدي سالم" onchange="setArea(${+c.id},this.value)"><datalist id="ar_l">${areaList().map(a=>`<option value="${esc(a)}">`).join('')}</datalist><div class="s" style="color:var(--mut);padding-top:6px">بيتجمّع العملاء حسب المنطقة في شاشة "المناطق وخطوط السير".</div></div>`};
function setArea(id,v){const c=cust(id);if(!c)return;c.area=(v||'').trim();save();toast('اتحفظ ✅')}
R['/areas']=()=>{head('المناطق وخطوط السير',true);const m={};db.customers.filter(c=>!me().emp||c.rep==me().id||true).forEach(c=>{recalc(c);const a=(c.area||'').trim()||'بدون منطقة';(m[a]=m[a]||[]).push(c)});
 const keys=Object.keys(m).sort((a,b)=>a==='بدون منطقة'?1:b==='بدون منطقة'?-1:a.localeCompare(b,'ar'));
 if(!db.customers.length)return '<div class="card"><div class="empty">مفيش عملاء</div></div>';
 const rn=c=>{const u=db.users.find(x=>x.id==c.rep);return u?u.name:''};
 return keys.map(k=>{const L=m[k],tot=L.reduce((a,c)=>a+Math.max(0,c.balance||0),0);return `<div class="card out"><h2>📍 ${esc(k)} <span class="s" style="color:var(--mut)">(${L.length} عميل · مديونية ${fmt(tot)} ج.م)</span></h2>${L.sort((a,b)=>(b.balance||0)-(a.balance||0)).map(c=>`<div class="item" onclick="location.hash='#/customer/${c.id}'"><div class="main"><div class="t">${esc(c.name)}</div><div class="s">${esc(phones(c)[0]||'')}${rn(c)?' · مندوب: '+esc(rn(c)):''}</div></div><div class="num ${c.balance>0?'neg':''}">${fmt(c.balance||0)}</div></div>`).join('')}</div>`}).join('')};
ROUTE_PERM['/areas']=null;
(()=>{const g=MORE_GROUPS.find(x=>x.id==='par')||MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['📍','المناطق وخطوط السير','#/areas','customers.collect,customers.edit,reports.view,cash.view','العملاء مجمّعين بالمنطقة'])})();
function demoAreas(){const A=['سيدي سالم','دسوق','كفر الشيخ','فوه'];db.customers.forEach((c,i)=>{if(!c.area)c.area=A[i%A.length]})}

/* ---------- قوائم الأسعار: قطاعي / جملة / سعر خاص للعميل ----------
   الأولوية في الفاتورة: سعر خاص للعميل (c.sp) ثم سعر الجملة لو العميل "جملة" (c.tier='w' و p.wp) ثم السعر العادي. */
const _lpT=lastPrice;lastPrice=function(cid,pid){const c=cid&&cust(cid);if(c&&!(c.sp&&+c.sp[pid]>0)&&c.tier==='w'){const p=prod(pid);if(p&&+p.wp>0)return +p.wp}return _lpT(cid,pid)};
const _rpT=R['/product'];R['/product']=id=>{const h=_rpT(id);if(id==='new'||!can('products.edit'))return h;const p=prod(id);if(!p)return h;
 return h+`<div class="card noprint"><h2>💲 سعر الجملة</h2><label>سعر البيع لعملاء الجملة (فاضي = نفس السعر العادي)</label><input type="number" inputmode="decimal" value="${p.wp||''}" placeholder="${p.price||0}" onchange="setWp(${+p.id},this.value)"><div class="s" style="color:var(--mut);padding-top:6px">السعر العادي (قطاعي): ${fmt(p.price||0)} ج.م</div></div>`};
function setWp(id,v){const p=prod(id);if(!p)return;p.wp=+v||0;save();toast('اتحفظ ✅')}
const _rcT=R['/customer'];R['/customer']=id=>{const h=_rcT(id);if(id==='new'||!['customers.edit','customers.add','users.manage','customers.collect'].some(can))return h;const c=cust(id);if(!c)return h;
 return h+`<div class="card noprint"><h2>💲 قائمة الأسعار</h2><select onchange="setTier(${+c.id},this.value)"><option value="r" ${c.tier!=='w'?'selected':''}>قطاعي (السعر العادي)</option><option value="w" ${c.tier==='w'?'selected':''}>جملة (سعر الجملة للأصناف اللي ليها)</option></select><div class="s" style="color:var(--mut);padding-top:6px">السعر الخاص للصنف (تحت) بيغلب أي قائمة.</div></div>`};
function setTier(id,v){const c=cust(id);if(!c)return;c.tier=v==='w'?'w':'r';save();toast('اتحفظ ✅')}
function demoTiers(){db.products.forEach(p=>{if(!p.wp&&+p.price>0)p.wp=Math.round(p.price*0.93)});if(db.customers[1])db.customers[1].tier='w'}

/* ---------- إعداد ضريبة القيمة المضافة (للمدير) ---------- */
const _rsVat=R['/settings'];R['/settings']=()=>{const h=_rsVat();if(!can('users.manage'))return h;const on=!!db.settings.vat;
 return h+`<div class="card"><h2>🧾 ضريبة القيمة المضافة</h2><div class="stat"><span>الخيار في الفاتورة</span><b style="color:${on?'#1c4b92':'#b33'}">${on?'شغّال':'موقوف'}</b></div><label>نسبة الضريبة %</label><input type="number" inputmode="decimal" value="${+db.settings.vatRate||14}" onchange="db.settings.vatRate=+this.value||14;save();toast('اتحفظ ✅')"><button class="btn ${on?'del':'sec'}" onclick="db.settings.vat=!db.settings.vat;save();route()">${on?'⏸ إيقاف خيار الضريبة':'▶ تفعيل خيار الضريبة'}</button><div class="s" style="color:var(--mut);padding-top:6px">لما يتفعّل بتظهر في الفاتورة خانة "إضافة ضريبة" (اختيارية لكل فاتورة) وبتتطبع على الفاتورة.</div></div>`};

/* ---------- تقويم الاستحقاقات: شيكات واردة وصادرة + أقساط العملاء ---------- */
let CAL={m:'',sel:''};
function calEvents(){const E={};const A=(d,e)=>{if(!d)return;(E[d]=E[d]||[]).push(e)};V2();
 if(can('cash.view'))db.chq.filter(c=>!['محصل','مدفوع','راجع'].includes(c.st)).forEach(c=>A(c.due,{k:c.t==='in'?'in':'out',t:(c.t==='in'?'📥 شيك وارد من ':'📤 شيك صادر إلى ')+chqParty(c),a:c.amount,h:'#/chq'}));
 return E}
R['/cal']=()=>{head('تقويم الاستحقاقات',true);if(!CAL.m)CAL.m=today().slice(0,7);const [y,mo]=CAL.m.split('-').map(Number),E=calEvents(),first=new Date(Date.UTC(y,mo-1,1)),dim=new Date(Date.UTC(y,mo,0)).getUTCDate(),off=(first.getUTCDay()+1)%7;
 const MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],td=today();let cells='';
 for(let i=0;i<off;i++)cells+='<div></div>';
 for(let d=1;d<=dim;d++){const k=CAL.m+'-'+String(d).padStart(2,'0'),ev=E[k]||[],hi=ev.some(e=>e.k==='in'),ho=ev.some(e=>e.k==='out');
  cells+=`<div onclick="CAL.sel='${k}';route()" style="text-align:center;padding:8px 0;border-radius:10px;cursor:pointer;${k===td?'border:2px solid var(--g3);':''}${k===CAL.sel?'background:var(--g3);color:#fff;':''}"><div style="font-weight:700">${d}</div><div style="height:8px;font-size:9px;line-height:8px">${hi?'<span style="color:#1c4b92">●</span>':''}${ho?'<span style="color:#c0392b">●</span>':''}</div></div>`}
 const sel=CAL.sel&&CAL.sel.startsWith(CAL.m)?CAL.sel:'',L=sel?(E[sel]||[]):[];
 const pm=()=>{const x=new Date(Date.UTC(y,mo-2,1));return x.toISOString().slice(0,7)},nm=()=>{const x=new Date(Date.UTC(y,mo,1));return x.toISOString().slice(0,7)};
 const tot=Object.keys(E).filter(k=>k.startsWith(CAL.m)).reduce((a,k)=>{E[k].forEach(e=>e.k==='in'?a.i+=e.a:a.o+=e.a);return a},{i:0,o:0});
 return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button class="chipb" onclick="CAL.m='${nm()}';CAL.sel='';route()">‹</button><b>${MN[mo-1]} ${y}</b><button class="chipb" onclick="CAL.m='${pm()}';CAL.sel='';route()">›</button></div>
 <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:11px;color:var(--mut);margin-bottom:4px">${['سبت','أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة'].map(x=>`<div>${x}</div>`).join('')}</div>
 <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${cells}</div>
 <div class="s" style="color:var(--mut);padding-top:8px"><span style="color:#1c4b92">●</span> داخل (تحصيل) &nbsp; <span style="color:#c0392b">●</span> خارج (شيك صادر)</div></div>
 <div class="card"><div class="stat"><span>الشهر ده: داخل متوقع</span><b style="color:#1c4b92">${fmt(tot.i)} ج.م</b></div><div class="stat"><span>الشهر ده: خارج متوقع</span><b style="color:#c0392b">${fmt(tot.o)} ج.م</b></div></div>
 ${sel?`<div class="card"><h2>📅 ${sel}</h2>${L.length?L.map(e=>`<div class="item" onclick="location.hash='${e.h}'"><div class="main"><div class="t">${esc(e.t)}</div></div><div class="num ${e.k==='out'?'neg':''}">${fmt(e.a)}</div></div>`).join(''):'<div class="empty">مفيش استحقاقات في اليوم ده</div>'}</div>`:''}`};
ROUTE_PERM['/cal']=null;
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['📅','تقويم الاستحقاقات','#/cal','cash.view,customers.collect','شيكات وأقساط على التقويم'])})();

/* ---------- حماية الفواتير من التعديل والحذف (زرار في الإعدادات، للمدير بس، من غير باسورد) ----------
   db.settings.invProt = true/false. لما تكون شغالة: مفيش تعديل ولا حذف لفاتورة محفوظة لأي مستخدم (والمدير كمان)، المدير يقفلها من الإعدادات الأول. */
function invGate(){if(!(db.settings&&db.settings.invProt))return true;toast('🔒 الفواتير محمية من التعديل والحذف. المدير يقفل الحماية من الإعدادات.');try{audit('محاولة تعديل/حذف فاتورة والحماية شغالة','')}catch(e){}return false}
const _eInv=editInvoice;editInvoice=function(id){if(invGate())return _eInv(id)};
const _dInv=delInvoice;delInvoice=function(id){if(invGate())return _dInv(id)};
function invProtToggle(){if(!can('users.manage'))return toast('للمدير فقط');db.settings.invProt=!db.settings.invProt;delete db.settings.invPw;try{audit(db.settings.invProt?'تشغيل حماية الفواتير':'إيقاف حماية الفواتير','')}catch(e){}save();toast(db.settings.invProt?'🔒 الحماية اشتغلت':'🔓 الحماية اتقفلت');route()}
const _rsInv=R['/settings'];R['/settings']=()=>{const h=_rsInv();if(!can('users.manage'))return h;const on=!!(db.settings&&db.settings.invProt);
 return h+`<div class="card"><h2>🔐 حماية الفواتير من التعديل والحذف</h2><div class="stat"><span>الحالة</span><b style="color:${on?'#1c4b92':'#b33'}">${on?'🔒 شغالة':'🔓 مقفولة'}</b></div><div class="s" style="color:var(--mut);padding:6px 0">افتراضيًا التعديل والحذف للمدير بس، وتقدر تدي أي مستخدم الصلاحية من صلاحيات المستخدم (تعديل / حذف فاتورة بعد ما تتحفظ). الزرار ده قفل شامل: لما يشتغل محدش يعدّل أو يحذف حتى المدير، لحد ما تقفله. من غير باسورد.</div><button class="btn ${on?'del':''}" onclick="invProtToggle()">${on?'🔓 إيقاف الحماية':'🔒 تشغيل الحماية'}</button></div>`};

/* ---------- النسخة الورقية: 4 ملفات PDF بضغطة واحدة (مديونيات، عملاء، موردين، أصناف) ----------
   بترسم جدول على canvas بصفحات A4 (RTL) وتجمّعهم في PDF متعدد الصفحات بدون أي مكتبة خارجية. */
function tablePdf(title,cols,rows,foot,name){const W=1240,H=1754,M=60,RH=46,HH=54,F=FONT,pages=[],per=Math.floor((H-M-190-HH-80)/RH),tw=W-2*M,td=new Date().toLocaleDateString('ar-EG'),co=(db.settings&&db.settings.name)||'خالد تريد';
 const chunks=[];for(let i=0;i<Math.max(rows.length,1);i+=per)chunks.push(rows.slice(i,i+per));
 chunks.forEach((ch,pi)=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.direction='rtl';x.textBaseline='middle';
  const T=(s,px,py,font,al,col)=>{x.font=font+' '+F;x.fillStyle=col||'#111';x.textAlign=al;x.fillText(s,px,py)};
  T(co,W-M,M+20,'bold 40px','right','#10284a');T(title,W-M,M+78,'bold 30px','right');T(td+'  ·  '+(db.settings.phone||''),M,M+20,'22px','left','#555');T('صفحة '+(pi+1)+' / '+chunks.length,M,M+78,'22px','left','#555');
  let y=M+130;x.fillStyle='#10284a';x.fillRect(M,y,tw,HH);let xr=W-M;const pos=cols.map(c=>{const w=c.w*tw,r={x0:xr-w,w,c};xr-=w;return r});
  pos.forEach(p=>T(p.c.h,p.x0+p.w/2,y+HH/2,'bold 22px','center','#fff'));y+=HH;
  ch.forEach((r,ri)=>{if(ri%2){x.fillStyle='#f1f4f9';x.fillRect(M,y,tw,RH)}x.strokeStyle='#d5dbe5';x.lineWidth=1;x.strokeRect(M,y,tw,RH);
   pos.forEach((p,ci)=>{let s=String(r[ci]??'');x.font='22px '+F;while(s.length>3&&x.measureText(s).width>p.w-16)s=s.slice(0,-2);if(s!==String(r[ci]??''))s+='…';const nm=p.c.n;T(s,nm?p.x0+p.w/2:p.x0+p.w-10,y+RH/2,'22px',nm?'center':'right',nm&&String(r[ci]).startsWith('-')?'#b33':'#111')});y+=RH});
  if(pi===chunks.length-1&&foot){y+=10;x.fillStyle='#10284a';x.fillRect(M,y,tw,HH);T(foot,W-M-14,y+HH/2,'bold 24px','right','#fff')}
  const d=atob(cv.toDataURL('image/jpeg',.9).split(',')[1]),jpg=new Uint8Array(d.length);for(let k=0;k<d.length;k++)jpg[k]=d.charCodeAt(k);pages.push({jpg,w:W,h:H})});
 return new File([jpegPdfN(pages)],name+'.pdf',{type:'application/pdf'})}
function paperBuild(k){const ph=o=>(typeof phones==='function'?(phones(o)[0]||''):(o.phone||''));
 if(k==='bal'){recalcAll();const L=db.customers.filter(c=>Math.abs(c.balance||0)>0.5).sort((a,b)=>b.balance-a.balance);const t=L.reduce((a,c)=>a+(c.balance||0),0);
  return tablePdf('مديونيات العملاء',[{h:'م',w:.07,n:1},{h:'العميل',w:.37},{h:'التليفون',w:.2},{h:'المنطقة',w:.18},{h:'المديونية',w:.18,n:1}],L.map((c,i)=>[i+1,c.name,ph(c),c.area||'',fmt(c.balance)]),'إجمالي المديونيات: '+fmt(t)+' ج.م  ·  '+L.length+' عميل','مديونيات-العملاء')}
 if(k==='cus'){recalcAll();const L=db.customers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  return tablePdf('قايمة العملاء',[{h:'م',w:.07,n:1},{h:'العميل',w:.37},{h:'التليفون',w:.2},{h:'المنطقة',w:.18},{h:'الرصيد',w:.18,n:1}],L.map((c,i)=>[i+1,c.name,ph(c),c.area||'',fmt(c.balance||0)]),'عدد العملاء: '+L.length,'قايمة-العملاء')}
 if(k==='sup'){const L=db.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));const t=L.reduce((a,s)=>a+supBal(s),0);
  return tablePdf('قايمة الموردين',[{h:'م',w:.07,n:1},{h:'المورد',w:.4},{h:'التليفون',w:.25},{h:'المستحق له',w:.28,n:1}],L.map((s,i)=>[i+1,s.name,ph(s),fmt(supBal(s))]),'عدد الموردين: '+L.length+'  ·  إجمالي المستحق: '+fmt(t)+' ج.م','قايمة-الموردين')}
 if(k==='prd'){const C=can('products.cost');const L=db.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  const cols=[{h:'م',w:.06,n:1},{h:'الصنف',w:C?.30:.38},{h:'الوحدة',w:.16},{h:'الرصيد',w:.1,n:1},{h:'سعر البيع',w:.13,n:1}].concat(C?[{h:'سعر الشراء',w:.13,n:1}]:[]).concat([{h:'الباركود',w:C?.12:.17}]);
  return tablePdf('الأصناف المسجلة',cols,L.map((p,i)=>[i+1,p.name,unitT(p),fmt(p.stock),fmt(p.price)].concat(C?[fmt(p.cost)]:[]).concat([p.barcode||''])),'عدد الأصناف: '+L.length,'الأصناف-المسجلة')}}
function recalcAll(){db.customers.forEach(c=>recalc(c))}
const PAPER=[['bal','💰','مديونيات العملاء','كل العملاء اللي عليهم فلوس وإجمالي المديونية',['customers.collect','reports.view','cash.view']],['cus','👥','قايمة العملاء','الاسم والتليفون والمنطقة والرصيد',['customers.collect','reports.view','cash.view']],['sup','🏭','قايمة الموردين','الاسم والتليفون والمستحق',['suppliers.view','reports.view','cash.view']],['prd','📦','الأصناف المسجلة','الأصناف والأرصدة والأسعار والباركود',['products.edit','stock.adjust','reports.view','sales.add']]];
function paperDl(k){const d=PAPER.find(x=>x[0]===k);if(!d||!d[4].some(can))return toast('مش مسموح');try{const f=paperBuild(k);dl(f);try{audit('تحميل نسخة ورقية',d[2])}catch(e){}toast('اتحمل ملف الـ PDF ✅')}catch(e){console.warn(e);toast('تعذر تجهيز الملف')}}
R['/paper']=()=>{head('النسخة الورقية',true);const L=PAPER.filter(d=>d[4].some(can));if(!L.length)return nf();
 return `<div class="card"><div class="s" style="color:var(--mut);padding-bottom:8px">اضغط على أي زرار ينزّل ملف PDF جاهز للطباعة أو الحفظ كنسخة ورقية.</div>${L.map(d=>`<button class="btn" style="display:flex;align-items:center;gap:10px;justify-content:flex-start;margin-bottom:10px;text-align:right" onclick="paperDl('${d[0]}')"><span style="font-size:24px">${d[1]}</span><span><b>⬇️ ${d[2]}</b><br><small style="opacity:.8">${d[3]}</small></span></button>`).join('')}</div>`};
ROUTE_PERM['/paper']=null;
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['🖨️','النسخة الورقية (PDF)','#/paper','customers.collect,reports.view,cash.view,suppliers.view,products.edit','مديونيات وعملاء وموردين وأصناف'])})();

/* ---------- تقارير إضافية: مبيعات المندوبين شهريًا + التحصيلات اليومية (داخل/خارج) ---------- */
const RPX={from:'',to:''};
const rpxBar=fn=>{if(!RPX.from){const d=new Date();d.setMonth(d.getMonth()-5);RPX.from=d.toISOString().slice(0,7)+'-01'}if(!RPX.to)RPX.to=today();
 return `<div class="card noprint"><div class="row2"><div><label>من</label><input type="date" value="${RPX.from}" onchange="RPX.from=this.value;route()"></div><div><label>إلى</label><input type="date" value="${RPX.to}" onchange="RPX.to=this.value;route()"></div></div></div>`};
const MNAR=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
R['/rptm']=()=>{head('مبيعات المندوبين شهريًا',true);const bar=rpxBar(),inR=d=>d>=RPX.from&&d<=RPX.to,m={};
 db.invoices.filter(i=>inR(i.date)).forEach(i=>{const u=db.users.find(x=>x.id==i.by),n=u?u.name:'—',k=i.date.slice(0,7);const r=m[n]=m[n]||{};r[k]=(r[k]||0)+(+i.total||0)});
 const names=Object.keys(m).sort(),tot=names.reduce((a,n)=>a+Object.values(m[n]).reduce((x,y)=>x+y,0),0);
 return bar+`<div class="card out"><h2>مبيعات كل مندوب في الشهر</h2>${names.length?names.map(n=>{const ks=Object.keys(m[n]).sort(),t=ks.reduce((a,k)=>a+m[n][k],0);return `<div style="margin-bottom:12px"><div class="stat"><b>${esc(n)}</b><b>${fmt(t)} ج.م</b></div>${ks.map(k=>`<div class="stat" style="font-size:13px"><span>${MNAR[+k.slice(5)-1]} ${k.slice(0,4)}</span><span>${fmt(m[n][k])}</span></div>`).join('')}</div>`}).join('')+`<div class="stat"><b>الإجمالي</b><b>${fmt(tot)} ج.م</b></div>`:'<div class="empty">مفيش مبيعات في الفترة دي</div>'}</div>`};
function rpxDaily(){const D={};const A=(d,i,o)=>{const r=D[d]=D[d]||{i:0,o:0};r.i+=i;r.o+=o};
 try{cashEv().forEach(e=>A(e.d,+e.in||0,+e.out||0))}catch(e){}
 try{V2();db.accts.forEach(a=>accEv(a).forEach(e=>A(e.d,e.v>0?e.v:0,e.v<0?-e.v:0)))}catch(e){}return D}
R['/rptd']=()=>{head('التحصيلات اليومية (داخل وخارج)',true);const bar=rpxBar(),D=rpxDaily(),ks=Object.keys(D).filter(d=>d>=RPX.from&&d<=RPX.to).sort().reverse(),T=ks.reduce((a,d)=>({i:a.i+D[d].i,o:a.o+D[d].o}),{i:0,o:0});
 return bar+`<div class="card out"><h2>حركة الفلوس في اليوم</h2>${ks.length?`<div class="stat" style="font-weight:800"><span>اليوم</span><span>داخل · خارج · صافي</span></div>`+ks.map(d=>`<div class="stat"><span>${d}</span><span><b style="color:#1c4b92">${fmt(D[d].i)}</b> · <b style="color:#c0392b">${fmt(D[d].o)}</b> · <b>${fmt(D[d].i-D[d].o)}</b></span></div>`).join('')+`<div class="stat" style="font-weight:800"><span>الإجمالي</span><span>${fmt(T.i)} · ${fmt(T.o)} · ${fmt(T.i-T.o)}</span></div>`:'<div class="empty">مفيش حركة في الفترة دي</div>'}</div>`};
ROUTE_PERM['/rptm']='reports.view';ROUTE_PERM['/rptd']='cash.view';
(()=>{const g=MORE_GROUPS.find(x=>x.id==='fin');if(g)g.it.push(['📆','مبيعات المندوبين شهريًا','#/rptm','reports.view','كل مندوب باع بكام في الشهر'],['💵','التحصيلات اليومية','#/rptd','cash.view','داخل وخارج كل يوم'])})();

/* ================= الجرد: ورقة جرد للطباعة + مسودات الجرد + الاعتماد =================
   المسودة بتتحفظ من غير ما تغيّر رصيد المخزن. الاعتماد (للمدير بس) بيطبّق الفروق عن طريق نفس مستند الجرد (docSave). */
const CD=()=>(db.cdrafts=db.cdrafts||[]);
let CDID=null,CSONLY=false;
const _rDocC=R['/doc'];
R['/doc']=k=>{const h=_rDocC(k);if(k!=='adj')return h;
 return h+`<div class="card noprint"><h2>مسودة وورقة جرد</h2><button class="btn sec" onclick="cdSave()">💾 حفظ كمسودة (من غير تعديل الرصيد)</button><button class="btn sec" onclick="location.hash='#/cntsheet/'+doc.loc">🖨️ طباعة ورقة جرد للمكان ده</button><button class="btn sec" onclick="location.hash='#/cnt'">📂 مسودات الجرد</button></div>`};
function cdLines(){return doc.lines.filter(l=>l.pid&&l.qty!==undefined&&l.qty!==''&&!isNaN(+l.qty)).map(l=>({pid:l.pid,qty:+l.qty}))}
function cdSave(){const L=cdLines();if(!L.length)return toast('اكتب الكمية الفعلية لصنف واحد على الأقل');
 let d=CDID&&CD().find(x=>x.id===CDID&&x.st==='draft');
 if(d){d.loc=doc.loc;d.lines=L;d.notes=doc.notes||'';d.ts=Date.now()}
 else{const no=CD().reduce((a,x)=>Math.max(a,x.no),0)+1;d={id:'cd'+Date.now().toString(36),no,date:today(),ts:Date.now(),loc:doc.loc,by:db.me,notes:doc.notes||'',lines:L,st:'draft'};CD().push(d)}
 CDID=d.id;save();try{audit('حفظ مسودة جرد','#'+d.no+' '+locName(d.loc))}catch(e){}toast('اتحفظت كمسودة ✅ (الرصيد ماتغيرش)');location.hash='#/cntd/'+d.id}
function cdEdit(id){const d=CD().find(x=>x.id===id);if(!d||d.st!=='draft')return;CDID=id;doc=docNew('adj',{loc:d.loc,notes:d.notes||'',lines:[...d.lines.map(l=>({pid:l.pid,qty:l.qty,price:0})),{}]});location.hash='#/doc/adj'}
function cdDel(id){const d=CD().find(x=>x.id===id);if(!d||d.st!=='draft')return;if(!(can('users.manage')||d.by===db.me))return toast('مش مسموح');if(!confirm('حذف مسودة الجرد دي؟'))return;db.cdrafts=CD().filter(x=>x.id!==id);if(CDID===id)CDID=null;save();toast('اتحذفت المسودة');location.hash='#/cnt'}
function cdApprove(id){const d=CD().find(x=>x.id===id);if(!d||d.st!=='draft')return;if(!can('users.manage'))return toast('الاعتماد للمدير بس');
 if(!confirm('اعتماد الجرد وتطبيق الفروق على رصيد '+locName(d.loc)+'؟ العملية دي بتعدّل المخزون.'))return;
 doc=docNew('adj',{loc:d.loc,notes:'من مسودة جرد #'+d.no+(d.notes?' - '+d.notes:''),lines:d.lines.map(l=>({pid:l.pid,qty:l.qty,price:0}))});
 const n=db.adjs.length;docSave();
 if(db.adjs.length>n){d.st='approved';d.appr=db.me;d.apprTs=Date.now();d.adjId=db.adjs[db.adjs.length-1].id;CDID=null;save();try{audit('اعتماد جرد','#'+d.no+' '+locName(d.loc))}catch(e){}toast('اتعتمد الجرد واتعدّل الرصيد ✅')}}
const cdWho=id=>{const u=db.users.find(x=>x.id==id);return u?u.name:''};
const cdCalc=d=>{const sh=can('reports.profit')||can('users.manage');let inc=0,dec=0,same=0;const rows=d.lines.map(l=>{const p=prod(l.pid)||{name:'؟',cost:0},cur=qtyAt(d.loc,l.pid),df=l.qty-cur,v=df*(+p.cost||0);if(df>0)inc+=v;else if(df<0)dec+=v;else same++;return{p,cur,qty:l.qty,df,v}});return{rows,inc,dec,same,sh}};
R['/cnt']=()=>{head('مسودات الجرد',true);const L=[...CD()].reverse();
 return `<div class="card"><h2>🖨️ ورقة جرد فاضية للطباعة</h2><label>المكان (مخزن أو عربية)</label><select id="cs_loc">${locOpts(defLoc())}</select><button class="btn" onclick="location.hash='#/cntsheet/'+$('#cs_loc').value">🖨️ فتح ورقة الجرد</button><button class="btn sec" onclick="openDoc('adj')">＋ جرد جديد</button></div>
 <div class="card"><h2>📂 المسودات والجرد المعتمد (${L.length})</h2>${L.length?L.map(d=>`<div class="item" onclick="location.hash='#/cntd/${d.id}'"><div class="main"><div class="t">جرد #${d.no} · ${esc(locName(d.loc))}</div><div class="s">${d.date} · ${esc(cdWho(d.by))} · ${d.lines.length} صنف</div></div><span class="pill ${d.st==='draft'?'bad':''}">${d.st==='draft'?'مسودة':'معتمد'}</span></div>`).join(''):'<div class="empty">مفيش مسودات جرد</div>'}</div>`};
R['/cntd']=id=>{const d=CD().find(x=>x.id===id);if(!d)return nf();head('مراجعة جرد #'+d.no,true);const c=cdCalc(d);
 const ord=c.rows.slice().sort((a,b)=>(b.df!==0)-(a.df!==0)||Math.abs(b.v)-Math.abs(a.v));
 const tb=`<table><tr><th>الصنف</th><th>بالبرنامج</th><th>الفعلي</th><th>الفرق</th>${c.sh?'<th>القيمة بالتكلفة</th>':''}</tr>${ord.map(r=>`<tr><td>${esc(r.p.name)}</td><td>${fmt(r.cur)}</td><td>${fmt(r.qty)}</td><td class="${r.df<0?'neg':''}">${r.df===0?'✔':(r.df>0?'+':'−')+fmt(Math.abs(r.df))}</td>${c.sh?`<td class="${r.v<0?'neg':''}">${r.df===0?'':(r.v<0?'−':'+')+fmt(Math.abs(r.v))}</td>`:''}</tr>`).join('')}</table>`;
 const act=d.st==='draft'?`<div class="card noprint"><div class="s" style="color:var(--mut);margin-bottom:8px">الفرق متحسوب على رصيد المكان دلوقتي. الاعتماد بيطبّق الفروق ويسجل مستند جرد.</div>${can('users.manage')?`<button class="btn" onclick="cdApprove('${d.id}')">✅ اعتماد وتطبيق الفروق</button>`:'<div class="s" style="color:var(--mut)">الاعتماد للمدير بس</div>'}<button class="btn sec" onclick="cdEdit('${d.id}')">✏️ فتح للتعديل</button><button class="btn sec" onclick="cdDel('${d.id}')">🗑️ حذف المسودة</button></div>`
  :`<div class="card noprint"><div class="s">✅ اتعتمد ${d.apprTs?new Date(d.apprTs).toLocaleDateString('ar-EG'):''} بواسطة ${esc(cdWho(d.appr))}</div>${d.adjId?`<button class="btn sec" onclick="location.hash='#/rec/adj/${d.adjId}'">فتح مستند الجرد ›</button>`:''}</div>`;
 return `<div class="card out"><h2>📋 مراجعة جرد #${d.no} (${d.st==='draft'?'مسودة':'معتمد'})</h2><div class="stat"><span>المكان</span><b>${esc(locName(d.loc))}</b></div><div class="stat"><span>التاريخ / المسؤول</span><b>${d.date} · ${esc(cdWho(d.by))}</b></div>${d.notes?`<div class="stat"><span>ملاحظات</span><b>${esc(d.notes)}</b></div>`:''}
 <div class="stat"><span>أصناف مطابقة / فيها فرق</span><b>${c.same} / ${c.rows.length-c.same}</b></div>${c.sh?`<div class="stat"><span>زيادة بالتكلفة</span><b>+${fmt(c.inc)} ج.م</b></div><div class="stat"><span>نقص بالتكلفة</span><b class="neg">−${fmt(Math.abs(c.dec))} ج.م</b></div><div class="stat"><span>صافي الفرق</span><b class="${c.inc+c.dec<0?'neg':''}">${fmt(c.inc+c.dec)} ج.م</b></div>`:''}${tb}</div>`+act};
R['/cntsheet']=loc=>{if(!loc||!allLocs().includes(loc))return R['/cnt']();head('ورقة جرد',true);
 const L=db.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(p=>!CSONLY||qtyAt(loc,p.id)!==0);
 return `<div class="card noprint"><label>المكان</label><select onchange="location.hash='#/cntsheet/'+this.value">${locOpts(loc)}</select><label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" ${CSONLY?'checked':''} onchange="CSONLY=this.checked;route()"> الأصناف اللي ليها رصيد بس</label><button class="btn sec" onclick="cdSheetPdf('${loc}')">⬇️ PDF متعدد الصفحات (A4)</button></div>
 <div class="card out"><h2>📋 ورقة جرد - ${esc(locName(loc))}</h2><div class="stat"><span>التاريخ</span><b>${today()}</b></div><table><tr><th>م</th><th>الصنف</th><th>الوحدة</th><th>بالبرنامج</th><th style="min-width:80px">الجرد الفعلي</th></tr>${L.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td>${esc(unitT(p))}</td><td>${fmt(qtyAt(loc,p.id))}</td><td style="border-bottom:1px solid #999"></td></tr>`).join('')}</table></div>`};
function cdSheetPdf(loc){const L=db.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).filter(p=>!CSONLY||qtyAt(loc,p.id)!==0);
 dl(tablePdf('ورقة جرد - '+locName(loc),[{h:'م',w:.07,n:1},{h:'الصنف',w:.40},{h:'الوحدة',w:.15},{h:'بالبرنامج',w:.15,n:1},{h:'الجرد الفعلي',w:.23}],L.map((p,i)=>[i+1,p.name,unitT(p),fmt(qtyAt(loc,p.id)),'']),'عدد الأصناف: '+L.length+'  ·  '+today(),'ورقة-جرد'));toast('اتحمل ملف الـ PDF ✅')}
ROUTE_PERM['/cnt']='stock.adjust';ROUTE_PERM['/cntd']='stock.adjust';ROUTE_PERM['/cntsheet']='stock.adjust';
(()=>{const g=MORE_GROUPS.find(x=>x.id==='stk');if(g)g.it.push(['📂','مسودات الجرد وورقة الجرد','#/cnt','stock.adjust','اطبع ورقة جرد وراجع المسودات'])})();

/* ================= طباعة لكل شاشة وتقرير =================
   أي شاشة معروضة ملهاش أزرار الطباعة (حفظ PDF / واتساب / طباعة) بتاخدهم تلقائي:
   محتوى الشاشة كله بيتحط في حاوية .out وتحتها شريط الأزرار. شاشات الإدخال (فاتورة/مستند جديد/سند جديد) والشات مستثناة. */
const _oaAll=outAuto;
outAuto=function(){_oaAll();try{
 /* تغيير 22: الأزرار بس على المطبوعات الحقيقية (كشوف/تقارير/سندات/ورق جرد) - الشاشات العادية من غير أزرار */
 const A=$('#app');if(!A||A.querySelector('.out'))return;
 const s=location.hash.slice(1).split('?')[0].split('/').filter(Boolean),k=s[0]||'',id=s[1];
 if(!['stmt','itemsrep','stock','stkall','rec','vch','rep','rptd','rptm','pmove','acct','accts','cinv','hand','chq','cntsheet','paper','carexp','rexp','spinst'].includes(k))return;
 if(['doc','chat','grp','search','vchnew','login'].includes(k)||(k==='invoice'&&id==='new'))return;
 const kids=[...A.children].filter(e=>!e.classList.contains('obar')&&e.tagName!=='SCRIPT'&&e.tagName!=='STYLE');if(!kids.length||A.innerText.trim().length<20)return;
 const w=document.createElement('div');w.className='out autoout';A.insertBefore(w,kids[0]);kids.forEach(e=>w.appendChild(e));
 const b=document.createElement('div');b.className='obar noprint';b.innerHTML=OUT_BTNS;w.after(b)}catch(e){console.warn(e)}};

/* ================= تنضيف المرفقات (للمدير بس) =================
   بيمسح صور وملفات الشات وصور إيصالات المصروفات الأقدم من تاريخ يختاره المدير. الرسالة نفسها والمصروف نفسه بيفضلوا، المرفق بس هو اللي بيتمسح. */
const attMs=d=>new Date(d+'T00:00:00').getTime();
function attScan(d){const t=attMs(d);const ms=(db.msgs||[]).filter(m=>m.att&&m.ts<t);const rc=Object.keys(db.rcpt||{}).filter(id=>{const x=(db.exps||[]).find(e=>e.id==id);return !x||(x.date||'')<d});
 const sz=a=>a.reduce((s,v)=>s+(v&&v.length?v.length:0),0);return{ms,rc,bytes:sz(ms.map(m=>m.att.data))+sz(rc.map(id=>db.rcpt[id]))}}
const attMB=b=>(b*0.75/1048576).toFixed(1)+' ميجا';
function attPv(){const d=$('#att_d').value,e=$('#att_pv');if(!d){e.textContent='';return}const s=attScan(d);e.textContent=`هيتمسح: ${s.ms.length} مرفق شات + ${s.rc.length} صورة إيصال (حوالي ${attMB(s.bytes)})`}
function attPurge(){if(!can('users.manage'))return toast('للمدير فقط');const d=$('#att_d').value;if(!d)return toast('اختار التاريخ الأول');const s=attScan(d);if(!s.ms.length&&!s.rc.length)return toast('مفيش مرفقات أقدم من التاريخ ده');
 if(!confirm(`مسح ${s.ms.length} مرفق شات و ${s.rc.length} صورة إيصال أقدم من ${d} (حوالي ${attMB(s.bytes)})؟ مفيش رجوع.`))return;
 s.ms.forEach(m=>{delete m.att;m.text=(m.text?m.text+' ':'')+'🗑 (المرفق اتمسح)'});s.rc.forEach(id=>delete db.rcpt[id]);
 try{audit('تنضيف مرفقات',`${s.ms.length} شات + ${s.rc.length} إيصال قبل ${d}`)}catch(e){}save();toast('اتمسحت المرفقات ✅');route()}
const _rsAtt=R['/settings'];R['/settings']=()=>{const h=_rsAtt();if(!can('users.manage'))return h;const all=attScan('9999-12-31');
 const d0=new Date(Date.now()-90*864e5);const def=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');
 return h+`<div class="card"><h2>🧹 تنضيف المرفقات</h2><div class="stat"><span>المرفقات دلوقتي</span><b>${all.ms.length} شات + ${all.rc.length} إيصال (${attMB(all.bytes)})</b></div><div class="s" style="color:var(--mut);padding:6px 0">اختار تاريخ، وكل صور وملفات الشات وصور إيصالات المصروفات الأقدم منه تتمسح. الرسائل والمصروفات نفسها بتفضل.</div><label>امسح المرفقات الأقدم من</label><input type="date" id="att_d" value="${def}" oninput="attPv()"><div class="s" id="att_pv" style="padding:6px 0"></div><button class="btn del" onclick="attPurge()">🧹 مسح المرفقات</button><script>setTimeout(attPv,0)<\/script></div>`};



/* =====================================================================
   الأمان: تسجيل الدخول + تشفير البيانات + الجلسة + لوحة الملاحظات
   ---------------------------------------------------------------------
   الفكرة (مناسبة لتطبيق شغال في المتصفح):
   1) البيانات كلها بتتخزن مشفرة (AES-256-GCM) بمفتاح عشوائي واحد (DEK) في localStorage باسم kt_dbe.
   2) المفتاح ده نفسه بيتخزن "ملفوف" لكل مستخدم بمفتاح مشتق من باسورده (PBKDF2-SHA256 بـ 600 ألف دورة + ملح عشوائي) في kt_ks.
      يعني مفيش باسورد ولا هاش باسورد مخزن أصلاً: الباسورد الصح هو اللي بيفك المفتاح، والغلط بيفشل تلقائياً.
   3) الجلسة: المفتاح بيفضل في ذاكرة الصفحة (وفي sessionStorage عشان الريفريش) ويتمسح بالخروج أو بعد فترة خمول أو إقفال التبويب.
   4) الصلاحيات: كل مستخدم له perms، والشاشات والأزرار والدوال الحساسة بتتحقق منها.
   5) السيرفر لاحقاً: كل ده متغلف في كائن Auth واحد (login / logout / setPass / persist...). لما نروح لسيرفر
      بنبدل التنفيذ ده بنداء API (توكن جلسة + هاش باسورد على السيرفر + قاعدة بيانات مشفرة) من غير ما نلمس باقي الكود.
   ===================================================================== */
const DEMO=/[?&]demo=1/.test(location.search);
const Auth=(()=>{
 const te=new TextEncoder(),S=crypto.subtle,IT=600000;
 const b64=u=>{u=new Uint8Array(u);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
 const unb=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
 /* مفتاح من باسورد: PBKDF2 → AES-GCM */
 const kdf=async(pw,salt,it)=>{const k=await S.importKey('raw',te.encode(String(pw).normalize('NFKC')),'PBKDF2',false,['deriveKey']);return S.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:it},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
 const seal=async(key,bytes)=>{const iv=rnd(12),ct=new Uint8Array(await S.encrypt({name:'AES-GCM',iv},key,bytes)),o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return b64(o)};
 const open=async(key,s)=>{const o=unb(s);return new Uint8Array(await S.decrypt({name:'AES-GCM',iv:o.slice(0,12)},key,o.slice(12)))};
 const dkey=raw=>S.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
 /* مخزن المفاتيح */
 const getKS=()=>{try{return JSON.parse(localStorage.getItem('kt_ks')||'null')}catch(e){return null}};
 const putKS=k=>localStorage.setItem('kt_ks',JSON.stringify(k));
 const low=s=>String(s||'').trim().toLowerCase();
 let dek=null,DK=null,uid=0,prev=0,la=Date.now(),t0=Date.now(),q=Promise.resolve(),fresh=false;
 const COMMON=['12345678','123456789','1234567890','password','password1','qwertyui','11111111','00000000','iloveyou','admin123','khaledtrade','abcd1234','12341234'];
 const pwErr=(pw,un)=>{pw=String(pw||'');if(pw.length<8)return 'الباسورد لازم يكون 8 حروف أو أرقام على الأقل';if(/^(.)\1+$/.test(pw)||/^\d+$/.test(pw))return 'الباسورد ضعيف: اخلط حروف وأرقام';if(COMMON.includes(pw.toLowerCase()))return 'الباسورد ده شائع وسهل التخمين، اختار غيره';if(un&&low(un)===pw.toLowerCase())return 'الباسورد ماينفعش يبقى زي اسم المستخدم';return ''};
 const score=pw=>{let s=0;if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[a-z]/.test(pw)&&/[A-Z]/.test(pw))s++;if(/\d/.test(pw)&&/\D/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return Math.min(4,s)};
 const genRec=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=rnd(20);let s='';r.forEach((x,i)=>{s+=a[x%32];if(i%4==3&&i<19)s+='-'});return s};
 const normRec=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 /* محاولات الدخول: تأخير يزيد بعد 5 غلطات */
 const lg=()=>{try{return JSON.parse(localStorage.getItem('kt_lg')||'{}')}catch(e){return{}}};
 const wait=()=>Math.max(0,Math.ceil(((lg().until||0)-Date.now())/1000));
 const fail=()=>{const o=lg(),n=(o.n||0)+1;localStorage.setItem('kt_lg',JSON.stringify({n,until:n>=5?Date.now()+Math.min(900,30*Math.pow(2,n-5))*1000:0}))};
 const okLogin=()=>localStorage.removeItem('kt_lg');
 const idleMs=()=>((db.settings&&+db.settings.idle)||30)*60000;
 /* حفظ مشفر: طابور واحد عشان الكتابات متترتبش غلط */
 const persist=d=>{if(!DK||DEMO)return;let json;try{json=JSON.stringify(d)}catch(e){return}const k=DK;q=q.then(async()=>{const v=await seal(k,te.encode(json));try{localStorage.setItem('kt_dbe',JSON.stringify({v:1,d:v}))}catch(e){toast('⚠️ مساحة التخزين على الجهاز امتلت. صدّر نسخة احتياطية وامسح صور قديمة')}}).catch(e=>console.error('save',e))};
 const flush=()=>q;
 const loadDb=async()=>{const r=localStorage.getItem('kt_dbe');if(!r)return null;return JSON.parse(new TextDecoder().decode(await open(DK,JSON.parse(r).d)))};
 const stash=()=>{try{sessionStorage.setItem('kt_sk',JSON.stringify({u:uid,k:b64(dek),t:t0,l:la}))}catch(e){}};
 /* فتح الجلسة بعد التحقق من الباسورد */
 const unlock=async(raw,id,data)=>{dek=raw;DK=await dkey(raw);uid=id;t0=la=Date.now();
  if(data===undefined)data=await loadDb();
  if(data)db=data;ensure();const u=db.users.find(x=>x.id==uid);
  if(!u||u.active===false){lock(true);throw new Error('off')}
  prev=u.last||0;u.last=Date.now();db.me=uid;db.users.forEach(x=>{delete x.ph});stash();persist(db)};
 const lock=(noReload)=>{dek=null;DK=null;uid=0;sessionStorage.removeItem('kt_sk');if(!noReload)location.reload()};
 const onAct=()=>{const n=Date.now();if(n-la>15000){la=n;if(dek)stash()}la=n};
 const tick=()=>{if(!dek||DEMO)return;const n=Date.now();if(n-la>idleMs()||n-t0>12*3600e3){toast('🔒 اتقفل النظام لعدم الاستخدام');setTimeout(()=>lock(),700)}};
 ['click','keydown','touchstart','scroll'].forEach(e=>addEventListener(e,onAct,{passive:true}));setInterval(tick,20000);
 addEventListener('pagehide',()=>{if(dek)stash()});
 return{
  ok:()=>!!DK&&uid>0,on:()=>!DEMO&&!!DK,get uid(){return uid},get prev(){return prev},get fresh(){return fresh},set fresh(v){fresh=v},
  pwErr,score,wait,persist,flush,lock,getKS,genRec,
  hasKS:()=>!!getKS(),hasData:()=>!!localStorage.getItem('kt_dbe'),
  legacyRaw:()=>localStorage.getItem('kt_db_real')||localStorage.getItem('kt_db'),
  /* أول تشغيل: إنشاء حساب المدير (وترحيل أي بيانات قديمة غير مشفرة) */
  async setup(name,un,pw){const e=pwErr(pw,un);if(e)throw new Error(e);if(!String(un).trim()||!String(name).trim())throw new Error('اكتب الاسم واسم المستخدم');
   let data=null;const lr=Auth.legacyRaw();if(lr){try{const d=JSON.parse(lr);if(d&&Array.isArray(d.users)&&Array.isArray(d.products))data=d}catch(x){}}
   if(data){db=data}ensure();
   const adm=db.users.find(x=>(x.perms||[]).includes('*'))||db.users[0];adm.name=String(name).trim();adm.username=String(un).trim();adm.active=true;adm.perms=['*'];
   const raw=rnd(32),ks={v:1,it:IT,u:{},rec:null},salt=rnd(16),k=await kdf(pw,salt,IT);
   ks.u[low(un)]={id:adm.id,s:b64(salt),w:await seal(k,raw)};
   const code=genRec(),rs=rnd(16),rk=await kdf(normRec(code),rs,IT);ks.rec={id:adm.id,s:b64(rs),w:await seal(rk,raw)};
   dek=raw;DK=await dkey(raw);uid=adm.id;db.me=adm.id;adm.last=Date.now();db.users.forEach(x=>{delete x.ph});persist(db);await flush();
   /* نتأكد إن الفك شغال قبل ما نمسح النسخة القديمة */
   const chk=await loadDb();if(!chk||!Array.isArray(chk.users))throw new Error('فشل التشفير، البيانات القديمة لسه زي ما هي');
   putKS(ks);['kt_db','kt_db_real','kt_demo'].forEach(x=>localStorage.removeItem(x));stash();fresh=true;return code},
  async login(un,pw){const w=wait();if(w)return{ok:false,msg:'محاولات كتير غلط. استنى '+w+' ثانية'};
   const ks=getKS();if(!ks)return{ok:false,msg:'النظام لسه مجهّزش'};const en=ks.u[low(un)];
   try{if(!en){await kdf(pw,rnd(16),ks.it);throw 0}const raw=await open(await kdf(pw,unb(en.s),ks.it),en.w);okLogin();await unlock(raw,en.id);fresh=true;return{ok:true}}
   catch(e){if(e&&e.message==='off')return{ok:false,msg:'الحساب ده موقوف. كلم المدير'};fail();const w2=wait();return{ok:false,msg:w2?'محاولات كتير غلط. استنى '+w2+' ثانية':'اسم المستخدم أو الباسورد غلط'}}},
  async resume(){let s;try{s=JSON.parse(sessionStorage.getItem('kt_sk')||'null')}catch(e){}if(!s)return false;
   const n=Date.now();t0=s.t;la=s.l;if(n-s.l>idleMs0()||n-s.t>12*3600e3){sessionStorage.removeItem('kt_sk');return false}
   try{await unlock(unb(s.k),s.u);t0=s.t;stash();return true}catch(e){sessionStorage.removeItem('kt_sk');dek=DK=null;uid=0;return false}},
  /* تغيير/تحديد باسورد مستخدم (لازم تكون داخل بالفعل) */
  async setPass(id,un,pw){if(!dek)throw new Error('سجل دخول الأول');const e=pwErr(pw,un);if(e)throw new Error(e);const ks=getKS();Object.keys(ks.u).forEach(k=>{if(ks.u[k].id==id)delete ks.u[k]});
   const salt=rnd(16);ks.u[low(un)]={id,s:b64(salt),w:await seal(await kdf(pw,salt,ks.it),dek)};putKS(ks)},
  syncUser(id,un){const ks=getKS();if(!ks)return;const k=Object.keys(ks.u).find(x=>ks.u[x].id==id);if(k&&k!==low(un)){ks.u[low(un)]=ks.u[k];delete ks.u[k];putKS(ks)}},
  removeUser(id){const ks=getKS();if(!ks)return;Object.keys(ks.u).forEach(k=>{if(ks.u[k].id==id)delete ks.u[k]});putKS(ks)},
  /* جهاز جديد: الدخول بظرف المستخدم. بنعمل مفتاح جهاز جديد ونلفه بباسورد المستخدم من غير ما نحتاج باسورد البيانات */
  hasUser:un=>{const ks=getKS();return !!ks&&!!ks.u[low(un)]},
  async joinDevice(data,un,pw){const u=(data.users||[]).find(x=>low(x.username)===low(un));if(!u||u.active===false)throw new Error('الحساب ده مش موجود أو موقوف. كلم المدير');
   const raw=rnd(32),ks={v:1,it:IT,u:{},rec:null},salt=rnd(16);ks.u[low(un)]={id:u.id,s:b64(salt),w:await seal(await kdf(pw,salt,IT),raw)};
   putKS(ks);['kt_dbe','kt_db','kt_db_real','kt_demo'].forEach(x=>localStorage.removeItem(x));
   await unlock(raw,u.id,data);await flush();fresh=true},
  hasPass:id=>{const ks=getKS();return !!ks&&Object.values(ks.u).some(x=>x.id==id)},
  async changeOwn(old,nw){const u=db.users.find(x=>x.id==uid),ks=getKS(),en=ks.u[low(u.username)];try{await open(await kdf(old,unb(en.s),ks.it),en.w)}catch(e){throw new Error('الباسورد الحالي غلط')}await Auth.setPass(uid,u.username,nw)},
  async newRecovery(){const ks=getKS(),code=genRec(),rs=rnd(16);ks.rec={id:uid,s:b64(rs),w:await seal(await kdf(normRec(code),rs,ks.it),dek)};putKS(ks);return code},
  /* نسيت الباسورد: كود الاسترداد بيفك المفتاح ونحدد باسورد جديد للمدير */
  async recover(code,pw){const w=wait();if(w)throw new Error('استنى '+w+' ثانية وحاول تاني');const ks=getKS();if(!ks||!ks.rec)throw new Error('مفيش كود استرداد متسجل');
   let raw;try{raw=await open(await kdf(normRec(code),unb(ks.rec.s),ks.it),ks.rec.w)}catch(e){fail();throw new Error('كود الاسترداد غلط')}
   okLogin();const data=await(async()=>{DK=await dkey(raw);const d=await loadDb();DK=null;return d})();
   const adm=data&&data.users.find(x=>x.id==ks.rec.id);if(!adm)throw new Error('تعذر قراءة البيانات');const e=pwErr(pw,adm.username);if(e)throw new Error(e);
   dek=raw;DK=await dkey(raw);uid=adm.id;await Auth.setPass(adm.id,adm.username,pw);await unlock(raw,adm.id,data);fresh=true},
  wipeAll(){['kt_dbe','kt_ks','kt_lg','kt_db','kt_db_real','kt_demo'].forEach(x=>localStorage.removeItem(x));sessionStorage.removeItem('kt_sk')},
  /* نسخة احتياطية مشفرة بباسورد خاص */
  async packBackup(json,pass){const salt=rnd(16),it=300000;return JSON.stringify({kt:'bak1',it,s:b64(salt),d:await seal(await kdf(pass,salt,it),te.encode(json))})},
  async unpackBackup(text,pass){const o=JSON.parse(text);return new TextDecoder().decode(await open(await kdf(pass,unb(o.s),o.it),o.d))},
  /* بعد الاستعادة: نحافظ على حسابات الدخول الحالية */
  mergeRestore(d,oldUsers){const ks=getKS();let mx=Math.max(0,...d.users.map(u=>u.id));Object.keys(ks.u).forEach(k=>{let nu=d.users.find(u=>low(u.username)===k);if(!nu){const o=oldUsers.find(u=>u.id==ks.u[k].id);if(!o){delete ks.u[k];return}nu=Object.assign({},o);if(d.users.some(u=>u.id==nu.id))nu.id=++mx;d.users.push(nu)}ks.u[k].id=nu.id});
   if(ks.rec){const o=oldUsers.find(u=>u.id==ks.rec.id);const nu=o&&d.users.find(u=>low(u.username)===low(o.username));if(nu)ks.rec.id=nu.id}
   putKS(ks);const cu=oldUsers.find(u=>u.id==uid),nu=cu&&d.users.find(u=>low(u.username)===low(cu.username));uid=nu?nu.id:uid;d.me=uid}
 };
 function idleMs0(){return 120*60000}
})();
/* حفظ مشفر: النقطة الوحيدة اللي بتكتب بيانات النظام */
const AUTH_CSS=`body.authb{padding-bottom:0;background:linear-gradient(165deg,#0a1730,#13233b 45%,#1d3f73)!important;min-height:100vh}body.authb header,body.authb nav{display:none!important}body.authb main{max-width:none;padding:0}
.aw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px}.ac{width:100%;max-width:400px;background:var(--card,#fff);color:var(--txt,#171d25);border-radius:22px;padding:24px 20px;box-shadow:0 20px 50px #0007}
.ac .lg{display:block;margin:-62px auto 8px;width:84px;height:84px;border-radius:50%;border:4px solid var(--card,#fff);background:#fff;box-shadow:0 6px 18px #0004}.ac h1{font-size:20px;text-align:center;margin:6px 0 2px}.ac .sub{text-align:center;color:var(--mut,#6b727c);font-size:13px;margin-bottom:6px}
.ac .pw{position:relative}.ac .pw button{position:absolute;left:8px;top:50%;transform:translateY(-50%);border:0;background:none;font-size:18px;padding:6px}.ac .er{color:#c0392b;font-size:13px;text-align:center;min-height:18px;margin-top:10px;font-weight:700}
.ac .ft{text-align:center;color:var(--mut,#6b727c);font-size:12px;margin-top:14px}.ac a.lk{display:block;text-align:center;font-size:13px;margin-top:12px;color:#2f5fa8}.ac .sm{height:6px;border-radius:4px;background:#e2e8f0;margin-top:6px;overflow:hidden}.ac .sm i{display:block;height:100%;width:0;transition:.2s}
.ac .code{direction:ltr;text-align:center;font:800 20px/1.6 monospace;letter-spacing:1px;background:#eef3fb;border:2px dashed #2f5fa8;border-radius:14px;padding:14px 8px;margin:12px 0;user-select:all;color:#13233b}.ac .note{background:#fff7e0;color:#6b4a00;border-radius:12px;padding:10px;font-size:12.5px;margin-top:10px;line-height:1.7}
#wel{position:fixed;inset:0;z-index:99;background:linear-gradient(165deg,#0a1730,#1d3f73);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;animation:wf .5s;padding:20px}#wel img{width:96px;height:96px;border-radius:50%;background:#fff;box-shadow:0 8px 24px #0006}#wel h1{font-size:26px;margin:18px 0 6px}#wel p{margin:3px 0;opacity:.85;font-size:14px}#wel.out{opacity:0;transition:opacity .45s}@keyframes wf{from{opacity:0;transform:scale(.97)}to{opacity:1}}`;
(()=>{const s=document.createElement('style');s.textContent=AUTH_CSS;document.head.appendChild(s)})();
/* ---------- واجهات الدخول ---------- */
const A$=id=>document.getElementById(id);
function authShell(inner){document.body.classList.add('authb');$('#hd').innerHTML='';$('#nav').innerHTML='';$('#app').innerHTML=`<div class="aw"><div class="ac"><img class="lg" src="${LOGO}" alt="">${inner}</div></div>`}
const eyeBtn=id=>`<button type="button" aria-label="إظهار" onclick="const i=A$('${id}');i.type=i.type==='password'?'text':'password'">👁</button>`;
function authScreen(){if(Auth.hasKS()){authLogin();return}
 if(Auth.hasData()){authShell(`<h1>ملف المفاتيح ناقص</h1><div class="sub">البيانات المشفرة موجودة بس ملف الدخول مش موجود على الجهاز ده. لو عندك نسخة احتياطية استعملها بعد البدء من جديد.</div><button class="btn del" onclick="if(confirm('ده هيمسح البيانات المشفرة على الجهاز ده نهائياً. متأكد؟')){Auth.wipeAll();location.reload()}">البدء من جديد</button>`);return}
 authEnvScreen()}
function authLogin(){const w=Auth.wait();authShell(`<h1>${esc(db.settings.name||'خالد تريد')}</h1><div class="sub">سجّل دخولك علشان تكمل</div>
 <form onsubmit="authDoLogin();return false"><label>اسم المستخدم</label><input id="lg_u" autocomplete="username" autocapitalize="none" spellcheck="false"><label>الباسورد</label><div class="pw"><input id="lg_p" type="password" autocomplete="current-password">${eyeBtn('lg_p')}</div>
 <div class="er" id="lg_e">${w?'استنى '+w+' ثانية':''}</div><button class="btn" id="lg_b" type="submit" style="margin-top:6px">دخول</button></form><a class="lk" onclick="authRecover()">نسيت الباسورد؟</a><div class="ft">🔒 بياناتك مشفرة على الجهاز</div>`);setTimeout(()=>{const u=A$('lg_u');if(u)u.focus()},50)}
async function authDoLogin(){const u=A$('lg_u').value,p=A$('lg_p').value,b=A$('lg_b'),e=A$('lg_e');if(!u.trim()||!p){e.textContent='اكتب اسم المستخدم والباسورد';return}
 b.disabled=true;b.textContent='جارِ التحقق…';e.textContent='';const r=await Auth.login(u,p);if(r.ok){postInit();welcome();route();return}
 if(!Auth.hasUser(u)&&!/استنى/.test(r.msg||'')){b.textContent='جارِ التحقق…';e.textContent='المستخدم ده مش متسجل على الجهاز ده. افتح اللينك من جهاز جديد، أو كلم المدير';}
 else e.textContent=r.msg;b.disabled=false;b.textContent='دخول';A$('lg_p').value='';A$('lg_p').focus()}
/* شاشة الجهاز الجديد: اسم المستخدم والباسورد بس. الظرف المشفر على السحابة بيربط الجهاز لوحده */
function authEnvScreen(){authShell(`<h1>${esc((db.settings&&db.settings.name)||'خالد تريد')}</h1><div class="sub">اكتب اسم المستخدم والباسورد اللي المدير إداهولك</div>
 <form onsubmit="authEnvGo();return false"><label>اسم المستخدم</label><input id="ev_u" autocomplete="username" autocapitalize="none" spellcheck="false"><label>الباسورد</label><div class="pw"><input id="ev_p" type="password" autocomplete="current-password">${eyeBtn('ev_p')}</div>
 <div class="er" id="ev_e"></div><button class="btn" id="ev_b" type="submit" style="margin-top:6px">دخول</button></form><a class="lk" onclick="authSetup()">أول تشغيل للمدير</a><div class="ft">🔒 بياناتك مشفرة، وبتتزامن لوحدها بعد الدخول</div>`);setTimeout(()=>{const u=A$('ev_u');if(u)u.focus()},50)}
async function authEnvGo(){const u=A$('ev_u').value.trim(),p=A$('ev_p').value,b=A$('ev_b'),e=A$('ev_e');if(!u||!p){e.textContent='اكتب اسم المستخدم والباسورد';return}
 b.disabled=true;b.textContent='جارِ الدخول…';e.textContent='';
 try{const r=await KSY.envLogin(u,p);r.data.sync=r.sync;await Auth.joinDevice(r.data,u,p);postInit();welcome();route()}
 catch(x){b.disabled=false;b.textContent='دخول';e.textContent=x.message||'حصلت مشكلة';A$('ev_p').value=''}}
function strengthBar(pw,id){const s=Auth.score(pw),c=['#c0392b','#e67e22','#e6b93c','#3769b5','#1c4b92'][s],t=['ضعيف جداً','ضعيف','مقبول','كويس','قوي'][s];const el=A$(id);if(el){el.firstElementChild.style.width=(pw?(s+1)*20:0)+'%';el.firstElementChild.style.background=c;el.nextElementSibling.textContent=pw?'قوة الباسورد: '+t:''}}
function authSetup(){const old=Auth.legacyRaw()?true:false;let a={};try{a=old?(JSON.parse(Auth.legacyRaw()).users||[]).find(x=>(x.perms||[]).includes('*'))||{}:{}}catch(e){}
 authShell(`<h1>أهلاً بيك في خالد تريد 👋</h1><div class="sub">${old?'هنأمّن بياناتك الحالية بباسورد وتشفير':'جهّز حساب المدير علشان تبدأ'}</div>
 <form onsubmit="authDoSetup();return false"><label>اسمك</label><input id="st_n" value="${esc(a.name&&a.name!=='المدير'?a.name:'')}" autocomplete="name"><label>اسم المستخدم (للدخول)</label><input id="st_u" value="${esc(a.username&&a.username!=='admin'?a.username:'')}" autocapitalize="none" autocomplete="username" spellcheck="false">
 <label>الباسورد</label><div class="pw"><input id="st_p" type="password" autocomplete="new-password" oninput="strengthBar(this.value,'st_s')">${eyeBtn('st_p')}</div><div class="sm" id="st_s"><i></i></div><div style="font-size:12px;color:var(--mut)"></div>
 <label>تأكيد الباسورد</label><input id="st_c" type="password" autocomplete="new-password"><div class="er" id="st_e"></div><button class="btn" id="st_b" type="submit">إنشاء الحساب وتشفير البيانات</button></form>
 <div class="note">لا يوجد باسورد افتراضي. اختار باسورد قوي (8 أحرف على الأقل). هتاخد بعد كده كود استرداد لو نسيت الباسورد.</div>`)}
async function authDoSetup(){const n=A$('st_n').value,u=A$('st_u').value,p=A$('st_p').value,c=A$('st_c').value,e=A$('st_e'),b=A$('st_b');e.textContent='';
 if(!n.trim()||!u.trim())return e.textContent='اكتب الاسم واسم المستخدم';if(/\s/.test(u.trim()))return e.textContent='اسم المستخدم من غير مسافات';const er=Auth.pwErr(p,u);if(er)return e.textContent=er;if(p!==c)return e.textContent='الباسورد وتأكيده مش زي بعض';
 b.disabled=true;b.textContent='جارِ التشفير…';try{const code=await Auth.setup(n,u,p);authRecShow(code,true)}catch(x){b.disabled=false;b.textContent='إنشاء الحساب وتشفير البيانات';e.textContent=x.message||'حصل خطأ'}}
function authRecShow(code,first){authShell(`<h1>كود الاسترداد 🔑</h1><div class="sub">احفظه في مكان آمن (ورقة أو مدير باسوردات)</div><div class="code" id="rc">${esc(code)}</div>
 <div class="note">لو نسيت الباسورد، الكود ده هو الطريقة الوحيدة لفتح بياناتك المشفرة. مش هيظهر تاني. أي حد معاه الكود يقدر يفتح النظام.</div>
 <button class="btn sec" type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(code)}').then(()=>toast('اتنسخ ✅'))">📋 نسخ الكود</button>
 <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="rc_ok" style="width:auto" onchange="A$('rc_b').disabled=!this.checked"> حفظت الكود</label><button class="btn" id="rc_b" disabled onclick="${first?'authAfterSetup()':'postInit();route()'}">${first?'ابدأ':'تمام'}</button>`)}
function authAfterSetup(){postInit();welcome();route()}
function authRecover(){authShell(`<h1>استرداد الحساب</h1><div class="sub">اكتب كود الاسترداد وحدد باسورد جديد للمدير</div><form onsubmit="authDoRecover();return false"><label>كود الاسترداد</label><input id="rv_c" dir="ltr" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX">
 <label>الباسورد الجديد</label><div class="pw"><input id="rv_p" type="password" autocomplete="new-password" oninput="strengthBar(this.value,'rv_s')">${eyeBtn('rv_p')}</div><div class="sm" id="rv_s"><i></i></div><div style="font-size:12px;color:var(--mut)"></div><div class="er" id="rv_e"></div><button class="btn" id="rv_b" type="submit">تغيير الباسورد والدخول</button></form><a class="lk" onclick="authLogin()">رجوع لتسجيل الدخول</a>`)}
async function authDoRecover(){const b=A$('rv_b'),e=A$('rv_e');e.textContent='';b.disabled=true;b.textContent='جارِ التحقق…';try{await Auth.recover(A$('rv_c').value,A$('rv_p').value);postInit();welcome();route()}catch(x){b.disabled=false;b.textContent='تغيير الباسورد والدخول';e.textContent=x.message||'حصل خطأ'}}
/* ---------- رسالة الترحيب بعد الدخول ---------- */
function welcome(){document.body.classList.remove('authb');const u=me(),first=String(u.name||'').split(' ')[0],h=new Date().getHours(),g=h<12?'صباح الخير':h<18?'مساء الخير':'مساء النور',role=(TEMPLATES[u.role]||{}).name||((u.perms||[]).includes('*')?'المدير العام':'مستخدم'),pv=Auth.prev?new Date(Auth.prev).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'';
 const d=document.createElement('div');d.id='wel';d.innerHTML=`<img src="${LOGO}" alt=""><h1>${g} يا ${esc(first)} 👋</h1><p>أهلاً بيك في ${esc(db.settings.name||'خالد تريد')}</p><p>${esc(role)}${pv?' · آخر دخول: '+esc(pv):''}</p>`;document.body.appendChild(d);try{audit('تسجيل دخول','')}catch(e){}
 const go=()=>{d.classList.add('out');setTimeout(()=>d.remove(),500)};d.onclick=go;setTimeout(go,2200)}
/* ---------- تهيئة النظام بعد فتح البيانات ---------- */
function postInit(){db.settings=db.settings||{name:'خالد تريد',sub:'أسمدة · مبيدات · مستلزمات زراعية',phone:'',addr:'سيدي سالم'};if(!db.settings.phone)db.settings.phone='';db.payments=db.payments||[];db.seq=db.seq||{};db.seq.pay=db.seq.pay||0;db.board=db.board||[];
 db.customers.forEach(c=>{if(c.open===undefined){c.open=(c.balance||0)-db.invoices.filter(i=>i.cid==c.id).reduce((a,i)=>a+i.rem,0)}});
 ensure();applySettings();autoSeed();checkInst();if(db.settings.logo)LOGO=db.settings.logo;document.body.classList.remove('authb')}
/* ---------- حماية الدوال الحساسة (بجانب إخفاء الشاشات والأزرار) ---------- */
(()=>{const G={saveUser:'users.manage',delUser:'users.manage',saveSettings:'settings.edit',backupExport:'settings.edit',backupImport:'settings.edit',startDemo:'settings.edit',addNote:'users.manage',saveNote:'users.manage',delNote:'users.manage',authNewRec:'users.manage'};
 Object.keys(G).forEach(n=>{const f=window[n];if(typeof f!=='function')return;window[n]=function(...a){if(!DEMO&&!can(G[n]))return toast('🔒 مش مسموح لك بالإجراء ده');return f.apply(this,a)}})})();
/* ---------- المستخدمين: الباسورد بيتخزن مشفر مش هاش ---------- */
async function userPass(u,pw,isNew){if(pw){const e=Auth.pwErr(pw,u.username);if(e){toast(e);return false}await Auth.setPass(u.id,u.username,pw)}else Auth.syncUser(u.id,u.username);return true}
/* ---------- نسخة احتياطية مشفرة + استعادة ---------- */
function askPass(title,conf){return new Promise(res=>{const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:98;background:#0009;display:flex;align-items:center;justify-content:center;padding:20px';d.innerHTML=`<div class="card" style="width:100%;max-width:380px"><h2>${esc(title)}</h2><label>الباسورد</label><input id="ap_1" type="password" autocomplete="off">${conf?'<label>تأكيد الباسورد</label><input id="ap_2" type="password" autocomplete="off">':''}<div class="er" id="ap_e" style="color:#c0392b;font-size:13px;min-height:18px;margin-top:8px"></div><div class="row2"><button class="btn" style="margin:0" id="ap_ok">تمام</button><button class="btn sec" style="margin:0" id="ap_no">إلغاء</button></div></div>`;document.body.appendChild(d);const done=v=>{d.remove();res(v)};
 A$('ap_no').onclick=()=>done(null);A$('ap_ok').onclick=()=>{const a=A$('ap_1').value;if(!a)return;if(conf){const e=Auth.pwErr(a,'');if(e)return A$('ap_e').textContent=e;if(a!==A$('ap_2').value)return A$('ap_e').textContent='الباسورد وتأكيده مش زي بعض'}done(a)};setTimeout(()=>A$('ap_1').focus(),50)})}
async function backupExport(){const p=await askPass('باسورد حماية النسخة الاحتياطية (احفظه، من غيره مفيش استعادة)',true);if(!p)return;try{const t=await Auth.packBackup(JSON.stringify(db),p);dl(new File([t],'khaled-trade-backup-'+today()+'.ktbak',{type:'application/octet-stream'}));db.settings.lastBackup=today();save();try{audit('نسخة احتياطية','')}catch(e){}toast('اتحمل ملف النسخة (مشفر) ✅')}catch(e){toast('فشل عمل النسخة')}}
function backupImport(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{let txt=String(r.result),d;try{const o=JSON.parse(txt);if(o&&o.kt==='bak1'){const p=await askPass('اكتب باسورد النسخة الاحتياطية');if(!p)return;try{txt=await Auth.unpackBackup(txt,p)}catch(e){return toast('الباسورد غلط أو الملف تالف')}}d=JSON.parse(txt)}catch(e){return toast('الملف مش صالح')}
 if(!d||!Array.isArray(d.invoices)||!Array.isArray(d.products)||!Array.isArray(d.customers)||!Array.isArray(d.users))return toast('ده مش ملف نسخة احتياطية للبرنامج');
 if(!confirm('هتستبدل كل البيانات الحالية بالنسخة اللي في الملف ('+d.invoices.length+' فاتورة، '+d.products.length+' صنف). حسابات الدخول الحالية هتفضل زي ما هي. متأكد؟'))return;
 const old=db.users;db=d;ensure();Auth.mergeRestore(db,old);db.users.forEach(u=>{delete u.ph});save();await Auth.flush();toast('تمت الاستعادة ✅');setTimeout(()=>location.reload(),600)};r.readAsText(f)}
/* ---------- إعدادات الأمان ---------- */
const _rsA=R['/settings'];R['/settings']=()=>{const h=_rsA();if(DEMO||!Auth.on())return h;const adm=can('users.manage');
 return h+`<div class="card"><h2>🔒 الأمان</h2><div class="stat"><span>تشفير البيانات</span><b style="color:#1c4b92">مفعّل (AES-256)</b></div><div class="stat"><span>المستخدم الحالي</span><b>${esc(me().name)}</b></div>
 <label>القفل التلقائي بعد (دقيقة خمول)</label><select onchange="db.settings.idle=+this.value;save();toast('اتحفظ ✅')">${[5,15,30,60,120].map(m=>`<option value="${m}" ${(+db.settings.idle||30)==m?'selected':''}>${m}</option>`).join('')}</select>
 <label style="margin-top:14px">تغيير الباسورد بتاعي</label><input id="cp_o" type="password" placeholder="الباسورد الحالي" autocomplete="current-password"><input id="cp_n" type="password" placeholder="الباسورد الجديد" autocomplete="new-password" style="margin-top:8px"><input id="cp_c" type="password" placeholder="تأكيد الجديد" autocomplete="new-password" style="margin-top:8px"><button class="btn sec" onclick="authChangePw()">تغيير الباسورد</button>
 ${adm?'<button class="btn sec" onclick="authNewRec()">🔑 كود استرداد جديد</button>':''}<button class="btn del" onclick="Auth.lock()">🔒 قفل النظام دلوقتي</button></div>`};
async function authChangePw(){const o=A$('cp_o').value,n=A$('cp_n').value,c=A$('cp_c').value;if(!o||!n)return toast('اكتب الباسورد الحالي والجديد');if(n!==c)return toast('التأكيد مش زي الجديد');const e=Auth.pwErr(n,me().username);if(e)return toast(e);try{await Auth.changeOwn(o,n);toast('اتغير الباسورد ✅');['cp_o','cp_n','cp_c'].forEach(i=>A$(i).value='')}catch(x){toast(x.message)}}
async function authNewRec(){if(!confirm('الكود القديم هيتلغي. نكمل؟'))return;const p=await askPass('اكتب باسورد المدير للتأكيد');if(!p)return;try{await Auth.changeOwn(p,p)}catch(e){return toast('الباسورد غلط')}authRecShow(await Auth.newRecovery(),false)}
/* ---------- لوحة الملاحظات (أعلى الشاشة الرئيسية) ---------- */
let NB={edit:null,txt:''};
const nbFmt=t=>esc(t).replace(/\n/g,'<br>');
function notesBoard(){const L=(db.board||[]).slice().sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||b.ts-a.ts),adm=can('users.manage');if(!L.length&&!adm)return '';
 const ed=NB.edit!==null?`<div style="margin-top:10px"><textarea id="nb_t" rows="4" maxlength="600" style="width:100%;padding:12px;border:1.5px solid var(--line);border-radius:12px;font:inherit" placeholder="اكتب الملاحظة أو الإعلان…" oninput="NB.txt=this.value">${esc(NB.txt)}</textarea><div class="row2" style="margin-top:8px"><button class="btn" style="margin:0" onclick="saveNote()">${NB.edit==='new'?'نشر':'حفظ'}</button><button class="btn sec" style="margin:0" onclick="NB.edit=null;route()">إلغاء</button></div></div>`:'';
 return `<div class="card" style="border:1.5px solid #c9d8ef;background:linear-gradient(180deg,#f3f7fd,var(--card))"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">📌 لوحة الملاحظات</h2>${adm&&NB.edit===null?'<button class="chipb" onclick="NB={edit:\'new\',txt:\'\'};route()">＋ ملاحظة</button>':''}</div>
 ${L.map(n=>`<div class="item" style="align-items:flex-start"><div class="main"><div class="t" style="font-weight:600;white-space:normal;line-height:1.7">${n.pin?'📍 ':''}${nbFmt(n.text)}</div><div class="s">${esc(uname(n.by))} · ${esc(new Date(n.ts).toLocaleDateString('ar-EG'))}</div></div>${adm?`<div style="display:flex;gap:6px"><button class="mvb" onclick="NB={edit:${+n.id},txt:(db.board.find(x=>x.id==${+n.id})||{}).text||''};route()">تعديل</button><button class="mvb" onclick="pinNote(${+n.id})">${n.pin?'إلغاء التثبيت':'تثبيت'}</button><button class="mvb" onclick="delNote(${+n.id})">حذف</button></div>`:''}</div>`).join('')||'<div class="s" style="padding:6px 0;color:var(--mut)">مفيش ملاحظات دلوقتي</div>'}${ed}</div>`}
function saveNote(){const t=(NB.txt||'').trim();if(!t)return toast('اكتب الملاحظة');db.board=db.board||[];if(NB.edit==='new'){db.seq.bnote=(db.seq.bnote||0)+1;db.board.push({id:db.seq.bnote,text:t.slice(0,600),ts:Date.now(),by:db.me,pin:false});try{audit('نشر ملاحظة','')}catch(e){}}else{const n=db.board.find(x=>x.id==NB.edit);if(n){n.text=t.slice(0,600);n.ed=Date.now()}}NB={edit:null,txt:''};save();toast('اتحفظت ✅');route()}
function addNote(){NB={edit:'new',txt:''};route()}
function delNote(id){if(!confirm('تحذف الملاحظة؟'))return;db.board=(db.board||[]).filter(n=>n.id!=id);save();route()}
function pinNote(id){const n=(db.board||[]).find(x=>x.id==id);if(n){n.pin=!n.pin;save();route()}}
const _dN=R['/'];R['/']=()=>notesBoard()+_dN();
/* آمن للاستخدام جوه نص JS في onclick: بيهرّب العلامات بعد ما المتصفح يفك الـHTML */
const escJs=s=>esc(String(s??'').replace(/[\\'"\n\r\u2028\u2029<>&]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));

/* ---------- القايمة السريعة أعلى الرئيسية (بتفتح وتقفل، والحالة محفوظة على الجهاز) ---------- */
const QA=[['🧾','فاتورة بيع',"location.hash='#/invoice/new'",['sales.add']],['🛒','فاتورة شراء',"openDoc('pur')",['purchases.add']],['📥','سند قبض',"location.hash='#/vchnew/in'",['customers.collect','cash.view','sales.add']],['📤','سند صرف',"location.hash='#/vchnew/out'",['cash.view','expenses.add','suppliers.view']],['📒','كشف حساب عميل',"location.hash='#/stmt'",['customers.view','customers.collect','reports.view','sales.view']]];
function quickPanel(){const l=QA.filter(q=>q[3].some(can));if(!l.length)return '';const open=!(typeof hkState==='function'?hkState()['⚡ اختصارات سريعة']:localStorage.getItem('kt_qa')==='0');
 return `<div class="card" style="padding:8px 12px"><div onclick="qaTog()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"><b>⚡ اختصارات سريعة</b><span style="font-size:18px;color:var(--mut)">${open?'▲':'▼'}</span></div>${open?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">${l.map(q=>`<button class="btn sec" style="padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px" onclick="${q[2]}"><span style="font-size:22px">${q[0]}</span>${q[1]}</button>`).join('')}</div>`:''}</div>`}
function qaTog(){const st=hkState(),k='⚡ اختصارات سريعة';if(st[k])delete st[k];else st[k]=1;save();route()}
const _dQ=R['/'];R['/']=()=>quickPanel()+_dQ();

/* ===== افتراضيًا محدش يحذف أو يعدّل أي حاجة محفوظة غير المدير، إلا لو اتداله صلاحية =====
   صلاحيتين جداد في صلاحيات المستخدم: data.delete (حذف/إلغاء أي حاجة) و data.edit (تعديل مستند محفوظ).
   الدوال دي بتتغلّف بفحص الصلاحية، والمدير (صلاحية كاملة) بيعدّي. */
function gateDel(){['delAcct','delCat','delChq','delCustomer','delExp','delList','delNote','delOffer','delPay2','delPlace','delProduct','delQuote','delRexp','delSup','delUser','hrDel','hrDelAtt','hrDelEmp','spDel','handDel','removeUser','cdDel','chatDel','mnDel','vDel','delInvoice','delPay2'].forEach(n=>{try{const f=window[n];if(typeof f!=='function'||f.__g)return;const g=function(){if(!can('data.delete'))return toast('🔒 الحذف محتاج صلاحية من المدير');return f.apply(this,arguments)};g.__g=1;window[n]=g}catch(e){}})}
const _oaGate=outAuto;outAuto=function(){gateDel();_oaGate()};
gateDel();
/* الحذف للمدير بس: إعادة التغليف بعد تحميل كل السكربتات (لأن بعضها بيعيد تعريف الدوال) */
window.addEventListener('load',()=>{try{gateDel()}catch(e){}});


const needLogin=()=>!DEMO&&!Auth.ok();
function route(){if(needLogin()){authScreen();return}document.body.classList.remove('authb');if(Auth.uid)db.me=Auth.uid;
 const h=location.hash.slice(1)||'/';const [path,qs]=h.split('?');const seg=path.split('/').filter(Boolean).map(x=>x.replace(/[^\w\u0600-\u06FF.\-]/g,''));const key='/'+(seg[0]||'');
 const f=R[key]||R['/'];let html;
 if(!routeAllowed(key,seg)){head('ممنوع',true);html='<div class="empty">🔒 مش مسموح لك تفتح الصفحة دي. كلم المدير.</div>'}else html=f(seg[1],qs);
 $('#app').innerHTML=html;document.querySelectorAll('#app [data-need]').forEach(e=>{if(!can(e.dataset.need))e.remove()});
 if(key==='/invoice'&&seg[1]==='new'){$('#app').insertAdjacentHTML('beforeend','<div id="sbar" class="sbar"></div>');drawLines();}
 outAuto();navbar();window.scrollTo(0,0);}
db.settings=db.settings||{name:'خالد تريد',sub:'أسمدة · مبيدات · مستلزمات زراعية',phone:'',addr:'سيدي سالم'};if(!db.settings.phone)db.settings.phone='';
db.payments=db.payments||[];db.seq.pay=db.seq.pay||0;
db.customers.forEach(c=>{if(c.open===undefined){c.open=(c.balance||0)-db.invoices.filter(i=>i.cid==c.id).reduce((a,i)=>a+i.rem,0)}});
if(location.search.includes('demo=1')&&!db.products.length){seed();ensure();['Green Life','سينجنتا','الدلتا للأسمدة'].forEach(n=>db.companies.push({id:++db.seq.co,name:n}));db.products.forEach((p,i)=>{p.co=[3,1,3,1,2,1,2][i%7]||1});db.products.forEach(p=>{p.pack={'شيكارة':'50 كجم','لتر':'1 لتر','كرتونة':'12 علبة'}[p.unit]||''});save();demoMore();demoPlus()}
ensure();save();
applyMode();addEventListener('hashchange',route);
/* التشغيل: وضع تجريبي بدون دخول، أو استرجاع جلسة مفتوحة، أو شاشة الدخول */
(async()=>{if(top!==self){document.body.innerHTML='';return}if(DEMO)postInit();else if(await Auth.resume())postInit();route()})();
