const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.PRZ_CANVAS_MODULE||'@napi-rs/canvas');
module.exports=async function importarObjetos({root,A,manifesto}){
  const entradas=['props-v3','props-v4'].flatMap(nome=>{const pasta=path.join(root,'assets-src',nome),config=path.join(pasta,'registro.json');return fs.existsSync(config)?JSON.parse(fs.readFileSync(config,'utf8')).map(item=>({...item,pasta})):[];});if(!entradas.length)return;
  manifesto.objetosRaster=[];manifesto.iconesRaster=[];manifesto.itens=[];
  const salvar=(arquivo,c)=>{const p=path.join(root,'assets',arquivo);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c.toBuffer('image/png'));};
  for(const item of entradas){
    const im=await loadImage(path.join(item.pasta,item.fonte)),fonte=createCanvas(im.width,im.height),fg=fonte.getContext('2d');fg.drawImage(im,0,0);
    const bytes=fg.getImageData(0,0,im.width,im.height).data;let x0=im.width,y0=im.height,x1=-1,y1=-1;
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(bytes[(y*im.width+x)*4+3]>=128){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(x1<=x0||y1<=y0)throw new Error('Objeto sem conteúdo: '+item.id);
    const c=createCanvas(item.largura,item.altura),g=c.getContext('2d');g.imageSmoothingEnabled=false;
    if(item.categoria==='icone'){
      g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      const fator=Math.min((item.largura-4)/(x1-x0+1),(item.altura-4)/(y1-y0+1)),w=Math.round((x1-x0+1)*fator),h=Math.round((y1-y0+1)*fator);
      g.drawImage(im,x0,y0,x1-x0+1,y1-y0+1,Math.round((c.width-w)/2),Math.round((c.height-h)/2),w,h);
    }else g.drawImage(im,x0,y0,x1-x0+1,y1-y0+1,1,1,c.width-2,c.height-2);
    const data=g.getImageData(0,0,c.width,c.height);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>=128?255:0;g.putImageData(data,0,0);
    if(item.categoria==='icone'){
      const arquivo=(item.item?'icones/itens/':'icones/'+(item.versao||'pixel-v3')+'/')+item.id+'.png';salvar(arquivo,c);salvar('icones/'+item.id+'.png',c);
      const meta={id:item.id,arquivo,largura:c.width,altura:c.height};manifesto.iconesRaster.push(meta);
      const menu=manifesto.icones.find(p=>p.id===item.id);if(menu)Object.assign(menu,{arquivo});if(item.item)manifesto.itens.push(meta);A.registrarIconeRaster(item.id,c);
    }else{
      const arquivo='objetos/'+(item.versao||'pixel-v3')+'/'+item.id+'.png';salvar(arquivo,c);salvar('objetos/'+item.id+'.png',c);
      const meta={id:item.id,tipo:item.tipo||item.id,espelhar:!!item.espelhar,arquivo,largura:c.width,altura:c.height,pivo:item.pivo||{x:item.celulas.profundidade*32,y:c.height-(item.celulas.largura+item.celulas.profundidade)*16},celulas:item.celulas,alturaLogica:c.height-(item.celulas.largura+item.celulas.profundidade)*16};
      manifesto.objetosRaster.push(meta);const registro=manifesto.objetos.find(p=>p.id===item.id);if(registro)Object.assign(registro,meta);else manifesto.objetos.push(meta);A.registrarObjetoRaster(meta,c);
    }
  }
  const atlas=createCanvas(192,192),g=atlas.getContext('2d');for(const[i,id]of A.ICONES.entries())g.drawImage(A.icone(id,48),(i%4)*48,Math.floor(i/4)*48);salvar('icones/atlas.png',atlas);
};
