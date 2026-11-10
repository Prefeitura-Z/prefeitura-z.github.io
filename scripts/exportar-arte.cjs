// Uso: node scripts/exportar-arte.cjs. Requer @napi-rs/canvas (pacote de desenvolvimento).
(async()=>{
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createCanvas}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..','jogo');
const out=path.join(root,'assets');
const context={window:{PZ:{}},document:{createElement:()=>createCanvas(1,1)},console};
vm.createContext(context);
for(const file of ['mundo.js','arte.js','arte-v2.js','abrigo-refino.js','objetos-pixel.js','cenario-detalhes.js','area.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const A=context.window.PZ.arte,M=context.window.PZ.mundo;
const save=(file,c)=>{const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,c.toBuffer('image/png'));};
const manifesto={versao:A.arteVersao,projecao:'isometrica-2:1',piso:{largura:64,altura:32},personagem:{largura:A.QW,altura:A.QH,pivo:{x:A.PX,y:A.PY}},personagens:[],pisos:[],objetos:[],icones:[],retratos:{arquivo:'retratos/npcs-v2.png',colunas:['prefeito','wolf','bashar']}};
let total=0;
for(const[id,aparencia]of Object.entries(A.perfisExportacao)){
  const folha=A.folha(aparencia),c=createCanvas(A.QW*8,A.QH*12),g=c.getContext('2d'),quadros=[];
  for(let di=0;di<A.DIRS.length;di++)for(const[ei,estado]of ['parado','anda','trabalha'].entries()){
    const dir=A.DIRS[di],row=di*3+ei;
    folha[dir][estado].forEach((quadro,index)=>{
      const x=index*A.QW,y=row*A.QH;g.drawImage(quadro,x,y);
      const pixels=quadro.getContext('2d').getImageData(0,0,A.QW,A.QH).data;
      let count=0,borda=0;
      for(let yy=0;yy<A.QH;yy++)for(let xx=0;xx<A.QW;xx++){if(!pixels[(yy*A.QW+xx)*4+3])continue;count++;if(xx===0||yy===0||xx===A.QW-1||yy===A.QH-1)borda++;}
      if(count<100)throw new Error(id+': quadro vazio');
      if(borda)throw new Error(id+': sprite toca a borda; revisar recorte '+dir+'/'+estado+'/'+index);
      quadros.push({direcao:dir,estado,indice:index,x,y,largura:A.QW,altura:A.QH,duracaoMs:estado==='anda'?100:estado==='parado'?250:167});total++;
    });
  }
  const arquivo='personagens/'+id+'.png';save(arquivo,c);manifesto.personagens.push({id,aparencia,arquivo,quadros});
}
for(let tipo=0;tipo<11;tipo++){
  const c=createCanvas(64*8,32),g=c.getContext('2d');for(let v=0;v<8;v++)g.drawImage(A.tile(tipo,v),v*64,0);
  const id=['grama','terra','concreto','madeira','agua','cascalho','arado','asfalto','calcada','faixaX','faixaY'][tipo],arquivo='pisos/'+id+'.png';save(arquivo,c);manifesto.pisos.push({id,tipo,arquivo,colunas:8,larguraQuadro:64,alturaQuadro:32});
}
const tipos=new Map();for(const o of M.OBJ)if(!tipos.has(o.tipo))tipos.set(o.tipo,o);
for(const o of context.window.PZ.area.OBJ)if(!tipos.has(o.tipo))tipos.set(o.tipo,o);
tipos.set('paredeAbrigo',{tipo:'paredeAbrigo',x:0,y:0,w:4,d:1,placa:'ABRIGO'});
for(const[id,o]of tipos){
  const b=A.caixaTela(o),x0=Math.floor(b.x0)-12,y0=Math.floor(b.y0)-12,w=Math.ceil(b.x1)-x0+12,h=Math.ceil(b.y1)-y0+12;
  const c=createCanvas(w,h),g=c.getContext('2d');g.translate(-x0,-y0);for(const parte of A.partesDesenho(o))A.desenharObjeto(g,parte,0);
  const p=A.iso(o.x,o.y),arquivo='objetos/'+id+'.png';save(arquivo,c);manifesto.objetos.push({id,arquivo,largura:w,altura:h,pivo:{x:p.x-x0,y:p.y-y0},celulas:{largura:o.w,profundidade:o.d},alturaLogica:A.ALTURA[id]});
}
const sheet=createCanvas(48*4,48*4),sg=sheet.getContext('2d');
for(const[i,id]of A.ICONES.entries()){const c=A.icone(id);save('icones/'+id+'.png',c);sg.drawImage(c,(i%4)*48,Math.floor(i/4)*48);manifesto.icones.push({id,arquivo:'icones/'+id+'.png',x:(i%4)*48,y:Math.floor(i/4)*48,largura:48,altura:48});}
save('icones/atlas.png',sheet);
await require('./importar-pixel.cjs')({root,A,manifesto});
await require('./importar-movimento.cjs')({root,A,manifesto});
await require('./importar-objetos.cjs')({root,A,manifesto});
fs.writeFileSync(path.join(out,'manifesto.json'),JSON.stringify(manifesto,null,2)+'\n');
const amostra=createCanvas(1100,470),ag=amostra.getContext('2d');ag.fillStyle='#242b27';ag.fillRect(0,0,1100,470);ag.imageSmoothingEnabled=false;
const amostras=['sobrevivente_jaqueta','prefeito','wolf','bashar','guarda'];
for(const[i,id]of amostras.entries()){const f=A.folha(A.perfisExportacao[id]);ag.drawImage(f.SE.parado[0],i*220+35,38,144,240);ag.drawImage(f.NW.anda[2],i*220+58,285,96,160);ag.fillStyle='#e1d4b4';ag.font='17px sans-serif';ag.fillText(id.replace('sobrevivente_',''),i*220+58,28);}
save('previa-personagens.png',amostra);
console.log(JSON.stringify({personagens:manifesto.personagens.length,quadros:manifesto.personagens.reduce((n,p)=>n+p.quadros.length,0),pisos:11,variantesPiso:88,objetos:manifesto.objetos.length,icones:manifesto.icones.length,itens:manifesto.itens.length,validacao:'quadros preenchidos e sem recorte nas bordas',saida:out}));
})().catch(e=>{console.error(e);process.exitCode=1;});
