import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { XP_NIVEIS, nivelDe, atributos, ROTAS, ITENS, VERSAO, simular, resultadoAte, simularRonda, rondaAte } from '../worker/src/regras.js';
import { ROTAS_NOVAS } from '../worker/src/expansao.js';
import { montarJogo, APARENCIA } from './helpers/jogo-teste.mjs';

const POST = (m, perfil, rota) => m.chamar(perfil, '/game/expedicao/iniciar', { rota });
function adiantar(m, ex, t, duracao = ex.fim - ex.inicio) {
  const inicio = Date.now() - t * 1000;
  m.db.prepare('UPDATE game_expeditions SET inicio = ?, fim = ? WHERE id = ?').run(inicio, inicio + duracao, ex.id);
}
async function voltar(m, perfil, r, rota) {
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  const ex = r.corpo.expedicao;
  assert.equal(ex.rota, rota);
  adiantar(m, ex, (ex.fim - ex.inicio) / 1000 + 1);
  const resultado = await m.chamar(perfil, '/game/expedicao/concluir', { id: ex.id });
  assert.equal(resultado.status, 200, JSON.stringify(resultado.corpo));
  return resultado.corpo;
}

test('curva mantém todos os limiares antigos e recarrega XP excedente sem alterar o personagem', async () => {
  let antigo = 0;
  for (let nivel = 1; nivel <= 60; nivel++) {
    const xp = XP_NIVEIS[nivel - 1];
    if (nivel <= 30) assert.equal(xp, antigo);
    assert.equal(nivelDe(xp).nivel, nivel);
    if (nivel > 1) assert.equal(nivelDe(xp - 1).nivel, nivel - 1);
    antigo += Math.round(100 * (nivel ** 1.55));
  }
  assert.deepEqual(nivelDe(XP_NIVEIS.at(-1) + 500), { nivel: 60, xpNoNivel: 500, xpProximo: 0 });
  const m = await montarJogo();
  const r = await m.chamar('veterano', '/game/me');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.personagem.nivel, 35);
  assert.equal(r.corpo.personagem.xp, XP_NIVEIS[34]);
  assert.equal(r.corpo.personagem.origem, 'mecanico');
  assert.deepEqual(r.corpo.personagem.aparencia, APARENCIA);
  assert.equal(r.corpo.estado.creditos, 1400000);
  assert.ok(r.corpo.estado.equipamento.some(e => e.item === 'gancho_estiva' && e.equipado));
  assert.ok(!r.corpo.estado.equipamento.find(e => e.item === 'barra_portao').equipado);
  assert.ok(r.corpo.personagem.flags.mastim_vencido);
});

test('campanha passa pelas 15 rotas, preserva a expedição ao recarregar e paga troféus apenas uma vez', async () => {
  const m = await montarJogo();
  assert.equal((await POST(m,'incursao','reles_patio')).status, 400);
  assert.equal((await POST(m,'incursao','canais_knox')).status, 400);
  const accept = await m.chamar('incursao', '/game/npc/interact', { npc: 'bashar', escolha: 'sinal' });
  assert.equal(accept.corpo.novo, 'sinal_aceito');
  await m.chamar('veterano', '/game/npc/interact', { npc: 'bashar', escolha: 'sinal' });
  assert.match((await POST(m, 'veterano', 'acesso_comando')).corpo.erro, /liberada/);
  const conflitos = await Promise.all([POST(m,'incursao','reles_patio'), POST(m,'incursao','reles_patio')]);
  assert.deepEqual(conflitos.map(x => x.status).sort(), [200, 409]);
  const r0 = conflitos.find(x => x.status === 200);
  const onReload = await m.chamar('incursao', '/game/me');
  assert.deepEqual(onReload.corpo.expedicao.log, r0.corpo.expedicao.log);
  assert.equal(onReload.corpo.expedicao.id, r0.corpo.expedicao.id);
  assert.equal((await m.chamar('incursao', '/game/expedicao/concluir', { id: r0.corpo.expedicao.id })).status, 409);
  for (const [id, rota] of Object.entries(ROTAS_NOVAS)) {
    m.db.prepare('UPDATE game_equipment SET condicao = 100 WHERE discord_id = ?').run(m.ids.incursao);
    const r = id === 'reles_patio' ? r0 : await POST(m, 'incursao', id);
    const f = await voltar(m, 'incursao', r, id);
    assert.equal(f.relatorio.motivo, 'concluida', id + ' ' + JSON.stringify(f.relatorio));
    assert.equal(f.relatorio.creditos >= rota.creditos, true);
    if (!rota.chefe) continue;
    const premie = rota.pontos.at(-1).primeiraVez;
    assert.equal(f.relatorio.equip, premie.item);
    assert.ok(f.relatorio.sinais.length);
    assert.equal(f.estado.itens[premie.trofeu], 1);
    assert.ok(f.personagem.flags[premie.marca]);
    const replay = await m.chamar('incursao','/game/expedicao/concluir',{ id: r.corpo.expedicao.id });
    assert.equal(replay.corpo.repetido, true);
    assert.equal(replay.corpo.estado.creditos, f.estado.creditos);
    const replayRota = await voltar(m, 'incursao', await POST(m, 'incursao', id), id);
    assert.equal(replayRota.relatorio.equip, null);
    assert.equal(replayRota.estado.itens[premie.trofeu], 1);
  }
  const r = await m.chamar('incursao', '/game/expedicao/ronda', { rota: 'ronda_knox', ciclos: 4, vidaMin: 0.3 });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  const ex = r.corpo.expedicao;
  const row = m.db.prepare('SELECT sim FROM game_expeditions WHERE id = ?').get(ex.id);
  const s = JSON.parse(row.sim);
  assert.ok(s.ciclos.length > 1);
  adiantar(m, ex, s.ciclos[0].dur + 0.8, ex.ronda.fim - ex.ronda.inicio);
  const fim = await m.chamar('incursao','/game/expedicao/recuar',{ id: ex.id });
  assert.equal(fim.corpo.relatorio.voltas, 1);
  assert.equal(fim.corpo.relatorio.equip, null);
  assert.equal(fim.corpo.relatorio.creditos, ROTAS.ronda_knox.creditos);
  assert.equal(fim.corpo.estado.itens.selo_comporta, 1);
});

