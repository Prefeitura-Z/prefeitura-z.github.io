// Prefeitura Z: Depois da Queda — estoque, equipamento, loja do Wolf e expedições.
// Regra geral: o navegador pede, o servidor decide. Toda mudança de recurso sai num lote (transação) do D1
// que só vale se a condição ainda for verdadeira dentro do próprio lote, e um clique repetido não conta duas vezes.
import { CAIXAS, CAIXAS_POR_DIA, CAIXA_EXPIRA_DIAS, ITENS, EQUIPAVEIS, KIT_INICIAL, KIT_SUPRIMENTOS, LOJA, RECEITAS, ROTAS, VERSAO, reparoPorPonto, FERIMENTO_SEG, valorRevenda,
  RONDA, kitsDaRonda, atributos, nivelDe, XP_NIVEIS, ORIGEM_BONUS, caminhoRetorno, simular, simularRonda, rondaAte, resultadoAte, desgaste, catalogo } from './regras.js';

const seg = () => Math.floor(Date.now() / 1000);
const novoId = () => [...crypto.getRandomValues(new Uint8Array(10))].map(x => x.toString(16).padStart(2, '0')).join('');
const ATIVA = "status IN ('andamento', 'premiando')";
const PRECO_TICKET = 1250000;
const precoTicket = env => {
  const n = Number(env.TICKET_ORIGEM_PRECO);
  return Number.isInteger(n) && n >= 1000000 && n <= 1500000 ? n : PRECO_TICKET;
};
const BONUS_PRIMEIRA_ROTA = { xp: 40, creditos: 10 };
const PREMIO_REGISTRO = { xp: 40, creditos: 40 };

// ---------- leitura ----------
export async function estadoDoJogador(env, did, c) {
  // sem "c", o personagem vem na mesma ida ao banco (o que cada resposta de ação precisa)
  const lote = await env.DB.batch([
    ...(c ? [] : [env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(did)]),
    env.DB.prepare('SELECT item, qtd FROM game_inventory WHERE discord_id = ? AND qtd > 0').bind(did),
    env.DB.prepare('SELECT id, item, condicao, equipado FROM game_equipment WHERE discord_id = ? ORDER BY criado, id').bind(did),
    env.DB.prepare(`SELECT id, rota, inicio, fim, status, sim, regras FROM game_expeditions WHERE discord_id = ? AND ${ATIVA}`).bind(did),
    env.DB.prepare('SELECT id FROM game_class_tickets WHERE discord_id = ? AND usado IS NULL').bind(did),
  ]);
  if (!c) c = lote.shift().results[0];
  const [inv, eq, ex, tickets] = lote;
  const itens = {}; let creditos = 0;
  for (const r of inv.results) { if (r.item === 'creditos') creditos = r.qtd; else if (ITENS[r.item]) itens[r.item] = r.qtd; }
  const ticket = tickets.results[0]?.id || null;
  if (ticket) itens.ticket_origem = 1;
  const equipamento = eq.results.filter(e => ITENS[e.item]).map(e => ({ id: e.id, item: e.item, condicao: e.condicao, equipado: !!e.equipado }));
  const flags = JSON.parse(c.flags || '{}');
  const ferido = (flags.ferido_ate || 0) > seg();
  const equipados = {};
  for (const e of equipamento) if (e.equipado) equipados[ITENS[e.item].tipo] = e;
  const attrs = atributos({ xp: c.xp, origem: c.origem, equipados, ferido });
  const e = ex.results[0];
  return {
    personagem: c, creditos, itens, equipamento, ticket, equipados, flags, ferido, feridoAte: ferido ? flags.ferido_ate : 0, attrs,
    expedicao: e ? expedicaoPublica(e, attrs, flags) : null,
  };
}

// O navegador recebe o roteiro pra desenhar a expedição. Ele não decide nada: o prêmio sai do que ficou guardado aqui.
function expedicaoPublica(e, attrs, flags) {
  const sim = JSON.parse(e.sim);
  if (sim.tipo === 'ronda') {
    // Ronda longa: o navegador recebe só a volta da vez (refeita da semente guardada) e o que já está valendo.
    const t = (Date.now() - e.inicio) / 1000, cs = sim.ciclos;
    let i = cs.findIndex(c => t < c.t0 + c.dur);
    if (i < 0) i = cs.length - 1;
    const c = cs[i], ate = rondaAte(sim, t);
    const novo = sim.porKit > 0;   // rondas abertas antes do farm sem volta ao portão seguem do jeito antigo
    const volta = simular(e.rota, c.attrs, c.semente, { flags, temRegistro: true, vidaInicial: c.vidaInicial, origem: novo ? c.de : null, semVolta: novo, inverso: !!c.inv, ronda: e.regras >= 9 });
    let log = volta.log, dur = c.dur;
    if (novo && i === cs.length - 1 && sim.retorno > 0 && sim.de) {
      // última volta: depois da revista ele pega o caminho do portão
      log = log.filter(x => x.e !== 'fim');
      log.push({ t: c.dur, e: 'volta', de: sim.de, para: catalogo().saida, ...(e.regras >= 9 && ROTAS[e.rota]?.nivel ? { pts: caminhoRetorno(e.rota, sim.de) } : {}), d: sim.retorno, motivo: 'concluida' }, { t: c.dur + sim.retorno, e: 'fim' });
      dur += sim.retorno;
    }
    return {
      id: e.id, rota: e.rota, tipo: 'ronda', inicio: e.inicio + c.t0 * 1000, fim: e.inicio + (c.t0 + dur) * 1000,
      log, vidaMax: c.attrs.vidaMax, vidaInicial: c.vidaInicial, capacidade: c.attrs.capacidade,
      ronda: { volta: i + 1, voltas: cs.length, ultima: i === cs.length - 1, inicio: e.inicio, fim: e.fim, feitas: ate.feitos, xp: ate.xp, creditos: ate.creditos, itens: ate.itens, parada: sim.parada, vidaMin: sim.vidaMin },
    };
  }
  return { id: e.id, rota: e.rota, inicio: e.inicio, fim: e.fim, log: sim.log, vidaMax: sim.final.vidaMax, capacidade: sim.capacidade ?? attrs.capacidade };
}

