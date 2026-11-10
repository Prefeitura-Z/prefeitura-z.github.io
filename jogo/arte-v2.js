// Arte original de produção: mesmas dimensões e API do motor existente.
// Este arquivo também é a fonte dos PNGs exportados por scripts/exportar-arte.cjs.
(() => {
'use strict';
const A = window.PZ.arte;
const originalObjeto = A.desenharObjeto;
const originalFolha = A.folha;
const cor = A.tom, iso = A.iso;
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x,y], i) => i ? g.lineTo(Math.round(x),Math.round(y)) : g.moveTo(Math.round(x),Math.round(y))); g.closePath(); g.fill(); }
function linha(g, pts, c, w=1) { g.strokeStyle=c; g.lineWidth=w; g.lineJoin='miter'; g.beginPath(); pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.stroke(); }
function random(seed) { let s=seed|0; return ()=> { s=(Math.imul(s,1664525)+1013904223)|0; return (s>>>0)/4294967296; }; }
function contorno(c) {
  const o=canvas(c.width,c.height), g=o.getContext('2d');
  for(const [x,y] of [[-1,0],[1,0],[0,1],[0,-1]]) g.drawImage(c,x,y);
  g.globalCompositeOperation='source-in'; g.fillStyle='#1c201d'; g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='source-over'; g.drawImage(c,0,0); return o;
}

// Identidades ligadas às aparências já persistidas; nenhum campo salvo é removido.
A.ROUPA.jaqueta = {...A.ROUPA.jaqueta, torso:'#9b6044', manga:'#9b6044', detalhe:'#d0aa76'};
A.ROUPA.bashar = {...A.ROUPA.bashar, torso:'#555743', manga:'#555743', detalhe:'#858572'};
A.NPC_AP.bashar = {...A.NPC_AP.bashar, cabelo:'ondulado', corCabelo:'c2', fone:false, barba:true, grisalho:true, lenco:true, radio:true};
A.NPC_AP.prefeito = {...A.NPC_AP.prefeito, barba:true};