test('derrota, mochila cheia e recuo conservam somente o resultado já revistado', async () => {
  const a = atributos({ xp: XP_NIVEIS[37], origem: 'brigadista', equipados: {} });
  const cheia = simular('reles_patio', a, 123);
  assert.equal(cheia.final.motivo, 'mochila');
  assert.equal(cheia.final.creditos, 0);
  assert.deepEqual(cheia.final.marcas, []);
  const boa = { ...a, capacidade: 80, ataque: 150, defesa: 100 };
  const sim = simular('vigia_comando', boa, 123);
  const recuo = resultadoAte(sim, sim.salvos[0].t);
  assert.equal(recuo.motivo, 'recuo');
  assert.equal(recuo.paradas, 1);
  assert.equal(recuo.equip, null);
  assert.equal(recuo.creditos, 0);
  assert.ok(!recuo.marcas.includes('vigia_vencido'));
  const derrota = simular('matriarca_knox', { ...a, capacidade: 80, vidaMax: 26 }, 123);
  assert.equal(derrota.final.motivo, 'derrota');
  assert.equal(derrota.final.equip, null);
  assert.deepEqual(derrota.final.marcas, []);
});

test('resultado de uma expedição versão 8 fecha sem nova simulação e preserva o prêmio armazenado', async () => {
  const m = await montarJogo(), did = m.ids.veterano;
  const inicio = Date.now() - 60000, id = 'exp-legado';
  const sim = { log: [{ t: 50, e: 'fim' }], salvos: [], final: {
    motivo: 'concluida', paradas: 1, totalParadas: 1, duracao: 50, xp: 501, itens: { sucata: 5 }, vidaMax: 100, marcas: [], equip: null,
  }, equip: {}, mult: 1 };
  m.db.prepare("INSERT INTO game_expeditions(id,discord_id,rota,semente,regras,inicio,fim,status,sim) VALUES (?,?,?,1,8,?,?,'andamento',?)").run(id, did, 'rua_de_cima', inicio, inicio+50000, JSON.stringify(sim));
  assert.deepEqual((await m.chamar('veterano','/game/me')).corpo.expedicao.log, sim.log);
  const r = await m.chamar('veterano','/game/expedicao/concluir',{ id });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.relatorio.xp, 501);
  assert.equal(r.corpo.estado.itens.sucata, 5);
  assert.equal(r.corpo.personagem.xp, XP_NIVEIS[34] + 501);
  assert.ok(VERSAO > 8);
});

