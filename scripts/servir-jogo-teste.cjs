// Servidor de QA da interface principal. Só escuta no computador local.
// /jogo/ mantém o login original; /jogo/teste-interface.html usa dados em memória.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),porta=8767;
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const fixture=require('./fixture-interface.cjs')(root);
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:'+porta),teste=url.pathname==='/jogo/teste-interface.html';
  let nome;try{nome=decodeURIComponent(url.pathname);}catch{res.writeHead(400);return res.end();}
  if(nome.endsWith('/'))nome+='index.html';
  const arquivo=path.resolve(root,'.'+(teste?'/jogo/index.html':nome));
  if(!arquivo.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(arquivo,async(erro,bytes)=>{
    if(erro){res.writeHead(404);return res.end('Não encontrado');}
    res.writeHead(200,{'Content-Type':tipos[path.extname(arquivo)]||'application/octet-stream','Cache-Control':'no-store'});
    if(teste){const html=bytes.toString('utf8').replace('<script src="app.js"></script>',await fixture+'<script src="app.js"></script>').replace('</body>','<div style="position:fixed;bottom:4px;left:4px;z-index:1000;background:#17251fe8;color:#e3cb91;border:1px solid #6b745b;padding:5px 9px;border-radius:4px;font:11px monospace;pointer-events:none">TESTE LOCAL · dados temporários · sem API online</div></body>').replace('Prévia visual: sem login e sem salvar no servidor','Teste da interface principal · perfil local temporário · sem API ou progresso online');return res.end(html);}
    res.end(bytes);
  });
}).listen(porta,'127.0.0.1',()=>console.log('Interface principal para QA: http://127.0.0.1:'+porta+'/jogo/teste-interface.html'));
