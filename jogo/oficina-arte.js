// Laboratório visual isolado: usa arte e motor reais; não chama a API de contas.
(async()=>{
'use strict';const A=PZ.arte,M=PZ.mundo,$=s=>document.getElementById(s);
await A.carregarAssets();
const ap=A.perfisExportacao.sobrevivente_jaqueta;
const fechar=()=>{$('dialogo').hidden=true;motor.pausar(false);$('cena').focus();};
function conversa(n){
  $('dn').textContent=n.nome;$('dp').textContent=n.papel;$('df').textContent=M.DIALOGOS[n.id]?.abertura({})||'De olho no portão.';
  const c=$('retrato'),g=c.getContext('2d'),i=['prefeito','wolf','bashar'].indexOf(n.id);g.clearRect(0,0,256,256);
  if(A.retratoAtlas&&i>=0){const w=A.retratoAtlas.width/3;g.drawImage(A.retratoAtlas,w*i,0,w,A.retratoAtlas.height,0,0,256,256);}else {g.imageSmoothingEnabled=false;g.drawImage(A.folha(A.NPC_AP[n.ap]).SE.parado[0],56,-10,144,240);}
  $('dialogo').hidden=false;motor.pausar(true);$('fechar').focus();
}
const motor=new PZ.Motor($('cena'),M,{aparencia:ap,reduzir:true,interagir:conversa,perto:n=>{$('aviso').textContent=n?'E · Conversar com '+n.nome:'Clique no chão para caminhar. WASD e setas também funcionam.';},aviso:t=>$('aviso').textContent=t});
// Ponto inicial no pátio para avaliar escala, materiais e oclusão.
motor.p.x=19.5;motor.p.y=20.5;const ps=A.iso(motor.p.x,motor.p.y);motor.cam.x=ps.x;motor.cam.y=ps.y-30;motor.zoom=1.75;
function acompanhar(){motor.cam.fixa=false;motor.pausar(false);motor.zoom=1.75;$('visao-abrigo').setAttribute('aria-pressed','false');$('seguir-jogador').setAttribute('aria-pressed','true');$('cena').focus();}
$('seguir-jogador').onclick=acompanhar;
$('visao-abrigo').onclick=()=>{motor.cam.fixa=true;motor.pausar(true);motor.zoom=Math.min(motor.W/2000,motor.H/1260);const centro=A.iso(19.5,19.5);motor.cam.x=centro.x;motor.cam.y=centro.y-24;$('visao-abrigo').setAttribute('aria-pressed','true');$('seguir-jogador').setAttribute('aria-pressed','false');$('aviso').textContent='Visão geral pausada. Use Acompanhar jogador para voltar a caminhar.';};
$('roupa-jogador').onchange=e=>{motor.definirAparencia(A.perfisExportacao[e.target.value]);$('cena').focus();};
$('fechar').onclick=fechar;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dialogo').hidden)fechar();});
for(const b of document.querySelectorAll('[data-destino]'))b.onclick=()=>{
  acompanhar();
  const n=motor.npcs.find(n=>n.id===b.dataset.destino);
  const caminho=motor.buscar(c=>Math.hypot(c.x+.5-n.px,c.y+.5-n.py)<=2);
  if(!caminho){$('aviso').textContent='Não há caminho até '+n.nome;return;}
  if(!caminho.length){conversa(n);return;}
  motor.p.caminho=caminho;motor.p.aoChegar=()=>conversa(n);
};
let raf;
const nomes={prefeito:'Prefeito',wolf:'Wolf',bashar:'Bashar',guarda:'Guarda',morador1:'Morador 1',morador2:'Morador 2',sobrevivente_jaqueta:'Sobrevivente · jaqueta',sobrevivente_moletom:'Sobrevivente · moletom',sobrevivente_colete:'Sobrevivente · colete',sobrevivente_macacao:'Sobrevivente · macacão',bipe:'Bipe',inventario:'Inventário',mapa:'Mapa',ajustes:'Ajustes',gestao:'Gestão',controles:'Controles',contrato:'Contrato',armazem:'Armazém',reparar:'Reparar',comprar:'Comprar',vender:'Vender',vida:'Vida',sucata:'Sucata',suprimentos:'Suprimentos',equipe:'Equipe',cao:'Cão'};
function galeria(aba){
  if(raf)cancelAnimationFrame(raf);$('conteudo').replaceChildren();$('titulo-galeria').textContent={personagens:'Personagens · 4 direções e animações',icones:'Ícones · PNG transparente 48 × 48',cenario:'Pisos e objetos isométricos'}[aba];
  if(aba==='personagens'){
    let direcao='SE',pausado=false,tempoQuadro=0;
    const controles=document.createElement('div');controles.style='grid-column:1 / -1;display:flex;gap:8px;flex-wrap:wrap';
    const botoes=[];
    for(const[dir,nome]of [['SE','Frente direita'],['SW','Frente esquerda'],['NE','Costas direita'],['NW','Costas esquerda']]){
      const b=document.createElement('button');b.type='button';b.textContent=nome;b.setAttribute('aria-pressed',String(dir===direcao));
      b.onclick=()=>{direcao=dir;for(const[valor,botao]of botoes)botao.setAttribute('aria-pressed',String(valor===dir));};botoes.push([dir,b]);controles.append(b);
    }
    const pausa=document.createElement('button');pausa.type='button';pausa.textContent='Pausar animação';pausa.onclick=()=>{pausado=!pausado;pausa.textContent=pausado?'Continuar animação':'Pausar animação';};controles.append(pausa);$('conteudo').append(controles);
    const cards=[];for(const[id,perfil]of Object.entries(A.perfisExportacao)){const card=document.createElement('div');card.className='card';const h=document.createElement('h3');h.textContent=nomes[id]||id;const c=document.createElement('canvas');c.width=192;c.height=192;const a=document.createElement('a');const asset=A.manifesto?.personagens.find(p=>p.id===id);a.href='assets/'+(asset?.arquivo||'personagens/'+id+'.png');a.download=id+'.png';a.textContent='Baixar spritesheet PNG';card.append(h,c,a);$('conteudo').append(card);cards.push({c,folha:A.folha(perfil)});}
    const tick=t=>{if(!pausado)tempoQuadro=t;for(const{c,folha}of cards){const g=c.getContext('2d');g.clearRect(0,0,192,192);g.imageSmoothingEnabled=false;g.drawImage(folha[direcao].anda[Math.floor(tempoQuadro/110)%8],48,16,96,160);}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    const im=document.createElement('img');im.src='assets/retratos/npcs-v2.png';im.alt='Retratos de Prefeito, Wolf e Bashar';im.className='retratos';im.style.gridColumn='1 / -1';$('conteudo').append(im);
  }else if(aba==='icones')for(const id of A.ICONES){const card=document.createElement('div');card.className='card';const h=document.createElement('h3');h.textContent=nomes[id]||id;const c=A.icone(id,96);const a=document.createElement('a');a.href='assets/icones/'+id+'.png';a.download=id+'.png';a.textContent='Baixar PNG';card.append(h,c,a);$('conteudo').append(card);}
  else for(const tipo of ['pisos','objetos'])fetch('assets/manifesto.json').then(r=>r.json()).then(m=>{for(const o of m[tipo]){const card=document.createElement('div');card.className='card';const h=document.createElement('h3');h.textContent=o.id;const im=document.createElement('img');im.src='assets/'+o.arquivo;im.alt=o.id;im.style='max-width:100%;height:100px;object-fit:contain;image-rendering:pixelated';const a=document.createElement('a');a.href=im.src;a.download=o.id+'.png';a.textContent='Baixar PNG';card.append(h,im,a);$('conteudo').append(card);}});
}
for(const b of document.querySelectorAll('[data-aba]'))b.onclick=()=>{if(!$('dialogo').hidden)fechar();const aba=b.dataset.aba;for(const n of document.querySelectorAll('[data-aba]'))n.setAttribute('aria-pressed',String(n===b));$('abrigo').hidden=aba!=='abrigo';$('galeria').hidden=aba==='abrigo';motor.pausar(aba!=='abrigo');if(aba!=='abrigo')galeria(aba);else {if(raf)cancelAnimationFrame(raf);motor.redimensionar();acompanhar();}};
$('cena').focus();
})();
