// Prefeitura Z - API do site (Cloudflare Worker + D1)
// Login com Discord, vínculo com o personagem e pedidos de compra com PRZcoins.
// O saldo e a entrega são decididos pelo servidor do jogo; aqui só ficam os pedidos.
//
// Segredos (wrangler secret): DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SITE_BRIDGE_SECRET, OWNER_DISCORD_ID (dono do jogo)

import { rotasJogo, entrarNaSala, abrigoPublico } from './jogo.js';
export { SalaAbrigo } from './sala.js';

const SESSAO_DIAS = 30;
const CODIGO_MIN = 30;
const MAX_PENDENTES = 5;
const EXPIRA_PEDIDO_DIAS = 3;

const agora = () => Math.floor(Date.now() / 1000);

function rand(n, alfabeto) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  if (!alfabeto) return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return [...b].map(x => alfabeto[x % alfabeto.length]).join('');
}

async function hmac(chave, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.SITE,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(env, dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(env) },
  });
}

const erro = (env, status, msg) => json(env, { erro: msg }, status);

async function usuarioDaSessao(req, env) {
  const h = req.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const s = await env.DB.prepare('SELECT discord_id FROM sessions WHERE token = ? AND expira > ?').bind(token, agora()).first();
  if (!s) return null;
  const u = await env.DB.prepare('SELECT * FROM users WHERE discord_id = ?').bind(s.discord_id).first();
  return u ? { ...u, token } : null;
}

// ---------- login com Discord ----------

function redirectUri(req) {
  return new URL('/auth/callback', req.url).toString();
}

// páginas pra onde o login pode voltar (nada de URL livre)
const VOLTAS = { conta: '/conta.html', jogo: '/jogo/' };

async function login(req, env) {
  const t = agora();
  const v = new URL(req.url).searchParams.get('volta');
  const nonce = rand(12) + (Object.hasOwn(VOLTAS, v) && v !== 'conta' ? '-' + v : '');
  const state = `${t}.${nonce}.${(await hmac(env.DISCORD_CLIENT_SECRET, `${t}.${nonce}`)).slice(0, 32)}`;
  const u = new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id', env.DISCORD_CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri(req));
  u.searchParams.set('scope', 'identify');
  u.searchParams.set('state', state);
  return Response.redirect(u.toString(), 302);
}