function quadro(ap, dir, estado, f) {
  const c=canvas(A.QW,A.QH), g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  const frente=dir==='SE'||dir==='SW', flip=dir==='SW'||dir==='NW';
  if(flip) { g.translate(A.QW,0); g.scale(-1,1); }
  const r=A.ROUPA[ap.roupa]||A.ROUPA.jaqueta, pele=A.PELE[ap.pele]||A.PELE.p3, cabelo=A.CABELO[ap.corCabelo]||A.CABELO.c1;
  const fase=f/8*Math.PI*2, passo=estado==='anda'?Math.sin(fase):0;
  const b=estado==='anda'?Math.round(Math.abs(Math.sin(fase))*1):estado==='parado'&&f>1?1:0;
  const trab=estado==='trabalha'?Math.round(Math.sin(f/6*Math.PI*2)*2):0;
  const cx=24, ty=27+b, hw=ap.corpo==='b'?8:7, hx=21, hy=11+b;
  const px=(x,y,w,h,c)=>rect(g,x,y,w,h,c);
  // Pernas articuladas: movimento de joelho e tornozelo, sem deslizar um bloco inteiro.
  function perna(x, phase, far) {
    const desloc=Math.round(phase*3), levanta=Math.max(0,Math.round(phase*2));
    const base=far?cor(r.calca,.72):r.calca;
    poly(g,[[x-3,48+b],[x+3,48+b],[x+3+desloc,60],[x+2+desloc,71-levanta],[x-2+desloc,71-levanta],[x-3+desloc,60]],base);
    px(x-2,50+b,1,8,cor(base,1.15)); px(x-2+desloc,61,1,8,cor(base,1.12));
    px(x-2+desloc,68-levanta,5,5,r.bota); px(x-1+desloc,72-levanta,7,2,cor(r.bota,.72));
    px(x+1+desloc,69-levanta,3,1,cor(r.bota,1.38));
  }
  perna(cx-4,passo,true); perna(cx+4,-passo,false);
  function braco(far) {
    const x=far?cx-hw-2:cx+hw-1, swing=Math.round(passo*(far?2:-2)), off=far?0:trab;
    const mc=far?cor(r.manga,.72):r.manga;
    poly(g,[[x,ty+2],[x+4,ty+4],[x+4+swing,ty+13-off],[x+3+swing,ty+21-off],[x+swing,ty+21-off],[x-1+swing,ty+13-off]],mc);
    px(x+1,ty+5,1,7,cor(mc,1.2)); px(x+swing,ty+16-off,4,2,cor(mc,.72));
    px(x+swing,ty+20-off,3,4,far?cor(pele,.8):pele); px(x+2+swing,ty+21-off,1,2,cor(pele,.72));
    if(estado==='trabalha'&&!far) { px(x+2+swing,ty+20-off,2,7,'#9da6a3'); px(x+swing,ty+25-off,5,2,'#79827f'); }
  }
  braco(true);
  // Tronco afunilado, ombros e planos iluminados.
  poly(g,[[cx-4,ty],[cx+4,ty],[cx+hw,ty+3],[cx+hw-1,ty+23],[cx-hw+1,ty+23],[cx-hw,ty+4]],r.torso);
  poly(g,[[cx+hw-4,ty+3],[cx+hw,ty+3],[cx+hw-1,ty+23],[cx+hw-4,ty+23]],cor(r.torso,.73));
  px(cx-hw+1,ty+5,2,14,cor(r.torso,1.13));
  px(cx-hw+1,ty+21,hw*2-2,2,'#36362d'); px(cx+2,ty+21,3,2,'#a59870');
  if(frente) {
    px(cx+1,ty+3,1,17,cor(r.torso,.55)); px(cx+2,ty+4,1,14,cor(r.detalhe,1.1));
    poly(g,[[cx-4,ty],[cx,ty+6],[cx-4,ty+4]],cor(r.torso,1.35));
    poly(g,[[cx+3,ty],[cx+1,ty+6],[cx+5,ty+4]],cor(r.torso,1.18));
    for(const x of [cx-hw+3,cx+3]) { px(x,ty+9,4,5,cor(r.torso,.8)); px(x,ty+9,4,1,cor(r.torso,1.3)); px(x+2,ty+10,1,1,'#9d9679'); }
  } else {
    px(cx-hw+3,ty+5,hw*2-6,1,cor(r.torso,1.15));
    // Mochila e alças do sobrevivente, diferentes dos uniformes de trabalho.
    if(!['prefeito','wolf','bashar'].includes(ap.roupa)) {
      poly(g,[[cx-5,ty+5],[cx+4,ty+5],[cx+6,ty+9],[cx+5,ty+20],[cx-5,ty+20],[cx-6,ty+9]],'#666b4d');
      px(cx-4,ty+7,7,2,'#8c8b65'); px(cx+3,ty+8,2,11,'#414638'); px(cx-3,ty+14,6,5,'#545a42'); px(cx-2,ty+13,4,1,'#a2936c');
    }
  }
  if(r.colete) {
    const v=r.coleteCor||r.torso; px(cx-hw+1,ty+2,4,18,v); px(cx+hw-5,ty+2,3,18,cor(v,.82));
    if(frente) { px(cx-hw+1,ty+11,4,5,cor(v,.72)); px(cx-hw+1,ty+11,4,1,cor(v,1.2)); }
  }
  if(r.alcas&&frente) { px(cx-5,ty+1,2,15,r.detalhe); px(cx+4,ty+2,2,14,r.detalhe); px(cx-5,ty+13,11,8,cor(r.torso,.92)); }
  if(r.avental) {
    if(frente) { poly(g,[[cx-4,ty+3],[cx+5,ty+3],[cx+6,ty+23],[cx-6,ty+23]],r.detalhe); px(cx-3,ty+3,1,3,'#ba9a6a'); px(cx+3,ty+3,1,3,'#ba9a6a'); px(cx-3,ty+13,7,6,cor(r.detalhe,.74)); px(cx-2,ty+12,1,6,'#a4a9a1'); px(cx+2,ty+11,1,6,'#be784c'); }
    else { linha(g,[[cx-5,ty+3],[cx+5,ty+16]],r.detalhe,2); linha(g,[[cx+5,ty+3],[cx-5,ty+16]],r.detalhe,2); }
  }
  braco(false);
  px(cx-2,ty-4,4,5,cor(pele,.84));
  // Cabeça com perfil em três quartos, orelha, têmpora e plano de mandíbula.
  poly(g,[[hx+1,hy],[hx+7,hy],[hx+9,hy+3],[hx+9,hy+9],[hx+6,hy+13],[hx+2,hy+12],[hx,hy+8],[hx,hy+3]],pele);
  px(hx,hy+5,2,4,cor(pele,.78)); px(hx+7,hy+3,2,6,cor(pele,.8)); px(hx+3,hy+2,3,2,cor(pele,1.16));
  const est=ap.cabelo;
  if(est!=='raspado') {
    poly(g,[[hx-1,hy+1],[hx,hy-2],[hx+3,hy-3],[hx+8,hy-2],[hx+10,hy+1],[hx+9,hy+4],[hx+7,hy+1],[hx+4,hy],[hx+1,hy+3]],cabelo);
    px(hx+1,hy-2,5,1,cor(cabelo,1.38)); px(hx-1,hy+2,2,5,cabelo);
    if(!frente) px(hx+1,hy+1,8,8,cabelo);
    if(est==='longo') { px(hx-1,hy+3,2,13,cabelo); px(hx+8,hy+3,2,13,cor(cabelo,.8)); }
    if(est==='coque') { px(hx-2,hy-3,5,4,cabelo); px(hx-1,hy-3,3,1,cor(cabelo,1.3)); }
    if(est==='moicano') { px(hx+3,hy-5,3,6,cabelo); px(hx+4,hy-5,1,4,cor(cabelo,1.4)); }
    if(est==='cacheado'||est==='ondulado') for(let i=0;i<5;i++) px(hx+i*2-1,hy-2-(i%2),2,2,cor(cabelo,1.12+(i%3)*.1));
    if(ap.grisalho) { px(hx-1,hy+2,2,4,'#a7a49a'); px(hx+8,hy+2,1,4,'#aaa89c'); px(hx+1,hy-1,2,1,'#9b9a8f'); }
  } else { px(hx+1,hy,7,2,cor(cabelo,1.28)); px(hx,hy+2,1,3,cabelo); }
  if(frente) {
    px(hx+3,hy+4,2,1,cor(cabelo,.8)); px(hx+7,hy+5,2,1,cor(cabelo,.8));
    px(hx+4,hy+5,1,1,'#24241e'); px(hx+8,hy+6,1,1,'#24241e'); px(hx+6,hy+7,2,2,cor(pele,.7));
    px(hx+4,hy+10,3,1,cor(pele,.64));
    if(ap.barba) { poly(g,[[hx+1,hy+8],[hx+4,hy+9],[hx+8,hy+8],[hx+8,hy+11],[hx+6,hy+14],[hx+3,hy+13],[hx+1,hy+11]],ap.grisalho?'#686b64':cor(cabelo,1.15)); px(hx+4,hy+9,3,1,'#43392f'); if(ap.grisalho) {px(hx+3,hy+12,3,1,'#b2b0a4');px(hx+1,hy+10,1,2,'#a2a297');} }
    if(ap.oculos) { px(hx+2,hy+4,4,1,'#353b35'); px(hx+2,hy+7,4,1,'#353b35'); px(hx+2,hy+5,1,2,'#353b35'); px(hx+5,hy+5,1,2,'#353b35'); px(hx+6,hy+5,3,1,'#353b35'); px(hx+7,hy+7,2,1,'#353b35'); }
  }
  if(ap.bandana) { px(hx-1,hy+1,11,2,'#98533d'); px(hx,hy+1,7,1,'#c58255'); px(hx-3,hy+3,3,4,'#8b4936'); }
  if(ap.bone) { px(hx-1,hy-2,11,4,'#58614b'); px(hx+5,hy+1,8,2,'#424b38'); px(hx+1,hy-2,5,1,'#788063'); }
  if(ap.lenco) {
    poly(g,[[cx-6,ty-2],[cx,ty+1],[cx+6,ty-2],[cx+6,ty+4],[cx+1,ty+9],[cx-5,ty+5]],'#4b4d46');
    for(let y=0;y<6;y+=2) for(let x=0;x<8;x+=2) px(cx-4+x,ty+y+(x%4?1:0),1,1,'#ada99a');
    if(frente&&ap.radio) { px(cx+7,ty+9,4,7,'#242d29'); px(cx+9,ty+4,1,6,'#434b41'); px(cx+8,ty+11,2,2,'#d1ad6c'); }
  }
  if(ap.fone) { px(hx-2,hy+2,2,5,'#343d37'); px(hx-1,hy-3,10,1,'#343d37'); px(hx+9,hy+3,2,5,'#343d37'); }
  return contorno(c);
}

