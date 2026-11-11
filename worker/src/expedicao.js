// Prefeitura Z: Depois da Queda — estoque, equipamento, loja do Wolf e expedições.
// Regra geral: o navegador pede, o servidor decide. Toda mudança de recurso sai num lote (transação) do D1
// que só vale se a condição ainda for verdadeira dentro do próprio lote, e um clique repetido não conta duas vezes.
import { ITENS, EQUIPAVEIS, KIT_INICIAL, KIT_SUPRIMENTOS, LOJA, RECEITAS, ROTAS, VERSAO, CUSTO_REPARO_POR_PONTO, FERIMENTO_SEG, valorRevenda,
  RONDA, kitsDaRonda, atributos, nivelDe, simular, simularRonda, rondaAte, resultadoAte, desgaste, catalogo } from './regras.js';

const seg = () => Math.floor(Date.now() / 1000);
const novoId = () => [...crypto.getRandomValues(new Uint8Array(10))].map(x => x.toString(16).padStart(2, '0')).join('');
const ATIVA = "status IN ('andamento', 'premiando')";
const BONUS_PRIMEIRA_ROTA = { xp: 40, creditos: 10 };
const PREMIO_REGISTRO = { xp: 40, creditos: 40 };

// ---------- leitura ----------
export async function estadoDoJogador(env, did, c) {
  const [inv, eq, ex] = await env.DB.batch([
    env.DB.prepare('SELECT item, qtd FROM game_inventory WHERE discord_id = ? AND qtd > 0').bind(did),
    env.DB.prepare('SELECT id, item, condicao, equipado FROM game_equipment WHERE discord_id = ? ORDER BY criado, id').bind(did),
    env.DB.prepare(`SELECT id, rota, inicio, fim, status, sim FROM game_expeditions WHERE discord_id = ? AND ${ATIVA}`).bind(did),
  ]);
  const itens = {}; let creditos = 0;
  for (const r of inv.results) { if (r.item === 'creditos') creditos = r.qtd; else if (ITENS[r.item]) itens[r.item] = r.qtd; }
  const equipamento = eq.results.filter(e => ITENS[e.item]).map(e => ({ id: e.id, item: e.item, condicao: e.condicao, equipado: !!e.equipado }));
  const flags = JSON.parse(c.flags || '{}');
  const ferido = (flags.ferido_ate || 0) > seg();
  const equipados = {};
  for (const e of equipamento) if (e.equipado) equipados[ITENS[e.item].tipo] = e;
  const attrs = atributos({ xp: c.xp, origem: c.origem, equipados, ferido });
  const e = ex.results[0];
  return {
    creditos, itens, equipamento, equipados, flags, ferido, feridoAte: ferido ? flags.ferido_ate : 0, attrs,
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
    const volta = simular(e.rota, c.attrs, c.semente, { flags, temRegistro: true, vidaInicial: c.vidaInicial, origem: novo ? c.de : null, semVolta: novo });
    let log = volta.log, dur = c.dur;
    if (novo && i === cs.length - 1 && sim.retorno > 0 && sim.de) {
      // última volta: depois da revista ele pega o caminho do portão
      log = log.filter(x => x.e !== 'fim');
      log.push({ t: c.dur, e: 'volta', de: sim.de, para: catalogo().saida, d: sim.retorno, motivo: 'concluida' }, { t: c.dur + sim.retorno, e: 'fim' });
      dur += sim.retorno;
    }
    return {
      id: e.id, rota: e.rota, tipo: 'ronda', inicio: e.inicio + c.t0 * 1000, fim: e.inicio + (c.t0 + dur) * 1000,
      log, vidaMax: c.attrs.vidaMax, vidaInicial: c.vidaInicial, capacidade: c.attrs.capacidade,
      ronda: { volta: i + 1, voltas: cs.length, ultima: i === cs.length - 1, inicio: e.inicio, fim: e.fim, feitas: ate.feitos, xp: ate.xp, itens: ate.itens, parada: sim.parada, vidaMin: sim.vidaMin },
    };
  }
  return { id: e.id, rota: e.rota, inicio: e.inicio, fim: e.fim, log: sim.log, vidaMax: sim.final.vidaMax, capacidade: attrs.capacidade };
}

