// Sprites de cenário e itens detalhados; os retângulos lógicos continuam no mapa.
(() => {
'use strict';const A=window.PZ.arte,desenhar=A.desenharObjeto,caixa=A.caixaTela,icone=A.icone;
A.objetosRaster={};A.iconesRaster={};
const porBase=new Map(),chave=(tipo,w,d)=>tipo+':'+w+':'+d;
A.registrarObjetoRaster=(meta,imagem)=>{
  const tipo=meta.tipo||meta.id,p={...meta,imagem};A.objetosRaster[meta.id]=p;porBase.set(chave(tipo,meta.celulas.largura,meta.celulas.profundidade),p);A.ALTURA[tipo]=Math.max(A.ALTURA[tipo]||0,meta.alturaLogica);
  if(meta.alturaLogica>=40)A.ALTOS.add(tipo);
};
A.registrarIconeRaster=(id,imagem)=>{A.iconesRaster[id]=imagem;};
function dados(o){return porBase.get(chave(o.tipo,o.w,o.d));}
A.desenharObjeto=(g,o,t)=>{
  const p=dados(o);if(!p)return desenhar(g,o,t);
  const origem=A.iso(o.x,o.y),x=Math.round(origem.x-p.pivo.x),y=Math.round(origem.y-p.pivo.y);
  if(p.espelhar){g.save();g.translate(x+p.largura,y);g.scale(-1,1);g.drawImage(p.imagem,0,0);g.restore();}else g.drawImage(p.imagem,x,y);
};
A.caixaTela=o=>{
  const p=dados(o);if(!p)return caixa(o);
  const origem=A.iso(o.x,o.y),x=origem.x-p.pivo.x,y=origem.y-p.pivo.y;
  return{x0:x,x1:x+p.largura,y0:y,y1:y+p.altura};
};
A.icone=(id,tamanho=48)=>{
  const im=A.iconesRaster[id];if(!im)return icone(id,tamanho);
  const c=document.createElement('canvas');c.width=tamanho;c.height=tamanho;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(im,0,0,tamanho,tamanho);return c;
};
const carregar=A.carregarAssets;let espera;
A.carregarAssets=()=>espera||(espera=(async()=>{
  await carregar();const m=A.manifesto;if(!m)return;
  const load=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;});
  await Promise.all((m.objetosRaster||[]).map(async p=>{const im=await load('assets/'+p.arquivo);if(im)A.registrarObjetoRaster(p,im);}));
  await Promise.all((m.iconesRaster||[]).map(async p=>{const im=await load('assets/'+p.arquivo);if(im)A.registrarIconeRaster(p.id,im);}));
})());
})();