const cache=new Map(), atlas=new Map();
const chave=ap=>JSON.stringify(Object.fromEntries(Object.entries(ap).sort(([a],[b])=>a.localeCompare(b))));
function folha(ap) {
  if(ap.zumbi)return originalFolha(ap);
  const k=chave(ap); if(atlas.has(k))return atlas.get(k); if(cache.has(k))return cache.get(k);
  const s={}; for(const d of A.DIRS) { s[d]={}; for(const [e,n] of [['parado',4],['anda',8],['trabalha',6]]) s[d][e]=Array.from({length:n},(_,f)=>quadro(ap,d,e,f)); }
  for(const d of A.DIRS)s[d].ataca=originalFolha(ap)[d].ataca;
  cache.set(k,s);return s;
}
A.folha=folha;
A.registrarAtlas=(aparencia,folha)=>{for(const d of A.DIRS)if(!folha[d].ataca?.length)folha[d].ataca=originalFolha(aparencia)[d].ataca;atlas.set(chave(aparencia),folha);};

// Pisos sem bordas de tabuleiro: pequenas variações, materiais e manchas coerentes.
const tipos=['grama','terra','concreto','madeira','agua','cascalho','arado','asfalto','calcada','faixaX','faixaY'];
const cores=['#4a5840','#625747','#72756a','#70604c','#344f56','#6c695d','#514432','#3b4142','#797d71','#3b4142','#3b4142'];
const tiles=new Map();
function tile(tipo,variante) {
  const key=tipo+':'+variante; if(tiles.has(key))return tiles.get(key);
  const c=canvas(64,32),g=c.getContext('2d'),r=random(tipo*971+variante*313+47),base=cores[tipo]||cores[1];
  poly(g,[[32,0],[64,16],[32,32],[0,16]],cor(base,.97+variante*.008));g.save();g.clip();
  for(let i=0;i<(tipo===0?135:95);i++) { const x=Math.floor(r()*64),y=Math.floor(r()*32); rect(g,x,y,tipo===4?3:1+r()*2,1,cor(base,r()>.5?1.13:.88)); }
  if(tipo===0) for(let i=0;i<16;i++) {const x=r()*60,y=r()*30;rect(g,x,y,1,3,cor(base,.73));rect(g,x+1,y-1,1,2,cor(base,1.25));}
  if(tipo===2) {
    if(variante===2||variante===6) linha(g,[[12,6],[26,12],[29,18],[41,20],[46,26]],'#545b52');
    if(variante===4) {poly(g,[[10,14],[25,8],[43,13],[48,18],[31,25],[18,23]],'#59676a');linha(g,[[17,15],[31,13],[37,15]],'#91a09b');}
    if(variante===7) for(let i=0;i<9;i++)rect(g,24+r()*10,13+r()*8,1,1,'#56664a');
  }
  if(tipo===3) {for(let i=-2;i<6;i++)linha(g,[[i*12,0],[i*12+64,32]],'#4f4538');for(let i=0;i<12;i++)rect(g,r()*64,r()*32,5,1,'#8b7859');}
  if(tipo===4) {for(let i=0;i<12;i++)rect(g,r()*64,r()*32,3+r()*8,1,'#74918a');}
  if(tipo===5)for(let i=0;i<24;i++){const x=r()*64,y=r()*32;rect(g,x,y,2,2,'#4e534a');rect(g,x,y,2,1,'#969584');}
  if(tipo===6)for(let i=-2;i<6;i++)linha(g,[[i*12,0],[i*12+64,32]],'#382f25',2);
  if(tipo>=7){
    if(tipo===8){linha(g,[[0,16],[32,32],[64,16]],'#555d55');linha(g,[[16,8],[48,24]],'#646c61');linha(g,[[16,24],[48,8]],'#646c61');if(variante%3===1){rect(g,29,28,2,2,'#596b44');rect(g,31,27,1,3,'#8a9560');}}
    else{if(variante%3===1)linha(g,[[11,8],[24,13],[20,19],[35,23],[41,28]],'#252d2e');if(variante===6){poly(g,[[18,11],[35,8],[48,15],[35,23],[19,20]],'#293b3e');linha(g,[[24,13],[34,12],[42,16]],'#637e7c');}}
    if(tipo===9)poly(g,[[11,6],[17,3],[53,21],[47,24]],'#b6a26a');
    if(tipo===10)poly(g,[[47,3],[53,6],[17,24],[11,21]],'#b6a26a');
    if(tipo>=9)for(let i=0;i<10;i++)rect(g,13+r()*38,5+r()*20,1,1,'#4b4d43');
  }
  g.restore();tiles.set(key,c);return c;
}
A.tile=tile;
A.desenharChao=m=> {
  const ox=m.ALT*32,oy=20,c=canvas((m.LARG+m.ALT)*32,(m.LARG+m.ALT)*16+40),g=c.getContext('2d');g.imageSmoothingEnabled=false;
  for(let y=0;y<m.ALT;y++)for(let x=0;x<m.LARG;x++){const p=iso(x+.5,y+.5),v=((x*193+y*71)^Math.floor(x/3)*19)&7;g.drawImage(tile(m.chao[y*m.LARG+x],v),Math.round(p.x+ox-32),Math.round(p.y+oy-16));}
  return{canvas:c,ox,oy};
};