// o que vai pro navegador
export function estadoPublico(s) {
  const a = s.attrs;
  return {
    creditos: s.creditos, itens: s.itens, equipamento: s.equipamento, ferido: s.ferido, feridoAte: s.feridoAte,
    atributos: { vidaMax: a.vidaMax, ataque: a.ataque, defesa: a.defesa, capacidade: a.capacidade },
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
    paradas: ate.paradas, xp: ate.xp, itens: ate.itens, creditos: 0, equip: null, perdidos: {}, desgaste: ate.gasto,
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
    ...(devolver > 0 ? [mais(env, did, 'suprimento', devolver, g)] : []),
    ...Object.entries(sim.equip || {}).filter(([k]) => ate.gasto[k] > 0).map(([k, idEq]) => env.DB.prepare(
      `UPDATE game_equipment SET condicao = MAX(0, condicao - ?) WHERE id = ? AND discord_id = ? AND ${g.sql}`
    ).bind(ate.gasto[k], idEq, did, g.bind)),
    env.DB.prepare(`UPDATE characters SET xp = xp + ?, flags = ${flagsSql}, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
      .bind(ate.xp, ...flagsBinds, t, did, g.bind),
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
  return comRecibo(env, did, 'kit', 'inicial', { itens: KIT_INICIAL, suprimento: KIT_SUPRIMENTOS }, { sql: '1 = 1', binds: [] }, g => [
    ...KIT_INICIAL.map(item => env.DB.prepare(
      `INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, 1, ? WHERE ${g.sql}`
    ).bind(`kit:${did}:${item}`, did, item, t, g.bind)),
    mais(env, did, 'suprimento', KIT_SUPRIMENTOS, g),
  ]);
}

// Entrega do registro ao Bashar: tira o item, paga e marca a missão. Só vale uma vez.
export async function entregarRegistro(env, did) {
  return comRecibo(env, did, 'missao', 'registro', PREMIO_REGISTRO, todas(tem(did, 'registro_rota', 1), semExpedicao(did)), g => [
    menos(env, did, 'registro_rota', 1, g),
    mais(env, did, 'creditos', PREMIO_REGISTRO.creditos, g),
    env.DB.prepare(`UPDATE characters SET xp = xp + ?, flags = json_set(flags, '$.registro_entregue', ?), versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
      .bind(PREMIO_REGISTRO.xp, seg(), seg(), did, g.bind),
  ]);
}

