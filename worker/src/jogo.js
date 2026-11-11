// Prefeitura Z: Depois da Queda — rotas do jogo dentro da API do site.
// A conta do jogo é a mesma do site (Discord); nada aqui confia em id enviado pelo navegador.
// O proprietário vem do segredo OWNER_DISCORD_ID; os outros papéis ficam em role_assignments com auditoria.

import { nivelDe, ITENS } from './regras.js';
import { rotasExpedicao, estadoDoJogador, estadoPublico, darKit, entregarRegistro } from './expedicao.js';

const agora = () => Math.floor(Date.now() / 1000);
const id = () => [...crypto.getRandomValues(new Uint8Array(10))].map(x => x.toString(16).padStart(2, '0')).join('');

export const PAPEIS = ['jogador', 'suporte', 'moderador', 'administrador', 'proprietario'];
const CONCEDIVEIS = ['suporte', 'moderador', 'administrador'];

// opções de aparência que existem no cliente; qualquer outra coisa é recusada
export const APARENCIA = {
  corpo: ['a', 'b'],
  pele: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
  cabelo: ['curto', 'raspado', 'longo', 'coque', 'moicano', 'cacheado'],
  corCabelo: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
  roupa: ['jaqueta', 'moletom', 'colete', 'macacao'],
};
export const ORIGENS = ['brigadista', 'mecanico', 'batedor', 'socorrista', 'trabalhador'];

// o que cada escolha de conversa pode fazer. "requer" e "marca" são flags do personagem.
// Serviços ainda demonstrativos respondem demo: true e não mexem em nada.
export const ACOES_NPC = {
  prefeito: {
    registro: { marca: 'registrado' },
    armazem: { requer: 'registrado', abre: 'armazem' },
    projetos: { requer: 'registrado', demo: true },
    ajudar: {},
  },
  wolf: {
    kit: { requer: 'registrado', marca: 'kit_recebido' },
    comprar: { requer: 'kit_recebido', abre: 'loja:comprar' },
    vender: { requer: 'kit_recebido', abre: 'loja:vender' },
    reparar: { requer: 'kit_recebido', abre: 'loja:reparar' },
    fabricar: { requer: 'kit_recebido', abre: 'loja:fabricar' },
    dica: {},
  },
  bashar: {
    trabalho: { requer: 'kit_recebido', marca: 'contrato_visto' },
    entregar: { requer: 'contrato_visto', especial: 'registro' },
    ativos: { requer: 'contrato_visto' },
    regiao: {},
  },
};
const MOTIVO_REQUER = {
  registrado: 'Passe no Prefeito e faça seu registro primeiro.',
  kit_recebido: 'Pegue seu kit com o Wolf antes de sair.',
  contrato_visto: 'Peça um trabalho ao Bashar primeiro.',
};

export function validarNome(n) {
  const s = String(n ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < 3 || s.length > 20) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-_.]*$/u.test(s)) return null;
  return s;
}

export function validarAparencia(a) {
  if (!a || typeof a !== 'object') return null;
  const out = {};
  for (const [k, ops] of Object.entries(APARENCIA)) {
    if (!ops.includes(a[k])) return null;
    out[k] = a[k];
  }
  return out;
}

export async function papelDe(env, discordId) {
  if (env.OWNER_DISCORD_ID && String(env.OWNER_DISCORD_ID).trim() === discordId) return 'proprietario';
  const r = await env.DB.prepare(
    'SELECT papel FROM role_assignments WHERE discord_id = ? AND revogado_em IS NULL AND (expira IS NULL OR expira > ?) ORDER BY criado DESC LIMIT 1'
  ).bind(discordId, agora()).first();
  return r ? r.papel : 'jogador';
}

const pode = {
  gerirEquipe: p => p === 'proprietario',
  verGestao: p => p === 'proprietario' || p === 'administrador',
};

function personagemPublico(c) {
  if (!c) return null;
  return {
    nome: c.nome, aparencia: JSON.parse(c.aparencia), origem: c.origem,
    ...nivelDe(c.xp), xp: c.xp, flags: JSON.parse(c.flags || '{}'), versao: c.versao, criado: c.criado,
  };
}