// o que vai pro navegador
export function estadoPublico(s) {
  const a = s.attrs;
  return {
    creditos: s.creditos, itens: s.itens, equipamento: s.equipamento.map(e => ({ ...e, equipado: s.equipados[ITENS[e.item].tipo]?.id === e.id })), ferido: s.ferido, feridoAte: s.feridoAte,
    atributos: { vidaMax: a.vidaMax, ataque: a.ataque, defesa: a.defesa, capacidade: a.capacidade },
    comparacoes: Object.fromEntries(s.equipamento.map(e => {
      const tipo = ITENS[e.item].tipo;
      const eq = { ...s.equipados, [tipo]: s.equipados[tipo]?.id === e.id ? null : e };
      const b = atributos({ xp: s.personagem.xp, origem: s.personagem.origem, equipados: eq, ferido: s.ferido });
      const dif = ['ataque', 'defesa', 'capacidade', 'cadencia', 'evasao', 'penetracao', 'isolamento', 'respiro', 'alerta', 'sucataExtra']
        .map(k => [k, Math.round((b[k] - a[k]) * 1000) / 1000]);
      for (const material of new Set([a.recupera, b.recupera].filter(Boolean))) {
        dif.push([material, (b.recupera === material ? b.extra : 0) - (a.recupera === material ? a.extra : 0)]);
      }
      return [e.id, Object.fromEntries(dif.filter(([, v]) => v))];
    })),
  };
}

// ---------- ações com recibo ----------
// condicao: { sql, binds } que precisa ser verdadeira; efeitos(guarda) devolve as instruções, cada uma usando guarda.sql/guarda.bind
// Devolve 'feito' | 'repetido' | 'recusado'.
async function comRecibo(env, did, tipo, chave, dados, condicao, efeitos) {
  const id = `${did}:${tipo}:${chave}`;
  const guarda = { sql: "EXISTS (SELECT 1 FROM game_ledger WHERE id = ? AND estado = 'novo')", bind: id };
  const lote = [
    env.DB.prepare(`INSERT OR IGNORE INTO game_ledger (id, discord_id, tipo, dados, estado, criado) SELECT ?, ?, ?, ?, 'novo', ? WHERE ${condicao.sql}`)
      .bind(id, did, tipo, JSON.stringify(dados), seg(), ...condicao.binds),
    ...efeitos(guarda),
    env.DB.prepare("UPDATE game_ledger SET estado = 'ok' WHERE id = ? AND estado = 'novo'").bind(id),
  ];
  const r = await env.DB.batch(lote);
  if (r[r.length - 1].meta.changes === 1) return 'feito';
  const ja = await env.DB.prepare('SELECT estado FROM game_ledger WHERE id = ?').bind(id).first();
  return ja ? 'repetido' : 'recusado';
}
const mais = (env, did, item, q, g) => env.DB.prepare(
  `INSERT INTO game_inventory (discord_id, item, qtd) SELECT ?, ?, ? WHERE ${g.sql} ON CONFLICT(discord_id, item) DO UPDATE SET qtd = qtd + excluded.qtd`
).bind(did, item, q, g.bind);
const menos = (env, did, item, q, g) => env.DB.prepare(
  `UPDATE game_inventory SET qtd = qtd - ? WHERE discord_id = ? AND item = ? AND ${g.sql}`
).bind(q, did, item, g.bind);
const tem = (did, item, q) => ({ sql: 'COALESCE((SELECT qtd FROM game_inventory WHERE discord_id = ? AND item = ?), 0) >= ?', binds: [did, item, q] });
const semExpedicao = did => ({ sql: `NOT EXISTS (SELECT 1 FROM game_expeditions WHERE discord_id = ? AND ${ATIVA})`, binds: [did] });
const todas = (...cs) => ({ sql: cs.map(c => `(${c.sql})`).join(' AND '), binds: cs.flatMap(c => c.binds) });
const contaAtiva = did => ({ sql: "EXISTS (SELECT 1 FROM game_accounts WHERE discord_id = ? AND estado = 'ativo')", binds: [did] });
const personagemNaVersao = (did, v) => ({ sql: 'EXISTS (SELECT 1 FROM characters WHERE discord_id = ? AND versao = ?)', binds: [did, v] });
const possuiFlag = (did, flag) => ({ sql: 'COALESCE((SELECT json_extract(flags, ?) FROM characters WHERE discord_id = ?), 0) <> 0', binds: ['$.' + flag, did] });
function condicaoSaida(did, s, kits) {
  const eqs = s.equipamento.filter(e => e.equipado);
  const equipamento = {
    sql: '((SELECT COUNT(*) FROM game_equipment WHERE discord_id = ? AND equipado = 1) = ?)' +
      eqs.map(() => ' AND EXISTS (SELECT 1 FROM game_equipment WHERE discord_id = ? AND id = ? AND condicao = ? AND equipado = 1)').join(''),
    binds: [did, eqs.length, ...eqs.flatMap(e => [did, e.id, e.condicao])],
  };
  return todas(tem(did, 'suprimento', kits), personagemNaVersao(did, s.personagem.versao), contaAtiva(did), equipamento);
}
const chaveValida = k => typeof k === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(k);
const inteiro = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