// ---------- rotas HTTP ----------
export async function rotasExpedicao(req, env, u, pathname, json, erro, ler, personagemPublico) {
  const did = u.discord_id;
  if (pathname === '/game/catalogo' && req.method === 'GET') return json(env, catalogo());

  const c = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(did).first();
  if (!c) return erro(env, 409, 'Crie seu personagem primeiro.');
  const responder = async (extra, status = 200) => {
    const c2 = await env.DB.prepare('SELECT * FROM characters WHERE discord_id = ?').bind(did).first();
    const s = await estadoDoJogador(env, did, c2);
    return json(env, { ...extra, personagem: personagemPublico(c2), estado: estadoPublico(s), expedicao: s.expedicao, agora: Date.now() }, status);
  };

  // ----- sair pelo portão -----
  if (pathname === '/game/expedicao/iniciar' && req.method === 'POST') {
    const b = await ler(req);
    const rota = Object.hasOwn(ROTAS, b?.rota) ? ROTAS[b.rota] : null;
    if (!rota) return erro(env, 400, 'Essa rota não existe.');
    const s = await estadoDoJogador(env, did, c);
    if (s.expedicao) return responder({ erro: 'Você já está numa expedição.' }, 409);
    if (!s.flags.kit_recebido) return erro(env, 400, 'Pegue seu kit com o Wolf antes de sair.');
    if (rota.requer && !s.flags[rota.requer]) return erro(env, 400, 'Essa rota ainda não está liberada pra você.');
    if (rota.custo > (s.itens.suprimento || 0)) return erro(env, 400, 'Falta kit de campo. O Wolf vende e também dá pra fabricar na bancada dele.');
    const semente = crypto.getRandomValues(new Uint32Array(1))[0];
    const sim = simular(b.rota, s.attrs, semente, { flags: s.flags, temRegistro: (s.itens.registro_rota || 0) > 0 || !!s.flags.registro_entregue });
    const id = novoId(), inicio = Date.now(), fim = inicio + sim.duracao * 1000;
    const guardado = {
      log: sim.log, salvos: sim.salvos, final: sim.final, desgaste: { arma: 1, protecao: 1, mochila: 1, ferramenta: 1 },
      mult: s.attrs.desgaste, equip: Object.fromEntries(Object.entries(s.equipados).map(([k, e]) => [k, e.id])),
      primeiraRota: !!rota.marca && !s.flags[rota.marca],
    };
    const lote = [env.DB.prepare(
      `INSERT INTO game_expeditions (id, discord_id, rota, semente, regras, inicio, fim, status, sim) SELECT ?, ?, ?, ?, ?, ?, ?, 'andamento', ? WHERE ${tem(did, 'suprimento', rota.custo).sql}`
    ).bind(id, did, b.rota, semente, VERSAO, inicio, fim, JSON.stringify(guardado), did, 'suprimento', rota.custo)];
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
    if (!r[0].meta.changes) return erro(env, 400, 'Falta kit de campo.');
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
    if (!rota.repete || !s.flags[rota.repete]) return erro(env, 400, 'Faça essa rota uma vez acompanhando antes de deixar o personagem farmando nela.');
    if (s.ferido) return erro(env, 400, 'Ferido não sai pra ronda longa. Use um curativo ou espere passar.');
    if (rota.custo > 0 && (s.itens.suprimento || 0) < 1) return erro(env, 400, 'Falta kit de campo pra deixar farmando nessa rota. O Wolf vende e a bancada dele faz.');
    const semente = crypto.getRandomValues(new Uint32Array(1))[0];
    const ronda = simularRonda(b.rota, { xp: c.xp, origem: c.origem, equipados: s.equipados, flags: s.flags, suprimentos: s.itens.suprimento || 0 }, semente, { ciclos: pedidos, vidaMin });
    if (!ronda.ciclos.length) return erro(env, 400, 'Seu equipamento está gasto demais pra sair. Passe no Wolf.');
    const n = ronda.kits, id = novoId(), inicio = Date.now(), fim = inicio + ronda.duracao * 1000;
    const guardado = { tipo: 'ronda', ciclos: ronda.ciclos, parada: ronda.parada, vidaMin, pedidos, porKit: RONDA.voltasPorKit, semKit: ronda.semKit, retorno: ronda.retorno, de: ronda.de,
      equip: Object.fromEntries(Object.entries(s.equipados).map(([k, e]) => [k, e.id])) };
    // os kits de todas as voltas previstas saem agora; chamar de volta antes devolve os das voltas que nem começaram
    const lote = [
      env.DB.prepare(`INSERT INTO game_expeditions (id, discord_id, rota, semente, regras, inicio, fim, status, sim) SELECT ?, ?, ?, ?, ?, ?, ?, 'andamento', ? WHERE ${tem(did, 'suprimento', n).sql}`)
        .bind(id, did, b.rota, semente, VERSAO, inicio, fim, JSON.stringify(guardado), did, 'suprimento', n),
      env.DB.prepare('UPDATE game_inventory SET qtd = qtd - ? WHERE discord_id = ? AND item = ? AND EXISTS (SELECT 1 FROM game_expeditions WHERE id = ?)').bind(n, did, 'suprimento', id),
    ];
    let r;
    try { r = await env.DB.batch(lote); }
    catch (e) {
      if (/UNIQUE|constraint/i.test(String(e && e.message))) return responder({ erro: 'Você já está na rua.' }, 409);
      throw e;
    }
    if (!r[0].meta.changes) return erro(env, 400, 'Falta kit de campo.');
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
    const bonus = final.motivo === 'concluida' && sim.primeiraRota ? BONUS_PRIMEIRA_ROTA : null;
    const gasto = desgaste(final, { desgaste: sim.mult || 1 });
    const relatorio = {
      id: e.id, rota: e.rota, nomeRota: rota ? rota.nome : e.rota, motivo: final.motivo,
      fora: Math.round((agoraMs - e.inicio) / 1000), trabalhou: Math.min(final.duracao, Math.round((agoraMs - e.inicio) / 1000)),
      paradas: final.paradas, totalParadas: final.totalParadas, xp: final.xp + (bonus ? bonus.xp : 0), itens: final.itens,
      creditos: bonus ? bonus.creditos : 0, equip: final.equip || null, perdidos: final.perdidos || {}, desgaste: gasto,
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
      env.DB.prepare(`UPDATE characters SET xp = xp + ?, flags = ${flagsSql}, versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`)
        .bind(relatorio.xp, ...flagsBinds, t, did, g.bind),
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
       WHERE discord_id = ? AND item IN (${doTipo.map(() => '?').join(',')}) AND ${semExpedicao(did).sql}`
    ).bind(alvo.id, tirar ? 1 : 0, did, ...doTipo, did).run();
    if (!r.meta.changes) return responder({ erro: 'Não dá pra trocar equipamento no meio de uma expedição.' }, 409);
    return responder({ ok: true });
  }

  // ----- usar curativo -----
  if (pathname === '/game/usar' && req.method === 'POST') {
    const b = await ler(req);
    if (b?.item !== 'curativo' || !chaveValida(b?.chave)) return erro(env, 400, 'Não dá pra usar isso.');
    const ferido = { sql: "COALESCE((SELECT json_extract(flags, '$.ferido_ate') FROM characters WHERE discord_id = ?), 0) > ?", binds: [did, seg()] };
    const res = await comRecibo(env, did, 'usar', b.chave, { item: 'curativo' }, todas(tem(did, 'curativo', 1), ferido, semExpedicao(did)), g => [
      menos(env, did, 'curativo', 1, g),
      env.DB.prepare(`UPDATE characters SET flags = json_remove(flags, '$.ferido_ate'), versao = versao + 1, atualizado = ? WHERE discord_id = ? AND ${g.sql}`).bind(seg(), did, g.bind),
    ]);
    if (res === 'recusado') return responder({ erro: 'Você precisa estar ferido e ter um curativo.' }, 400);
    return responder({ ok: true, repetido: res === 'repetido' });
  }

  // ----- loja e bancada do Wolf -----
  if (pathname === '/game/loja' && req.method === 'POST') {
    const b = await ler(req);
    if (!chaveValida(b?.chave)) return erro(env, 400, 'Pedido inválido.');
    const flags = JSON.parse(c.flags || '{}');
    if (!flags.registrado) return erro(env, 400, 'Passe no Prefeito e faça seu registro primeiro.');
    const livre = semExpedicao(did);
    let res, falha = 'Não deu.';

    if (b.acao === 'vender') {
      const def = Object.hasOwn(ITENS, b.item) ? ITENS[b.item] : null, q = inteiro(b.qtd, 1, 999);
      if (!def || !def.venda || !q) return erro(env, 400, 'O Wolf não compra isso.');
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
      falha = 'Faltam créditos.';
      res = await comRecibo(env, did, 'comprar', b.chave, { item: b.item, qtd: q, total }, todas(tem(did, 'creditos', total), livre), g => [
        menos(env, did, 'creditos', total, g),
        equip ? env.DB.prepare(`INSERT OR IGNORE INTO game_equipment (id, discord_id, item, condicao, equipado, criado) SELECT ?, ?, ?, 100, 0, ? WHERE ${g.sql}`)
          .bind(`loja:${did}:${b.chave}`, did, b.item, seg(), g.bind) : mais(env, did, b.item, q, g),
      ]);
    } else if (b.acao === 'fabricar') {
      const rec = Object.hasOwn(RECEITAS, b.receita) ? RECEITAS[b.receita] : null, q = inteiro(b.qtd ?? 1, 1, 20);
      if (!rec || !q) return erro(env, 400, 'Essa receita não existe.');
      falha = 'Falta material.';
      res = await comRecibo(env, did, 'fabricar', b.chave, { receita: b.receita, qtd: q },
        todas(...Object.entries(rec.gasta).map(([k, n]) => tem(did, k, n * q)), livre), g => [
          ...Object.entries(rec.gasta).map(([k, n]) => menos(env, did, k, n * q, g)),
          ...Object.entries(rec.faz).map(([k, n]) => mais(env, did, k, n * q, g)),
        ]);
    } else if (b.acao === 'reparar') {
      const eq = await env.DB.prepare('SELECT id, item, condicao FROM game_equipment WHERE id = ? AND discord_id = ?').bind(String(b.id || ''), did).first();
      if (!eq) return erro(env, 404, 'Você não tem esse equipamento.');
      if (eq.condicao >= 100) return responder({ ok: true, repetido: true });
      const custo = Math.ceil((100 - eq.condicao) * CUSTO_REPARO_POR_PONTO);
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

  return null;
}