test('ronda antiga reproduz combate versão 8 e rondas novas nunca entregam troféu', async () => {
  const eq = { arma: { item: 'chave_linha', condicao: 80 }, protecao: { item: 'armadura_placas', condicao: 85 }, mochila: { item: 'mochila_cargueira', condicao: 100 } };
  const a = atributos({ xp: XP_NIVEIS[29], origem: 'mecanico', equipados: eq });
  const opts = { flags: { mastim_vencido: true }, temRegistro: true, origem: [40.5,21], inverso: true, semVolta: true };
  // Digest do log emitido por regras.js v8 na revisão c842c6426.
  const log = simular('canil_mastim', a, 42, opts).log.map(e => Object.fromEntries(Object.keys(e).sort().map(k => [k, e[k]])));
  const digest = createHash('sha256').update(JSON.stringify(log)).digest('hex');
  assert.equal(digest, '4028c561a4b7c7ae5cb08d56da6d27b6e6c3365b7ababac3219a0d304566d012');
  const r = simularRonda('matriarca_knox', { xp: XP_NIVEIS.at(-1), origem: 'mecanico', equipados: eq, flags: {}, suprimentos: 3 }, 42, { ciclos: 1, vidaMin: 0.3 });
  assert.equal(rondaAte(r, r.duracao).itens.selo_comporta, undefined);
});

test('ticket com preço configurado é atômico, válido uma vez e protegido durante expedição', async () => {
  const m = await montarJogo();
  m.env.TICKET_ORIGEM_PRECO = '1300000';
  const path = '/game/ticket', now = (await m.chamar('dono', path)).corpo;
  assert.equal(now.preco, 1300000);
  assert.equal((await m.chamar('ferido', path + '/comprar', { chave:'compra-0001', versao:1, preco:now.preco })).status, 409);
  const comprar = chave => m.chamar('dono', path + '/comprar', { chave, versao:now.versao, preco:now.preco });
  const [a,b] = await Promise.all([comprar('compra-000a'),comprar('compra-000b')]);
  assert.deepEqual([a.status,b.status].sort(), [200,409]);
  const chave = a.status === 200 ? 'compra-000a' : 'compra-000b';
  assert.equal((await comprar(chave)).corpo.repetido, true);
  const t = (await m.chamar('dono', path)).corpo;
  assert.equal(t.saldo, 300000);
  assert.equal((await m.chamar('dono',path+'/usar',{ ticket:t.ticket,origem:'mecanico' })).status,409);
  const partida = await POST(m, 'dono', 'rua_de_cima');
  assert.equal(partida.status, 200);
  assert.equal((await m.chamar('dono',path+'/usar',{ ticket:t.ticket,origem:'batedor' })).status,409);
  await m.chamar('dono','/game/expedicao/recuar',{ id:partida.corpo.expedicao.id });
  const antes = (await m.chamar('dono','/game/me')).corpo;
  const uso = await m.chamar('dono',path+'/usar',{ ticket:t.ticket,origem:'batedor' });
  assert.equal(uso.status,200,JSON.stringify(uso.corpo));
  assert.equal(uso.corpo.personagem.origem,'batedor');
  for (const k of ['xp','nivel','aparencia','flags']) assert.deepEqual(uso.corpo.personagem[k],antes.personagem[k]);
  assert.deepEqual(uso.corpo.estado.equipamento,antes.estado.equipamento);
  assert.equal(uso.corpo.estado.creditos,300000);
  assert.equal(uso.corpo.estado.itens.ticket_origem,undefined);
  assert.equal((await m.chamar('dono',path+'/usar',{ ticket:t.ticket,origem:'batedor' })).corpo.repetido,true);
  assert.equal((await m.chamar('dono',path+'/usar',{ ticket:t.ticket,origem:'socorrista' })).status,409);
  assert.equal((await comprar('compra-000c')).status,409);
  assert.equal((await comprar(chave)).corpo.repetido,true);
});

