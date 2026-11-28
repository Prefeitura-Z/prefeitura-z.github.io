// Execute com Node.js 24. As ações passam pelo Worker e persistem no SQLite
// em memória durante a sessão deste processo.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { montarJogo } from '../tests/helpers/jogo-teste.mjs';

const host = '127.0.0.1', porta = Number(process.env.PZ_PREVIA_PORTA || 8765);
const site = `http://${host}:${porta}`;
const { worker, env, tokens } = await montarJogo(site);
const tipos = { css: 'text/css', js: 'text/javascript', html: 'text/html', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const perfis = {
  dono: ['Proprietário no nível 18', 'Abra Gestão → Meu personagem. O saldo inicial permite testar um ticket.'],
  veterano: ['Veterano com XP acumulado', 'Derrotou o Mastim e está apto a aceitar o chamado da subestação com o Bashar.'],
  incursao: ['Batedora de Knox no nível 60', 'Tem equipamento para percorrer os três capítulos. Aceite o chamado com o Bashar.'],
  jogador: ['Jogador com armazém vazio', 'Abra a Mochila ou faça o registro com o Prefeito.'],
  ferido: ['Socorrista ferida', 'Confira o ferimento e use um curativo no armazém.'],
  admin: ['Administrador', 'Abra Gestão para conferir as permissões do papel.'],
};
const pagina = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prévia de Depois da Queda</title><style>body{background:#191d1c;color:#eae3d3;font:16px system-ui;max-width:56rem;margin:3rem auto;padding:0 1rem}
ul{padding-left:0;display:grid;gap:.7rem;list-style:none}li{background:#232925;border:1px solid #535c4e;border-radius:.5rem;padding:.8rem}
a{color:#f0c879;font-weight:700}p{margin:.5rem 0;color:#d7d2c6}</style>
<h1>Depois da Queda · Prévia local</h1><p>Escolha um personagem de teste. O progresso fica salvo aqui enquanto a prévia estiver aberta.</p>
<ul>${Object.entries(perfis).map(([id,[nome,desc]]) => `<li><a href="/previa/${id}">${nome}</a><p>${desc}</p></li>`).join('')}</ul></html>`;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, site), path = url.pathname;
    const responder = (status, tipo, corpo) => { res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store' }); res.end(corpo); };
    if (path === '/') return responder(200, 'text/html; charset=utf-8', pagina);
    if (path.startsWith('/previa/') && Object.hasOwn(tokens, path.slice(8))) {
      res.writeHead(302, { Location: `/jogo/?api=${encodeURIComponent(site)}#token=${tokens[path.slice(8)]}`, 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (path.startsWith('/game/') || path === '/logout' || path === '/me' || path.startsWith('/auth/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request(url.href, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
      const r = await worker.fetch(request, env);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const arquivo = path === '/jogo/' ? '/jogo/index.html' : path;
    if (!/^\/(?:jogo|img)\/[A-Za-z0-9_.-]+$/.test(arquivo)) return responder(404, 'text/plain', 'Arquivo não encontrado.');
    const tipo = tipos[arquivo.split('.').at(-1)];
    if (!tipo) return responder(404, 'text/plain', 'Arquivo não encontrado.');
    const conteudo = await readFile(new URL('..' + arquivo, import.meta.url)).catch(() => null);
    if (!conteudo) return responder(404, 'text/plain', 'Arquivo não encontrado.');
    responder(200, tipo + (tipo.startsWith('text/') ? '; charset=utf-8' : ''), conteudo);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(porta, host, () => console.log(`Prévia jogável em ${site}/`));
