/* Garage Empire start screen: no starting car, choose the country first. Server-layer file (not synced from the demo repo). */
(function(){
const M=MK.M,ar=()=>S.lang==='ar',W=(e,a)=>ar()?a:e,nm=k=>MK.C[k].n[ar()?1:0],mkStock=window.stock;
/* Starting country and cash. A new account starts with no car; the first step is choosing the country. Start cash is a game value per country. */
const START={eg:50000,ae:15000,sa:15000,de:4500,us:5000,jp:600000,gb:4000,it:4000,fr:4500,kr:6000000,cn:25000};
const FLAG={eg:'🇪🇬',ae:'🇦🇪',sa:'🇸🇦',de:'🇩🇪',us:'🇺🇸',jp:'🇯🇵',gb:'🇬🇧',it:'🇮🇹',fr:'🇫🇷',kr:'🇰🇷',cn:'🇨🇳'};
MK.startLocal=k=>START[k]||0;MK.startUsd=k=>Math.round((START[k]||0)/MK.C[k].rate);
window.pickStart=function(k){if(!MK.C[k]||S.started!==false)return;M.country=k;M.mode='local';M.reg=true;M.sm=[];M.un=[];M.pl={};M.meta={};S.usd=MK.startUsd(k);S.started=true;S.cur=MK.C[k].cur==='EGP'?'EGP':S.cur;S.stock=mkStock();MK.save();const o=document.getElementById('geStart');if(o)o.remove();S.tab='market';S.scr='game';render();save()};
function startOverlay(){const old=document.getElementById('geStart');if(S.started!==false){if(old)old.remove();return}
 if(old&&old.dataset.l===S.lang)return;if(old)old.remove();
 const d=document.createElement('div');d.id='geStart';d.dataset.l=S.lang;d.dir=ar()?'rtl':'ltr';
 d.style.cssText='position:fixed;inset:0;z-index:8000;background:#05070f;overflow:auto;padding:18px;display:flex;justify-content:center';
 d.innerHTML=`<div style="width:100%;max-width:420px"><h2 style="margin:8px 0">${W('Choose your starting country','اختار الدولة اللي هتبدأ فيها')}</h2><p class="mut" style="margin:0 0 14px">${W('You start with no car. Your starting cash depends on the country. You can buy a car from the Market.','هتبدأ من غير عربية. الفلوس اللي هتبدأ بيها بتختلف حسب الدولة. تقدر تشتري عربية من السوق.')}</p>`+
 Object.keys(MK.C).map(k=>`<button onclick="pickStart('${k}')" style="display:flex;width:100%;justify-content:space-between;align-items:center;margin-bottom:8px;padding:12px 14px;font-size:16px"><span>${FLAG[k]||''} ${nm(k)}</span><span class="mut">${START[k].toLocaleString('en-US')} ${MK.C[k].cl[ar()?1:0]}</span></button>`).join('')+`</div>`;
 document.body.appendChild(d)}
const _r2=window.render;window.render=function(){const r=_r2.apply(this,arguments);startOverlay();return r};
render();
})();