// Primitivas de materiais: caixas abertas, madeira, metal, alvenaria e folhagem.
function box(g,x,y,w,d,h,c,z=0) {
  const a=iso(x,y),b=iso(x+w,y),cc=iso(x+w,y+d),dd=iso(x,y+d);
  poly(g,[[dd.x,dd.y-z],[cc.x,cc.y-z],[cc.x,cc.y-z-h],[dd.x,dd.y-z-h]],c);
  poly(g,[[cc.x,cc.y-z],[b.x,b.y-z],[b.x,b.y-z-h],[cc.x,cc.y-z-h]],cor(c,.72));
  poly(g,[[a.x,a.y-z-h],[b.x,b.y-z-h],[cc.x,cc.y-z-h],[dd.x,dd.y-z-h]],cor(c,1.2));
  return{a,b,c:cc,d:dd};
}
function face(g,x,y,w,d,h,u,v,ww,hh,c,lado='esq') {
  const a=lado==='dir'?iso(x+w,y+d):iso(x,y+d),b=lado==='dir'?iso(x+w,y):iso(x+w,y+d);
  const p=(s,t)=>[a.x+(b.x-a.x)*s,a.y+(b.y-a.y)*s-t*h];
  poly(g,[p(u,v),p(u+ww,v),p(u+ww,v+hh),p(u,v+hh)],c);
}
function madeira(g,o,h) {
  for(let j=0;j<4;j++)face(g,o.x,o.y,o.w,o.d,h,.03,.12+j*.2,.94,.02,'#3a352c70');
  for(const u of [.12,.85])face(g,o.x,o.y,o.w,o.d,h,u,.05,.04,.9,'#bc9b6c66');
}
function mesa(g,o,radio=false) {
  for(const [xx,yy]of[[.1,.12],[o.w-.22,.12],[.1,o.d-.23],[o.w-.22,o.d-.23]])box(g,o.x+xx,o.y+yy,.13,.13,18,'#474b43');
  box(g,o.x+.02,o.y+.04,o.w-.04,o.d-.08,4,radio?'#665748':'#7d6549',18);
  const p=iso(o.x+.8,o.y+.5);rect(g,p.x-6,p.y-25,10,4,'#d1c6a5');rect(g,p.x-5,p.y-24,6,1,'#92947a');
  if(radio) {const q=iso(o.x+1.7,o.y+.5);box(g,o.x+1.2,o.y+.25,.8,.45,11,'#344c49',22);rect(g,q.x-9,q.y-27,8,4,'#a7bba1');rect(g,q.x+1,q.y-26,2,2,'#d8ac66');rect(g,q.x+5,q.y-45,1,15,'#69766c');}
  else {const q=iso(o.x+o.w-.4,o.y+.5);rect(g,q.x-1,q.y-32,2,10,'#71654b');rect(g,q.x-5,q.y-34,10,3,'#d3b374');rect(g,q.x-3,q.y-31,6,2,'#e7d6a8');}
}
A.ALTURA.paredeAbrigo=62;A.ALTOS.add('paredeAbrigo');
A.desenharObjeto=(g,o,t)=> {
  const{x,y,w,d}=o,p=iso(x+w/2,y+d/2),h=A.ALTURA[o.tipo]||20,r=random(x*831+y*137+41);
  if(o.tipo==='muro') {
    const vertical=x===6||x===33,xx=x+(vertical?.35:0),yy=y+(vertical?0:.35),ww=vertical?.3:1,dd=vertical?1:.3;
    box(g,xx,yy,ww,dd,h,'#777266');
    for(let j=0;j<8;j++)for(let i=0;i<3;i++) {const u=i/3+(j%2?.15:0);if(u<.95)face(g,xx,yy,ww,dd,h,u,.02+j*.119,Math.min(.29,.98-u),.092,['#8b7966','#786e60','#807363','#6e6b5d'][Math.floor(r()*4)]);}
    box(g,xx-.02,yy-.02,ww+.04,dd+.04,3,'#a39b84',h);
    if(r()>.55)for(let i=0;i<7;i++)rect(g,p.x-8+r()*14,p.y-h+4+r()*22,2,2,'#536447');
    return;
  }
  if(o.tipo==='paredeAbrigo') {
    const vertical=d>w,xx=x+(vertical?.65:0),yy=y+(vertical?0:.65),ww=vertical?.2:w,dd=vertical?d:.2;
    box(g,xx,yy,ww,dd,h,o.cor||'#716c5d');
    for(const[lado,comprimento]of[['esq',ww],['dir',dd]])for(let j=0;j<7;j++)for(let i=0;i<Math.ceil(comprimento*3);i++) {
      const quantidade=Math.ceil(comprimento*3),u=i/quantidade+(j%2?.5/quantidade:0);if(u<.98)face(g,xx,yy,ww,dd,h,u,.025+j*.13,Math.min(.9/quantidade,.98-u),.105,['#7e7562','#746b5d','#827360'][Math.floor(r()*3)],lado);
    }
    box(g,xx-.02,yy-.02,ww+.04,dd+.04,3,'#626c5f',h);
    if(o.placa){const q=iso(xx+ww*.5,yy+dd);rect(g,q.x-40,q.y-h+10,80,15,'#303c35');g.fillStyle='#d4c8a7';g.font='bold 7px monospace';g.textAlign='center';g.fillText(o.placa,q.x,q.y-h+21);g.textAlign='left';}
    return;
  }
  if(['caixa','caixas'].includes(o.tipo)) {box(g,x+.12,y+.12,.76,.76,15,'#8b7553');madeira(g,{x:x+.12,y:y+.12,w:.76,d:.76},15);if(o.tipo==='caixas'){box(g,x+.2,y+.2,.6,.6,14,'#776345',15);face(g,x+.2,y+.2,.6,.6,29,.1,.65,.8,.025,'#b59664');}return;}
  if(o.tipo==='mesa'||o.tipo==='mesaRadio'){mesa(g,o,o.tipo==='mesaRadio');return;}
  if(o.tipo==='bancada') {
    mesa(g,o,false);box(g,x+.1,y+.1,.7,.7,16,'#6c5040');face(g,x+.1,y+.1,.7,.7,16,.05,.4,.9,.025,'#c29b6a');
    const q=iso(x+1.8,y+.5);rect(g,q.x-6,q.y-29,12,6,'#4c5a54');rect(g,q.x-3,q.y-31,7,3,'#8f9b94');rect(g,q.x+11,q.y-27,7,2,'#c28c55');return;
  }
  if(o.tipo==='arvore') {
    const sway=Math.sin(t*.7+x)*.7;
    poly(g,[[p.x-4,p.y],[p.x+4,p.y],[p.x+3,p.y-60],[p.x-1,p.y-70]],'#514936');
    linha(g,[[p.x,p.y-30],[p.x-17,p.y-58]],'#514936',3);linha(g,[[p.x+1,p.y-37],[p.x+16,p.y-72]],'#514936',3);
    for(let dy=-30;dy<=29;dy+=4)for(let dx=-28;dx<=28;dx+=4){
      const borda=dx*dx/(26*26)+dy*dy/(31*31);if(borda>1.02-r()*.12)continue;
      const luz=Math.max(0,Math.min(4,Math.floor(2-dx/24-dy/24+(r()-.5)*2)));
      rect(g,p.x+dx+sway,p.y-76+dy,5,5,['#354a33','#40583a','#4e6542','#62764b','#75845a'][luz]);
      if(r()>.75)rect(g,p.x+dx+sway,p.y-76+dy,2,1,['#566c43','#6c7d50','#83905f'][Math.floor(r()*3)]);
    }
    return;
  }
  originalObjeto(g,o,t);
  // Detalhes materiais nos objetos preservados do motor original.
  if(o.tipo==='arquivo'||o.tipo==='armario'){for(let j=0;j<3;j++){face(g,x+.15,y+.2,.7,.6,h,.32,.2+j*.22,.22,.035,'#b1b4a0');face(g,x+.15,y+.2,.7,.6,h,.15,.24+j*.22,.05,.02,'#c2b796');}}
  if(o.tipo==='gerador'){rect(g,p.x-8,p.y-19,10,3,'#d1b56e');for(let j=0;j<4;j++)rect(g,p.x-8+j*3,p.y-12,1,7,'#232e29');}
  if(o.tipo==='tambor'){rect(g,p.x-5,p.y-20,1,12,'#b2b7a366');rect(g,p.x+2,p.y-21,3,2,'#424c45');}
  if(o.tipo==='quadro'){const q=iso(x+w*.5,y+d*.5);rect(g,q.x-12,q.y-32,3,2,'#a65f3d');rect(g,q.x+8,q.y-25,3,2,'#74a6a1');}
};