async function garantirConta(env, u) {
  // uma ida ao banco só: cria se faltar e lê
  const r = await env.DB.batch([
    env.DB.prepare('INSERT INTO game_accounts (discord_id, estado, criado) VALUES (?, ?, ?) ON CONFLICT(discord_id) DO NOTHING').bind(u.discord_id, 'ativo', agora()),
    env.DB.prepare('SELECT * FROM game_accounts WHERE discord_id = ?').bind(u.discord_id),
  ]);
  return r[1].results[0];
}

async function ler(req) { try { return await req.json(); } catch { return null; } }

// ---------- presença no abrigo ----------
const BILHETE_SEG = 30;
const chaveBilhete = env => env.DISCORD_CLIENT_SECRET;

// Chamado sem sessão (o navegador não manda cabeçalho em WebSocket). Quem prova a conta é o bilhete
// assinado pelo servidor, que vale 30 s e só é entregue pra quem tem sessão e personagem.
export async function entrarNaSala(req, env, hmac, igual) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('Esperava WebSocket.', { status: 426 });
  if (req.headers.get('Origin') !== env.SITE) return new Response('Origem não permitida.', { status: 403 });
  if (!env.ABRIGO) return new Response('Presença desligada.', { status: 503 });
  const [did, exp, assinatura] = String(new URL(req.url).searchParams.get('b') || '').split('.');
  if (!/^\d{5,25}$/.test(did || '') || !/^\d{10}$/.test(exp || '') || Number(exp) < agora()) return new Response('Bilhete vencido.', { status: 401 });
  const certo = (await hmac(chaveBilhete(env), `ws.${did}.${exp}`)).slice(0, 40);
  if (!igual(assinatura || '', certo)) return new Response('Bilhete inválido.', { status: 401 });
  const c = await env.DB.prepare(
    "SELECT c.nome, c.aparencia FROM characters c JOIN game_accounts g ON g.discord_id = c.discord_id WHERE c.discord_id = ? AND g.estado = 'ativo'"
  ).bind(did).first();
  if (!c) return new Response('Sem personagem.', { status: 403 });
  const papel = await papelDe(env, did);
  // o que está equipado aparece no boneco pros outros; sai do banco, nunca do navegador
  const eqs = await env.DB.prepare('SELECT item FROM game_equipment WHERE discord_id = ? AND equipado = 1').bind(did).all();
  const eq = {};
  for (const r of eqs.results) if (ITENS[r.item]) eq[ITENS[r.item].tipo] = r.item;
  const h = new Headers(req.headers);
  h.set('X-PZ-Jogador', encodeURIComponent(JSON.stringify({ did, n: c.nome, ap: { ...JSON.parse(c.aparencia), eq }, pp: papel === 'jogador' ? undefined : papel })));
  return env.ABRIGO.get(env.ABRIGO.idFromName('uniao-da-margem')).fetch(new Request('https://sala/entrar', { headers: h }));
}

// Número público pro site: quantos estão no abrigo. Sem nomes. O navegador guarda por 30 s.
export async function abrigoPublico(env, cors) {
  let n = 0;
  if (env.ABRIGO) {
    try { n = (await (await env.ABRIGO.get(env.ABRIGO.idFromName('uniao-da-margem')).fetch('https://sala/contar')).json()).n | 0; } catch { n = 0; }
  }
  return new Response(JSON.stringify({ noAbrigo: n }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30', ...cors },
  });
}

