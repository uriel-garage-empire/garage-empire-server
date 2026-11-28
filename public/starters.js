/* Garage Empire starter cars: cheap, weak classics so a new player with a small budget can buy a first car.
   Server-layer file. Specs are approximate era values and prices are game estimates, not sourced figures.
   Loaded after catalog-data.js, preview.js and markets-data.js, before the main game script. */
(function(){
const SRC=CAR_SOURCES.length;
CAR_SOURCES.push({url:'#',publisher:'Game estimate',scope:'approximate era specification, no manufacturer source'});
// [name, year, rarity, hp, kg, base USD, shape, engine, power text, drive, gearbox, source index, scope]
const D=[
['Fiat 127',1980,0,45,750,750,'smallhatch','0.9L inline-4','about 45 hp (approximate era figure)','FWD','4-speed manual',SRC,'Game estimate, 3-door hatchback'],
['Fiat 128',1980,0,55,820,900,'classic','1.1L inline-4','about 55 hp (approximate era figure)','FWD','4-speed manual',SRC,'Game estimate, 4-door saloon'],
['Lada 2101',1980,0,64,955,950,'classic','1.2L inline-4','about 64 hp (approximate era figure)','RWD','4-speed manual',SRC,'Game estimate, 4-door saloon'],
['Fiat 131',1982,0,75,1000,1100,'classic','1.6L inline-4','about 75 hp (approximate era figure)','RWD','4-speed manual',SRC,'Game estimate, 4-door saloon'],
['Fiat Uno',1990,0,58,790,1300,'smallhatch','1.1L inline-4','about 58 hp (approximate era figure)','FWD','5-speed manual',SRC,'Game estimate, 5-door hatchback'],
['Lada 2107',1995,0,75,1020,1500,'classic','1.5L inline-4','about 75 hp (approximate era figure)','RWD','5-speed manual',SRC,'Game estimate, 4-door saloon'],
['Lada Niva',1995,0,80,1150,2000,'suv','1.7L inline-4','about 80 hp (approximate era figure)','4WD','4-speed manual',SRC,'Game estimate, 3-door 4x4']];
D.forEach(d=>CAR_ADDITIONS.push(d));
// Egypt sells Fiat and Lada locally; Fiat is also a home brand in Italy. Other countries get them as imports.
if(window.MK&&MK.C){MK.C.eg.sold.push('Fiat','Lada');MK.C.it.home.push('Fiat')}
const NOTE={
 'Fiat 127':['Original simplified Fiat 127: boxy three-door hatchback, round headlamps, thin chrome bumpers. Not an exact replica.','مجسم أصلي مبسط لفيات 127: هاتشباك 3 أبواب مربع، فوانيس دايرة وصدامات كروم رفيعة. مش نسخة مطابقة.'],
 'Fiat 128':['Original simplified Fiat 128: small four-door saloon, rectangular lamps and chrome bumpers. Not an exact replica.','مجسم أصلي مبسط لفيات 128: سيدان صغيرة 4 أبواب، فوانيس مستطيلة وصدامات كروم. مش نسخة مطابقة.'],
 'Lada 2101':['Original simplified Lada 2101: upright four-door saloon, round headlamps, chrome bumpers. Not an exact replica.','مجسم أصلي مبسط لادا 2101: سيدان 4 أبواب مستقيمة، فوانيس دايرة وصدامات كروم. مش نسخة مطابقة.'],
 'Fiat 131':['Original simplified Fiat 131: squared four-door saloon, rectangular lamps, black bumpers. Not an exact replica.','مجسم أصلي مبسط لفيات 131: سيدان 4 أبواب مربعة، فوانيس مستطيلة. مش نسخة مطابقة.'],
 'Fiat Uno':['Original simplified Fiat Uno: tall five-door hatchback, plastic bumpers, wide rectangular lamps. Not an exact replica.','مجسم أصلي مبسط لفيات أونو: هاتشباك 5 أبواب عالي وصدامات بلاستيك. مش نسخة مطابقة.'],
 'Lada 2107':['Original simplified Lada 2107: four-door saloon, rectangular headlamps, black bumpers. Not an exact replica.','مجسم أصلي مبسط لادا 2107: سيدان 4 أبواب وفوانيس مستطيلة. مش نسخة مطابقة.'],
 'Lada Niva':['Original simplified Lada Niva: short boxy 4x4 with high ride height and round lamps. Not an exact replica.','مجسم أصلي مبسط لادا نيفا: دفع رباعي قصير مربع وعالي عن الأرض. مش نسخة مطابقة.']};
// Shape specs: L length, W width, wb wheelbase, wr wheel radius, rd ride height, belt, nose (nose top y), cowl (hood end x),
// cab: greenhouse points [x,y] from windscreen base to rear base, tail: y of the rear edge top, lamp: round|rect, plastic: bumpers
const SP={
 'Fiat 127':{L:3.59,W:1.53,wb:2.22,wr:.27,rd:.20,belt:.80,nose:.66,cowl:-.78,cab:[[-.78,.80],[-.36,1.24],[.62,1.24],[1.52,.86]],tail:.78,lamp:'round',col:'#c8362b'},
 'Fiat 128':{L:3.86,W:1.59,wb:2.45,wr:.28,rd:.20,belt:.82,nose:.68,cowl:-.80,cab:[[-.62,.82],[-.26,1.27],[.62,1.27],[.98,.86]],tail:.84,lamp:'rect',col:'#d9d3c4'},
 'Lada 2101':{L:4.07,W:1.61,wb:2.42,wr:.29,rd:.21,belt:.86,nose:.74,cowl:-.80,cab:[[-.58,.86],[-.28,1.30],[.62,1.30],[.96,.90]],tail:.84,lamp:'round',col:'#e8e2cf'},
 'Fiat 131':{L:4.25,W:1.64,wb:2.49,wr:.29,rd:.21,belt:.82,nose:.70,cowl:-.92,cab:[[-.70,.82],[-.30,1.26],[.66,1.26],[1.06,.86]],tail:.84,lamp:'rect',plastic:1,col:'#3c6ea5'},
 'Fiat Uno':{L:3.64,W:1.55,wb:2.36,wr:.27,rd:.21,belt:.84,nose:.76,cowl:-.80,cab:[[-.72,.84],[-.30,1.38],[.88,1.38],[1.79,.90]],tail:.84,lamp:'rect',plastic:1,col:'#e5e5e0'},
 'Lada 2107':{L:4.13,W:1.62,wb:2.42,wr:.29,rd:.22,belt:.86,nose:.76,cowl:-.80,cab:[[-.58,.86],[-.28,1.31],[.62,1.31],[.98,.90]],tail:.86,lamp:'rect',plastic:1,col:'#8a1f25'},
 'Lada Niva':{L:3.74,W:1.68,wb:2.20,wr:.33,rd:.32,belt:.98,nose:.88,cowl:-.60,cab:[[-.60,.98],[-.46,1.42],[1.00,1.42],[1.12,.98]],tail:1.00,lamp:'round',col:'#6b7a4f'}};
function build(name){const T=THREE,p=SP[name],car=new T.Group();
 const mat=(c,m=0,r=.55)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r,side:T.DoubleSide});
 const paint=mat(p.col,.3,.45),black=mat('#1d2022',.05,.7),tire=mat('#141618',0,.85),glass=mat('#2b3d46',.35,.2),chrome=mat('#b3b7b8',.75,.3),lamp=mat('#f1ead2',.1,.25),red=mat('#a3171d',.2,.4),amber=mat('#e79729',.15,.4),hub=mat('#8d9395',.5,.4);
 const mesh=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);car.add(o);return o};
 const box=(x,y,z,l,h,w,m)=>mesh(new T.BoxGeometry(l,h,w),m,x,y,z);
 function prism(pts,w,m,zc=0){const s=new T.Shape();pts.forEach((q,i)=>i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1]));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);const o=mesh(g,m);o.position.z=zc;return o}
 const L=p.L,W=p.W,x0=-L/2,x1=L/2,c=p.cab,cr=c[c.length-1];
 // lower body: nose, hood, belt line, rear deck
 prism([[x0,p.rd+.08],[x0,p.nose],[p.cowl,p.belt],[cr[0],p.belt],[x1,p.tail],[x1,p.rd+.08]],W,paint);
 prism([[x0+.12,p.rd],[x1-.12,p.rd],[x1-.12,p.rd+.1],[x0+.12,p.rd+.1]],W-.1,black);
 // greenhouse: glass block, paint roof slab and pillars
 prism(c,W-.16,glass);
 const top=Math.max(...c.map(q=>q[1])),xs=c.filter(q=>q[1]===top);
 box((xs[0][0]+xs[xs.length-1][0])/2,top+.012,0,Math.abs(xs[xs.length-1][0]-xs[0][0])+.08,.04,W-.1,paint);
 for(const s of [-1,1]){const z=s*(W-.16)/2;
  for(let i=1;i<c.length;i++){const a=new T.Vector3(c[i-1][0],c[i-1][1],z),b=new T.Vector3(c[i][0],c[i][1],z),d=b.clone().sub(a);const o=mesh(new T.BoxGeometry(.05,d.length(),.04),paint);o.position.copy(a.clone().add(b).multiplyScalar(.5));o.rotation.z=-Math.atan2(d.x,d.y)}
  const bx=(c[1][0]+c[2][0])/2+.05;box(bx,(p.belt+top)/2,z,.06,top-p.belt,.04,paint);
  // wheel arch shadows, door seams, sill
  for(const ax of [-p.wb/2,p.wb/2])mesh(new T.CylinderGeometry(p.wr+.06,p.wr+.06,.012,28),black,ax,p.wr,s*(W/2+.004)).rotation.x=Math.PI/2;
  box(0,p.belt-.02,s*(W/2+.003),L*.72,.014,.01,black);
  box(bx-.2,p.belt+.1,s*(W/2+.012),.18,.02,.02,chrome);
  // lamps
  const hl=p.lamp==='round'?new T.CylinderGeometry(.095,.095,.04,20):new T.BoxGeometry(.04,.12,.3);
  const h=mesh(hl,lamp,x0-.01,p.nose-.1,s*(W/2-.2));if(p.lamp==='round')h.rotation.z=Math.PI/2;
  box(x1+.01,p.tail-.1,s*(W/2-.2),.04,.12,.3,red);
  box(x0-.005,p.nose-.1,s*(W/2-.04),.03,.06,.1,amber);
 }
 // grille, bumpers, plates
 box(x0-.008,p.nose-.12,0,.03,.14,W*.34,black);
 const bm=p.plastic?black:chrome;
 box(x0-.045,p.rd+.22,0,.08,.14,W+.04,bm);box(x1+.045,p.rd+.22,0,.08,.14,W+.04,bm);
 box(x0-.09,p.rd+.19,0,.01,.1,.4,lamp);box(x1+.09,p.rd+.19,0,.01,.1,.4,lamp);
 // wheels
 for(const ax of [-p.wb/2,p.wb/2])for(const s of [-1,1]){const z=s*(W/2-.12);
  mesh(new T.CylinderGeometry(p.wr,p.wr,.19,32),tire,ax,p.wr,z).rotation.x=Math.PI/2;
  mesh(new T.CylinderGeometry(p.wr*.62,p.wr*.62,.02,24),hub,ax,p.wr,s*(W/2-.025)).rotation.x=Math.PI/2;
  mesh(new T.CylinderGeometry(.04,.04,.03,12),chrome,ax,p.wr,s*(W/2-.012)).rotation.x=Math.PI/2}
 // merge by material and convert colours like the other original bodies
 car.updateMatrixWorld(true);const groups=new Map();
 car.traverse(o=>{if(!o.isMesh)return;const k=o.material.uuid;if(!groups.has(k))groups.set(k,{mat:o.material,geo:[]});let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(o.matrixWorld);groups.get(k).geo.push(g)});
 const out=new T.Group();
 for(const{mat:m,geo}of groups.values()){const g=new T.BufferGeometry();const len=geo.reduce((n,x)=>n+x.attributes.position.array.length,0),a=new Float32Array(len);let i=0;for(const x of geo){a.set(x.attributes.position.array,i);i+=x.attributes.position.array.length}
  g.setAttribute('position',new T.BufferAttribute(a,3));g.computeVertexNormals();const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;out.add(o)}
 out.traverse(o=>{if(o.isMesh&&o.material.color)o.material.color.convertSRGBToLinear()});return out}
D.forEach(d=>{const n=d[0],key='original:'+n.toLowerCase().replace(/ /g,'')+'-original';
 MODELS[n]={yaw:Math.PI,catalogYear:d[1],url:key,original:true,credit:'Original simplified body',noteEn:NOTE[n][0],noteAr:NOTE[n][1]};
 ORIGINAL_BUILDERS[key]=()=>build(n)});
})();
