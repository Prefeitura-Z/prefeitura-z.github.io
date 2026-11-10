// Materiais editáveis para os elementos modulares do abrigo e da primeira área.
(() => {
'use strict';const A=window.PZ.arte,anterior=A.desenharObjeto,iso=A.iso,tom=A.tom;
const poly=(g,p,c)=>{g.fillStyle=c;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();};
function face(g,o,l,u,v,w,h,c,altura){const z=altura||o.h||A.ALTURA[o.tipo]||20,a=l==='dir'?iso(o.x+o.w,o.y+o.d):iso(o.x,o.y+o.d),b=l==='dir'?iso(o.x+o.w,o.y):iso(o.x+o.w,o.y+o.d);const p=(s,t)=>[a.x+(b.x-a.x)*s,a.y+(b.y-a.y)*s-t*z];poly(g,[p(u,v),p(u+w,v),p(u+w,v+h),p(u,v+h)],c);}
function linha(g,p,c){g.strokeStyle=c;g.lineWidth=1;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(Math.round(x)+.5,Math.round(y)+.5):g.moveTo(Math.round(x)+.5,Math.round(y)+.5));g.stroke();}
function metal(g,o,h){for(const l of ['esq','dir']){face(g,o,l,.07,.05,.02,.86,'#adb19b66',h);face(g,o,l,.91,.04,.02,.9,'#111a1c77',h);for(const v of [.12,.84])for(const u of [.12,.86])face(g,o,l,u,v,.04,.025,'#d2c0a0',h);}}
A.desenharObjeto=(g,o,t)=>{
  anterior(g,o,t);
  if(Object.values(A.objetosRaster||{}).some(p=>(p.tipo||p.id)===o.tipo&&p.celulas.largura===o.w&&p.celulas.profundidade===o.d))return;
  const h=o.h||A.ALTURA[o.tipo]||20;
  if(o.tipo==='bloco'){
    for(const[l,ativa]of [['esq',o.sul],['dir',o.leste]])if(ativa){
      const cor=tom(o.cor||'#6b6258',l==='dir'?.62:.82),azulejo=(z)=>z<7||z%30>26;
      for(let z=3;z<h;z+=5){face(g,o,l,0,z/h,1,1/h,cor,h);for(let u=((Math.floor(z/5)+o.x+o.y)%2)*.19;u<1;u+=.38){if(azulejo(z)||u<.16||u>.83)face(g,o,l,u,z/h,.016,4/h,cor,h);}}
      face(g,o,l,0,0,1,3/h,'#303a3277',h);face(g,o,l,0,(h-3)/h,1,2/h,'#c0b49a55',h);
      for(let z=10;z+15<h;z+=30){if(z===10&&(o.porta===l||o.vitrine))continue;face(g,o,l,.17,(z-2)/h,.66,2/h,'#b3ab93',h);face(g,o,l,.18,(z+15)/h,.64,2/h,'#9a947c',h);face(g,o,l,.48,z/h,.035,15/h,'#535e58',h);face(g,o,l,.27,(z+2)/h,.15,1/h,'#8a9b9377',h);}
      if(o.porta===l){face(g,o,l,.27,0,.04,25/h,'#b0a086',h);face(g,o,l,.72,0,.04,25/h,'#938674',h);face(g,o,l,.63,11/h,.035,1.5/h,'#d0ad68',h);}
      if((o.x*7+o.y)%4===0)face(g,o,l,.8,.04,.11,.18,'#50624866',h);
    }
    // Cobertura contínua: pequenos riscos, sem alterar a base sólida dos prédios.
    const p=iso(o.x+.5,o.y+.5);for(let k=0;k<3;k++)linha(g,[[p.x-12+k*7,p.y-h-2],[p.x-5+k*7,p.y-h+1]],'#b2aa9155');
  }
  if(['arquivo','armario'].includes(o.tipo)){
    metal(g,o,h);const n=o.tipo==='arquivo'?3:2;
    for(let i=0;i<n;i++){face(g,o,'dir',.16,.1+i*.78/n,.66,.6/n,'#343f4777',h);face(g,o,'dir',.38,.2+i*.78/n,.23,2/h,'#b9b6a3',h);face(g,o,'dir',.4,.13+i*.78/n,.19,2/h,'#ded2b3',h);}
    for(let i=0;i<4;i++)face(g,o,'esq',.2,.7-i*.05,.42,1/h,'#1d2c2a77',h);
  }
  if(['caixa','caixaMedica','estante','casinha','ferramentas'].includes(o.tipo)){
    const l='esq';for(let k=1;k<5;k++)face(g,o,l,.05,k*.17,.9,.015,'#29231a66',h);
    for(const u of [.1,.86])for(const v of [.14,.8])face(g,o,l,u,v,.025,.03,'#baa17c',h);
    if(o.tipo==='caixaMedica'){face(g,o,l,.43,.3,.12,.4,'#78a398',h);face(g,o,l,.28,.43,.42,.13,'#78a398',h);}
    if(o.tipo==='estante')for(let z=0;z<3;z++){for(let j=0;j<7;j++){const u=.06+j*.13;face(g,o,l,u,.1+z*.3,.06,.17+(j%2)*.025,['#8b7750','#536e6c','#a37650','#b3ab8f'][j%4],h);face(g,o,l,u+.014,.13+z*.3,.035,.013,'#e6d1a177',h);}face(g,o,l,.02,.08+z*.3,.96,.025,'#b19570',h);}
  }
  if(o.tipo==='tambor'){const p=iso(o.x+.5,o.y+.5);g.fillStyle='#b0b3a777';g.fillRect(p.x-6,p.y-h+4,2,h-10);for(let i=0;i<3;i++){g.fillStyle='#8a4e3488';g.fillRect(p.x+3-i,p.y-4-i*6,3,3);}g.strokeStyle='#192b2b';g.beginPath();g.ellipse(p.x,p.y-h,7,3.5,0,0,7);g.stroke();g.fillStyle='#bdac83';g.fillRect(p.x+3,p.y-h-2,2,2);}
  if(o.tipo==='pneus'){const p=iso(o.x+.5,o.y+.5);for(let z=0;z<3;z++)for(let x=-10;x<=10;x+=5)linha(g,[[p.x+x,p.y-z*5-2],[p.x+x+2,p.y-z*5]],'#5a5d53');}
  if(o.tipo==='poste'||o.tipo==='pilar'){const p=iso(o.x+.5,o.y+.5);if(o.tipo==='poste'){g.fillStyle='#b0ac9377';g.fillRect(p.x-2,p.y-h+8,1,h-10);g.fillStyle='#1a2426';g.fillRect(p.x+4,p.y-h+2,10,7);g.fillStyle='#e8cf85';g.fillRect(p.x+6,p.y-h+3,6,4);g.fillStyle='#555d53';g.fillRect(p.x-5,p.y-3,10,4);}else for(let z=5;z<h;z+=8)face(g,o,'esq',.03,z/h,.9,1/h,'#333b3266',h);}
  if(o.tipo==='entulho'){const p=iso(o.x+.5,o.y+.5);linha(g,[[p.x-10,p.y-3],[p.x-1,p.y-7],[p.x+6,p.y-2]],'#aa9b7d');linha(g,[[p.x+3,p.y],[p.x+12,p.y-4],[p.x+17,p.y]],'#677c76');}
  if(o.tipo==='barricada'){for(const l of ['esq','dir'])for(let v=.2;v<.8;v+=.22)face(g,o,l,.06,v,.88,.02,'#3c3a2966',h);}
  if(o.tipo==='cerca'){const p=iso(o.x+.5,o.y+.5);linha(g,[[p.x-2,p.y-18],[p.x-2,p.y]],'#a2916f');linha(g,[[p.x-17,p.y-6],[p.x+14,p.y-22]],'#b3aa8777');}
  if(o.tipo==='planta'){const p=iso(o.x+.5,o.y+.5);for(let i=0;i<3;i++){g.fillStyle='#80905a';g.fillRect(p.x-8+i*7,p.y-5-i%2*3,2,3);g.fillStyle='#c09553';g.fillRect(p.x-7+i*7,p.y-6,2,2);}}
};
})();
