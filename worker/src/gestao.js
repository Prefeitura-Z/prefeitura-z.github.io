import { XP_NIVEIS, nivelDe, ROTAS, ITENS, EQUIPAVEIS, ORIGEM_BONUS } from './regras.js';
import { estadoDoJogador, estadoPublico } from './expedicao.js';

const idValido = s => typeof s === 'string' && /^\d{5,25}$/.test(s);
const numero = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const MAX_XP = 1000000000;
const MAX_CREDITOS = 1000000000;

export const flagsDaRota = r => [...new Set(['kit_recebido', r.requer].filter(Boolean))];
const acaoValida = ['xp', 'origem', 'curar', 'creditos', 'equipamento', 'rota', 'suspender', 'reativar'];

export async function gestaoPersonagem(req, env, u, pathname, json, erro, ler, publico) {
  const params = new URL(req.url).searchParams;
  if (pathname === '/game/admin/historico' && req.method === 'GET') {
    const alvo = params.get('alvo') || '', acao = params.get('acao') || '';
    if ((alvo && !idValido(alvo)) || (acao && ![...acaoValida, 'conceder_papel', 'revogar_papel'].includes(acao))) return erro(env, 400, 'Filtro inválido.');
    const cond = [...(alvo ? ['a.alvo = ?'] : []), ...(acao ? ['a.acao = ?'] : [])];
    const sql = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const { results: historico } = await env.DB.prepare(
      `SELECT a.*, ua.nome AS ator_nome, ut.nome AS alvo_nome FROM admin_audit a
       LEFT JOIN users ua ON ua.discord_id = a.ator LEFT JOIN users ut ON ut.discord_id = a.alvo
       ${sql} ORDER BY a.criado DESC, a.rowid DESC LIMIT 100`
    ).bind(...[alvo, acao].filter(Boolean)).all();
    return json(env, { historico });
  }
  if (pathname === '/game/admin/personagem' && req.method === 'GET') {
    const alvo = params.get('alvo') || u.discord_id;
    if (!idValido(alvo)) return erro(env, 400, 'Conta inválida.');
    const conta = await env.DB.prepare(
      "SELECT u.discord_id, u.nome, COALESCE(g.estado,'sem_conta') AS estado FROM users u LEFT JOIN game_accounts g ON u.discord_id = g.discord_id WHERE u.discord_id = ?"
    ).bind(alvo).first();
    if (!conta) return erro(env, 404, 'Conta não encontrada.');
    const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(alvo).first();
    const s = c ? await estadoDoJogador(env, alvo, c) : null;
    return json(env, {
      conta, proprio: alvo === u.discord_id, personagem: publico(c), estado: s ? estadoPublico(s) : null,
      expedicao: s?.expedicao ? { id: s.expedicao.id, rota: s.expedicao.rota, fim: s.expedicao.ronda?.fim || s.expedicao.fim } : null,
      flagsRotas: Object.fromEntries(Object.entries(ROTAS).map(([id, r]) => [id, flagsDaRota(r)])),
      limites: { xp: MAX_XP, creditos: MAX_CREDITOS, quantidade: 10 },
    });
  }
  if (pathname !== '/game/admin/personagem' || req.method !== 'POST') return null;

  const b = await ler(req), alvo = b?.alvo, acao = b?.acao;
  const motivo = typeof b?.motivo === 'string' ? b.motivo.trim() : '';
  if (!idValido(alvo) || !acaoValida.includes(acao) || b.confirmado !== true || motivo.length < 3 || motivo.length > 200 || !/^[A-Za-z0-9_-]{8,40}$/.test(b.chave || ''))
    return erro(env, 400, 'Confira conta, confirmação e motivo de 3 a 200 caracteres.');
  const contaAcao = acao === 'suspender' || acao === 'reativar';
  if (contaAcao === (alvo === u.discord_id))
    return erro(env, 403, contaAcao ? 'A conta do proprietário não pode ser suspensa.' : 'Ajustes de personagem são permitidos apenas na sua ficha.');

  const id = `gestao:${u.discord_id}:${b.chave}`, t = Math.floor(Date.now() / 1000);
  const mesmoRecibo = () => env.DB.prepare('SELECT acao, alvo FROM admin_audit WHERE id = ?').bind(id).first();
  const existente = await mesmoRecibo();
  if (existente) return existente.acao === acao && existente.alvo === alvo
    ? json(env, { ok: true, repetido: true }) : erro(env, 409, 'Já existe uma operação para esta confirmação.');

  const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(alvo).first();
  const g = { sql: 'EXISTS (SELECT 1 FROM admin_audit WHERE id = ? AND criado = -1)', id };
  const livre = "NOT EXISTS (SELECT 1 FROM game_expeditions WHERE discord_id = ? AND status IN ('andamento', 'premiando'))";
  let cond = livre, args = [alvo], antes, depois, efeitos = [];
  const atualizar = (set, ...values) => env.DB.prepare(
    `UPDATE characters SET ${set}, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`
  ).bind(...values, t, alvo, id);

  if (contaAcao) {
    antes = { estado: acao === 'suspender' ? 'ativo' : 'suspenso' };
    depois = { estado: acao === 'suspender' ? 'suspenso' : 'ativo' };
    cond += ' AND EXISTS (SELECT 1 FROM users WHERE discord_id = ?) AND COALESCE((SELECT estado FROM game_accounts WHERE discord_id = ?), ?) = ?';
    args.push(alvo, alvo, 'ativo', antes.estado);
    efeitos.push(env.DB.prepare(
      `INSERT INTO game_accounts (discord_id, estado, criado) SELECT ?, ?, ? WHERE ${g.sql} ON CONFLICT(discord_id) DO UPDATE SET estado = excluded.estado`
    ).bind(alvo, depois.estado, t, id));
  } else {
    if (!c) return erro(env, 404, 'Crie um personagem primeiro.');
    if (c.versao !== b.versao) return erro(env, 409, 'O personagem mudou. Reabra a ficha antes de salvar.');
    cond += ' AND EXISTS (SELECT 1 FROM characters WHERE discord_id = ? AND versao = ?)';
    args.push(alvo, c.versao);
    const flags = JSON.parse(c.flags || '{}');
    switch (acao) {
      case 'xp': {
        const xp = b.nivel === undefined ? b.xp : numero(b.nivel, 1, XP_NIVEIS.length) ? XP_NIVEIS[b.nivel - 1] : null;
        if (!numero(xp, 0, MAX_XP)) return erro(env, 400, 'XP ou nível fora do limite.');
        antes = { xp: c.xp, nivel: nivelDe(c.xp).nivel };
        depois = { xp, nivel: nivelDe(xp).nivel };
        efeitos.push(atualizar('xp = ?, nivel = ?', xp, depois.nivel));
        break;
      }
      case 'origem':
        if (!Object.hasOwn(ORIGEM_BONUS, b.origem) || b.origem === c.origem) return erro(env, 400, 'Escolha outra Origem.');
        antes = { origem: c.origem }; depois = { origem: b.origem };
        efeitos.push(atualizar('origem = ?', b.origem));
        break;
      case 'curar':
        antes = { feridoAte: flags.ferido_ate || 0 }; depois = { feridoAte: 0 };
        efeitos.push(atualizar("flags = json_remove(flags, '$.ferido_ate')"));
        break;
      case 'creditos': {
        if (!numero(b.creditos, 0, MAX_CREDITOS) || !numero(b.saldo, 0, Number.MAX_SAFE_INTEGER)) return erro(env, 400, 'Créditos fora do limite.');
        antes = { creditos: b.saldo }; depois = { creditos: b.creditos };
        cond += " AND COALESCE((SELECT qtd FROM game_inventory WHERE discord_id = ? AND item = 'creditos'),0) = ?";
        args.push(alvo, b.saldo);
        efeitos.push(env.DB.prepare(
          `INSERT INTO game_inventory (discord_id, item, qtd) SELECT ?, 'creditos', ? WHERE ${g.sql} ON CONFLICT(discord_id,item) DO UPDATE SET qtd = excluded.qtd`
        ).bind(alvo, b.creditos, id), atualizar('nivel = ?', nivelDe(c.xp).nivel));
        break;
      }
      case 'equipamento': {
        if (!Object.hasOwn(ITENS, b.item) || !EQUIPAVEIS.includes(ITENS[b.item].tipo) || !numero(b.qtd, 1, 10) || !numero(b.condicao, 0, 100))
          return erro(env, 400, 'Escolha equipamento, quantidade de 1 a 10 e condição de 0% a 100%.');
        const pecas = Array.from({ length: b.qtd }, () => ({ id: crypto.randomUUID(), item: b.item, condicao: b.condicao, equipado: false }));
        antes = { pecas: [] }; depois = { pecas };
        efeitos.push(...pecas.map(p => env.DB.prepare(
          `INSERT INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, ?, 0, ? WHERE ${g.sql}`
        ).bind(p.id, alvo, p.item, p.condicao, t, id)), atualizar('nivel = ?', nivelDe(c.xp).nivel));
        break;
      }
      case 'rota': {
        if (!Object.hasOwn(ROTAS, b.rota)) return erro(env, 400, 'Escolha uma rota.');
        const chaves = flagsDaRota(ROTAS[b.rota]);
        antes = { rota: b.rota, flags: Object.fromEntries(chaves.map(k => [k, flags[k] ?? null])) };
        for (const k of chaves) if (!flags[k]) flags[k] = t;
        depois = { rota: b.rota, flags: Object.fromEntries(chaves.map(k => [k, flags[k]])) };
        efeitos.push(atualizar('flags = ?', JSON.stringify(flags)));
        break;
      }
    }
  }
  const resultado = await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO admin_audit (id, ator, alvo, acao, motivo, antes, depois, criado)
      SELECT ?, ?, ?, ?, ?, ?, ?, -1 WHERE ${cond}`)
      .bind(id, u.discord_id, alvo, acao, motivo, JSON.stringify(antes), JSON.stringify(depois), ...args),
    ...efeitos,
    env.DB.prepare('UPDATE admin_audit SET criado = ? WHERE id = ? AND criado = -1').bind(t, id),
  ]);
  if (!resultado[0].meta.changes) {
    const repetido = await mesmoRecibo();
    if (repetido?.acao === acao && repetido.alvo === alvo) return json(env, { ok: true, repetido: true });
    return erro(env, 409, 'Operação bloqueada. Verifique expedição ativa, saldo ou alterações feitas em outra aba.');
  }
  if (acao === 'suspender' && env.ABRIGO) {
    try {
      await env.ABRIGO.get(env.ABRIGO.idFromName('uniao-da-margem')).fetch('https://sala/suspender', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alvo }),
      });
    } catch (e) { console.error('Não foi possível fechar a sessão do abrigo.', e); }
  }
  return json(env, { ok: true });
}