// Fecha a ronda longa. Só voltas inteiras contam; a volta pela metade não rende, e as que nem começaram devolvem o kit.
// O mesmo intervalo nunca é pago duas vezes: tudo depende de a expedição passar de 'andamento' pra 'premiando' neste lote.
async function fecharRonda(env, did, c, e, sim, recuo, agoraMs, responder) {
  const acabou = agoraMs >= e.fim;
  if (!acabou && !recuo) return responder({ erro: 'Você ainda não voltou.' }, 409);
  const t = seg(), ate = rondaAte(sim, (agoraMs - e.inicio) / 1000), rota = ROTAS[e.rota];
  const porKit = sim.porKit || 1, kits = sim.semKit ? 0 : kitsDaRonda(ate.iniciados, porKit), devolver = sim.semKit ? 0 : kitsDaRonda(sim.ciclos.length, porKit) - kits;
  const relatorio = {
    id: e.id, rota: e.rota, nomeRota: rota ? rota.nome : e.rota, tipo: 'ronda', motivo: acabou ? sim.parada : 'chamado',
    fora: Math.round((agoraMs - e.inicio) / 1000), voltas: ate.feitos, voltasPrevistas: sim.ciclos.length, kits, kitsDevolvidos: devolver,
    paradas: ate.paradas, xp: ate.xp, itens: ate.itens, creditos: ate.creditos, sinais: ate.sinais, equip: null, perdidos: {}, desgaste: ate.gasto,
    ferido: ate.derrota, bonus: false, nivelAntes: nivelDe(c.xp).nivel, nivelDepois: nivelDe(c.xp + ate.xp).nivel,
  };
  const g = { sql: "EXISTS (SELECT 1 FROM game_expeditions WHERE id = ? AND status = 'premiando')", bind: e.id };
  let flagsSql = ate.feitos ? "json_set(flags, '$.ronda_feita', COALESCE(json_extract(flags, '$.ronda_feita'), ?))" : 'flags';
  const flagsBinds = ate.feitos ? [t] : [];
  if (ate.derrota) { flagsSql = `json_set(${flagsSql}, '$.ferido_ate', ?)`; flagsBinds.push(t + FERIMENTO_SEG); }
  const lote = [
    env.DB.prepare(acabou
      ? "UPDATE game_expeditions SET status = 'premiando' WHERE id = ? AND discord_id = ? AND status = 'andamento' AND fim <= ?"
      : "UPDATE game_expeditions SET status = 'premiando' WHERE id = ? AND discord_id = ? AND status = 'andamento'"
    ).bind(...(acabou ? [e.id, did, agoraMs] : [e.id, did])),
    ...Object.entries(ate.itens).filter(([k, q]) => ITENS[k] && q > 0).map(([k, q]) => mais(env, did, k, q, g)),
    ...(relatorio.creditos ? [mais(env, did, 'creditos', relatorio.creditos, g)] : []),
    ...(devolver > 0 ? [mais(env, did, 'suprimento', devolver, g)] : []),
    ...Object.entries(sim.equip || {}).filter(([k]) => ate.gasto[k] > 0).map(([k, idEq]) => env.DB.prepare(
      `UPDATE game_equipment SET condicao = MAX(0, condicao - ?) WHERE id = ? AND discord_id = ? AND ${g.sql}`
    ).bind(ate.gasto[k], idEq, did, g.bind)),
    env.DB.prepare(`UPDATE characters SET xp = xp + ?, nivel = ?, flags = ${flagsSql}, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
      .bind(ate.xp, relatorio.nivelDepois, ...flagsBinds, t, did, g.bind),
    env.DB.prepare("UPDATE game_expeditions SET status = 'encerrada', resultado = ?, encerrada_em = ? WHERE id = ? AND status = 'premiando'")
      .bind(JSON.stringify(relatorio), agoraMs, e.id),
  ];
  const r = await env.DB.batch(lote);
  if (r[r.length - 1].meta.changes !== 1) {
    const e2 = await env.DB.prepare('SELECT status, resultado FROM game_expeditions WHERE id = ?').bind(e.id).first();
    if (e2 && e2.status === 'encerrada') return responder({ ok: true, repetido: true, relatorio: JSON.parse(e2.resultado) });
    return responder({ erro: 'Não deu pra fechar a ronda agora. Tente de novo.' }, 409);
  }
  return responder({ ok: true, relatorio });
}

// Kit do Wolf: equipamento com id fixo (não duplica) e os kits de campo com recibo.
export async function darKit(env, did) {
  const t = seg();
  return comRecibo(env, did, 'kit', 'inicial', { itens: KIT_INICIAL, suprimento: KIT_SUPRIMENTOS }, contaAtiva(did), g => [
    ...KIT_INICIAL.map(item => {
      const equivalentes = Object.keys(ITENS).filter(k => ITENS[k].tipo === ITENS[item].tipo);
      const espacoLivre = `NOT EXISTS (SELECT 1 FROM game_equipment WHERE discord_id = ? AND equipado = 1 AND item IN (${equivalentes.map(() => '?').join(',')}))`;
      return env.DB.prepare(
        `INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, ${espacoLivre}, ? WHERE ${g.sql}`
      ).bind(`kit:${did}:${item}`, did, item, did, ...equivalentes, t, g.bind);
    }),
    mais(env, did, 'suprimento', KIT_SUPRIMENTOS, g),
  ]);
}

// Entrega do registro ao Bashar: tira o item, paga e marca a missão. Só vale uma vez.
export async function entregarRegistro(env, did) {
  return comRecibo(env, did, 'missao', 'registro', PREMIO_REGISTRO, todas(tem(did, 'registro_rota', 1), semExpedicao(did)), g => [
    menos(env, did, 'registro_rota', 1, g),
    mais(env, did, 'creditos', PREMIO_REGISTRO.creditos, g),
    env.DB.prepare(`UPDATE characters SET xp = xp + ?, nivel = (SELECT COUNT(*) FROM json_each(?) WHERE value <= xp + ?), flags = json_set(flags, '$.registro_entregue', ?), versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
      .bind(PREMIO_REGISTRO.xp, JSON.stringify(XP_NIVEIS), PREMIO_REGISTRO.xp, seg(), seg(), did, g.bind),
  ]);
}

