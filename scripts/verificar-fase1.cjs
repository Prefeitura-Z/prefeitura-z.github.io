// Exercita os roteiros reais contra o motor, sprites e mapas integrados.
(async()=>{
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),jogo=path.join(root,'jogo'),codigo=fs.readFileSync(path.join(root,'worker/src/regras.js'),'utf8'),R=await import('data:text/javascript;base64,'+Buffer.from(codigo).toString('base64'));
const context={window:{PZ:{}},document:{createElement:()=>createCanvas(1,1),addEventListener(){},removeEventListener(){}},console,Math,Date,performance:{now:()=>0},requestAnimationFrame:()=>0,addEventListener(){},removeEventListener(){},innerWidth:1024,devicePixelRatio:1};vm.createContext(context);
for(const f of ['mundo.js','arte.js','arte-v2.js','abrigo-refino.js','objetos-pixel.js','cenario-detalhes.js','area.js','motor.js','expedicao.js'])vm.runInContext(fs.readFileSync(path.join(jogo,f),'utf8'),context,{filename:f});
const PZ=context.window.PZ,A=PZ.arte,m=JSON.parse(fs.readFileSync(path.join(jogo,'assets/manifesto.json'),'utf8'));
for(const perfil of m.personagens){const im=await loadImage(path.join(jogo,'assets',perfil.arquivo)),folha={};for(const dir of A.DIRS){folha[dir]={};for(const estado of ['parado','anda','trabalha','ataca']){const frames=perfil.quadros.filter(f=>f.direcao===dir&&f.estado===estado);if(frames.length)folha[dir][estado]=frames.map(f=>{const c=createCanvas(A.QW,A.QH);c.getContext('2d').drawImage(im,f.x,f.y,A.QW,A.QH,0,0,A.QW,A.QH);return c;});}}A.registrarAtlas(perfil.aparencia,folha);}
for(const p of m.objetosRaster)A.registrarObjetoRaster(p,await loadImage(path.join(jogo,'assets',p.arquivo)));
for(const id of Object.keys(R.ITENS))assert.ok(m.itens.some(p=>p.id===id),'Item sem arte: '+id);
for(const p of m.itens){const im=await loadImage(path.join(jogo,'assets',p.arquivo));assert.equal(im.width,48);assert.equal(im.height,48);}
for(let t=7;t<11;t++)assert.notEqual(A.tile(t,1).toBuffer('image/png').toString('base64'),A.tile(1,1).toBuffer('image/png').toString('base64'),'Rua caiu no piso de terra');
const cv=createCanvas(1024,768);cv.getBoundingClientRect=()=>({width:1024,height:768,left:0,top:0});cv.addEventListener=()=>{};cv.removeEventListener=()=>{};
const equipados=Object.fromEntries(R.KIT_INICIAL.map((item)=>[R.ITENS[item].tipo,{item,condicao:100}]));
const attrs=R.atributos({xp:1500,origem:'batedor',equipados,ferido:false});let casos=0,amostras=0,ataques=0,desenhou=false;
for(const roupa of ['jaqueta','moletom','colete','macacao'])for(const rota of Object.keys(R.ROTAS)){
  const sim=R.simular(rota,attrs,271828,{flags:{}});let tempo=0,concluiu=0;
  const cena=new PZ.Expedicao(cv,{expedicao:{id:'teste',rota,inicio:0,log:sim.log,vidaMax:attrs.vidaMax,capacidade:attrs.capacidade},catalogo:R.catalogo(),aparencia:A.perfisExportacao['sobrevivente_'+roupa],reduzir:true,agora:()=>tempo*1000,mudou(){},fim(){concluiu++;}});
  const tempos=new Set([0,sim.duracao+1]);for(const e of sim.log){tempos.add(e.t);tempos.add(e.t+.21);if(e.e==='atk'&&e.de==='j')for(let i=0;i<6;i++)tempos.add(e.t+i*.075+.01);}
  for(const t of [...tempos].sort((a,b)=>a-b)){
    tempo=t;cena.motor.atualizar(.05);cena.motor.desenhar();amostras++;
    assert.ok(Number.isFinite(cena.motor.p.x)&&Number.isFinite(cena.motor.p.y));
    if(cena.motor.p.estado==='ataca'){ataques++;assert.ok(cena.motor.p.folha[cena.motor.p.dir].ataca[cena.motor.p.quadro]);}
    if(!desenhou&&roupa==='jaqueta'&&cena.motor.p.estado==='ataca'&&cena.motor.p.quadro===2){fs.writeFileSync(path.join(jogo,'assets/previa-primeira-fase.png'),cv.toBuffer('image/png'));desenhou=true;}
  }
  assert.equal(concluiu,1,'Conclusão disparou mais de uma vez');cena.parar();casos++;
}
// A mesma distância produz a mesma fase, independentemente do fps.
const motor=new PZ.Motor(cv,PZ.mundo,{aparencia:A.perfisExportacao.sobrevivente_jaqueta,reduzir:true}),a={anda:true},b={anda:true};for(let i=0;i<20;i++)motor.animarPassos(a,3.4/20);for(let i=0;i<60;i++)motor.animarPassos(b,3.4/60);assert.ok(Math.abs(a.faseAndar-b.faseAndar)<1e-8);a.anda=false;motor.animarPassos(a,0);assert.equal(a.faseAndar,0);
// Presença remota continua aceitando as folhas novas e ordenando junto dos objetos.
motor.outros.set('teste',{px:19,py:20,tx:19.1,ty:20.2,dir:'SE',dirRede:'SE',folha:A.folha(A.perfisExportacao.sobrevivente_jaqueta),nome:'Teste',papel:'jogador'});motor.atualizar(.05);motor.desenhar();motor.parar();
const tira=createCanvas(8*96,4*160),g=tira.getContext('2d');g.fillStyle='#1f2b25';g.fillRect(0,0,tira.width,tira.height);g.imageSmoothingEnabled=false;const folha=A.folha(A.perfisExportacao.sobrevivente_jaqueta);for(let row=0;row<4;row++)for(let col=0;col<8;col++)g.drawImage(folha[A.DIRS[row]].anda[col],col*96,row*160,96,160);fs.writeFileSync(path.join(jogo,'assets/previa-caminhada-v4.png'),tira.toBuffer('image/png'));
assert.ok(ataques>0&&desenhou);console.log(JSON.stringify({status:'aprovado',rotasERoupas:casos,instantesRenderizados:amostras,quadrosDeAtaqueExercitados:ataques,itensDoCatalogoComArte:Object.keys(R.ITENS).length,pisosDaRua:4,passadaIndependenteDoFPS:true,presencaCompativel:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
