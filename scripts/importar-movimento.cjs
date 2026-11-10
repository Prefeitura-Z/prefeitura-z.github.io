// Importa poses desenhadas; não interpola nem inventa quadros de animação.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
async function recortar(arquivo,colunas,A){
  const im=await loadImage(arquivo),src=createCanvas(im.width,im.height),sg=src.getContext('2d');sg.drawImage(im,0,0);
  const pixels=sg.getImageData(0,0,im.width,im.height).data,quadros=[];
  // Identifica as silhuetas inteiras. Uma ponta de arma pode ultrapassar a
  // divisão ideal da grade sem encostar no vizinho; cortar na grade a amputaria.
  const vistos=new Uint8Array(im.width*im.height),poses=new Map();
  for(let k=0;k<vistos.length;k++){
    if(vistos[k]||pixels[k*4+3]<128)continue;
    const fila=[k];vistos[k]=1;let xmin=im.width,ymin=im.height,xmax=-1,ymax=-1;
    for(let z=0;z<fila.length;z++){
      const i=fila[z],x=i%im.width,y=Math.floor(i/im.width);xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);
      for(const j of [x?i-1:-1,x<im.width-1?i+1:-1,i-im.width,i+im.width])if(j>=0&&j<vistos.length&&!vistos[j]&&pixels[j*4+3]>=128){vistos[j]=1;fila.push(j);}
    }
    if(fila.length<=100)continue;
    const row=Math.floor((ymin+ymax)/2/im.height*4),col=Math.floor((xmin+xmax)/2/im.width*colunas),chave=row+':'+col;
    if(poses.has(chave))throw new Error('Duas silhuetas na mesma célula: '+arquivo+'/'+chave);
    if(xmin===0||ymin===0||xmax===im.width-1||ymax===im.height-1)throw new Error('Silhueta cortada pela borda da fonte: '+arquivo);
    poses.set(chave,{xmin,ymin,xmax,ymax});
  }
  if(poses.size!==colunas*4)throw new Error('Quantidade incorreta de silhuetas: '+arquivo+' '+poses.size);
  for(let row=0;row<4;row++){
    const linha=[];
    for(let col=0;col<colunas;col++){
      const {xmin,ymin,xmax,ymax}=poses.get(row+':'+col);
      const w=xmax-xmin+1,h=ymax-ymin+1,escala=Math.min(68/h,44/w),dw=Math.round(w*escala),dh=Math.round(h*escala),c=createCanvas(A.QW,A.QH),g=c.getContext('2d');g.imageSmoothingEnabled=false;
      g.drawImage(im,xmin,ymin,w,h,A.PX-Math.round(dw/2),A.PY-dh,dw,dh);
      const dados=g.getImageData(0,0,c.width,c.height);for(let i=3;i<dados.data.length;i+=4)dados.data[i]=dados.data[i]>=128?255:0;g.putImageData(dados,0,0);linha.push(c);
    }
    quadros.push(linha);
  }
  return quadros;
}
module.exports=async function({root,A,manifesto}){
  const pasta=path.join(root,'assets-src','movimento-v4'),config=path.join(pasta,'registro.json');if(!fs.existsSync(config))return;
  for(const e of JSON.parse(fs.readFileSync(config,'utf8'))){
    const perfil=manifesto.personagens.find(p=>p.id===e.id);if(!perfil)throw new Error('Perfil de movimento ausente: '+e.id);
    const base=A.folha(perfil.aparencia),andar=await recortar(path.join(pasta,e.andar),8,A),ataca=await recortar(path.join(pasta,e.ataca),6,A);
    const c=createCanvas(A.QW*8,A.QH*12),g=c.getContext('2d'),folha={},quadros=[];
    for(let di=0;di<4;di++){
      const dir=A.DIRS[di];folha[dir]={parado:base[dir].parado,anda:andar[di],trabalha:base[dir].trabalha,ataca:ataca[di]};
      for(const estado of ['parado','anda','trabalha','ataca']){
        const row=di*3+(estado==='anda'?1:estado==='ataca'?2:0);
        folha[dir][estado].forEach((frame,indice)=>{const col=estado==='parado'||estado==='trabalha'?0:indice;g.drawImage(frame,col*A.QW,row*A.QH);quadros.push({direcao:dir,estado,indice,x:col*A.QW,y:row*A.QH,largura:A.QW,altura:A.QH,duracaoMs:estado==='anda'?96:estado==='ataca'?75:250});});
      }
    }
    const arquivo='personagens/pixel-v4/'+e.id+'.png',dest=path.join(root,'assets',arquivo);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,c.toBuffer('image/png'));
    Object.assign(perfil,{arquivo,quadros,estilo:'pixel-art-detalhada-v4',posesOriginais:60,posesCaminhada:32,posesAtaque:24,fontesMovimento:{andar:e.andar,ataca:e.ataca},observacao:'4 repousos,32 poses de caminhada,24 de ataque. Trabalho usa repouso; marcha selecionada pela distância percorrida.'});A.registrarAtlas(perfil.aparencia,folha);
  }
  manifesto.versao='2.3.0';
};