test('proprietário de nível 18 usa ficha, ajustes, suspensão reversível e auditoria', async () => {
  const m = await montarJogo(), url = '/game/admin/personagem';
  assert.equal((await m.chamar('jogador',url)).status,403);
  assert.equal((await m.chamar('admin',url)).status,403);
  const owner = (await m.chamar('dono',url)).corpo;
  assert.equal(owner.personagem.nivel, 18);
  let prox = 0;
  const montar = async (acao, campos, alvo = m.ids.dono) => {
    const r = (await m.chamar('dono',url+'?alvo='+alvo)).corpo;
    return { acao, alvo, versao:r.personagem?.versao, confirmado:true, motivo:'Homologação da expansão', chave:'operacao-'+(++prox), ...campos };
  };
  for (const perfil of ['jogador','admin']) assert.equal((await m.chamar(perfil,url,await montar('xp',{ nivel:60 }))).status,403);
  const xp = await montar('xp',{ nivel:55 });
  assert.equal((await m.chamar('dono',url,{ ...xp, motivo:'' })).status,400);
  assert.equal((await m.chamar('dono',url,xp)).status,200);
  assert.equal((await m.chamar('dono',url,xp)).corpo.repetido,true);
  assert.equal((await m.chamar('dono',url,await montar('origem',{ origem:'socorrista' }))).status,200);
  assert.equal((await m.chamar('dono',url,await montar('equipamento',{ item:'sonda_reles',condicao:72,qtd:2 }))).status,200);
  assert.equal((await m.chamar('dono',url,await montar('creditos',{ creditos:500000,saldo:1600000 }))).status,200);
  assert.equal((await m.chamar('dono',url,await montar('rota',{ rota:'canais_knox' }))).status,200);
  const ficha = (await m.chamar('dono',url)).corpo;
  assert.equal(ficha.estado.creditos,500000);
  assert.equal(ficha.personagem.xp,XP_NIVEIS[54]);
  assert.equal(ficha.personagem.origem,'socorrista');
  assert.equal(ficha.estado.equipamento.filter(x => x.item==='sonda_reles' && x.condicao===72).length,2);
  assert.ok(ficha.personagem.flags.zelador_vencido);
  assert.equal(ficha.personagem.flags.drenagem_mapeada,undefined);
  const ex = await POST(m, 'dono', 'canais_knox');
  assert.equal(ex.status,200);
  assert.equal((await m.chamar('dono',url,await montar('curar',{}))).status,409);
  assert.equal((await m.chamar('dono',url,await montar('suspender',{},m.ids.jogador))).status,200);
  assert.equal((await m.chamar('jogador','/game/me')).status,403);
  assert.equal((await m.chamar('dono',url,await montar('reativar',{},m.ids.jogador))).status,200);
  assert.equal((await m.chamar('jogador','/game/me')).status,200);
  const h = await m.chamar('dono','/game/admin/historico?acao=xp&alvo='+m.ids.dono);
  assert.equal(h.corpo.historico.length,1);
  assert.equal(h.corpo.historico[0].ator,m.ids.dono);
  assert.deepEqual(JSON.parse(h.corpo.historico[0].antes),{ xp:XP_NIVEIS[17],nivel:18 });
  assert.deepEqual(JSON.parse(h.corpo.historico[0].depois),{ xp:XP_NIVEIS[54],nivel:55 });
  assert.equal((await m.chamar('admin','/game/admin/historico')).status,403);
});

test('mapas têm marcos e as trilhas de ida, volta e ronda são transitáveis com raio do jogador', async () => {
  const ctx = { window: { PZ: { areas: {} } } };
  runInNewContext(await readFile(new URL('../jogo/areaExpansao.js',import.meta.url),'utf8'),ctx);
  const a = atributos({ xp:XP_NIVEIS.at(-1), origem:'mecanico', equipados:{} });
  const livre = (map,x,y) => !map.OBJ.some(o=>o.solido && x>o.x-.29 && x<o.x+o.w+.29 && y>o.y-.29 && y<o.y+o.d+.29)
    && map.chao[Math.floor(y)*map.LARG+Math.floor(x)]!==map.T.AGUA;
  for (const [id,r] of Object.entries(ROTAS_NOVAS)) {
    const map = ctx.window.PZ.areas[r.area];
    assert.ok(map.marcos.length>=5);
    for (const inverso of [true,false]) {
      const log = simular(id,{ ...a, ataque:200, defesa:200, capacidade:100 },3,{ inverso }).log;
      for (const e of log.filter(e=>e.pts)) {
        for (let i=1;i<e.pts.length;i++) {
          const [x0,y0]=e.pts[i-1], [x1,y1]=e.pts[i];
          for (let t=0;t<=100;t++) {
            const x=x0+(x1-x0)*t/100,y=y0+(y1-y0)*t/100;
            assert.ok(livre(map,x,y),`${id} passagem bloqueada em ${x}, ${y}`);
          }
        }
      }
    }
  }
});

