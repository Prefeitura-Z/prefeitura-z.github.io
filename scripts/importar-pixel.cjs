// Recorte e empacotamento técnico das folhas raster aprovadas. Não cria poses.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
module.exports=async function importarPixel({root,A,manifesto}){
  const pasta=path.join(root,'assets-src','pixel-v3'),config=path.join(pasta,'registro.json');
  if(!fs.existsSync(config))return;
  const entradas=JSON.parse(fs.readFileSync(config,'utf8'));
  if(entradas.some(e=>e.aprovado))manifesto.versao='2.2.0';
  for(const entrada of entradas){
    if(!entrada.aprovado)continue;
    const perfil=manifesto.personagens.find(p=>p.id===entrada.id);
    if(!perfil)throw new Error('Perfil desconhecido: '+entrada.id);
    const im=await loadImage(path.join(pasta,entrada.fonte));
    const original=createCanvas(im.width,im.height),og=original.getContext('2d');og.drawImage(im,0,0);
    const pixels=og.getImageData(0,0,im.width,im.height).data;
    const c=createCanvas(A.QW*4,A.QH*4),g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const recortes=[];
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      const x0=Math.floor(col*im.width/4),y0=Math.floor(row*im.height/4),x1=Math.floor((col+1)*im.width/4),y1=Math.floor((row+1)*im.height/4);
      let xmin=x1,ymin=y1,xmax=-1,ymax=-1,count=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*im.width+x)*4+3]>=128){xmin=Math.min(xmin,x);ymin=Math.min(ymin,y);xmax=Math.max(xmax,x);ymax=Math.max(ymax,y);count++;}
      if(count<200)throw new Error(entrada.id+': célula vazia '+row+','+col);
      if(xmin<=x0||xmax>=x1-1||ymin<=y0||ymax>=y1-1)throw new Error(entrada.id+': figura cruza a grade '+row+','+col);
      const w=xmax-xmin+1,h=ymax-ymin+1,escala=Math.min(68/h,44/w),dw=Math.round(w*escala),dh=Math.round(h*escala);
      const dx=col*A.QW+A.PX-Math.round(dw/2),dy=row*A.QH+A.PY-dh;
      g.drawImage(im,xmin,ymin,w,h,dx,dy,dw,dh);
      recortes.push({direcao:A.DIRS[row],pose:col,origem:{x:xmin,y:ymin,w,h},destino:{x:dx,y:dy,w:dw,h:dh}});
    }
    // Alpha binário preserva o recorte de pixel art e elimina bordas semitransparentes.
    const data=g.getImageData(0,0,c.width,c.height);let opacos=0,transparentes=0;
    for(let i=3;i<data.data.length;i+=4){data.data[i]=data.data[i]>=128?255:0;data.data[i]?opacos++:transparentes++;}
    if(!opacos||!transparentes)throw new Error('Transparência inválida: '+entrada.id);
    g.putImageData(data,0,0);
    const arquivo='personagens/pixel-v3/'+entrada.id+'.png',dest=path.join(root,'assets',arquivo);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,c.toBuffer('image/png'));
    const quadros=[];
    for(let row=0;row<4;row++)for(const[estado,n]of [['parado',4],['anda',8],['trabalha',6]])for(let i=0;i<n;i++){
      const col=estado==='anda'?[1,1,2,2,3,3,2,2][i]:0;
      quadros.push({direcao:A.DIRS[row],estado,indice:i,x:col*A.QW,y:row*A.QH,largura:A.QW,altura:A.QH,duracaoMs:estado==='anda'?100:250});
    }
    Object.assign(perfil,{arquivo,quadros,estilo:'pixel-art-detalhada-v3',posesOriginais:16,fonte:entrada.fonte,observacao:'4 vistas; 1 pose de repouso e 3 poses de marcha por vista. O estado trabalha usa repouso até receber animação própria.',recortes});
    const folha={};for(const dir of A.DIRS){folha[dir]={};for(const estado of ['parado','anda','trabalha'])folha[dir][estado]=quadros.filter(f=>f.direcao===dir&&f.estado===estado).map(f=>{const frame=createCanvas(A.QW,A.QH);frame.getContext('2d').drawImage(c,f.x,f.y,A.QW,A.QH,0,0,A.QW,A.QH);return frame;});}
    A.registrarAtlas(perfil.aparencia,folha);
  }
};
