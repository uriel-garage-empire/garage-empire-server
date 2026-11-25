/* Garage Empire UI2 layer. Presentation only: no game rules, prices or save data are changed here. */
(function(){
const ar=()=>S.lang==='ar',W=(e,a)=>ar()?a:e;
const PAGES={
 garage:{ic:'🚗',en:['Garage','Your cars, paint and road registration'],ar:['الجراج','عربياتك واللون وتسجيل الطريق']},
 market:{ic:'🏷️',en:['Market','Local deals or imports, with the full cost shown'],ar:['السوق','عربيات محلية أو استيراد، والتكلفة كلها قدامك']},
 catalog:{ic:'🖼️',en:['Showroom','Browse and preview every car in 3D'],ar:['المعرض','تصفّح كل العربيات وشوفها 3D']},
 work:{ic:'🔧',en:['Workshop','Repair wear before it costs you a race'],ar:['الورشة','صلّح التآكل قبل ما يكلفك السباق']},
 parts:{ic:'⚙️',en:['Parts','Service kits, tuning and upgrades'],ar:['القطع','صيانة وتعديلات وتطويرات']},
 team:{ic:'👥',en:['Crew','Hire specialists who help you win'],ar:['الفريق','وظّف ناس تساعدك تكسب']},
 race:{ic:'🏁',en:['Street race','400 m, green-light launch, shift in the zone'],ar:['سباق الشارع','400 متر، انطلاقة على الأخضر، وغيّر الغيار في المنطقة']}
};
const ORDER=['garage','market','catalog','work','parts','team','race'];
const pg=k=>PAGES[k][ar()?'ar':'en'];
const CAR_SVG=`<svg viewBox="0 0 600 190" aria-hidden="true"><defs><linearGradient id="hb" x1="0" x2="1"><stop offset="0" stop-color="#ff5a1f"/><stop offset="1" stop-color="#ff2d95"/></linearGradient><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe9ff"/><stop offset="1" stop-color="#1b3550"/></linearGradient></defs>
<path d="M22 138 Q20 118 44 112 L128 100 Q168 62 214 50 Q250 42 300 42 L372 44 Q418 48 450 80 L520 94 Q574 102 580 128 L582 146 Q582 152 574 152 L26 152 Q22 152 22 146Z" fill="url(#hb)"/>
<path d="M170 98 Q196 66 232 58 L292 56 L296 98Z" fill="url(#hg)" opacity=".92"/><path d="M308 56 L366 58 Q398 62 424 98 L308 98Z" fill="url(#hg)" opacity=".92"/>
<path d="M30 124 L560 124" stroke="#0a0c14" stroke-opacity=".35" stroke-width="2"/><rect x="540" y="108" width="34" height="9" rx="4" fill="#fff6c8"/><rect x="26" y="116" width="20" height="8" rx="3" fill="#ff2040"/>
<g fill="#0a0c14"><circle cx="138" cy="150" r="33"/><circle cx="466" cy="150" r="33"/></g><g fill="#c9d3ea"><circle cx="138" cy="150" r="19"/><circle cx="466" cy="150" r="19"/></g><g fill="#0a0c14"><circle cx="138" cy="150" r="7"/><circle cx="466" cy="150" r="7"/></g></svg>`;
const SKY=Array.from({length:20},(_,i)=>{const e=30+((i*47)%110);return`<rect x="${i*42}" y="${200-e}" width="34" height="${e}"/>`}).join('');
function sheet(kind){
 const el=document.getElementById('sheet');el.classList.add('open');el.dataset.kind=kind;
 const seg=(items,cur,fn)=>`<div class="seg">${items.map(([v,l])=>`<button class="${cur===v?'on':''}" onclick="${fn}('${v}')">${l}</button>`).join('')}</div>`;
 let body;
 if(kind==='how'){
  body=`<div class="top"><h2>${W('How to play','إزاي تلعب')}</h2><button onclick="UI2.close()" aria-label="Close">✕</button></div>
  <ol><li>${W('Open the Market, pick a country, and buy a car you can afford.','افتح السوق، اختار الدولة، واشتري عربية تقدر عليها.')}</li>
  <li>${W('Register it for the road, otherwise it cannot race.','سجّلها للطريق، من غير كده مش هتدخل سباقات.')}</li>
  <li>${W('Fix wear in the Workshop and upgrade it in Parts.','صلّح التآكل في الورشة وطوّرها من القطع.')}</li>
  <li>${W('Race: wait for green, tap to launch, then shift inside the green zone.','السباق: استنى الأخضر، دوس تنطلق، وغيّر الغيار جوه المنطقة الخضرا.')}</li>
  <li>${W('Win prizes, climb the six tiers, hire a crew, and fill your garage.','اكسب الجوايز، اطلع الست درجات، وظّف فريق، وكبّر جراجك.')}</li></ol>
  <p class="sv">${W('Prices are game estimates unless a card shows a price source.','الأسعار تقديرية للعبة إلا اللي على كارتها مصدر سعر.')}</p>`;
 }else{
  const st=document.getElementById('saveState').textContent;
  body=`<div class="top"><h2>${W('Settings','الإعدادات')}</h2><button onclick="UI2.close()" aria-label="Close">✕</button></div>
  <div class="grp"><small>${W('LANGUAGE','اللغة')}</small>${seg([['ar','العربية'],['en','English']],S.lang,'UI2.set_lang')}</div>
  <div class="grp"><small>${W('CURRENCY','العملة')}</small>${seg([['USD','USD'],['EGP','EGP']],S.cur,'UI2.set_cur')}</div>
  <div class="grp"><small>${W('THEME','المظهر')}</small>${seg([['','Auto'],['dark',W('Dark','داكن')],['light',W('Light','فاتح')]],S.theme||'','UI2.set_theme')}</div>
  ${window.Cloud?Cloud.settingsHTML():''}
  <div class="grp"><small>${W('SAVE','الحفظ')}</small><p class="sv">${st}</p>
   <button class="act" onclick="exportSave()">${W('Export save','نزّل نسخة حفظ')}</button>
   <label class="act">${W('Restore save','استرجع حفظ')}<input type="file" accept="application/json,.json" onchange="importSave(this);UI2.close()"></label></div>
  <div class="grp"><small>${W('DANGER','خطر')}</small><button class="act danger" onclick="UI2.reset()">${W('Reset progress','امسح التقدم')}</button></div>`;
 }
 el.innerHTML=`<div class="pane" role="dialog" aria-modal="true">${body}</div>`;
}
window.UI2={
 close(){document.getElementById('sheet').classList.remove('open')},
 sheet,
 set_lang(v){S.lang=v;render();sheet('set')},
 set_cur(v){S.cur=v;render();sheet('set')},
 set_theme(v){S.theme=v;render();sheet('set')},
 reset(){UI2.close();bReset.click()}
};
function mount(){
 if(document.getElementById('sheet'))return;
 const s=document.createElement('div');s.id='sheet';s.onclick=e=>{if(e.target===s)UI2.close()};document.body.append(s);
 addEventListener('keydown',e=>{if(e.key==='Escape')UI2.close()});
 document.body.insertBefore(document.getElementById('nav'),document.querySelector('main'));
 const bar=document.querySelector('header .bar');const g=document.createElement('button');g.id='bSet';g.textContent='⚙';g.setAttribute('aria-label','Settings');g.onclick=()=>sheet('set');bar.append(g);
 document.getElementById('money').onclick=()=>{S.cur=S.cur==='USD'?'EGP':'USD';render()};
 document.getElementById('money').title='USD / EGP';
}
let lastTab=null,lastScr=null;
function homeHTML(){
 const own=S.own.length,first=S.wins===0&&own<=1;
 const cards=ORDER.map(k=>`<button class="hcard" onclick="go('${k}')"><span class="ic">${PAGES[k].ic}</span><span><b>${pg(k)[0]}</b><small>${pg(k)[1]}</small></span></button>`).join('');
 return `<div class="hbg"></div><svg class="hsky" viewBox="0 0 840 200" preserveAspectRatio="none" aria-hidden="true">${SKY}</svg><div class="hroad"></div>
 <div class="hwrap"><div class="htop"><div class="hlogo"><i>GE</i></div><div class="hicons"><button onclick="UI2.sheet('how')">${W('How to play','إزاي تلعب')}</button><button onclick="S.lang=S.lang==='ar'?'en':'ar';render()">${ar()?'EN':'عربي'}</button><button onclick="UI2.sheet('set')" aria-label="Settings">⚙</button>${window.Cloud?Cloud.chip():''}</div></div>
 <div class="hhero"><p class="hkicker">${W('STREET RACING UPDATE','تحديث سباقات الشارع')}</p><h2 class="hbig">GARAGE<span>EMPIRE</span></h2>
 <p class="hsub">${W('Buy, tune and race 100 real cars across 11 country markets.','اشتري وعدّل وسابق بـ 100 عربية حقيقية في 11 سوق دولة.')}</p>
 <div class="hcar">${CAR_SVG}</div>
 <div class="hcta"><button class="go" onclick="go('game')">${first?W('Start playing','ابدأ اللعب'):W('Continue','كمّل اللعب')}</button><button class="alt" onclick="showCatalog(32)">${W('Showroom','المعرض')}</button></div>
 <div class="hstats"><div><b>${fmt(S.usd)}</b><span>${W('Cash','الرصيد')}</span></div><div><b>${own}</b><span>${W('Your cars','عربياتك')}</span></div><div><b>${S.wins}</b><span>${W('Race wins','انتصارات')}</span></div></div></div></div>
 <div class="hmore"><div class="in"><h3>${W('Where to?','رايح فين؟')}</h3><p class="s">${W('Every part of the game is one tap away.','كل أجزاء اللعبة على بعد ضغطة.')}</p><div class="hgrid">${cards}</div>
 <div class="hfoot"><span>${window.Cloud?Cloud.foot():W('Demo: your progress is saved in this browser only.','نسخة تجربة: تقدمك محفوظ في المتصفح ده بس.')}</span><button onclick="UI2.sheet('set')">${W('Settings and save backup','الإعدادات ونسخة الحفظ')}</button></div></div></div>`;
}
window.renderHome=function(){
 const h=S.scr!=='game';home.hidden=!h;document.querySelector('main').hidden=h;
 document.body.dataset.scr=h?'home':'game';document.body.dataset.tab=S.tab;
 if(!h)return;home.innerHTML=homeHTML();
};
const _render=window.render;
window.render=function(){
 _render.apply(this,arguments);
 mount();
 document.body.dataset.scr=S.scr!=='game'?'home':'game';document.body.dataset.tab=S.tab;
 if(S.scr==='game'&&S.tab!=='catalog'&&PAGES[S.tab]){
  const i=ORDER.indexOf(S.tab)+1,p=pg(S.tab);
  view.insertAdjacentHTML('afterbegin',`<div class="pgHead"><div class="eyebrow">${S.tab.toUpperCase()} / 0${i}</div><h2>${p[0]}</h2><p>${p[1]}</p></div>`);
 }
 if(S.scr!==lastScr||S.tab!==lastTab){if(S.tab!=='catalog'||S.scr!==lastScr)scrollTo(0,0);lastTab=S.tab;lastScr=S.scr}
 if(document.getElementById('sheet').classList.contains('open')&&document.getElementById('sheet').dataset.kind==='set'){}
};
render();
})();
