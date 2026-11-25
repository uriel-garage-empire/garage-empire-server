/* Shared allow-list for local and cloud saves. Economy is still client-authoritative. */
(function (root) {
  const CAR_COUNT = 100;
  const TEAM_IDS = ['analyst', 'mechanic', 'agent', 'coach'];
  const TABS = ['garage', 'market', 'catalog', 'work', 'race', 'parts', 'team'];
  function upg(u) {
    if (u === undefined || u === null) return {tu: 0, ti: 0, wt: 0};
    if (typeof u !== 'object' || Array.isArray(u)) return null;
    const {tu, ti, wt} = u;
    if (!Number.isInteger(tu) || tu < 0 || tu > 3 || !Number.isInteger(ti) || ti < 0 || ti > 2 ||
        !Number.isInteger(wt) || wt < 0 || wt > 2) return null;
    return {tu, ti, wt};
  }
  function normalize(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    if (!Number.isFinite(d.usd) || d.usd < 0 || d.usd >= 1e10 || !Number.isInteger(d.wins) || d.wins < 0 || d.wins > 1e7) return null;
    if (!Array.isArray(d.own) || d.own.length > 8 || !Array.isArray(d.stock) || d.stock.length > 100) return null;
    const ids = new Set(), own = [], stock = [];
    for (const c of d.own) {
      if (!c || !Number.isSafeInteger(c.id) || c.id < 1 || c.id >= Number.MAX_SAFE_INTEGER || ids.has(c.id) ||
          !Number.isInteger(c.cid) || c.cid < 0 || c.cid >= CAR_COUNT || !Array.isArray(c.w) || c.w.length !== 3 ||
          !c.w.every(n => Number.isInteger(n) && n >= 0 && n <= 100) ||
          typeof c.col !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c.col) ||
          ![0, 1].includes(c.sp) || !Number.isInteger(c.st) || c.st < 0 || c.st > 3) return null;
      const up = upg(c.up);
      if (!up) return null;
      ids.add(c.id); own.push({id:c.id,cid:c.cid,w:[...c.w],col:c.col,sp:c.sp,st:c.st,up});
    }
    for (const s of d.stock) {
      if (!s || !Number.isInteger(s.cid) || s.cid < 0 || s.cid >= CAR_COUNT ||
          !Number.isInteger(s.cond) || s.cond < 0 || s.cond > 100 || !Number.isFinite(s.price) || s.price < 0 || s.price > 1e9) return null;
      stock.push({cid:s.cid,cond:s.cond,price:s.price});
    }
    let team = [];
    if (d.team !== undefined) {
      if (!Array.isArray(d.team)) return null;
      for (const m of d.team) {
        if (!TEAM_IDS.includes(m) || team.includes(m)) return null;
        team.push(m);
      }
    }
    return {usd:d.usd,own,stock,wins:d.wins,team,
      sel:ids.has(d.sel)?d.sel:(own[0]?.id || 0),
      cur:['USD','EGP'].includes(d.cur)?d.cur:'USD',
      lang:['ar','en'].includes(d.lang)?d.lang:'ar',
      theme:['','light','dark'].includes(d.theme)?d.theme:'',
      tab:TABS.includes(d.tab)?d.tab:'garage',
      scr:['home','game'].includes(d.scr)?d.scr:'home'};
  }
  const api={normalize,CAR_COUNT,TEAM_IDS};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.GarageSave=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
