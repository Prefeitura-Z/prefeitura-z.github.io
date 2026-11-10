// Prefeitura Z: Depois da Queda — rotas do jogo dentro da API do site.
// A conta do jogo é a mesma do site (Discord); nada aqui confia em id enviado pelo navegador.
// O proprietário vem do segredo OWNER_DISCORD_ID; os outros papéis ficam em role_assignments com auditoria.

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
    armazem: { requer: 'registrado', demo: true },
    projetos: { requer: 'registrado', demo: true },
    ajudar: {},
  },
  wolf: {
    kit: { requer: 'registrado', marca: 'kit_recebido' },
    comprar: { requer: 'registrado', demo: true },
    vender: { requer: 'registrado', demo: true },
    reparar: { requer: 'registrado', demo: true },
    dica: {},
  },
  bashar: {
    trabalho: { requer: 'kit_recebido', marca: 'contrato_visto' },
    ativos: { requer: 'contrato_visto', demo: true },
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
    nivel: c.nivel, xp: c.xp, flags: JSON.parse(c.flags || '{}'), versao: c.versao, criado: c.criado,
  };
}

async function garantirConta(env, u) {
  await env.DB.prepare('INSERT INTO game_accounts (discord_id, estado, criado) VALUES (?, ?, ?) ON CONFLICT(discord_id) DO NOTHING')
    .bind(u.discord_id, 'ativo', agora()).run();
  return env.DB.prepare('SELECT * FROM game_accounts WHERE discord_id = ?').bind(u.discord_id).first();
}

async function ler(req) { try { return await req.json(); } catch { return null; } }

export async function rotasJogo(req, env, u, pathname, json, erro) {
  const conta = await garantirConta(env, u);
  if (conta.estado !== 'ativo') return erro(env, 403, 'Sua conta está suspensa no jogo.');
  const papel = await papelDe(env, u.discord_id);

  if (pathname === '/game/me' && req.method === 'GET') {
    const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    return json(env, {
      conta: { nome: u.nome, avatar: u.avatar }, papel,
      permissoes: { gestao: pode.verGestao(papel), equipe: pode.gerirEquipe(papel) },
      personagem: personagemPublico(c),
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

  if (pathname === '/game/npc/interact' && req.method === 'POST') {
    const b = await ler(req);
    const acoes = ACOES_NPC[b?.npc];
    const acao = acoes && Object.hasOwn(acoes, b?.escolha) ? acoes[b.escolha] : null;
    if (!acao) return erro(env, 400, 'Essa conversa não existe.');
    const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(u.discord_id).first();
    if (!c) return erro(env, 409, 'Crie seu personagem primeiro.');
    const flags = JSON.parse(c.flags || '{}');
    if (acao.requer && !flags[acao.requer]) return json(env, { ok: false, motivo: MOTIVO_REQUER[acao.requer], flags });
    if (acao.marca && !flags[acao.marca]) {
      flags[acao.marca] = agora();
      // versão evita que duas abas sobrescrevam flags uma da outra
      const up = await env.DB.prepare('UPDATE characters SET flags = ?, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND versao = ?')
        .bind(JSON.stringify(flags), agora(), u.discord_id, c.versao).run();
      if (!up.meta.changes) return erro(env, 409, 'Seu personagem mudou em outra aba. Tente de novo.');
      return json(env, { ok: true, novo: acao.marca, flags });
    }
    return json(env, { ok: true, demo: !!acao.demo, flags });
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
