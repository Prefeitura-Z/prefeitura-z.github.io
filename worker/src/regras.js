// Prefeitura Z: Depois da Queda — regras do jogo (itens, rotas, inimigos, combate).
// Tudo aqui é função pura, sem banco e sem relógio: o servidor sorteia uma semente, simula a expedição
// inteira de uma vez e guarda o resultado. O navegador só assiste. Mudou número aqui? Suba VERSAO.
export const VERSAO = 3;

// ---------- itens ----------
// tipo: material | consumivel | missao | arma | protecao | mochila | ferramenta
export const ITENS = {
  sucata: { nome: 'Sucata', tipo: 'material', venda: 2, desc: 'Metal torto, parafuso, arame. Serve pra quase tudo.' },
  tecido: { nome: 'Tecido', tipo: 'material', venda: 3, desc: 'Pano que ainda aguenta virar curativo ou remendo.' },
  pecas: { nome: 'Peças', tipo: 'material', venda: 8, desc: 'Engrenagem, mola, dobradiça. O Wolf sempre quer.' },
  peca_eletrica: { nome: 'Peça elétrica recuperada', tipo: 'material', venda: 14, desc: 'Sai de rádio velho e de painel de portão.' },
  suprimento: { nome: 'Kit de campo', tipo: 'consumivel', compra: 15, desc: 'Água, comida e fita. Cada saída pra rua gasta um.' },
  curativo: { nome: 'Curativo de abrigo', tipo: 'consumivel', compra: 12, desc: 'Trata ferimento. Quem volta ferido sai mais fraco até usar um.' },
  registro_rota: { nome: 'Registro de rota', tipo: 'missao', desc: 'As anotações do posto da Rua de Cima. O Bashar precisa disso.' },
  barra_portao: { nome: 'Barra de portão reforçada', tipo: 'arma', ataque: 6, compra: 30, desc: 'Pesada, feia e confiável.' },
  cano_rebite: { nome: 'Cano com rebite', tipo: 'arma', ataque: 9, compra: 70, desc: 'O Wolf soldou uma cabeça de rebites na ponta.' },
  machadinha: { nome: 'Machadinha do entreposto', tipo: 'arma', ataque: 13, desc: 'Estava na mão do Porteiro. Agora é sua.' },
  jaqueta_ronda: { nome: 'Jaqueta de ronda remendada', tipo: 'protecao', defesa: 12, compra: 30, desc: 'Couro velho com reforço no antebraço.' },
  colete_lona: { nome: 'Colete de lona dupla', tipo: 'protecao', defesa: 24, compra: 80, desc: 'Duas camadas de lona de caminhão costuradas.' },
  mochila_lona: { nome: 'Mochila de lona de patrulha', tipo: 'mochila', capacidade: 20, compra: 30, desc: 'Cabe o básico de uma saída curta.' },
  mochila_reforcada: { nome: 'Mochila de patrulha reforçada', tipo: 'mochila', capacidade: 34, compra: 90, desc: 'Armação de alumínio e alça larga.' },
  ferramenta_recuperacao: { nome: 'Ferramenta de recuperação', tipo: 'ferramenta', sucataExtra: 1, compra: 55, desc: 'Pé de cabra curto. Rende mais sucata por parada.' },
};
export const EQUIPAVEIS = ['arma', 'protecao', 'mochila', 'ferramenta'];
export const KIT_INICIAL = ['barra_portao', 'jaqueta_ronda', 'mochila_lona'];
export const KIT_SUPRIMENTOS = 3;
// o que o Wolf vende e o que dá pra fabricar na bancada dele
export const LOJA = ['suprimento', 'curativo', 'ferramenta_recuperacao', 'cano_rebite', 'colete_lona', 'mochila_reforcada', 'barra_portao', 'jaqueta_ronda', 'mochila_lona'];
export const RECEITAS = {
  curativo: { nome: 'Curativo de abrigo', gasta: { tecido: 2 }, faz: { curativo: 1 } },
  suprimento: { nome: 'Kit de campo', gasta: { sucata: 3, tecido: 1 }, faz: { suprimento: 1 } },
};
export const CUSTO_REPARO_POR_PONTO = 0.25;   // créditos por ponto de condição, arredondado pra cima
// O Wolf recompra equipamento por uma fração do preço da loja, menos ainda se estiver gasto.
// Sem preço de loja (o que só sai de chefe) ele não compra. Consertar pra revender nunca compensa.
export const REVENDA = 0.3;
export function valorRevenda(item, condicao) {
  const d = ITENS[item];
  if (!d || !d.compra || !EQUIPAVEIS.includes(d.tipo)) return 0;
  return Math.max(1, Math.floor(d.compra * REVENDA * (0.5 + 0.5 * Math.max(0, Math.min(100, condicao)) / 100)));
}
export const FERIMENTO_SEG = 600;             // quem cai volta ferido por 10 min (ou até usar curativo)

