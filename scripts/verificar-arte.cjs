(async()=>{
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..','jogo'),out=path.join(root,'assets');
const doc={createElement:()=>createCanvas(1,1),addEventListener(){},removeEventListener(){}};
const context={window:{PZ:{}},document:doc,console,Math,Date,performance:{now:()=>0},requestAnimationFrame:()=>0,addEventListener(){},removeEventListener(){},innerWidth:1024,devicePixelRatio:1};
vm.createContext(context);for(const f of ['mundo.js','arte.js','arte-v2.js','abrigo-refino.js','objetos-pixel.js','cenario-detalhes.js','motor.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const A=context.window.PZ.arte,M=context.window.PZ.mundo,Motor=context.window.PZ.Motor;
const cv=createCanvas(1024,768);cv.getBoundingClientRect=()=>({width:1024,height:768,left:0,top:0});cv.addEventListener=()=>{};cv.removeEventListener=()=>{};
let motor=new Motor(cv,M,{aparencia:A.perfisExportacao.sobrevivente_jaqueta,reduzir:true});
let trechos=0,percursos=0;
for(const parede of M.OBJ.filter(o=>A.geometriaParede(o))){
  const geo=A.geometriaParede(parede),partes=A.partesDesenho(parede);let fim=geo.de;
  for(const p of partes){assert.equal(p.geometria.de,fim,'Emenda aberta na parede');assert.ok(p.geometria.ate-p.geometria.de<=1.000001);fim=p.geometria.ate;trechos++;}
  assert.equal(fim,geo.ate);assert.equal(partes.filter(p=>p.pontaFinal).length,1);
}
for(const[x,y]of[[6.5,7.5],[33.5,7.5],[6.5,33.5],[33.5,33.5],[7.5,8.5],[7.5,16.5]]){
  assert.ok(motor.colisoresParede.filter(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.d).length>=2,'Canto desconectado');
}
assert.ok(motor.livre(7.02,25),'Colisão invisível além do muro');
assert.ok(!motor.livre(6.8,25),'Personagem atravessa a espessura do muro');
motor.p.x=7.2;motor.p.y=25;for(let i=0;i<60;i++)motor.mover(-3.4,0,1/60);assert.ok(motor.p.x>=6.94-1e-6,'Movimento atravessou o muro');
for(const partida of [M.SPAWN,{x:19.5,y:20.5}])for(const npc of motor.npcs){
  motor.p.x=partida.x;motor.p.y=partida.y;motor.p.preso=0;let chegou=false;
  motor.p.caminho=motor.buscar(c=>Math.hypot(c.x+.5-npc.px,c.y+.5-npc.py)<=2);motor.p.aoChegar=()=>{chegou=true;};
  for(let i=0;i<1000&&!chegou;i++)motor.atualizar(.05);
  assert.ok(chegou,'Caminhada real ficou presa até '+npc.id+': '+JSON.stringify({x:motor.p.x,y:motor.p.y,alvo:motor.p.caminho?.[0],preso:motor.p.preso}));percursos++;
}
let caminhos=0;for(const partida of [M.SPAWN,{x:19.5,y:20.5}])for(const npc of motor.npcs){motor.p.x=partida.x;motor.p.y=partida.y;const caminho=motor.buscar(c=>Math.hypot(c.x+.5-npc.px,c.y+.5-npc.py)<=2);assert.ok(caminho,'NPC inacessível: '+npc.id);for(const p of caminho)assert.ok(!motor.bloqueado(Math.floor(p.x),Math.floor(p.y)));caminhos++;}
const manifesto=JSON.parse(fs.readFileSync(path.join(out,'manifesto.json'),'utf8'));
let personagensPixel=0,posesPixel=0;
for(const perfil of manifesto.personagens.filter(p=>p.estilo?.startsWith('pixel-art-detalhada-'))){
  const im=await loadImage(path.join(out,perfil.arquivo)),folha={};
  for(const dir of A.DIRS){
    folha[dir]={};for(const estado of ['parado','anda','trabalha'])folha[dir][estado]=perfil.quadros.filter(f=>f.direcao===dir&&f.estado===estado).map(f=>{
      const c=createCanvas(A.QW,A.QH),g=c.getContext('2d');g.drawImage(im,f.x,f.y,A.QW,A.QH,0,0,A.QW,A.QH);
      const pixels=g.getImageData(0,0,A.QW,A.QH).data;let opacos=0;
      for(let y=0;y<A.QH;y++)for(let x=0;x<A.QW;x++)if(pixels[(y*A.QW+x)*4+3]){opacos++;assert.ok(x>0&&y>0&&x<A.QW-1&&y<A.QH-1,'Recorte cortado: '+perfil.id);}
      assert.ok(opacos>100,'Quadro vazio: '+perfil.id);return c;
    });
    assert.ok(new Set(folha[dir].anda.map(c=>c.toBuffer('image/png').toString('base64'))).size>=(perfil.estilo==='pixel-art-detalhada-v4'?8:3),'Marcha sem poses distintas: '+perfil.id+'/'+dir);
  }
  A.registrarAtlas(perfil.aparencia,folha);personagensPixel++;posesPixel+=perfil.posesOriginais;
}
for(const p of manifesto.objetosRaster||[]){const im=await loadImage(path.join(out,p.arquivo));assert.equal(im.width,p.largura);assert.equal(im.height,p.altura);A.registrarObjetoRaster(p,im);const c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;let vazios=0,cheios=0;for(let i=3;i<d.length;i+=4)d[i]?cheios++:vazios++;assert.ok(vazios>0&&cheios>100,'Objeto vazio ou sem transparência: '+p.id);}
for(const p of manifesto.iconesRaster||[])A.registrarIconeRaster(p.id,await loadImage(path.join(out,p.arquivo)));
motor.parar();motor=new Motor(cv,M,{aparencia:A.perfisExportacao.sobrevivente_jaqueta,reduzir:true});
let quadros=0,arquivos=0;
function png(f){const b=fs.readFileSync(path.join(out,f));assert.equal(b.subarray(1,4).toString(),'PNG');arquivos++;return{width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
for(const perfil of manifesto.personagens){const size=png(perfil.arquivo);assert.equal(perfil.quadros.length,perfil.estilo==='pixel-art-detalhada-v4'?96:72);for(const f of perfil.quadros){assert.ok(f.x+f.largura<=size.width&&f.y+f.altura<=size.height);quadros++;}}
for(const p of manifesto.pisos){const s=png(p.arquivo);assert.equal(s.width,512);assert.equal(s.height,32);}
for(const p of manifesto.objetos)png(p.arquivo);
for(const p of manifesto.icones){const s=png(p.arquivo);assert.equal(s.width,48);assert.equal(s.height,48);const c=A.icone(p.id),d=c.getContext('2d').getImageData(0,0,48,48).data;let vazios=0,cheios=0;for(let i=3;i<d.length;i+=4)d[i]?cheios++:vazios++;assert.ok(vazios>0&&cheios>0,'Ícone vazio ou sem transparência: '+p.id);}
const retratos=png(manifesto.retratos.arquivo);assert.equal(retratos.width%3,0);assert.equal(retratos.width/3,retratos.height);
assert.notEqual(A.chaveAparencia(A.NPC_AP.wolf),A.chaveAparencia(A.NPC_AP.bashar));
assert.ok(A.NPC_AP.bashar.grisalho&&A.NPC_AP.bashar.lenco&&!A.NPC_AP.bashar.fone);
// Visão geral renderizada pelo mesmo motor, para conferir os quatro encontros.
const overview=createCanvas(1560,1080);
motor.cv=overview;motor.g=overview.getContext('2d');motor.W=1560;motor.H=1080;motor.dpr=1;motor.zoom=.73;
motor.p.x=19.5;motor.p.y=20.5;motor.p.caminho=null;motor.p.anda=false;motor.perto=null;motor.t=0;
const centro=A.iso(19.5,19.5);motor.cam.x=centro.x;motor.cam.y=centro.y-24;
motor.desenhar();fs.writeFileSync(path.join(out,'previa-abrigo.png'),overview.toBuffer('image/png'));
motor.cv=cv;motor.g=cv.getContext('2d');
motor.parar();
console.log(JSON.stringify({status:'aprovado',personagensPixelDetalhados:personagensPixel,posesRasterOriginais:posesPixel,objetosPixelDetalhados:manifesto.objetosRaster.length,iconesPixelDetalhados:manifesto.iconesRaster.length,caminhosAteNPCs:caminhos,percursosSimulados:percursos,segmentosDeParedeSemFresta:trechos,cantosConectados:6,colisaoFisica:'alinhada à espessura visível',quadrosComCoordenadasValidas:quadros,arquivosPNGValidos:arquivos,iconesComTransparencia:16}));
})().catch(e=>{console.error(e);process.exitCode=1;});