export async function rotasJogo(req, env, u, pathname, json, erro, hmac) {
  const conta = await garantirConta(env, u);
  if (conta.estado !== 'ativo') return erro(env, 403, 'Sua conta está suspensa no jogo.');
  // loja, mochila e expedição não dependem do papel: saem antes pra poupar uma consulta
  if (/^\/game\/(catalogo|expedicao\/|equipar|usar|loja)/.test(pathname)) {
    const r = await rotasExpedicao(req, env, u, pathname, json, erro, ler, personagemPublico);
    if (r) return r;
  }
  const papel = await papelDe(env, u.discord_id);

  if (pathname === '/game/me' && req.method === 'GET') {
    let c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    let s = null;
    if (c) {
      // quem pegou o kit antes de o equipamento existir recebe agora (o recibo impede repetir)
      if (JSON.parse(c.flags || '{}').kit_recebido) await darKit(env, u.discord_id);
      s = await estadoDoJogador(env, u.discord_id, c);
    }
    return json(env, {
      conta: { nome: u.nome, avatar: u.avatar }, papel,
      permissoes: { gestao: pode.verGestao(papel), equipe: pode.gerirEquipe(papel) },
      personagem: personagemPublico(c),
      estado: s ? estadoPublico(s) : null, expedicao: s ? s.expedicao : null, agora: Date.now(),
    });
  }

  if (pathname === '/game/character' && req.method === 'POST') {
    const b = await ler(req);
    const nome = validarNome(b?.nome);
    if (!nome) return erro(env, 400, 'Nome precisa ter de 3 a 20 letras ou números.');
    const aparencia = validarAparencia(b?.aparencia);
    if (!aparencia) return erro(env, 400, 'Aparência inválida.');
    if (!ORIGENS.includes(b?.origem)) return erro(env, 400, 'Origem inválida.');
    const t = agora();
    // discord_id é a chave: uma segunda criação (duplo clique, outra aba) não passa
    const r = await env.DB.prepare(
      'INSERT INTO characters (discord_id, nome, aparencia, origem, nivel, xp, flags, versao, criado, atualizado) VALUES (?, ?, ?, ?, 1, 0, ?, 1, ?, ?) ON CONFLICT(discord_id) DO NOTHING'
    ).bind(u.discord_id, nome, JSON.stringify(aparencia), b.origem, '{}', t, t).run();
    const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    if (!r.meta.changes) return json(env, { personagem: personagemPublico(c), jaExistia: true }, 409);
    return json(env, { personagem: personagemPublico(c) }, 201);
  }

  if (pathname === '/game/presenca/bilhete' && req.method === 'POST') {
    const tem = await env.DB.prepare('SELECT 1 AS ok FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    if (!tem) return erro(env, 409, 'Crie seu personagem primeiro.');
    const exp = agora() + BILHETE_SEG;
    return json(env, { bilhete: `${u.discord_id}.${exp}.${(await hmac(chaveBilhete(env), `ws.${u.discord_id}.${exp}`)).slice(0, 40)}` });
  }

  if (pathname === '/game/npc/interact' && req.method === 'POST') {
    const b = await ler(req);
    const acoes = ACOES_NPC[b?.npc];
    const acao = acoes && Object.hasOwn(acoes, b?.escolha) ? acoes[b.escolha] : null;
    if (!acao) return erro(env, 400, 'Essa conversa não existe.');
    const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    if (!c) return erro(env, 409, 'Crie seu personagem primeiro.');
    const flags = JSON.parse(c.flags || '{}');
    if (acao.requer && !flags[acao.requer]) return json(env, { ok: false, motivo: MOTIVO_REQUER[acao.requer], flags });
    if (acao.especial === 'registro') {
      if (flags.registro_entregue) return json(env, { ok: true, flags });
      const r = await entregarRegistro(env, u.discord_id);
      if (r === 'recusado') return json(env, { ok: false, motivo: 'Você ainda não trouxe o registro. Ele está no posto do fim da Rua de Cima.', flags });
      const c2 = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
      const s2 = await estadoDoJogador(env, u.discord_id, c2);
      return json(env, { ok: true, novo: 'registro_entregue', flags: s2.flags, personagem: personagemPublico(c2), estado: estadoPublico(s2) });
    }
    if (acao.marca && !flags[acao.marca]) {
      flags[acao.marca] = agora();
      // versão evita que duas abas sobrescrevam flags uma da outra
      const up = await env.DB.prepare('UPDATE characters SET flags = ?, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND versao = ?')
        .bind(JSON.stringify(flags), agora(), u.discord_id, c.versao).run();
      if (!up.meta.changes) return erro(env, 409, 'Seu personagem mudou em outra aba. Tente de novo.');
      if (acao.marca === 'kit_recebido') {
        await darKit(env, u.discord_id);
        const c2 = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
        return json(env, { ok: true, novo: acao.marca, flags, estado: estadoPublico(await estadoDoJogador(env, u.discord_id, c2)) });
      }
      return json(env, { ok: true, novo: acao.marca, flags });
    }
    return json(env, { ok: true, demo: !!acao.demo, abre: acao.abre, flags });
  }

  // ---------- gestão ----------
  if (pathname.startsWith('/game/admin/')) {
    if (!pode.verGestao(papel)) return erro(env, 403, 'Você não tem acesso à gestão.');

    if (pathname === '/game/admin/equipe' && req.method === 'GET') {
      const { results: equipe } = await env.DB.prepare(
        `SELECT r.id, r.discord_id, r.papel, r.criado, r.autor, r.motivo, u.nome FROM role_assignments r
         LEFT JOIN users u ON u.discord_id = r.discord_id WHERE r.revogado_em IS NULL ORDER BY r.criado DESC LIMIT 100`).all();
      const { results: auditoria } = await env.DB.prepare(
        `SELECT a.*, ua.nome AS ator_nome, ut.nome AS alvo_nome FROM admin_audit a
         LEFT JOIN users ua ON ua.discord_id = a.ator LEFT JOIN users ut ON ut.discord_id = a.alvo
         ORDER BY a.criado DESC LIMIT 50`).all();
      return json(env, { equipe, auditoria, podeGerir: pode.gerirEquipe(papel) });
    }

    if (pathname === '/game/admin/contas' && req.method === 'GET') {
      if (!pode.gerirEquipe(papel)) return erro(env, 403, 'Só o proprietário procura contas para a equipe.');
      const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 40);
      if (q.length < 2) return json(env, { contas: [] });
      const { results } = await env.DB.prepare(
        `SELECT u.discord_id, u.nome, u.avatar, c.nome AS personagem FROM users u
         LEFT JOIN characters c ON c.discord_id = u.discord_id
         WHERE u.discord_id = ? OR u.nome LIKE ? ESCAPE '\\' OR c.nome LIKE ? ESCAPE '\\' LIMIT 20`)
        .bind(q, `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`, `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`).all();
      for (const r of results) r.papel = await papelDe(env, r.discord_id);
      return json(env, { contas: results });
    }

    if (pathname === '/game/admin/papel' && req.method === 'POST') {
      if (!pode.gerirEquipe(papel)) return erro(env, 403, 'Só o proprietário dá ou tira acesso.');
      const b = await ler(req);
      const alvo = String(b?.alvo || '');
      const motivo = String(b?.motivo || '').trim().slice(0, 200);
      if (!/^\d{5,25}$/.test(alvo)) return erro(env, 400, 'Conta inválida.');
      if (alvo === u.discord_id) return erro(env, 400, 'Você não pode mudar o seu próprio papel.');
      if (motivo.length < 3) return erro(env, 400, 'Escreva o motivo.');
      const existe = await env.DB.prepare('SELECT discord_id FROM users WHERE discord_id = ?').bind(alvo).first();
      if (!existe) return erro(env, 404, 'Essa conta ainda não entrou no site.');
      const antes = await papelDe(env, alvo);
      if (antes === 'proprietario') return erro(env, 400, 'O proprietário não muda por aqui.');
      const t = agora();
      if (b?.acao === 'conceder') {
        if (!CONCEDIVEIS.includes(b?.papel)) return erro(env, 400, 'Papel inválido.');
        if (antes === b.papel) return json(env, { ok: true, papel: antes, semMudanca: true });
        await env.DB.batch([
          env.DB.prepare('UPDATE role_assignments SET revogado_em = ?, revogado_por = ? WHERE discord_id = ? AND revogado_em IS NULL').bind(t, u.discord_id, alvo),
          env.DB.prepare('INSERT INTO role_assignments (id, discord_id, papel, autor, motivo, criado) VALUES (?, ?, ?, ?, ?, ?)').bind(id(), alvo, b.papel, u.discord_id, motivo, t),
          env.DB.prepare('INSERT INTO admin_audit (id, ator, alvo, acao, motivo, antes, depois, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), u.discord_id, alvo, 'conceder_papel', motivo, antes, b.papel, t),
        ]);
        return json(env, { ok: true, papel: b.papel });
      }
      if (b?.acao === 'revogar') {
        if (antes === 'jogador') return json(env, { ok: true, papel: 'jogador', semMudanca: true });
        await env.DB.batch([
          env.DB.prepare('UPDATE role_assignments SET revogado_em = ?, revogado_por = ? WHERE discord_id = ? AND revogado_em IS NULL').bind(t, u.discord_id, alvo),
          env.DB.prepare('INSERT INTO admin_audit (id, ator, alvo, acao, motivo, antes, depois, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id(), u.discord_id, alvo, 'revogar_papel', motivo, antes, 'jogador', t),
        ]);
        return json(env, { ok: true, papel: 'jogador' });
      }
      return erro(env, 400, 'Ação inválida.');
    }
  }
  return erro(env, 404, 'Não encontrado.');
}