// ---------- inimigos ----------
export const INIMIGOS = {
  errante: { nome: 'Errante', vida: 26, ataque: 5, defesa: 0, cadencia: 2.2, evasao: 0, xp: 8 },
  corredor: { nome: 'Corredor febril', vida: 18, ataque: 4, defesa: 0, cadencia: 1.15, evasao: 0.1, xp: 11 },
  porteiro: { nome: 'O Porteiro', vida: 135, ataque: 9, defesa: 25, cadencia: 2.4, evasao: 0, xp: 90, chefe: true, pesadoACada: 4, pesadoFator: 2.2 },
};

// ---------- rotas (todas no Quarteirão da Entrada) ----------
// pontos em células do mapa da área; "enc" lista os inimigos da parada. O mapa desenhado no cliente segue estes pontos.
const SAIDA = [2.5, 12.5];
export const ROTAS = {
  rua_de_cima: {
    nome: 'Rua de Cima', resumo: 'Vá até o posto que parou de responder e traga o registro.',
    custo: 0, requer: 'contrato_visto', perigo: 1, forca: 0.8,
    pontos: [
      { p: [9.5, 12.5], enc: ['errante'] },
      { p: [15.5, 12.2], enc: ['errante'] },
      { p: [24.5, 12.8], enc: ['errante', 'errante'] },
      { p: [31.5, 12.4], enc: ['corredor'] },
      { p: [37.5, 11.2], enc: ['errante', 'corredor'], traz: 'registro_rota', trazSe: 'sem_registro' },
    ],
    saque: { sucata: [1, 2], tecido: [0, 1] },
    marca: 'rota1_concluida', repete: 'rota1_concluida',
  },
  quarteirao: {
    nome: 'Ronda do Quarteirão', resumo: 'Volta completa pelas duas ruas. Mais errante, mais coisa pra trazer.',
    custo: 1, requer: 'rota1_concluida', perigo: 2, forca: 0.85,
    pontos: [
      { p: [9.5, 12.6], enc: ['errante', 'errante'] },
      { p: [16.5, 12.3], enc: ['corredor'] },
      { p: [21.5, 16.5], enc: ['errante', 'corredor'] },
      { p: [21.6, 21.5], enc: ['errante', 'errante'] },
      { p: [21.5, 13.0], enc: [] },
      { p: [29.5, 12.5], enc: ['corredor', 'corredor'] },
      { p: [36.5, 12.6], enc: ['errante', 'corredor'] },
    ],
    saque: { sucata: [1, 3], tecido: [0, 2], pecas: [0, 1] },
    marca: 'rota2_concluida', repete: 'rota2_concluida',
  },
  entreposto: {
    nome: 'Entreposto do Porteiro', resumo: 'O antigo entreposto da rua de cima tem dono. Ele não deixa ninguém passar.',
    custo: 1, requer: 'registro_entregue', perigo: 3, chefe: 'porteiro',
    pontos: [
      { p: [12.5, 12.5], enc: ['errante', 'corredor'] },
      { p: [21.5, 12.0], enc: ['corredor', 'corredor'] },
      { p: [21.5, 8.0], enc: ['errante', 'errante'] },
      { p: [21.5, 4.6], enc: ['porteiro'], primeiraVez: { item: 'machadinha', marca: 'porteiro_vencido' } },
    ],
    saque: { sucata: [1, 3], pecas: [1, 2], peca_eletrica: [0, 1] },
    repete: 'porteiro_vencido',   // chefe só entra em ronda depois de uma vitória acompanhada
  },
};
export const VEL_ANDAR = 1.9;        // células por segundo na rua
const TEMPO_REVISTA = 3;           // segundos revistando depois de cada parada
const RESPIRO = 6;                   // vida recuperada depois de cada parada vencida