// ---------- rotas HTTP ----------
export async function rotasExpedicao(req, env, u, pathname, json, erro, ler, personagemPublico, c) {
  const did = u.discord_id;
  if (pathname === '/game/catalogo' && req.method === 'GET') return json(env, catalogo());

  if (!c) return erro(env, 409, 'Crie seu personagem primeiro.');
  const responder = async (extra, status = 200) => {
    const s = await estadoDoJogador(env, did), c2 = s.personagem;
    return json(env, { ...extra, personagem: personagemPublico(c2), estado: estadoPublico(s), expedicao: s.expedicao, agora: Date.now() }, status);
  };

  if (pathname === '/game/ticket' && req.method === 'GET') {
    const s = await estadoDoJogador(env, did);
    return json(env, { ticket: s.ticket, preco: precoTicket(env), saldo: s.creditos,
      origem: s.personagem.origem, versao: s.personagem.versao, fora: !!s.expedicao, registrado: !!s.flags.registrado });
  }
  if (pathname === '/game/ticket/comprar' && req.method === 'POST') {
    const b = await ler(req), preco = precoTicket(env);
    if (!chaveValida(b?.chave) || !Number.isSafeInteger(b?.versao)) return erro(env, 400, 'Confirmação inválida.');
    const recibo = `${did}:ticket_compra:${b.chave}`;
    if (await env.DB.prepare('SELECT id FROM game_ledger WHERE id = ?').bind(recibo).first()) return responder({ ok: true, repetido: true });
    if (b.preco !== preco) return erro(env, 409, 'O preço mudou. Abra o diálogo para conferir o valor.');
    const semTicket = { sql: 'NOT EXISTS (SELECT 1 FROM game_class_tickets WHERE discord_id = ? AND usado IS NULL)', binds: [did] };
    const cond = todas(tem(did, 'creditos', preco), semExpedicao(did), contaAtiva(did), personagemNaVersao(did, b.versao), possuiFlag(did, 'registrado'), semTicket);
    const res = await comRecibo(env, did, 'ticket_compra', b.chave, { preco }, cond, g => [
      menos(env, did, 'creditos', preco, g),
      env.DB.prepare(`INSERT INTO game_class_tickets (id, discord_id, criado) SELECT ?, ?, ? WHERE ${g.sql}`).bind(novoId(), did, seg(), g.bind),
      env.DB.prepare(`UPDATE characters SET versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`).bind(seg(), did, g.bind),
    ]);
    if (res === 'recusado') return responder({ erro: 'Compra recusada. Confira registro, saldo, ticket pendente e se você está no abrigo.' }, 409);
    return responder({ ok: true, repetido: res === 'repetido' });
  }
  if (pathname === '/game/ticket/usar' && req.method === 'POST') {
    const b = await ler(req);
    if (!/^[a-f0-9]{20}$/.test(b?.ticket || '') || !Object.hasOwn(ORIGEM_BONUS, b?.origem)) return erro(env, 400, 'Selecione uma Origem válida.');
    const outra = { sql: 'EXISTS (SELECT 1 FROM characters WHERE discord_id = ? AND origem <> ?)', binds: [did, b.origem] };
    const pendente = { sql: 'EXISTS (SELECT 1 FROM game_class_tickets WHERE id = ? AND discord_id = ? AND usado IS NULL)', binds: [b.ticket, did] };
    const res = await comRecibo(env, did, 'ticket_uso', b.ticket, { origem: b.origem }, todas(outra, pendente, semExpedicao(did), contaAtiva(did)), g => [
      env.DB.prepare(`UPDATE characters SET origem = ?, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`).bind(b.origem, seg(), did, g.bind),
      env.DB.prepare(`UPDATE game_class_tickets SET usado = ? WHERE id = ? AND discord_id = ? AND ${g.sql}`).bind(seg(), b.ticket, did, g.bind),
    ]);
    if (res === 'repetido') {
      const recibo = await env.DB.prepare('SELECT dados FROM game_ledger WHERE id = ?').bind(`${did}:ticket_uso:${b.ticket}`).first();
      if (JSON.parse(recibo.dados).origem !== b.origem) return responder({ erro: 'Este ticket já foi usado para outra Origem.' }, 409);
    }
    if (res === 'recusado') return responder({ erro: 'Para trocar, volte ao abrigo com um ticket válido e escolha outra Origem.' }, 409);
    return responder({ ok: true, repetido: res === 'repetido' });
  }

  // ----- sair pelo portão -----
  if (pathname === '/game/expedicao/iniciar' && req.method === 'POST') {
    const b = await ler(req);
    const rota = Object.hasOwn(ROTAS, b?.rota) ? ROTAS[b.rota] : null;
    if (!rota) return erro(env, 400, 'Essa rota não existe.');
    const s = await estadoDoJogador(env, did, c);
    if (s.expedicao) return responder({ erro: 'Você já está numa expedição.' }, 409);
    if (!s.flags.kit_recebido) return erro(env, 400, 'Pegue seu kit com o Wolf antes de sair.');
    if (rota.requer && !s.flags[rota.requer]) return erro(env, 400, 'Essa rota ainda não está liberada pra você.');
    if (rota.nivel > s.attrs.nivel) return erro(env, 400, 'Esta rota exige nível ' + rota.nivel + '.');
    if (rota.custo > (s.itens.suprimento || 0)) return erro(env, 400, 'Falta kit de campo. O Wolf vende e também dá pra fabricar na bancada dele.');
    const semente = crypto.getRandomValues(new Uint32Array(1))[0];
    const sim = simular(b.rota, s.attrs, semente, { flags: s.flags, temRegistro: (s.itens.registro_rota || 0) > 0 || !!s.flags.registro_entregue });
    const id = novoId(), inicio = Date.now(), fim = inicio + sim.duracao * 1000;
    const guardado = {
      log: sim.log, salvos: sim.salvos, final: sim.final, capacidade: s.attrs.capacidade, desgaste: { arma: 1, protecao: 1, mochila: 1, ferramenta: 1 },
      mult: s.attrs.desgaste, equip: Object.fromEntries(Object.entries(s.equipados).map(([k, e]) => [k, e.id])),
      primeiraRota: !!rota.marca && !s.flags[rota.marca],
      ...(rota.bonusXp ? { bonusRota: { ...BONUS_PRIMEIRA_ROTA, xp: rota.bonusXp } } : {}),
    };
    const cond = condicaoSaida(did, s, rota.custo);
    const lote = [env.DB.prepare(
      `INSERT INTO game_expeditions (id, discord_id, rota, semente, regras, inicio, fim, status, sim) SELECT ?, ?, ?, ?, ?, ?, ?, 'andamento', ? WHERE ${cond.sql}`
    ).bind(id, did, b.rota, semente, VERSAO, inicio, fim, JSON.stringify(guardado), ...cond.binds)];
    if (rota.custo > 0) lote.push(env.DB.prepare(
      'UPDATE game_inventory SET qtd = qtd - ? WHERE discord_id = ? AND item = ? AND EXISTS (SELECT 1 FROM game_expeditions WHERE id = ?)'
    ).bind(rota.custo, did, 'suprimento', id));
    let r;
    try { r = await env.DB.batch(lote); }
    catch (e) {
      // o índice único recusou: outra aba saiu primeiro
      if (/UNIQUE|constraint/i.test(String(e && e.message))) return responder({ erro: 'Você já está numa expedição.' }, 409);
      throw e;
    }
    if (!r[0].meta.changes) return responder({ erro: 'O personagem mudou. Confira o equipamento e os kits antes de sair.' }, 409);
    return responder({ ok: true });
  }

  // ----- ronda longa: deixa o personagem farmando uma rota já conhecida, com o jogo aberto ou fechado -----
  if (pathname === '/game/expedicao/ronda' && req.method === 'POST') {
    const b = await ler(req);
    const rota = Object.hasOwn(ROTAS, b?.rota) ? ROTAS[b.rota] : null;
    if (!rota) return erro(env, 400, 'Essa rota não existe.');
    const vidaMin = RONDA.vidaMin.includes(b?.vidaMin) ? b.vidaMin : 0.5;
    const pedidos = inteiro(b?.ciclos ?? RONDA.ciclosMax, 1, RONDA.ciclosMax);
    if (!pedidos) return erro(env, 400, 'Quantidade de voltas inválida.');
    const s = await estadoDoJogador(env, did, c);
    if (s.expedicao) return responder({ erro: 'Você já está na rua.' }, 409);
    if (rota.nivel > s.attrs.nivel) return erro(env, 400, 'Esta rota exige nível ' + rota.nivel + '.');
    if (!s.flags.kit_recebido || (rota.requer && !s.flags[rota.requer]) || !rota.repete || !s.flags[rota.repete]) return erro(env, 400, 'Faça essa rota uma vez acompanhando antes de deixar o personagem farmando nela.');
    if (s.ferido) return erro(env, 400, 'Ferido não sai pra ronda longa. Use um curativo ou espere passar.');
    if (rota.custo > 0 && (s.itens.suprimento || 0) < 1) return erro(env, 400, 'Falta kit de campo pra deixar farmando nessa rota. O Wolf vende e a bancada dele faz.');
    const semente = crypto.getRandomValues(new Uint32Array(1))[0];
    const ronda = simularRonda(b.rota, { xp: c.xp, origem: c.origem, equipados: s.equipados, flags: s.flags, suprimentos: s.itens.suprimento || 0 }, semente, { ciclos: pedidos, vidaMin });
    if (!ronda.ciclos.length) return erro(env, 400, 'Seu equipamento está gasto demais pra sair. Passe no Wolf.');
    const n = ronda.kits, id = novoId(), inicio = Date.now(), fim = inicio + ronda.duracao * 1000;
    const guardado = { tipo: 'ronda', ciclos: ronda.ciclos, parada: ronda.parada, vidaMin, pedidos, porKit: RONDA.voltasPorKit, semKit: ronda.semKit, retorno: ronda.retorno, de: ronda.de,
      equip: Object.fromEntries(Object.entries(s.equipados).map(([k, e]) => [k, e.id])) };
    const cond = condicaoSaida(did, s, n);
    // os kits de todas as voltas previstas saem agora; chamar de volta antes devolve os das voltas que nem começaram
    const lote = [
      env.DB.prepare(`INSERT INTO game_expeditions (id, discord_id, rota, semente, regras, inicio, fim, status, sim) SELECT ?, ?, ?, ?, ?, ?, ?, 'andamento', ? WHERE ${cond.sql}`)
        .bind(id, did, b.rota, semente, VERSAO, inicio, fim, JSON.stringify(guardado), ...cond.binds),
      env.DB.prepare('UPDATE game_inventory SET qtd = qtd - ? WHERE discord_id = ? AND item = ? AND EXISTS (SELECT 1 FROM game_expeditions WHERE id = ?)').bind(n, did, 'suprimento', id),
    ];
    let r;
    try { r = await env.DB.batch(lote); }
    catch (e) {
      if (/UNIQUE|constraint/i.test(String(e && e.message))) return responder({ erro: 'Você já está na rua.' }, 409);
      throw e;
    }
    if (!r[0].meta.changes) return responder({ erro: 'O personagem mudou. Confira o equipamento e os kits antes de sair.' }, 409);
    return responder({ ok: true });
  }

  // ----- voltar: no fim do tempo (concluir) ou antes (recuar) -----
  if ((pathname === '/game/expedicao/concluir' || pathname === '/game/expedicao/recuar') && req.method === 'POST') {
    const b = await ler(req);
    const recuo = pathname.endsWith('/recuar');
    const e = await env.DB.prepare('SELECT * FROM game_expeditions WHERE id = ? AND discord_id = ?').bind(String(b?.id || ''), did).first();
    if (!e) return erro(env, 404, 'Expedição não encontrada.');
    if (e.status === 'encerrada') return responder({ ok: true, repetido: true, relatorio: JSON.parse(e.resultado) });
    const agoraMs = Date.now();
    const sim = JSON.parse(e.sim);
    if (sim.tipo === 'ronda') return fecharRonda(env, did, c, e, sim, recuo, agoraMs, responder);
    let final;
    if (agoraMs >= e.fim) final = sim.final;
    else if (recuo) final = resultadoAte(sim, (agoraMs - e.inicio) / 1000);
    else return responder({ erro: 'Você ainda não voltou.' }, 409);

    const rota = ROTAS[e.rota];
    const bonus = final.motivo === 'concluida' && sim.primeiraRota ? sim.bonusRota || BONUS_PRIMEIRA_ROTA : null;
    const gasto = desgaste(final, { desgaste: sim.mult || 1 });
    const relatorio = {
      id: e.id, rota: e.rota, nomeRota: rota ? rota.nome : e.rota, motivo: final.motivo,
      fora: Math.round((agoraMs - e.inicio) / 1000), trabalhou: Math.min(final.duracao, Math.round((agoraMs - e.inicio) / 1000)),
      paradas: final.paradas, totalParadas: final.totalParadas, xp: final.xp + (bonus ? bonus.xp : 0), itens: final.itens,
      creditos: (final.creditos || 0) + (bonus ? bonus.creditos : 0), sinais: final.sinais || [], equip: final.equip || null, perdidos: final.perdidos || {}, desgaste: gasto,
      ferido: final.motivo === 'derrota', bonus: !!bonus, nivelAntes: nivelDe(c.xp).nivel,
    };
    relatorio.nivelDepois = nivelDe(c.xp + relatorio.xp).nivel;

    const g = { sql: "EXISTS (SELECT 1 FROM game_expeditions WHERE id = ? AND status = 'premiando')", bind: e.id };
    const t = seg();
    // flags mudam com json_set dentro do lote: não depende de leitura antiga
    let flagsSql = 'flags'; const flagsBinds = [];
    for (const m of final.marcas || []) { flagsSql = `json_set(${flagsSql}, '$.${m.replace(/[^a-z0-9_]/g, '')}', ?)`; flagsBinds.push(t); }
    if (final.motivo === 'derrota') { flagsSql = `json_set(${flagsSql}, '$.ferido_ate', ?)`; flagsBinds.push(t + FERIMENTO_SEG); }
    const lote = [
      env.DB.prepare(recuo
        ? "UPDATE game_expeditions SET status = 'premiando' WHERE id = ? AND discord_id = ? AND status = 'andamento'"
        : "UPDATE game_expeditions SET status = 'premiando' WHERE id = ? AND discord_id = ? AND status = 'andamento' AND fim <= ?"
      ).bind(...(recuo ? [e.id, did] : [e.id, did, agoraMs])),
      ...Object.entries(final.itens || {}).filter(([k, q]) => ITENS[k] && q > 0).map(([k, q]) => mais(env, did, k, q, g)),
      ...(relatorio.creditos ? [mais(env, did, 'creditos', relatorio.creditos, g)] : []),
      ...(final.equip && ITENS[final.equip] ? [env.DB.prepare(
        `INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, 0, ? WHERE ${g.sql}`
      ).bind(`exp:${e.id}`, did, final.equip, t, g.bind)] : []),
      ...Object.entries(sim.equip || {}).filter(([k]) => gasto[k] > 0).map(([k, idEq]) => env.DB.prepare(
        `UPDATE game_equipment SET condicao = MAX(0, condicao - ?) WHERE id = ? AND discord_id = ? AND ${g.sql}`
      ).bind(gasto[k], idEq, did, g.bind)),
      env.DB.prepare(`UPDATE characters SET xp = xp + ?, nivel = ?, flags = ${flagsSql}, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
        .bind(relatorio.xp, relatorio.nivelDepois, ...flagsBinds, t, did, g.bind),
      env.DB.prepare("UPDATE game_expeditions SET status = 'encerrada', resultado = ?, encerrada_em = ? WHERE id = ? AND status = 'premiando'")
        .bind(JSON.stringify(relatorio), agoraMs, e.id),
    ];
    const r = await env.DB.batch(lote);
    if (r[r.length - 1].meta.changes !== 1) {
      // outra aba concluiu no mesmo instante: devolve o relatório que ficou valendo
      const e2 = await env.DB.prepare('SELECT status, resultado FROM game_expeditions WHERE id = ?').bind(e.id).first();
      if (e2 && e2.status === 'encerrada') return responder({ ok: true, repetido: true, relatorio: JSON.parse(e2.resultado) });
      return responder({ erro: 'Não deu pra fechar a expedição agora. Tente de novo.' }, 409);
    }
    return responder({ ok: true, relatorio });
  }

  // ----- trocar o que está equipado -----
  if (pathname === '/game/equipar' && req.method === 'POST') {
    const b = await ler(req);
    const alvo = await env.DB.prepare('SELECT id, item, equipado FROM game_equipment WHERE id = ? AND discord_id = ?').bind(String(b?.id || ''), did).first();
    if (!alvo || !ITENS[alvo.item]) return erro(env, 404, 'Você não tem esse equipamento.');
    const tipo = ITENS[alvo.item].tipo;
    const doTipo = Object.keys(ITENS).filter(k => ITENS[k].tipo === tipo);
    const tirar = b?.tirar === true;
    const r = await env.DB.prepare(
      `UPDATE game_equipment SET equipado = CASE WHEN id = ? AND ? = 0 THEN 1 ELSE 0 END
       WHERE discord_id = ? AND EXISTS (SELECT 1 FROM game_accounts WHERE discord_id = ? AND estado = 'ativo') AND item IN (${doTipo.map(() => '?').join(',')}) AND ${semExpedicao(did).sql}`
    ).bind(alvo.id, tirar ? 1 : 0, did, did, ...doTipo, did).run();
    if (!r.meta.changes) return responder({ erro: 'Não dá pra trocar equipamento no meio de uma expedição.' }, 409);
    return responder({ ok: true });
  }

  // ----- usar curativo -----
  if (pathname === '/game/usar' && req.method === 'POST') {
    const b = await ler(req);
    if (!['curativo', 'curativo_selado', 'kit_reserva'].includes(b?.item) || !chaveValida(b?.chave)) return erro(env, 400, 'Não dá pra usar isso.');
    const ferido = { sql: "COALESCE((SELECT json_extract(flags, '$.ferido_ate') FROM characters WHERE discord_id = ?), 0) > ?", binds: [did, seg()] };
    const pacote = b.item === 'kit_reserva';
    const condicao = todas(tem(did, b.item, 1), semExpedicao(did), contaAtiva(did), ...(pacote ? [] : [ferido]));
    const res = await comRecibo(env, did, 'usar', b.chave, { item: b.item }, condicao, g => [
      menos(env, did, b.item, 1, g),
      pacote ? mais(env, did, 'suprimento', 3, g) : env.DB.prepare(`UPDATE characters SET flags = json_remove(flags, '$.ferido_ate'), versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`).bind(seg(), did, g.bind),
    ]);
    if (res === 'recusado') return responder({ erro: pacote ? 'Abra o pacote no abrigo e confira se ele está no armazém.' : 'Use o curativo no abrigo enquanto estiver ferido.' }, 400);
    return responder({ ok: true, repetido: res === 'repetido' });
  }

  // ----- loja e bancada do Wolf -----
  if (pathname === '/game/loja' && req.method === 'POST') {
    const b = await ler(req);
    if (!chaveValida(b?.chave)) return erro(env, 400, 'Pedido inválido.');
    const flags = JSON.parse(c.flags || '{}');
    if (!flags.registrado) return erro(env, 400, 'Passe no Prefeito e faça seu registro primeiro.');
    const livre = todas(semExpedicao(did), contaAtiva(did));
    let res, falha = 'Não deu.';

    if (b.acao === 'vender') {
      // sem teto baixo: quem farmou muito vende tudo de uma vez (o limite só segura número absurdo)
      const def = Object.hasOwn(ITENS, b.item) ? ITENS[b.item] : null, q = inteiro(b.qtd, 1, 1000000);
      if (!def || !def.venda) return erro(env, 400, 'O Wolf não compra isso.');
      if (!q) return erro(env, 400, 'Quantidade inválida.');
      const total = def.venda * q;
      falha = 'Você não tem tudo isso pra vender.';
      res = await comRecibo(env, did, 'vender', b.chave, { item: b.item, qtd: q, total }, todas(tem(did, b.item, q), livre), g => [
        menos(env, did, b.item, q, g), mais(env, did, 'creditos', total, g),
        env.DB.prepare(`UPDATE characters SET flags = json_set(flags, '$.vendeu', COALESCE(json_extract(flags, '$.vendeu'), ?)), versao = versao + 1 WHERE discord_id = ? AND ${g.sql}`).bind(seg(), did, g.bind),
      ]);
    } else if (b.acao === 'comprar') {
      const def = LOJA.includes(b.item) ? ITENS[b.item] : null;
      const equip = def && EQUIPAVEIS.includes(def.tipo);
      const q = equip ? 1 : inteiro(b.qtd, 1, 99);
      if (!def || !q) return erro(env, 400, 'O Wolf não vende isso.');
      const total = def.compra * q;
      falha = def.requer && !flags[def.requer] ? 'Conclua o contrato de desbloqueio.' : 'Faltam créditos ou você está fora do abrigo.';
      res = await comRecibo(env, did, 'comprar', b.chave, { item: b.item, qtd: q, total }, todas(tem(did, 'creditos', total), livre, ...(def.requer ? [possuiFlag(did, def.requer)] : [])), g => [
        menos(env, did, 'creditos', total, g),
        equip ? env.DB.prepare(`INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, 0, ? WHERE ${g.sql}`)
          .bind(`loja:${did}:${b.chave}`, did, b.item, seg(), g.bind) : mais(env, did, b.item, q, g),
      ]);
    } else if (b.acao === 'fabricar') {
      const rec = Object.hasOwn(RECEITAS, b.receita) ? RECEITAS[b.receita] : null, q = rec && rec.equip ? 1 : inteiro(b.qtd ?? 1, 1, 20);
      if (!rec || !q) return erro(env, 400, 'Essa receita não existe.');
      falha = rec.requer && !flags[rec.requer] ? 'Conclua o contrato de desbloqueio.' : 'Falta material ou você está fora do abrigo.';
      res = await comRecibo(env, did, 'fabricar', b.chave, { receita: b.receita, qtd: q },
        todas(...Object.entries(rec.gasta).map(([k, n]) => tem(did, k, n * q)), livre, ...(rec.requer ? [possuiFlag(did, rec.requer)] : [])), g => [
          ...Object.entries(rec.gasta).map(([k, n]) => menos(env, did, k, n * q, g)),
          ...(rec.equip
            ? [env.DB.prepare(`INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, 0, ? WHERE ${g.sql}`)
              .bind(`fab:${did}:${b.chave}`, did, rec.equip, seg(), g.bind)]
            : Object.entries(rec.faz).map(([k, n]) => mais(env, did, k, n * q, g))),
        ]);
    } else if (b.acao === 'reparar') {
      const eq = await env.DB.prepare('SELECT id, item, condicao FROM game_equipment WHERE id = ? AND discord_id = ?').bind(String(b.id || ''), did).first();
      if (!eq) return erro(env, 404, 'Você não tem esse equipamento.');
      if (eq.condicao >= 100) return responder({ ok: true, repetido: true });
      const custo = Math.ceil((100 - eq.condicao) * reparoPorPonto(eq.item));
      falha = 'Faltam créditos pro reparo.';
      // a condição lida entra na trava: se mudou no meio, o preço seria outro e o pedido é recusado
      const mesma = { sql: 'EXISTS (SELECT 1 FROM game_equipment WHERE id = ? AND discord_id = ? AND condicao = ?)', binds: [eq.id, did, eq.condicao] };
      res = await comRecibo(env, did, 'reparar', b.chave, { id: eq.id, custo }, todas(tem(did, 'creditos', custo), mesma, livre), g => [
        menos(env, did, 'creditos', custo, g),
        env.DB.prepare(`UPDATE game_equipment SET condicao = 100 WHERE id = ? AND discord_id = ? AND ${g.sql}`).bind(eq.id, did, g.bind),
      ]);
    } else if (b.acao === 'venderEquip') {
      const eq = await env.DB.prepare('SELECT id, item, condicao, equipado FROM game_equipment WHERE id = ? AND discord_id = ?').bind(String(b.id || ''), did).first();
      const ja = await env.DB.prepare('SELECT estado FROM game_ledger WHERE id = ?').bind(`${did}:venderEquip:${b.chave}`).first();
      if (ja) return responder({ ok: true, repetido: true });
      if (!eq) return erro(env, 404, 'Você não tem esse equipamento.');
      if (eq.equipado) return erro(env, 400, 'Tire do corpo antes de vender (Mochila).');
      const total = valorRevenda(eq.item, eq.condicao);
      if (!total) return erro(env, 400, 'O Wolf não fica com isso.');
      falha = 'Não deu pra vender agora. Tente de novo.';
      // a peça precisa existir, estar guardada e na mesma condição lida: o preço saiu dela
      const mesma = { sql: 'EXISTS (SELECT 1 FROM game_equipment WHERE id = ? AND discord_id = ? AND condicao = ? AND equipado = 0)', binds: [eq.id, did, eq.condicao] };
      res = await comRecibo(env, did, 'venderEquip', b.chave, { id: eq.id, item: eq.item, condicao: eq.condicao, total }, todas(mesma, livre), g => [
        env.DB.prepare(`DELETE FROM game_equipment WHERE id = ? AND discord_id = ? AND equipado = 0 AND ${g.sql}`).bind(eq.id, did, g.bind),
        mais(env, did, 'creditos', total, g),
      ]);
      if (res !== 'recusado') return responder({ ok: true, repetido: res === 'repetido', total });
    } else return erro(env, 400, 'Pedido inválido.');

    if (res === 'recusado') return responder({ erro: falha }, 400);
    return responder({ ok: true, repetido: res === 'repetido' });
  }

  // ----- lootboxes do servidor: paga com créditos aqui, chega no Project Zomboid pela ponte -----
  if (pathname === '/game/caixas' && req.method === 'GET') return json(env, await vitrineCaixas(env, u));
  if (pathname === '/game/caixas/comprar' && req.method === 'POST') {
    const b = await ler(req);
    if (!chaveValida(b?.chave)) return erro(env, 400, 'Pedido inválido.');
    const cx = Object.hasOwn(CAIXAS, b.caixa) ? CAIXAS[b.caixa] : null;
    if (!cx) return erro(env, 400, 'Essa caixa não existe.');
    if (!JSON.parse(c.flags || '{}').registrado) return erro(env, 400, 'Passe no Prefeito e faça seu registro primeiro.');
    if (!u.login) return erro(env, 400, 'Vincule seu personagem do servidor em Minha conta antes de comprar.');
    if (!(await caixasLigadas(env))) return erro(env, 503, 'A entrega no servidor está desligada agora. Tente mais tarde.');
    const t = seg(), pedido = novoId().slice(0, 16);
    const limite = { sql: `(SELECT COUNT(*) FROM orders WHERE discord_id = ? AND listing_id LIKE 'caixa:%' AND status IN ('pendente', 'entregue') AND criado > ?) < ?`, binds: [did, t - 86400, CAIXAS_POR_DIA] };
    const res = await comRecibo(env, did, 'caixa', b.chave, { caixa: b.caixa, preco: cx.preco, pedido }, todas(tem(did, 'creditos', cx.preco), limite, contaAtiva(did)), g => [
      menos(env, did, 'creditos', cx.preco, g),
      env.DB.prepare(`INSERT INTO orders (id, discord_id, login, listing_id, item, preco, status, motivo, criado, atualizado) SELECT ?, ?, ?, ?, ?, ?, 'pendente', '', ?, ? WHERE ${g.sql}`)
        .bind(pedido, did, u.login, 'caixa:' + b.caixa, cx.nome, cx.preco, t, t, g.bind),
    ]);
    if (res === 'recusado') {
      const s = await estadoDoJogador(env, did, c);
      return responder({ erro: (s.creditos || 0) < cx.preco ? 'Faltam créditos.' : `Você já pegou ${CAIXAS_POR_DIA === 1 ? 'sua caixa' : 'suas caixas'} de hoje. Volte amanhã.` }, 400);
    }
    return responder({ ok: true, repetido: res === 'repetido', caixas: await vitrineCaixas(env, u) });
  }

  return null;
}

// O servidor do jogo avisa pela ponte que sabe entregar caixa (linha F|caixas). Sem aviso recente, não vende.
async function caixasLigadas(env) {
  const r = await env.DB.prepare("SELECT em FROM bridge_state WHERE chave = 'caixas'").first();
  return !!r && r.em > seg() - 3600;
}

async function vitrineCaixas(env, u) {
  const t = seg();
  const { results } = await env.DB.prepare(
    "SELECT id, item, preco, status, motivo, criado, atualizado FROM orders WHERE discord_id = ? AND listing_id LIKE 'caixa:%' ORDER BY criado DESC LIMIT 10"
  ).bind(u.discord_id).all();
  const hoje = results.filter(p => (p.status === 'pendente' || p.status === 'entregue') && p.criado > t - 86400);
  const proxima = hoje.length >= CAIXAS_POR_DIA ? Math.min(...hoje.map(p => p.criado)) + 86400 : 0;
  return {
    ligada: await caixasLigadas(env), vinculado: !!u.login, login: u.login || null,
    porDia: CAIXAS_POR_DIA, expiraDias: CAIXA_EXPIRA_DIAS, proximaEm: proxima,
    caixas: Object.entries(CAIXAS).map(([id, cx]) => ({ id, nome: cx.nome, preco: cx.preco, desc: cx.desc })),
    pedidos: results,
  };
}
