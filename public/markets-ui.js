/* Garage Empire markets UI layer: country, local/import, optional road registration. */
(function(){
const ar=()=>S.lang==='ar',W=(e,a)=>ar()?a:e,K=()=>MK.M.country,M=MK.M;
const nm=k=>MK.C[k].n[ar()?1:0];
const usd=x=>fmt(x);
const loc=n=>S.cur==='USD'?n:Math.round(n*MK.rate());
const fm=n=>S.cur==='USD'?'$'+n.toLocaleString('en-US'):n.toLocaleString('en-US')+' '+MK.cl()[ar()?1:0];
const sumLoc=a=>a.reduce((s,n)=>s+loc(n),0);
const rng=(a,b)=>a+Math.random()*(b-a);
const refOf=cid=>{const a=MK.anchor(cid,K());return {base:a?a.usd:CARS[cid][5],a}};
const regNow=()=>M.reg?MK.regFee(K()):0;
function mkStock(){const pool=CARS.map((c,i)=>i).filter(i=>MK.has(K(),CARS[i])===(M.mode==='local'));
 const list=pool.length?pool:CARS.map((c,i)=>i);const out=[],sm=[];
 const fee0=regNow(),poor=S.own.length===0&&S.usd>0,cheap=poor?list.filter(i=>refOf(i).base*.64<=S.usd-fee0):[];
 for(let n=0;n<6;n++){let cid=list[Math.min(list.length-1,Math.floor(Math.pow(Math.random(),1.7)*list.length))],cond=Math.round(rng(35,100)),tr=0;
  if(poor&&cheap.length&&n<4)cid=cheap[Math.floor(Math.random()*cheap.length)];
  let r=refOf(cid),base=Math.round(r.base*(.5+.5*cond/100)*rng(.95,1.2));
  while(poor&&cheap.length&&n<4&&base>S.usd-fee0&&tr++<15){cond=Math.round(rng(35,70));base=Math.round(r.base*(.5+.5*cond/100)*rng(.95,1.05))}const q=MK.calc(cid,base,K());q.ref=r.base;q.a=r.a?{url:r.a.url,d:r.a.d,basis:r.a.basis,exact:r.a.exact}:null;
  out.push({cid,cond,price:Math.round(q.total)});sm.push(q)}
 M.sm=sm;MK.save();return out}
window.stock=mkStock;
function prune(){const ids=new Set(S.own.map(o=>o.id));const n=M.un.length+Object.keys(M.pl).length;M.un=M.un.filter(x=>ids.has(x));for(const k of Object.keys(M.pl))if(!ids.has(+k))delete M.pl[k];for(const k of Object.keys(M.meta))if(!ids.has(+k))delete M.meta[k];if(n!==M.un.length+Object.keys(M.pl).length)MK.save()}
function ensure(){prune();if(!Array.isArray(M.sm)||M.sm.length!==S.stock.length||M.sm.some(q=>!q||q.k!==K())){S.stock=mkStock()}}
function srcLine(a){if(!a)return W('Price: game estimate, not a sourced market price','السعر: تقدير للعبة مش سعر سوق موثّق');
 return`${W('Price source','مصدر السعر')} (${a.exact===2?W('same model, first-registration year matches','نفس الموديل وسنة التسجيل الأول مطابقة'):a.exact?W('same model and year','نفس الموديل والسنة'):W('proxy estimate, not an exact match (year, trim or sale type, see note)','تقدير بديل مش مطابق تماما (السنة أو الفئة أو نوع البيع، شوف الملاحظة)')}, ${a.basis==='used'?W('used-market price, no added tax','سعر مستعمل، من غير ضريبة مضافة'):W('new-car price','سعر عربية جديدة')}): <a href="${a.url}" target="_blank" rel="noopener">${a.d[ar()?1:0]}</a>`}
function items(q,fee){const K0=MK.C[q.k],r=[];
 if(!q.imp){r.push([W('Car price','سعر العربية'),q.base]);if(q.fresh&&q.vat)r.push([`${W('VAT','الضريبة')} ${Math.round(K0.vat*100)}% (${W('new car','عربية جديدة')})`,q.vat])}
 else{r.push([W('Car','العربية'),q.base],[W('Shipping (estimate)','الشحن (تقديري)'),q.ship],[`${W('Duty','الجمارك')} ${Math.round(q.dr*100)}%`,q.du]);if(q.xt)r.push([`${W('Extra duty','رسم إضافي')} ${Math.round(q.ex*100)}%`,q.xt]);r.push([`${W('VAT','الضريبة')} ${Math.round(q.vr*100)}%`,q.vat])}
 if(fee)r.push([W('Road registration (game estimate)','تسجيل الطريق (تقدير للعبة)'),fee]);return r}
function gtot(q,fee){return fm(sumLoc(items(q,fee).map(x=>x[1])))}
function breakdown(q,fee,cond){const it=items(q,fee);const L=(q.imp?[W('Import:','استيراد:')]:[]).concat(it.map(x=>`${x[0]}: ${fm(loc(x[1]))}`));
 L.push(`<b>${W('Total to pay','الإجمالي المطلوب')}: ${gtot(q,fee)}</b>`);
 if(cond)L.push(W('Delivered in used condition 70% (game)','بتوصل بحالة مستعمل 70% (لعبة)'));
 L.push(srcLine(q.a));return L.join('<br>')}
function usedBasis(a){return !!(a&&a.basis==='used')}
function quote(cid){const r=refOf(cid),q=MK.calc(cid,r.base,K(),usedBasis(r.a)?0:1);q.ref=r.base;q.ub=usedBasis(r.a);q.a=r.a?{url:r.a.url,d:r.a.d,basis:r.a.basis,exact:r.a.exact}:null;return q}
MK.quote=quote;
MK.grandStr=cid=>gtot(quote(cid),regNow());MK.tileStr=cid=>fm(sumLoc(items(quote(cid),0).map(x=>x[1])));
MK.quoteHtml=cid=>{const q=quote(cid);return`<p class="mut" style="font-size:12px">${W('Market','سوق')}: ${nm(K())}<br>${breakdown(q,regNow(),q.ub)}<br>${W('Game estimate, not official tax advice.','تقدير للعبة، مش استشارة ضريبية رسمية.')}</p>`};
function buyCatalogN(cid){if(racing)return toast(W('Finish the race first','استنى السباق يخلص'));if(S.own.length>=8)return toast(t('full'));const q=quote(cid);
 if(S.usd<Math.round(q.total)+regNow())return toast(t('poor'));
 const cd=q.ub?70:100;S.stock.push({cid,cond:cd,price:Math.round(q.total)});M.sm.push(q);const n0=S.own.length;buy(S.stock.length-1);
 if(S.own.length>n0){S.own[S.own.length-1].w=[cd,cd,cd]}S.tab='garage';render()}
window.buyCatalog=buyCatalogN;
const _buy=window.buy;
window.buy=function(i){const s=S.stock[i];if(!s)return;const fee=regNow();
 if(S.own.length<8&&S.usd<s.price+fee)return toast(t('poor'));
 const n0=S.own.length,len0=S.stock.length,q0=M.sm[i],base0=CARS[s.cid][5];_buy(i);
 if(S.own.length>n0){if(S.stock.length<len0)M.sm.splice(i,1);const o=S.own[S.own.length-1];M.meta[o.id]={c:K(),r:Math.min(1,q0&&q0.ref?q0.ref/base0:1)};
  if(M.reg){S.usd-=fee;if(K()==='eg')M.pl[o.id]='private'}else if(!M.un.includes(o.id))M.un.push(o.id);MK.save();render()}};
const _sell=window.sell;window.sell=function(id){const o=S.own.find(x=>x.id===id);const v=o?Math.round(val(o)):0,m=M.meta[id],r=m&&typeof m.r==='number'&&m.r>0&&m.r<=1?m.r:1,u0=S.usd;_sell(id);if(!S.own.find(x=>x.id===id)){if(r<1)S.usd=u0+Math.round(v*r);M.un=M.un.filter(x=>x!==id);delete M.pl[id];delete M.meta[id];MK.save()}};
const _apply=window.applyState;window.applyState=function(d){_apply(d);M.un=[];M.pl={};M.sm=[];M.meta={};MK.save()};
window.regCar=function(id){const o=S.own.find(x=>x.id===id);if(!o||!M.un.includes(id))return;if(racing)return toast(W('Finish the race first','استنى السباق يخلص'));
 const bc=(M.meta[id]&&MK.C[M.meta[id].c])?M.meta[id].c:K(),fee=MK.regFee(bc);if(S.usd<fee)return toast(t('poor'));S.usd-=fee;M.un=M.un.filter(x=>x!==id);if(bc==='eg')M.pl[id]='private';MK.save();toast(W('Registered for the road','اتسجلت للطريق'));render()};
window.setCountry=function(k){if(!MK.C[k])return;M.country=k;M.sm=[];S.stock=mkStock();render()};
window.setMode=function(m){M.mode=m==='import'?'import':'local';S.stock=mkStock();render()};
window.setReg=function(v){M.reg=!!v;MK.save();render()};
/* Export and restore keep registration data with the cars. A file without the markets block is a pre-update save: its cars were already on the road, so they stay registered. */
window.exportSave=function(){const data=GarageSave.normalize(S);prune();data.markets={v:1,country:M.country,mode:M.mode,reg:M.reg,un:M.un.slice(),pl:Object.assign({},M.pl),meta:JSON.parse(JSON.stringify(M.meta))};
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='garage-empire-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.importSave=function(input){const file=input.files[0];if(!file)return;if(file.size>200000){toast(W('Save file too large','ملف الحفظ كبير زيادة'));input.value='';return}
 const fr=new FileReader();fr.onload=()=>{try{const raw=JSON.parse(fr.result),data=GarageSave.normalize(raw);if(!data)throw Error();
  if(confirm(W('Replace this browser progress with the backup?','تستبدل تقدم المتصفح بالنسخة الاحتياطية؟'))){applyState(data);
   const mk=raw&&raw.markets;if(mk&&mk.v===1&&MK.C[mk.country]){const ids=new Set(data.own.map(o=>o.id));M.country=mk.country;M.mode=mk.mode==='import'?'import':'local';M.reg=mk.reg!==false;
    M.un=(Array.isArray(mk.un)?mk.un:[]).filter(x=>Number.isInteger(x)&&ids.has(x));M.meta={};if(mk.meta&&typeof mk.meta==='object')for(const k of Object.keys(mk.meta)){const e=mk.meta[k];if(ids.has(+k)&&e&&MK.C[e.c]&&typeof e.r==='number'&&e.r>0&&e.r<=1)M.meta[k]={c:e.c,r:e.r}}M.pl={};if(mk.pl&&typeof mk.pl==='object')for(const k of Object.keys(mk.pl))if(ids.has(+k)&&mk.pl[k]==='private')M.pl[k]='private';}
   M.sm=[];MK.save();render()}}catch{toast(W('Invalid save file','ملف الحفظ مش صالح'))}input.value=''};fr.readAsText(file)};
const _race=window.race;window.race=function(){const o=cur();if(o&&M.un.includes(o.id))return toast(W('This car is not road-registered. Register it in the Garage to enter races.','العربية دي مش مسجلة للطريق. سجلها من الجراج عشان تدخل سباقات.'));return _race()};
function plateBadge(id){const p=M.pl[id];if(!p)return'';const P=MK.PLATES[p];return`<span style="background:${P.col};color:#000;border-radius:4px;padding:1px 6px;font-size:12px">${W(P.en,P.ar)}</span>`}
function facts(){const F=MK.C[K()].facts;return`<details><summary>${W('Sourced facts and game estimates','معلومات موثّقة وتقديرات اللعبة')}</summary><p class="mut" style="font-size:12px">${F.length?F.map(f=>`• <a href="${f[2]}" target="_blank" rel="noopener">${f[ar()?1:0]}</a>`).join('<br>'):W('No individually verified facts for this country yet.','مفيش معلومات متأكد منها لبلد دي لسه.')}<br>• ${W('Car prices are game values except where a card shows a price source (only a few cars have one). Shipping, other duties and taxes, registration fees, exchange rates and which cars are sold locally are game estimates or game design, not law or official tax advice. Egypt rules are not applied to other countries. All cars here are private passenger cars, so only the private plate is used; taxi and transport plates are not modeled.','أسعار العربيات أسعار لعبة إلا اللي على كارتها مصدر سعر (عربيات قليلة بس). الشحن والجمارك والضرايب التانية ورسوم التسجيل وأسعار الصرف والعربيات المتاحة محليا تقدير أو تصميم للعبة مش قانون ولا استشارة ضريبية. قواعد مصر مش بتتطبق على باقي البلاد. كل العربيات هنا ملاكي فبنستخدم اللوحة الملاكي بس، ولوحات الأجرة والنقل مش متمثلة.')}</p></details>`}
window.vMarket=function(){ensure();const opts=Object.keys(MK.C).map(k=>`<option value="${k}" ${k===K()?'selected':''}>${nm(k)}</option>`).join('');
 const fee=MK.regFee(K()),cl=MK.cl()[ar()?1:0];
 const head=`<div class="card"><div class="row"><label>${W('Country','الدولة')} <select onchange="setCountry(this.value)">${opts}</select></label><span class="mut">1 USD = ${MK.rate()} ${cl} (${W('game rate','سعر اللعبة')})</span></div>
 <div class="row" style="margin-top:6px"><button class="${M.mode==='local'?'pri':''}" onclick="setMode('local')">${W('Local cars','عربيات محلية')}</button><button class="${M.mode==='import'?'pri':''}" onclick="setMode('import')">${W('Import from abroad','استيراد من برة')}</button></div>
 <div class="row" style="margin-top:6px"><label><input type="checkbox" ${M.reg?'checked':''} onchange="setReg(this.checked)"> ${W('Register for the road on purchase','سجّلها للطريق عند الشراء')} (${usd(fee)})</label></div>
 <p class="mut" style="font-size:12px">${M.reg?'':W('Unregistered cars can be bought and tuned but cannot start races until registered. No fines, no resale penalty.','العربيات غير المسجلة تتشرى وتتعدل بس مش بتدخل سباقات لحد ما تتسجل. من غير غرامات ولا خصم عند البيع.')}${K()==='eg'?' '+W('Egypt: registered private cars get the light blue plate. Fee is a game estimate.','مصر: العربية الملاكي المسجلة بتاخد اللوحة اللبني. الرسوم تقديرية للعبة.'):''}</p>${facts()}</div>`;
 return head+`<button onclick="S.stock=stock();render()" style="margin-bottom:10px">${t('refresh')}</button>`+S.stock.map((s,i)=>{const c=CARS[s.cid],q=M.sm[i];return`<div class="card"><div class="row"><b>${c[0]} <span class="mut">${c[1]}</span></b>${tag(c[2])}</div>${infoButton(s.cid)}
 <div class="row"><span class="mut">${t('hp')}: ${c[3]} · ${W('Mass','الوزن')}: ${c[4]} ${t('kg')} · ${t('cond')}: ${s.cond}%</span><button class="pri" onclick="buy(${i})">${t('buy')} ${q?gtot(q,regNow()):fmt(s.price+regNow())}</button></div>${q?`<div class="mut" style="font-size:12px">${breakdown(q,regNow())}</div>`:''}</div>`}).join('')};
const _vG=window.vGarage;
window.vGarage=function(){prune();const o=cur();let top='';
 if(o){const un=M.un.includes(o.id),fee=MK.regFee((M.meta[o.id]&&MK.C[M.meta[o.id].c])?M.meta[o.id].c:K());top=`<div class="card"><div class="row"><b>${W('Road registration','تسجيل الطريق')}: ${CARS[o.cid][0]}</b>${un?`<span class="mut">${W('Not registered','مش مسجلة')}</span>`:(M.pl[o.id]?plateBadge(o.id):`<span class="mut">${W('Registered','مسجلة')}</span>`)}</div>
 ${un?`<div class="row"><span class="mut" style="font-size:12px">${W('Cannot start races until registered. Fee is a game estimate.','مش هتدخل سباقات لحد ما تتسجل. الرسوم تقديرية للعبة.')}</span><button class="pri" onclick="regCar(${o.id})">${W('Register','سجّل')} ${usd(fee)}</button></div>`:''}</div>`}
 return top+_vG()};
const _vR=window.vRace;
window.vRace=function(){const o=cur();const w=o&&M.un.includes(o.id)?`<div class="card" style="border-color:#ffb454">${W('This car is not road-registered. Register it in the Garage to start races.','العربية دي مش مسجلة للطريق. سجلها من الجراج عشان تبدأ سباقات.')}</div>`:'';return w+_vR()};
ensure();render();
})();