// ---------- progressão ----------
export const NIVEL_MAX = 30;
export const xpParaSubir = L => Math.round(100 * Math.pow(L, 1.55));
export function nivelDe(xpTotal) {
  let L = 1, resto = Math.max(0, Math.floor(xpTotal || 0));
  while (L < NIVEL_MAX && resto >= xpParaSubir(L)) { resto -= xpParaSubir(L); L++; }
  return { nivel: L, xpNoNivel: resto, xpProximo: L < NIVEL_MAX ? xpParaSubir(L) : 0 };
}

export const ORIGEM_BONUS = {
  brigadista: { vida: 8, txt: '+8 de vida' },
  mecanico: { desgaste: 0.7, txt: 'equipamento gasta 30% menos' },
  batedor: { evasao: 0.03, txt: '+3 pontos de esquiva' },
  socorrista: { respiro: 3, txt: 'recupera mais vida entre as paradas' },
  trabalhador: { capacidade: 5, txt: '+5 de espaço na mochila' },
};

const fatorCondicao = c => 0.5 + 0.5 * Math.max(0, Math.min(100, c)) / 100;

// equipados: { arma: {item, condicao}, protecao: ..., mochila: ..., ferramenta: ... } (faltando = sem nada)
export function atributos({ xp, origem, equipados, ferido }) {
  const { nivel } = nivelDe(xp);
  const b = ORIGEM_BONUS[origem] || {};
  const eq = k => equipados && equipados[k] ? { def: ITENS[equipados[k].item], f: fatorCondicao(equipados[k].condicao) } : null;
  const arma = eq('arma'), prot = eq('protecao'), moch = eq('mochila'), ferr = eq('ferramenta');
  const vidaCheia = 60 + 8 * (nivel - 1) + (b.vida || 0);
  return {
    nivel,
    vidaMax: ferido ? Math.round(vidaCheia * 0.75) : vidaCheia,
    ataque: Math.round(6 + nivel + (arma ? arma.def.ataque * arma.f : 0)),
    defesa: Math.round(prot ? prot.def.defesa * prot.f : 0),
    cadencia: 1.6, precisao: 0, evasao: 0.03 + (b.evasao || 0),
    critico: 0.08, criticoFator: 1.6,
    capacidade: (moch ? moch.def.capacidade : 6) + (b.capacidade || 0),
    sucataExtra: ferr ? ferr.def.sucataExtra : 0,
    respiro: RESPIRO + (b.respiro || 0),
    desgaste: b.desgaste || 1,
    ferido: !!ferido,
  };
}