test('continua registrando jogador, entregando kit e registro, vendendo no Wolf e assinando presença', async () => {
  const m = await montarJogo(), p = 'jogador';
  assert.equal((await m.chamar('sistema-sem-token','/game/me')).status,401);
  const npc = (id, escolha) => m.chamar(p,'/game/npc/interact',{ npc:id,escolha });
  assert.equal((await npc('prefeito','registro')).corpo.novo,'registrado');
  assert.equal((await npc('wolf','kit')).corpo.estado.itens.suprimento,3);
  assert.equal((await npc('bashar','trabalho')).corpo.novo,'contrato_visto');
  const did = m.ids[p];
  m.db.prepare("INSERT INTO game_inventory(discord_id,item,qtd) VALUES (?,'registro_rota',1)").run(did);
  assert.equal((await npc('bashar','entregar')).corpo.personagem.xp,40);
  assert.equal((await npc('bashar','entregar')).corpo.ok,true);
  const compra = await m.chamar(p,'/game/loja',{ acao:'comprar',item:'suprimento',qtd:1,chave:'wolf-0001' });
  assert.equal(compra.corpo.estado.itens.suprimento,4);
  const bilhete = await m.chamar(p,'/game/presenca/bilhete',{});
  assert.match(bilhete.corpo.bilhete,/^1000003\.\d+\.[a-f0-9]{40}$/);
  assert.equal((await m.chamar('ferido','/game/usar',{ item:'curativo',chave:'cura-00001' })).corpo.estado.ferido,false);
  assert.ok(ITENS.rele_ceramico.venda);
});

test('Wolf respeita a ordem dos contratos e fabrica itens consumíveis da expansão', async () => {
  const m = await montarJogo(), p = 'incursao', did = m.ids[p];
  const comprar = chave => m.chamar(p, '/game/loja', { acao: 'comprar', item: 'faca_cabos', chave });
  const fabricar = (chave, receita) => m.chamar(p, '/game/loja', { acao: 'fabricar', receita, chave });
  assert.equal((await comprar('wolf-exp01')).status, 400);
  assert.equal((await fabricar('wolf-exp02', 'kit_reserva')).status, 400);
  const flags = { reles_recuperados: 1, marcas_lidas: 1, drenagem_mapeada: 1 };
  m.db.prepare('UPDATE characters SET flags = json_patch(flags, ?) WHERE discord_id = ?').run(JSON.stringify(flags), did);
  assert.equal((await comprar('wolf-exp03')).status, 200);
  const caixa = await fabricar('wolf-exp04', 'kit_reserva');
  assert.equal(caixa.status, 200, JSON.stringify(caixa.corpo));
  const usar = () => m.chamar(p, '/game/usar', { item: 'kit_reserva', chave: 'usar-pacote01' });
  const usado = await usar();
  assert.equal(usado.corpo.estado.itens.suprimento, caixa.corpo.estado.itens.suprimento + 3);
  assert.equal(usado.corpo.estado.itens.kit_reserva, undefined);
  assert.equal((await usar()).corpo.repetido, true);
  const rec = await fabricar('wolf-exp05', 'curativo_selado');
  assert.equal(rec.corpo.estado.itens.curativo_selado, 2);
  const eq = await fabricar('wolf-exp06', 'perfurador_knox');
  const peca = eq.corpo.estado.equipamento.find(e => e.item === 'perfurador_knox');
  assert.equal(peca.condicao, 100);
  const r = await m.chamar(p, '/game/equipar', { id: peca.id });
  assert.ok(r.corpo.estado.equipamento.find(e => e.id === peca.id).equipado);
});

test('carros dos mapas anteriores deixam livres as travessias de ida, volta e ronda', async () => {
  const ctx = { window: { PZ: {} } }, saida = [2.5, 12.5];
  for (const f of ['area', 'areaEstacao', 'areaPorto'])
    runInNewContext(await readFile(new URL('../jogo/' + f + '.js', import.meta.url), 'utf8'), ctx);
  for (const [id, rota] of Object.entries(ROTAS)) {
    if (rota.nivel) continue;
    const carros = ctx.window.PZ.areas[rota.area || 'entrada'].OBJ.filter(o => ['carro', 'carcaca'].includes(o.tipo));
    const pontos = rota.pontos.map(p => p.p);
    for (const ordem of [pontos, [...pontos].reverse()]) {
      const fim = ordem.at(-1);
      const caminho = [saida, ...ordem, ...(Math.abs(fim[1] - 12.5) > 1.6 ? [[fim[0], 12.5]] : []), saida];
      for (let i = 1; i < caminho.length; i++) {
        const [a, b] = caminho.slice(i - 1, i + 1);
        for (let k = 0; k <= 100; k++) {
          const x = a[0] + (b[0] - a[0]) * k / 100, y = a[1] + (b[1] - a[1]) * k / 100;
          assert.ok(carros.every(o => x <= o.x - .29 || x >= o.x + o.w + .29 || y <= o.y - .29 || y >= o.y + o.d + .29), `${id}: carro no caminho em ${x},${y}`);
        }
      }
    }
  }
});