// Ícones próprios em pixel art (24px lógicos, exportados a 48px).
const ICONES=['bipe','inventario','mapa','ajustes','gestao','controles','contrato','armazem','reparar','comprar','vender','vida','sucata','suprimentos','equipe','cao'];
function icone(nome,tamanho=48){
  const c=canvas(tamanho,tamanho),g=c.getContext('2d');g.scale(tamanho/24,tamanho/24);g.imageSmoothingEnabled=false;
  const p=(x,y,w,h,col='#d4b37a')=>rect(g,x,y,w,h,col),esc='#514e3d',luz='#efe0b6',azul='#80a8a0';
  if(nome==='bipe'){p(6,6,12,15,esc);p(7,7,10,13);p(9,3,1,5);p(9,9,6,4,'#344d47');p(10,10,4,1,azul);p(9,16,2,2,luz);p(13,16,2,2,luz);}
  if(nome==='inventario'){p(7,5,10,3,esc);p(8,4,8,2);p(5,8,14,13,esc);p(6,8,12,11);p(8,12,8,1,esc);p(8,14,8,5,esc);p(9,15,6,3);p(8,8,1,4,luz);p(15,8,1,4,luz);}
  if(nome==='mapa'){poly(g,[[3,5],[9,3],[15,6],[21,4],[21,19],[15,21],[9,18],[3,20]],'#d4b37a');p(9,4,1,14,esc);p(15,7,1,13,esc);p(5,8,2,1,'#80a8a0');p(11,13,3,1,'#a65f3d');p(12,12,1,3,'#a65f3d');}
  if(nome==='ajustes'){for(const[x,y,w,h]of[[9,2,6,20],[2,9,20,6],[4,4,4,4],[16,4,4,4],[4,16,4,4],[16,16,4,4]])p(x,y,w,h);p(6,6,12,12);p(9,9,6,6,'#343e36');p(10,10,4,4,azul);}
  if(nome==='gestao'||nome==='equipe'){p(9,3,6,6);p(7,10,10,9);p(2,6,4,4,azul);p(1,11,5,7,azul);p(18,6,4,4,azul);p(18,11,5,7,azul);p(10,4,2,1,luz);}
  if(nome==='controles'){p(8,3,8,8,esc);p(9,4,6,6);p(11,5,2,3,esc);p(2,12,7,7,esc);p(3,13,5,5);p(10,12,7,7,esc);p(11,13,5,5);p(18,12,5,7,esc);p(19,13,3,5);}
  if(nome==='contrato'){p(5,4,14,18,'#a99873');p(7,6,10,14,'#ddd0a9');p(9,3,6,4,esc);for(let y=9;y<17;y+=3)p(9,y,6,1,esc);}
  if(nome==='armazem'){poly(g,[[3,8],[12,3],[21,8],[21,20],[3,20]],'#a68859');p(5,9,14,10,esc);p(8,11,8,8);p(11,11,1,8,esc);p(5,7,14,2,luz);}
  if(nome==='reparar'){poly(g,[[4,2],[8,2],[7,6],[10,9],[13,8],[14,4],[17,5],[18,10],[14,13],[7,21],[3,18],[11,10],[7,9],[3,6]],'#aeb9af');p(4,17,2,2,esc);}
  if(nome==='comprar'||nome==='vender'){p(3,7,15,2);p(6,9,12,7,esc);p(7,10,10,4);p(6,18,3,3);p(15,18,3,3);p(2,4,3,3);p(12,2,2,5,azul);p(nome==='comprar'?10:14,4,2,2,azul);}
  if(nome==='vida'){poly(g,[[3,6],[8,4],[12,8],[16,4],[21,6],[21,12],[12,21],[3,12]],'#b46553');p(5,6,4,2,'#dd9c7b');}
  if(nome==='sucata'){poly(g,[[3,15],[8,5],[12,8],[16,3],[21,12],[17,19],[7,21]],'#8e9c91');p(8,10,6,2,'#c4cbb8');p(13,13,6,3,esc);}
  if(nome==='suprimentos'){p(4,8,16,13,'#9b8d66');p(7,4,10,5,'#777e5e');p(9,3,6,2,'#c0b48a');p(6,12,12,6,esc);p(8,14,8,2,'#c5b67c');}
  if(nome==='cao'){poly(g,[[5,3],[10,7],[15,7],[20,3],[19,16],[15,21],[10,21],[5,16]],'#b58c59');p(7,10,2,2,esc);p(16,10,2,2,esc);p(10,15,5,3,esc);p(11,18,3,2,'#d8bc8a');}
  return c;
}
A.icone=icone;A.ICONES=ICONES;A.quadroPessoa=quadro;A.chaveAparencia=chave;
A.arteVersao='2.0.0';
A.perfisExportacao=Object.fromEntries([
  ...Object.entries(A.NPC_AP),
  ...['jaqueta','moletom','colete','macacao'].map(roupa=>['sobrevivente_'+roupa,{corpo:'a',pele:'p3',cabelo:'curto',corCabelo:'c1',roupa}])
]);
let carregamento;
A.carregarAssets=()=>carregamento||(carregamento=(async()=>{
  const load=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;});
  const [manifesto,imRetrato]=await Promise.all([fetch('assets/manifesto.json').then(r=>r.ok?r.json():null).catch(()=>null),load('assets/retratos/npcs-v2.png')]);
  if(imRetrato)A.retratoAtlas=imRetrato;
  if(!manifesto)return;
  A.manifesto=manifesto;
  await Promise.all(manifesto.personagens.map(async perfil=>{
    const im=await load('assets/'+perfil.arquivo);if(!im)return;const s={};
    for(const dir of A.DIRS){s[dir]={};for(const estado of ['parado','anda','trabalha','ataca']){const quadros=perfil.quadros.filter(f=>f.direcao===dir&&f.estado===estado);if(quadros.length)s[dir][estado]=quadros.map(f=>{const c=canvas(A.QW,A.QH);c.getContext('2d').drawImage(im,f.x,f.y,A.QW,A.QH,0,0,A.QW,A.QH);return c;});}}
    A.registrarAtlas(perfil.aparencia,s);
  }));
})());
// Ícones integrados nos controles que já existem, preservando rótulos e atalhos.
if(document.getElementById)for(const[id,nome]of[['btn-bipe','bipe'],['btn-gestao','gestao'],['btn-ajuda','controles'],['btn-ajustes','ajustes']]){
  const b=document.getElementById(id);if(!b)continue;const im=document.createElement('img');im.src='assets/icones/'+nome+'.png';im.alt='';im.width=22;im.height=22;im.setAttribute('aria-hidden','true');b.prepend(im);
}
})();