// ---------- sorteio com semente (mulberry32) ----------
export function sorteador(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;

// Fórmulas do roteiro: rola acerto, calcula dano, rola crítico. Dano inteiro, mínimo 1.
function golpe(rnd, atq, alvo, fator = 1) {
  const chance = limitar(0.9 + (atq.precisao || 0) - (alvo.evasao || 0), 0.6, 0.98);
  if (rnd() > chance) return { erro: 1, dano: 0 };
  const reducao = limitar(alvo.defesa / (alvo.defesa + 100), 0, 0.7);
  // variação de 15% pra cima ou pra baixo: sem ela, um ponto de ataque a mais mudava tudo de uma vez
  let dano = Math.max(1, atq.ataque * fator * (1 - reducao) * (0.85 + rnd() * 0.3));
  const crit = atq.critico && rnd() < atq.critico;
  if (crit) dano *= atq.criticoFator;
  return { dano: Math.max(1, Math.round(dano)), crit: crit ? 1 : 0 };
}

// Simula a rota inteira. ctx.flags decide prêmios de primeira vez; ctx.temRegistro evita registro repetido.
// Devolve { duracao, log, pontosSalvos, final } com tempos em segundos desde a saída.
export function simular(rotaId, attrs, semente, ctx = {}) {
  const rota = ROTAS[rotaId];
  const rnd = sorteador(semente), forca = rota.forca || 1;
  const log = [], salvos = [];
  let t = 0, pos = ctx.origem || SAIDA, vida = Math.max(1, Math.min(attrs.vidaMax, ctx.vidaInicial || attrs.vidaMax)), carga = 0, xp = 0, paradas = 0;
  const itens = {}, perdidos = {}, marcas = [];
  let equipGanho = null, motivo = 'concluida', ficouParaTras = false;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const andar = (para, n) => { const d = r1(dist(pos, para) / VEL_ANDAR); log.push({ t: r1(t), e: 'ir', n, de: pos, para, d }); t += d; pos = para; };
  const pegar = (item, q) => {
    if (ITENS[item].tipo === 'missao') { itens[item] = (itens[item] || 0) + q; return q; }   // item de missão não ocupa mochila
    const cabe = Math.max(0, Math.min(q, attrs.capacidade - carga));
    if (cabe) { itens[item] = (itens[item] || 0) + cabe; carga += cabe; }
    if (cabe < q) { perdidos[item] = (perdidos[item] || 0) + (q - cabe); ficouParaTras = true; }
    return cabe;
  };

  for (let i = 0; i < rota.pontos.length; i++) {
    const pt = rota.pontos[i];
    andar(pt.p, i);
    if (pt.enc.length) {
      const ini = pt.enc.map((tipo, k) => ({ k, tipo, ...INIMIGOS[tipo], vida: Math.round(INIMIGOS[tipo].vida * forca), ataque: INIMIGOS[tipo].ataque * forca, vidaAtual: Math.round(INIMIGOS[tipo].vida * forca), prox: 0.9 + k * 0.45 + rnd() * 0.4, golpes: 0 }));
      log.push({ t: r1(t), e: 'enc', i, ini: ini.map(n => ({ tipo: n.tipo, vida: n.vida })) });
      let proxJ = 0.5, tc = 0, vivos = ini.length;
      while (vivos > 0 && vida > 0) {
        // quem age primeiro: o jogador ou o inimigo vivo com o menor relógio
        let quem = null, menor = proxJ;
        for (const n of ini) if (n.vidaAtual > 0 && n.prox < menor) { menor = n.prox; quem = n; }
        tc = menor;
        if (!quem) {
          const alvo = ini.find(n => n.vidaAtual > 0);
          const g = golpe(rnd, attrs, alvo);
          alvo.vidaAtual = Math.max(0, alvo.vidaAtual - g.dano);
          log.push({ t: r1(t + tc), e: 'atk', de: 'j', em: alvo.k, ...g, v: alvo.vidaAtual });
          if (alvo.vidaAtual <= 0) { vivos--; xp += alvo.xp; log.push({ t: r1(t + tc + 0.25), e: 'cai', k: alvo.k }); }
          proxJ += attrs.cadencia;
        } else {
          quem.golpes++;
          const pesado = quem.pesadoACada && quem.golpes % quem.pesadoACada === 0;
          const g = golpe(rnd, quem, attrs, pesado ? quem.pesadoFator : 1);
          vida = Math.max(0, vida - g.dano);
          log.push({ t: r1(t + tc), e: 'atk', de: quem.k, em: 'j', ...g, ...(pesado ? { pesado: 1 } : {}), v: vida });
          quem.prox += quem.cadencia;
        }
      }
      t += tc + 0.6;
      if (vida <= 0) { motivo = 'derrota'; log.push({ t: r1(t), e: 'caiu' }); break; }
      // revista: saque da parada
      const ganho = {};
      for (const [item, [a, b]] of Object.entries(rota.saque)) {
        let q = a + Math.floor(rnd() * (b - a + 1));
        if (item === 'sucata') q += attrs.sucataExtra;
        if (q > 0) { const c = pegar(item, q); if (c) ganho[item] = c; }
      }
      if (pt.traz && !(pt.trazSe === 'sem_registro' && ctx.temRegistro)) { pegar(pt.traz, 1); ganho[pt.traz] = 1; }
      if (pt.primeiraVez && !(ctx.flags && ctx.flags[pt.primeiraVez.marca])) { equipGanho = pt.primeiraVez.item; marcas.push(pt.primeiraVez.marca); }
      const cura = Math.min(attrs.respiro, attrs.vidaMax - vida); vida += cura;
      t += TEMPO_REVISTA; paradas++;
      log.push({ t: r1(t), e: 'saque', i, itens: ganho, xp, v: vida, carga, ...(equipGanho && pt.primeiraVez ? { equip: equipGanho } : {}) });
      salvos.push({ t: r1(t), xp, itens: { ...itens }, paradas, vida, equip: equipGanho, marcas: [...marcas] });
      if (carga >= attrs.capacidade && i < rota.pontos.length - 1) { motivo = 'mochila'; break; }
    }
  }
  if (motivo === 'concluida' && rota.marca) marcas.push(rota.marca);
  // volta pro portão (derrotado volta carregado, mais devagar). No farm (ctx.semVolta) ele fica na área:
  // a volta acaba na última revista e a próxima começa dali mesmo. Só quem cai é carregado de volta.
  const ficou = pos;
  if (!ctx.semVolta || motivo === 'derrota') {
    const dv = r1(dist(pos, SAIDA) / (motivo === 'derrota' ? VEL_ANDAR * 0.7 : VEL_ANDAR * 1.25));
    log.push({ t: r1(t), e: 'volta', de: pos, para: SAIDA, d: dv, motivo });
    t += dv;
  }
  const duracao = Math.ceil(t);
  log.push({ t: duracao, e: 'fim', motivo });
  const ult = salvos[salvos.length - 1];
  const final = {
    motivo, duracao, paradas, totalParadas: rota.pontos.filter(p => p.enc.length).length,
    // quem cai fica só com o que já tinha revistado e não leva o prêmio da parada em que caiu
    xp: motivo === 'derrota' ? (ult ? ult.xp : 0) : xp,
    itens: motivo === 'derrota' ? (ult ? ult.itens : {}) : itens,
    equip: equipGanho, marcas, perdidos, ficouParaTras,
    vidaFinal: vida, vidaMax: attrs.vidaMax, pos: ficou,
  };
  return { duracao, log, salvos, final };
}

// Recuo: fica valendo o que estava revistado até o instante t (segundos desde a saída).
export function resultadoAte(sim, t) {
  let ult = null;
  for (const s of sim.salvos) if (s.t <= t) ult = s;
  return {
    motivo: 'recuo', duracao: Math.max(0, Math.floor(t)), paradas: ult ? ult.paradas : 0, totalParadas: sim.final.totalParadas,
    xp: ult ? ult.xp : 0, itens: ult ? ult.itens : {}, equip: ult ? ult.equip : null,
    // marcas de rota concluída não valem no recuo; a do chefe vale se ele já caiu
    marcas: ult ? ult.marcas.filter(m => !/^rota\d+_concluida$/.test(m)) : [],
    perdidos: {}, ficouParaTras: false, vidaFinal: ult ? ult.vida : sim.final.vidaMax, vidaMax: sim.final.vidaMax,
  };
}

// ---------- ronda longa (rende com o jogo fechado) ----------
// A mesma rota repetida, uma volta atrás da outra, com a MESMA simulação da expedição acompanhada.
// Tudo é decidido na saída: quantas voltas cabem, onde para e por quê. Depois é só o relógio do servidor.
export const RONDA = {
  limiteSeg: 8 * 3600,     // no máximo 8 horas por saída, igual pra todo mundo
  descansoSeg: 8,          // fôlego entre uma volta e outra, lá na área mesmo, enquanto os infectados voltam a aparecer
  voltasPorKit: 10,        // um kit de campo segura esse tanto de voltas
  descansoCura: 0.4,       // fração da vida máxima recuperada em cada pausa
  condicaoMin: 20,         // arma ou proteção abaixo disso: volta pra casa
  vidaMin: [0.3, 0.5, 0.7],
  ciclosMax: 300,
  desgaste: 0.1,           // farmando com calma o equipamento gasta bem menos que numa investida
};
// base: { xp, origem, equipados: { tipo: { id, item, condicao } }, flags, suprimentos }
// op: { ciclos, vidaMin }.  Devolve { ciclos: [...], duracao, parada, retorno, kits }
// O personagem não volta pro portão entre as voltas: cada volta começa onde a anterior acabou e os infectados
// renascem nas paradas. Só no fim (ou se cair) ele faz o caminho de volta, que entra em "retorno".
export const kitsDaRonda = (voltas, porKit = RONDA.voltasPorKit) => Math.ceil(voltas / porKit);
export function retornoDe(pos) { return pos ? r1(Math.hypot(pos[0] - SAIDA[0], pos[1] - SAIDA[1]) / (VEL_ANDAR * 1.25)) : 0; }
export function simularRonda(rotaId, base, semente, op) {
  const rnd = sorteador(semente ^ 0x9e3779b9);
  const equipados = Object.fromEntries(Object.entries(base.equipados || {}).map(([k, e]) => [k, { ...e }]));
  const pedidos = Math.max(1, Math.min(RONDA.ciclosMax, op.ciclos || RONDA.ciclosMax));
  let t = 0, xp = base.xp, sup = base.suprimentos, vida = null, parada = 'ciclos', pos = null;
  const usaKit = ROTAS[rotaId].custo > 0;
  const ciclos = [];
  while (ciclos.length < pedidos) {
    // rota que não gasta kit pra sair (a Rua de Cima) também não gasta no farm: sempre dá pra deixar o boneco lá
    const pedeKit = usaKit && ciclos.length % RONDA.voltasPorKit === 0;
    if (pedeKit && sup < 1) { parada = 'suprimentos'; break; }
    if (['arma', 'protecao'].some(k => equipados[k] && equipados[k].condicao < RONDA.condicaoMin)) { parada = 'equipamento'; break; }
    const attrs = atributos({ xp, origem: base.origem, equipados, ferido: false });
    const vidaInicial = vida == null ? attrs.vidaMax : Math.min(attrs.vidaMax, Math.round(vida + attrs.vidaMax * RONDA.descansoCura));
    if (ciclos.length && vidaInicial / attrs.vidaMax < op.vidaMin) { parada = 'vida'; break; }
    const t0 = ciclos.length ? t + RONDA.descansoSeg : 0;
    const sementeCiclo = Math.floor(rnd() * 4294967296) >>> 0;
    const sim = simular(rotaId, attrs, sementeCiclo, { flags: base.flags, temRegistro: true, vidaInicial, origem: pos, semVolta: true });
    if (t0 + sim.duracao + retornoDe(sim.final.pos) > RONDA.limiteSeg) { parada = 'tempo'; break; }
    const gasto = desgaste(sim.final, { desgaste: attrs.desgaste * RONDA.desgaste });
    for (const k of Object.keys(equipados)) equipados[k].condicao = Math.max(0, equipados[k].condicao - (gasto[k] || 0));
    if (pedeKit) sup--;
    xp += sim.final.xp; vida = sim.final.vidaFinal; t = t0 + sim.duracao;
    ciclos.push({ de: pos, t0, dur: sim.duracao, semente: sementeCiclo, attrs, vidaInicial, motivo: sim.final.motivo, xp: sim.final.xp, itens: sim.final.itens, paradas: sim.final.paradas, gasto });
    if (sim.final.motivo === 'derrota') { parada = 'derrota'; pos = null; break; }
    pos = sim.final.pos;
  }
  // quem não caiu ainda anda da última parada até o portão
  const retorno = Math.ceil(retornoDe(pos));
  return { ciclos, duracao: t + retorno, parada, retorno, de: pos, kits: usaKit ? kitsDaRonda(ciclos.length) : 0, semKit: !usaKit };
}
// o que já está valendo no instante t: só voltas inteiras contam
export function rondaAte(ronda, t) {
  const feitos = ronda.ciclos.filter(c => c.t0 + c.dur <= t);
  const iniciados = ronda.ciclos.filter(c => c.t0 <= t).length;
  const itens = {}, gasto = {};
  let xp = 0, paradas = 0;
  for (const c of feitos) {
    xp += c.xp; paradas += c.paradas;
    for (const [k, q] of Object.entries(c.itens)) itens[k] = (itens[k] || 0) + q;
    for (const [k, q] of Object.entries(c.gasto)) gasto[k] = (gasto[k] || 0) + q;
  }
  const ult = feitos[feitos.length - 1];
  return { feitos: feitos.length, iniciados, xp, itens, gasto, paradas, derrota: !!ult && ult.motivo === 'derrota' };
}

// desgaste do equipamento por expedição, em pontos de condição
export function desgaste(final, attrs) {
  const extra = final.motivo === 'derrota' ? 8 : 0;
  const m = attrs.desgaste;
  return {
    arma: Math.ceil((final.paradas * 1.5 + extra) * m),
    protecao: Math.ceil((final.paradas * 1 + extra) * m),
    mochila: Math.ceil((final.paradas * 0.5) * m),
    ferramenta: Math.ceil((final.paradas * 0.5) * m),
  };
}

// o que o navegador precisa pra desenhar e explicar (sem nada secreto)
export function catalogo() {
  return {
    versao: VERSAO, itens: ITENS, loja: LOJA, revenda: REVENDA, receitas: RECEITAS, inimigos: INIMIGOS,
    rotas: Object.fromEntries(Object.entries(ROTAS).map(([id, r]) => [id, {
      nome: r.nome, resumo: r.resumo, custo: r.custo, requer: r.requer, repete: r.repete || null, perigo: r.perigo, chefe: r.chefe || null,
      pontos: r.pontos.map(p => ({ p: p.p, enc: p.enc })), saque: Object.keys(r.saque),
    }])),
    saida: SAIDA, origens: Object.fromEntries(Object.entries(ORIGEM_BONUS).map(([k, v]) => [k, v.txt])),
    reparoPorPonto: CUSTO_REPARO_POR_PONTO, ferimentoSeg: FERIMENTO_SEG,
    ronda: { limiteSeg: RONDA.limiteSeg, descansoSeg: RONDA.descansoSeg, vidaMin: RONDA.vidaMin, ciclosMax: RONDA.ciclosMax, condicaoMin: RONDA.condicaoMin, voltasPorKit: RONDA.voltasPorKit },
  };
}
