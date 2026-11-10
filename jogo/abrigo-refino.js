// Alvenaria contínua: desenho, profundidade e colisão compartilham a geometria.
(() => {
'use strict';
const A=window.PZ.arte,iso=A.iso,tom=A.tom;
const desenharAnterior=A.desenharObjeto,caixaAnterior=A.caixaTela;
const parede=o=>o.tipo==='muro'||o.tipo==='paredeAbrigo';
function poligono(g,pontos,cor){g.fillStyle=cor;g.beginPath();pontos.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();}
function linha(g,pontos,cor){g.strokeStyle=cor;g.lineWidth=1;g.beginPath();pontos.forEach(([x,y],i)=>i?g.lineTo(Math.round(x)+.5,Math.round(y)+.5):g.moveTo(Math.round(x)+.5,Math.round(y)+.5));g.stroke();}
function geometriaParede(o){
  if(!parede(o))return null;
  if(o.geometria)return o.geometria;
  const eixo=o.d>o.w?'y':'x';
  const t=o.trecho||{eixo,de:eixo==='x'?o.x:o.y,ate:eixo==='x'?o.x+o.w:o.y+o.d,linha:eixo==='x'?o.y+.5:o.x+.5};
  const e=o.tipo==='muro'?.28:.22;
  return{...t,espessura:e,x:t.eixo==='x'?t.de:t.linha-e/2,y:t.eixo==='y'?t.de:t.linha-e/2,w:t.eixo==='x'?t.ate-t.de:e,d:t.eixo==='y'?t.ate-t.de:e};
}
A.geometriaParede=geometriaParede;
A.ALTURA.paredeAbrigo=54;A.ALTURA.cantoMuro=49;
A.ALTOS.add('cantoMuro');A.arteVersao='2.1.0';
A.partesDesenho=o=>{
  const geo=geometriaParede(o);if(!geo)return[o];
  const partes=[];
  for(let de=geo.de;de<geo.ate-1e-6;){
    const ate=Math.min(geo.ate,Math.floor(de+1+1e-6));
    const geometria={...geo,de,ate,x:geo.eixo==='x'?de:geo.x,y:geo.eixo==='y'?de:geo.y,w:geo.eixo==='x'?ate-de:geo.w,d:geo.eixo==='y'?ate-de:geo.d};
    partes.push({...o,geometria,geometriaOrigem:geo,pontaFinal:Math.abs(ate-geo.ate)<1e-6});de=ate;
  }
  return partes;
};
A.profundidadeObjeto=o=>{
  const q=o.geometria||geometriaParede(o);
  if(q)return q.x+q.w/2+q.y+q.d/2;
  if(o.tipo==='cantoMuro')return o.x+o.y+1.01;
  return o.x+o.w/2+o.y+o.d/2+.49;
};
A.caixaTela=o=>{
  let q=geometriaParede(o);
  if(o.tipo==='cantoMuro')q={x:o.x+.30,y:o.y+.30,w:.40,d:.40};
  if(!q)return caixaAnterior(o);
  const pts=[iso(q.x,q.y),iso(q.x+q.w,q.y),iso(q.x+q.w,q.y+q.d),iso(q.x,q.y+q.d)],h=A.ALTURA[o.tipo];
  return{x0:Math.min(...pts.map(p=>p.x))-3,x1:Math.max(...pts.map(p=>p.x))+3,y0:Math.min(...pts.map(p=>p.y))-h-4,y1:Math.max(...pts.map(p=>p.y))+2};
};
function face(g,q,h,de,ate,baixo,alto,cor){
  const ponto=(s,z)=>{
    const p=q.eixo==='x'?iso(s,q.y+q.d):iso(q.x+q.w,s);
    return[p.x,p.y-z];
  };
  poligono(g,[ponto(de,baixo),ponto(ate,baixo),ponto(ate,alto),ponto(de,alto)],cor);
}
function desenharParede(g,o){
  const q=geometriaParede(o),{x,y,w,d}=q,h=A.ALTURA[o.tipo],base=o.cor||(o.tipo==='muro'?'#77705f':'#736d5d');
  const a=iso(x,y),b=iso(x+w,y),c=iso(x+w,y+d),dd=iso(x,y+d);
  // Só a extremidade do trecho recebe a face de fechamento, não cada célula.
  if(q.eixo==='x'||o.pontaFinal!==false)poligono(g,[[dd.x,dd.y],[c.x,c.y],[c.x,c.y-h],[dd.x,dd.y-h]],base);
  if(q.eixo==='y'||o.pontaFinal!==false)poligono(g,[[c.x,c.y],[b.x,b.y],[b.x,b.y-h],[c.x,c.y-h]],tom(base,.78));
  const largura=.46,altura=6;
  for(let row=0;row<Math.ceil(h/altura);row++){
    const offset=(row%2)*largura/2;
    for(let n=Math.floor((q.de-offset)/largura);n*largura+offset<q.ate;n++){
      const inicio=Math.max(q.de,n*largura+offset),fim=Math.min(q.ate,(n+1)*largura+offset-.025);
      if(fim<=inicio)continue;
      const hash=((Math.imul(n,193)+row*71+Math.round(q.linha*29))>>>0)%5;
      face(g,q,h,inicio,fim,row*altura+1,Math.min(h-1,(row+1)*altura),tom(base,(q.eixo==='y'?.80:.94)+hash*.025));
    }
  }
  poligono(g,[[a.x,a.y-h],[b.x,b.y-h],[c.x,c.y-h],[dd.x,dd.y-h]],tom(base,1.22));
  linha(g,[[dd.x,dd.y-h],[c.x,c.y-h]],tom(base,1.32));
  if(q.eixo==='y')linha(g,[[c.x,c.y-h],[b.x,b.y-h]],tom(base,1.15));
  face(g,q,h,q.de,q.ate,0,4,tom(base,.72));
  if(o.placa){
    // A placa é recortada por trecho da própria face: não flutua nem some
    // quando o próximo segmento é ordenado à frente.
    const origem=o.geometriaOrigem||q;
    const pt=origem.eixo==='x'?iso((origem.de+origem.ate)/2,origem.linha+origem.espessura/2):iso(origem.linha+origem.espessura/2,(origem.de+origem.ate)/2);
    const facePts=q.eixo==='x'?[[dd.x,dd.y],[c.x,c.y],[c.x,c.y-h],[dd.x,dd.y-h]]:[[c.x,c.y],[b.x,b.y],[b.x,b.y-h],[c.x,c.y-h]];
    g.save();g.beginPath();facePts.forEach(([xx,yy],i)=>i?g.lineTo(Math.round(xx),Math.round(yy)):g.moveTo(Math.round(xx),Math.round(yy)));g.closePath();g.clip();
    g.translate(pt.x,pt.y-h+18);g.transform(1,origem.eixo==='x'?.5:-.5,0,1,0,0);
    g.fillStyle='#35453c';g.fillRect(-41,-9,82,14);g.fillStyle='#89947c';g.fillRect(-40,-8,80,1);
    g.fillStyle='#e0d5b3';g.font='bold 7px monospace';g.textAlign='center';g.fillText(o.placa,0,1);g.restore();
  }
}
A.desenharObjeto=(g,o,t)=>{
  if(parede(o)){desenharParede(g,o);return;}
  if(o.tipo==='cantoMuro'){
    const q={x:o.x+.32,y:o.y+.32,w:.36,d:.36},a=iso(q.x,q.y),b=iso(q.x+q.w,q.y),c=iso(q.x+q.w,q.y+q.d),dd=iso(q.x,q.y+q.d);
    poligono(g,[[dd.x,dd.y],[c.x,c.y],[c.x,c.y-47],[dd.x,dd.y-47]],'#807967');
    poligono(g,[[c.x,c.y],[b.x,b.y],[b.x,b.y-47],[c.x,c.y-47]],'#666959');
    poligono(g,[[a.x,a.y-49],[b.x,b.y-49],[c.x,c.y-49],[dd.x,dd.y-49]],'#b0a58a');return;
  }
  desenharAnterior(g,o,t);
};
})();