async function callback(req, env) {
  const url = new URL(req.url);
  const [t, nonce, sig] = (url.searchParams.get('state') || '').split('.');
  const destino = VOLTAS[String(nonce || '').split('-')[1]] || VOLTAS.conta;
  const voltar = (frag) => Response.redirect(`${env.SITE}${destino}#${frag}`, 302);
  const code = url.searchParams.get('code');
  if (!code || !t || !nonce || !sig) return voltar('erro=cancelado');
  const esperado = (await hmac(env.DISCORD_CLIENT_SECRET, `${t}.${nonce}`)).slice(0, 32);
  if (!igual(sig, esperado) || agora() - Number(t) > 600) return voltar('erro=expirado');

  const tok = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code', code, redirect_uri: redirectUri(req),
    }),
  });
  if (!tok.ok) return voltar('erro=discord');
  const { access_token } = await tok.json();
  const me = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${access_token}` } });
  if (!me.ok) return voltar('erro=discord');
  const d = await me.json();
  const nome = d.global_name || d.username || 'Sobrevivente';
  const avatar = d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64` : null;

  const token = rand(32);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (discord_id, nome, avatar, criado) VALUES (?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET nome = excluded.nome, avatar = excluded.avatar`).bind(d.id, nome, avatar, agora()),
    env.DB.prepare('INSERT INTO sessions (token, discord_id, expira) VALUES (?, ?, ?)').bind(token, d.id, agora() + SESSAO_DIAS * 86400),
    env.DB.prepare('DELETE FROM sessions WHERE expira < ?').bind(agora()),
  ]);
  return voltar(`token=${token}`);
}

// ---------- conta ----------

async function me(env, u) {
  const { results } = await env.DB.prepare(
    'SELECT id, item, preco, status, motivo, criado, atualizado FROM orders WHERE discord_id = ? ORDER BY criado DESC LIMIT 20'
  ).bind(u.discord_id).all();
  return json(env, {
    nome: u.nome, avatar: u.avatar, login: u.login,
    saldo: u.saldo, saldoEm: u.saldo_em, pedidos: results,
  });
}

async function novoCodigo(env, u) {
  const code = rand(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM link_codes WHERE discord_id = ? OR expira < ?').bind(u.discord_id, agora()),
    env.DB.prepare('INSERT INTO link_codes (code, discord_id, expira) VALUES (?, ?, ?)').bind(code, u.discord_id, agora() + CODIGO_MIN * 60),
  ]);
  return json(env, { codigo: code, validoMin: CODIGO_MIN });
}

async function novoPedido(req, env, u) {
  if (!u.login) return erro(env, 400, 'Vincule seu personagem antes de comprar.');
  let b;
  try { b = await req.json(); } catch { return erro(env, 400, 'Pedido inválido.'); }
  const listing = String(b.listingId || '');
  if (!/^[A-Za-z0-9_.:\-]{1,80}$/.test(listing)) return erro(env, 400, 'Item inválido.');
  const item = String(b.item || '').slice(0, 80);
  const preco = Math.max(0, Math.floor(Number(b.preco) || 0));
  const pend = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(preco), 0) AS total FROM orders WHERE discord_id = ? AND status = 'pendente'").bind(u.discord_id).first();
  if (pend.n >= MAX_PENDENTES) return erro(env, 429, `Você já tem ${MAX_PENDENTES} pedidos esperando entrega.`);
  if (u.saldo != null && preco + pend.total > u.saldo) return erro(env, 400, pend.n ? 'Saldo insuficiente contando os pedidos que ainda vão ser entregues.' : 'Saldo insuficiente.');
  const id = rand(8);
  const t = agora();
  await env.DB.prepare(
    "INSERT INTO orders (id, discord_id, login, listing_id, item, preco, status, motivo, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, 'pendente', '', ?, ?)"
  ).bind(id, u.discord_id, u.login, listing, item, preco, t, t).run();
  return json(env, { id, status: 'pendente' });
}

async function logout(env, u) {
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(u.token).run();
  return json(env, { ok: true });
}

// ---------- ponte com o servidor (chamada pela automação do GitHub) ----------

const MOTIVOS = { saldo: 'Saldo insuficiente', esgotado: 'Esgotado', indisponivel: 'Item saiu da loja', falha: 'Falha na entrega', offline: 'Você estava offline' };

async function ponte(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!env.SITE_BRIDGE_SECRET || !igual(h, `Bearer ${env.SITE_BRIDGE_SECRET}`)) return new Response('nao', { status: 401 });
  const outbox = await req.text();
  const t = agora();
  const ops = [];
  for (const linha of outbox.split('\n')) {
    const c = linha.trim().split('|');
    if (c[0] === 'K' && c.length >= 3) {
      // vínculo: o código digitado no jogo prova que o login pertence a esse Discord
      const cod = await env.DB.prepare('SELECT discord_id FROM link_codes WHERE code = ? AND expira > ?').bind(c[2].toUpperCase(), t).first();
      if (cod) {
        ops.push(env.DB.prepare('UPDATE users SET login = NULL, saldo = NULL WHERE login = ? AND discord_id <> ?').bind(c[1], cod.discord_id));
        ops.push(env.DB.prepare('UPDATE users SET login = ?, saldo = NULL, saldo_em = NULL WHERE discord_id = ?').bind(c[1], cod.discord_id));
        ops.push(env.DB.prepare('DELETE FROM link_codes WHERE code = ?').bind(c[2].toUpperCase()));
      }
    } else if (c[0] === 'B' && c.length >= 3) {
      ops.push(env.DB.prepare('UPDATE users SET saldo = ?, saldo_em = ? WHERE login = ?').bind(Math.floor(Number(c[2]) || 0), t, c[1]));
    } else if (c[0] === 'R' && c.length >= 3 && (c[2] === 'entregue' || c[2] === 'recusado')) {
      ops.push(env.DB.prepare("UPDATE orders SET status = ?, motivo = ?, atualizado = ? WHERE id = ? AND status IN ('pendente', 'expirado')")
        .bind(c[2], MOTIVOS[c[3]] || c[3] || '', t, c[1]));
    }
  }
  ops.push(env.DB.prepare("UPDATE orders SET status = 'expirado', motivo = 'Você não entrou no jogo a tempo', atualizado = ? WHERE status = 'pendente' AND criado < ?")
    .bind(t, t - EXPIRA_PEDIDO_DIAS * 86400));
  for (let i = 0; i < ops.length; i += 50) await env.DB.batch(ops.slice(i, i + 50));

  const limpa = s => String(s || '').replace(/[|\r\n]/g, ' ');
  const linhas = ['V|1'];
  const { results: us } = await env.DB.prepare('SELECT login FROM users WHERE login IS NOT NULL').all();
  for (const u of us) linhas.push(`L|${limpa(u.login)}`);
  const { results: ps } = await env.DB.prepare("SELECT id, login, listing_id, preco FROM orders WHERE status = 'pendente' ORDER BY criado LIMIT 200").all();
  for (const p of ps) linhas.push(`O|${p.id}|${limpa(p.login)}|${limpa(p.listing_id)}|${p.preco}`);
  return new Response(linhas.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    try {
      if (pathname === '/auth/login' && req.method === 'GET') return await login(req, env);
      if (pathname === '/auth/callback' && req.method === 'GET') return await callback(req, env);
      if (pathname === '/bridge/sync' && req.method === 'POST') return await ponte(req, env);
      if (pathname === '/') return json(env, { ok: true, servico: 'Prefeitura Z' });
      // WebSocket não manda Authorization: entra com um bilhete curto, pedido antes com a sessão
      if (pathname === '/game/publico' && req.method === 'GET') return await abrigoPublico(env, cors(env));
      if (pathname === '/game/presenca' && req.method === 'GET') return await entrarNaSala(req, env, hmac, igual);

      const u = await usuarioDaSessao(req, env);
      if (!u) return erro(env, 401, 'Entre com o Discord.');
      if (pathname === '/me' && req.method === 'GET') return await me(env, u);
      if (pathname === '/link/code' && req.method === 'POST') return await novoCodigo(env, u);
      if (pathname === '/orders' && req.method === 'POST') return await novoPedido(req, env, u);
      if (pathname === '/logout' && req.method === 'POST') return await logout(env, u);
      if (pathname.startsWith('/game/')) return await rotasJogo(req, env, u, pathname, json, erro, hmac);
      return erro(env, 404, 'Não encontrado.');
    } catch (e) {
      console.error(e);
      return erro(env, 500, 'Erro no servidor do site. Tente de novo.');
    }
  },
};
