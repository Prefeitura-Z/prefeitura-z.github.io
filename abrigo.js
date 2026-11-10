// Abrigo Z: jogo idle da Prefeitura Z. Roda só no navegador e salva no localStorage.
// Separado do servidor de propósito: nada daqui vira item, vantagem ou PRZcoin no jogo.
(() => {
'use strict';

const CHAVE = 'przAbrigo.v1';
const OFFLINE_MAX = 8 * 3600;        // segundos de progresso offline, no máximo
const OFFLINE_EF = 0.5;            // fora da página o abrigo rende metade (e as hordas param)
const PRIMEIRA_HORDA = 240;          // segundos até a primeira horda
const INTERVALO_HORDA = 180;
const HORDAS_PRO_WIPE = 10;

const RECURSOS = {
  comida:  { nome: 'Comida',  ico: '<path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5m3-5v5m-3 3h3M17 3c-2 2-2 6 0 9v9"/>' },
  madeira: { nome: 'Madeira', ico: '<path d="M3 17 17 3l4 4L7 21H3v-4Zm11-11 4 4"/>' },
  sucata:  { nome: 'Sucata',  ico: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/>' },
  remedio: { nome: 'Remédio', ico: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>' },
};
const ICO = {
  gente: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>',
  caveira: '<path d="M5 11a7 7 0 1 1 14 0v3l-2 1v3H7v-3l-2-1v-3Z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M11 18v-2m2 2v-2"/>',
};
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

const TRABALHOS = {
  catador:   { nome: 'Catadores',   desc: 'buscam comida' },
  lenhador:  { nome: 'Lenhadores',  desc: 'cortam madeira' },
  sucateiro: { nome: 'Sucateiros',  desc: 'desmontam carros' },
  guarda:    { nome: 'Guardas',     desc: '+3 de defesa cada' },
};

// custo base de cada construção; o custo do nível n é base × fator^n
const OBRAS = {
  barraca:    { nome: 'Barraca',       desc: '+2 vagas de sobrevivente',            custo: { madeira: 20 },                     fator: 1.45 },
  horta:      { nome: 'Horta',         desc: '+0,5 comida/s sem ninguém cuidando',  custo: { madeira: 30, sucata: 5 },          fator: 1.4 },
  muro:       { nome: 'Muro',          desc: '+10 de defesa',                       custo: { madeira: 40, sucata: 15 },         fator: 1.38 },
  serraria:   { nome: 'Serraria',      desc: '+25% de madeira',                     custo: { madeira: 50, sucata: 20 },         fator: 1.55 },
  oficina:    { nome: 'Oficina',       desc: '+25% de sucata, libera expedições',   custo: { madeira: 60, sucata: 40 },         fator: 1.55 },
  torre:      { nome: 'Torre de vigia', desc: '+20% de defesa',                     custo: { madeira: 120, sucata: 60 },        fator: 1.6,  req: { muro: 2 } },
  enfermaria: { nome: 'Enfermaria',    desc: '+0,02 remédio/s',                     custo: { madeira: 100, sucata: 80 },        fator: 1.6,  req: { oficina: 1 } },
  radio:      { nome: 'Rádio',         desc: 'chama sobreviventes e libera lugares longe', custo: { sucata: 200, remedio: 5 }, fator: 1.9, req: { enfermaria: 1 } },
};

// bairros do mapa de Knox County
const EXPEDICOES = [
  { id: 'rosewood',  nome: 'Mercado de Rosewood',     t: 60,  gente: 1, risco: 0.04, loot: { comida: [30, 70] } },
  { id: 'riverside', nome: 'Serraria de Riverside',   t: 90,  gente: 2, risco: 0.07, loot: { madeira: [60, 120] } },
  { id: 'muldraugh', nome: 'Ferro-velho de Muldraugh', t: 120, gente: 2, risco: 0.10, loot: { sucata: [45, 90] } },
  { id: 'westpoint', nome: 'Farmácia de West Point',  t: 180, gente: 3, risco: 0.15, loot: { remedio: [3, 6], comida: [20, 40] } },
  { id: 'march',     nome: 'Base de March Ridge',     t: 300, gente: 4, risco: 0.22, loot: { sucata: [150, 280], remedio: [4, 8] }, req: { radio: 1 } },
  { id: 'louisville', nome: 'Centro de Louisville',   t: 600, gente: 5, risco: 0.35, loot: { comida: [200, 350], madeira: [200, 350], sucata: [250, 400], remedio: [8, 14] }, novo: 0.5, req: { radio: 2 } },
];

// ---------- estado ----------
const novoEstado = (mem = 0, temporada = 1, recorde = 0) => ({
  v: 1,
  r: { comida: 15, madeira: 0, sucata: 0, remedio: 0 },
  pop: 1,
  jobs: { catador: 0, lenhador: 0, sucateiro: 0, guarda: 0 },
  b: Object.fromEntries(Object.keys(OBRAS).map(k => [k, 0])),
  horda: { n: 0, t: PRIMEIRA_HORDA, vitorias: 0 },
  exp: {},
  radioT: 0,
  mem, temporada, recorde,
  log: [],
  ultimo: Date.now(),
});

let S = carregar() || novoEstado();

function carregar() {
  try {
    const t = localStorage.getItem(CHAVE);
    return t ? normalizar(JSON.parse(t)) : null;
  } catch { return null; }
}
function normalizar(o) {
  if (!o || o.v !== 1) return null;
  const base = novoEstado();
  return {
    ...base, ...o,
    r: { ...base.r, ...o.r },
    jobs: { ...base.jobs, ...o.jobs },
    b: { ...base.b, ...o.b },
    horda: { ...base.horda, ...o.horda },
    exp: o.exp || {},
    log: Array.isArray(o.log) ? o.log.slice(0, 40) : [],
  };
}
function salvar() {
  S.ultimo = Date.now();
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch {}
}

// ---------- regras ----------
const mult = () => 1 + 0.1 * S.mem;
const vagas = () => 3 + S.b.barraca * 2;
const naRua = () => Object.values(S.exp).reduce((s, e) => s + e.gente, 0);
const empregados = () => Object.values(S.jobs).reduce((s, n) => s + n, 0);
const livres = () => S.pop - empregados() - naRua();
const comFome = () => S.r.comida <= 0;
const custoObra = k => Object.fromEntries(Object.entries(OBRAS[k].custo).map(([r, c]) => [r, Math.ceil(c * Math.pow(OBRAS[k].fator, S.b[k]))]));
const custoRecruta = () => Math.ceil(15 * Math.pow(1.32, S.pop - 1));
const forcaHorda = n => Math.round(8 * Math.pow(1.18, n));
const defesa = () => Math.round((S.b.muro * 10 + S.jobs.guarda * 3) * (1 + 0.2 * S.b.torre) * mult());
const temReq = req => !req || Object.entries(req).every(([k, n]) => S.b[k] >= n);
const pode = custo => Object.entries(custo).every(([r, c]) => S.r[r] >= c);
const pagar = custo => { for (const [r, c] of Object.entries(custo)) S.r[r] -= c; };
const pontosWipe = () => Math.floor(Math.pow(S.horda.vitorias, 1.5) / 10);

function taxas() {
  const m = mult() * (comFome() ? 0.5 : 1);
  return {
    comida: (S.jobs.catador * 0.6 + S.b.horta * 0.5) * m - S.pop * 0.2,
    madeira: S.jobs.lenhador * 0.5 * (1 + 0.25 * S.b.serraria) * m,
    sucata: S.jobs.sucateiro * 0.3 * (1 + 0.25 * S.b.oficina) * m,
    remedio: S.b.enfermaria * 0.02 * m,
  };
}

function diario(txt, tipo = '') {
  S.log.unshift({ t: Date.now(), txt, tipo });
  S.log.length = Math.min(S.log.length, 40);
  desenharDiario();
}

// avança o relógio do abrigo. offline = sem hordas (o muro segura enquanto você está fora)
function avancar(dt, offline, resumo) {
  const tx = taxas(), ef = offline ? OFFLINE_EF : 1;
  for (const r in tx) S.r[r] = Math.max(0, S.r[r] + tx[r] * dt * ef);

  if (S.b.radio > 0 && S.pop < vagas() && S.r.comida > 0) {
    S.radioT += dt;
    const cada = 150 / S.b.radio;
    while (S.radioT >= cada && S.pop < vagas()) {
      S.radioT -= cada; S.pop++;
      if (resumo) resumo.chegaram = (resumo.chegaram || 0) + 1;
      else diario('Alguém ouviu o rádio e apareceu no portão. +1 sobrevivente.', 'bom');
    }
    if (S.pop >= vagas()) S.radioT = 0;
  }

  for (const id in S.exp) if (Date.now() >= S.exp[id].fim) voltarExpedicao(id, resumo);

  if (!offline) {
    S.horda.t -= dt;
    if (S.horda.t <= 0) chegaHorda();
  }
}

function chegaHorda() {
  const n = S.horda.n, forca = forcaHorda(n), def = defesa();
  S.horda.n++;
  S.horda.t = INTERVALO_HORDA;
  if (def >= forca) {
    S.horda.vitorias++;
    S.recorde = Math.max(S.recorde, S.horda.vitorias);
    const premio = Math.round(forca * 2 * mult());
    S.r.sucata += premio;
    diario(`Horda ${n + 1} (força ${forca}) quebrou no muro. Vocês saquearam +${fmt(premio)} sucata dos corpos.`, 'bom');
    flash('bom');
  } else {
    const perda = Math.min(0.5, (forca - def) / forca * 0.6);
    for (const r of ['comida', 'madeira', 'sucata']) S.r[r] *= 1 - perda;
    let morte = '';
    if (S.pop > 1) {
      if (S.r.remedio >= 2) { S.r.remedio -= 2; morte = ' Um ferido foi salvo na enfermaria (-2 remédio).'; }
      else { tirarAlguem(); morte = ' Um sobrevivente não resistiu.'; }
    }
    diario(`Horda ${n + 1} (força ${forca}) passou da defesa (${def}). Perderam ${Math.round(perda * 100)}% do estoque.${morte}`, 'ruim');
    flash('ruim');
  }
}

function tirarAlguem() {
  S.pop--;
  if (livres() < 0) {
    const ordem = ['guarda', 'sucateiro', 'lenhador', 'catador'];
    for (const j of ordem) if (S.jobs[j] > 0) { S.jobs[j]--; break; }
  }
}

function sortear([a, b]) { return a + Math.random() * (b - a); }

function voltarExpedicao(id, resumo) {
  const e = S.exp[id], x = EXPEDICOES.find(x => x.id === id);
  delete S.exp[id];
  if (!x) return;
  const escala = mult() * (1 + 0.12 * S.horda.vitorias);
  const ganhos = [];
  for (const [r, faixa] of Object.entries(x.loot)) {
    const q = Math.round(sortear(faixa) * escala);
    S.r[r] += q; ganhos.push(`+${fmt(q)} ${RECURSOS[r].nome.toLowerCase()}`);
    if (resumo) resumo.loot[r] = (resumo.loot[r] || 0) + q;
  }
  let extra = '';
  if (Math.random() < x.risco) {
    if (S.r.remedio >= 1) { S.r.remedio -= 1; extra = ' Voltou alguém mordido, mas o remédio deu conta (-1).'; }
    else { S.pop = Math.max(1, S.pop - 1); extra = ' Um da equipe não voltou.'; if (resumo) resumo.perdidos = (resumo.perdidos || 0) + 1; }
  }
  if (x.novo && Math.random() < x.novo && S.pop < vagas()) { S.pop++; extra += ' Acharam um sobrevivente perdido e trouxeram junto!'; }
  if (resumo) resumo.exps.push(x.nome);
  diario(`Equipe voltou de ${x.nome}: ${ganhos.join(', ')}.${extra}`, extra.includes('não voltou') ? 'ruim' : 'bom');
}

// ---------- ações ----------
function vasculhar() {
  S.r.comida += 1 * mult(); S.r.madeira += 1 * mult();
  if (Math.random() < 0.3) S.r.sucata += 1 * mult();
  desenhar();
}
function mudarTrabalho(j, d) {
  if (d > 0 && livres() < 1) return;
  if (d < 0 && S.jobs[j] < 1) return;
  S.jobs[j] += d; desenhar();
}
function recrutar() {
  const c = custoRecruta();
  if (S.pop >= vagas() || S.r.comida < c) return;
  S.r.comida -= c; S.pop++;
  diario('Um sobrevivente novo entrou pro abrigo.', 'bom');
  desenhar();
}
function construir(k) {
  const c = custoObra(k);
  if (!temReq(OBRAS[k].req) || !pode(c)) return;
  pagar(c); S.b[k]++;
  diario(`${OBRAS[k].nome} subiu pro nível ${S.b[k]}.`);
  desenhar();
}
function mandar(id) {
  const x = EXPEDICOES.find(x => x.id === id);
  if (!x || S.exp[id] || S.b.oficina < 1 || !temReq(x.req) || livres() < x.gente) return;
  S.exp[id] = { fim: Date.now() + x.t * 1000, gente: x.gente };
  diario(`${x.gente === 1 ? 'Um sobrevivente saiu' : x.gente + ' sobreviventes saíram'} para ${x.nome}.`);
  desenhar();
}
let wipeArmado = 0;
function wipe(btn) {
  if (S.horda.vitorias < HORDAS_PRO_WIPE) return;
  if (Date.now() - wipeArmado > 4000) { wipeArmado = Date.now(); desenhar(); return; }
  const ganho = pontosWipe();
  S = novoEstado(S.mem + ganho, S.temporada + 1, S.recorde);
  diario(`Wipe! Começa a Temporada ${S.temporada}. Vocês lembram de tudo: +${ganho} de memória (+${ganho * 10}% em tudo).`, 'bom');
  wipeArmado = 0;
  montar(); desenhar(); salvar();
}

// ---------- interface ----------
const $ = id => document.getElementById(id);
function fmt(n) {
  n = Math.floor(n * 10) / 10;
  if (Math.abs(n) < 100) return n.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0 });
  if (Math.abs(n) < 1e4) return Math.floor(n).toLocaleString('pt-BR');
  const s = ['', 'k', 'M', 'B', 'T']; let i = 0;
  while (Math.abs(n) >= 1000 && i < s.length - 1) { n /= 1000; i++; }
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + s[i];
}
const fmtTaxa = n => (n >= 0 ? '+' : '') + n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '/s';
const fmtTempo = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m ? `${m}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`; };
const fmtCusto = c => Object.entries(c).map(([r, q]) => `<span class="${S.r[r] >= q ? '' : 'falta'}">${fmt(q)} ${RECURSOS[r].nome.toLowerCase()}</span>`).join(' · ');

function montar() {
  $('recursos').innerHTML = Object.entries(RECURSOS).map(([k, r]) =>
    `<div class="rec"><span>${svg(r.ico)} ${r.nome}</span><strong data-r="${k}">0</strong><small data-tx="${k}"></small></div>`).join('') +
    `<div class="rec"><span>${svg(ICO.gente)} Sobreviventes</span><strong id="v-pop">1</strong><small id="v-vagas"></small></div>`;

  $('jobs').innerHTML = Object.entries(TRABALHOS).map(([k, j]) =>
    `<div class="job"><span><b>${j.nome}</b><small>${j.desc}</small></span>
      <button type="button" data-job="${k}" data-d="-1" aria-label="Tirar um de ${j.nome}">−</button>
      <output data-jobn="${k}">0</output>
      <button type="button" data-job="${k}" data-d="1" aria-label="Botar um em ${j.nome}">+</button></div>`).join('');

  $('obras').innerHTML = Object.entries(OBRAS).map(([k, o]) =>
    `<button type="button" class="obra" data-obra="${k}"><span class="obra-t"><b>${o.nome}</b><i data-nivel="${k}"></i></span>
      <small>${o.desc}</small><span class="custo" data-custo="${k}"></span></button>`).join('');

  $('exps').innerHTML = EXPEDICOES.map(x =>
    `<div class="exp" data-exp="${x.id}"><div><b>${x.nome}</b>
      <small>${fmtTempo(x.t)} · ${x.gente} ${x.gente === 1 ? 'pessoa' : 'pessoas'} · risco ${Math.round(x.risco * 100)}% · traz ${Object.keys(x.loot).map(r => RECURSOS[r].nome.toLowerCase()).join(', ')}</small>
      <span class="barra"><i></i></span></div>
      <button type="button" class="button secondary" data-mandar="${x.id}">Mandar</button></div>`).join('');

  $('wipe').innerHTML = `<div class="panel-top"><h2>Wipe</h2><span class="muted" id="w-mem"></span></div>
    <p>Comece uma temporada nova do zero, mas com o que vocês aprenderam. Libera depois de segurar ${HORDAS_PRO_WIPE} hordas, e quanto mais hordas, mais memória (+10% em tudo por ponto).</p>
    <button type="button" class="button secondary" id="btn-wipe"></button>
    <p class="muted" id="w-info"></p>`;
  $('btn-wipe').onclick = e => wipe(e.currentTarget);

  $('temporada').textContent = 'Temporada ' + S.temporada;
  desenharDiario();
}

function desenhar() {
  const tx = taxas();
  for (const k in RECURSOS) {
    document.querySelector(`[data-r="${k}"]`).textContent = fmt(S.r[k]);
    const el = document.querySelector(`[data-tx="${k}"]`);
    el.textContent = fmtTaxa(tx[k]);
    el.className = tx[k] < 0 ? 'neg' : '';
  }
  $('v-pop').textContent = S.pop;
  $('v-vagas').textContent = `de ${vagas()} vagas`;

  const l = livres(), fora = naRua();
  $('livres').textContent = `${l} ${l === 1 ? 'livre' : 'livres'}${fora ? ` · ${fora} na rua` : ''}${comFome() ? ' · passando fome, produção pela metade' : ''}`;
  $('livres').classList.toggle('erro', comFome());
  for (const k in TRABALHOS) document.querySelector(`[data-jobn="${k}"]`).textContent = S.jobs[k];
  document.querySelectorAll('[data-job]').forEach(b => b.disabled = b.dataset.d > 0 ? l < 1 : S.jobs[b.dataset.job] < 1);

  const rc = $('btn-recrutar'), cr = custoRecruta();
  if (S.pop >= vagas()) { rc.innerHTML = 'Abrigo lotado: construa mais barracas'; rc.disabled = true; }
  else { rc.innerHTML = `Recrutar sobrevivente <small>${fmt(cr)} comida</small>`; rc.disabled = S.r.comida < cr; }

  for (const k in OBRAS) {
    const b = document.querySelector(`[data-obra="${k}"]`), ok = temReq(OBRAS[k].req), c = custoObra(k);
    document.querySelector(`[data-nivel="${k}"]`).textContent = S.b[k] ? 'nível ' + S.b[k] : '';
    document.querySelector(`[data-custo="${k}"]`).innerHTML = ok ? fmtCusto(c)
      : '<span class="req">Precisa de ' + Object.entries(OBRAS[k].req).map(([r, n]) => `${OBRAS[r].nome} ${n}`).join(' e ') + '</span>';
    b.disabled = !ok || !pode(c);
  }

  for (const x of EXPEDICOES) {
    const card = document.querySelector(`[data-exp="${x.id}"]`), btn = card.querySelector('button'), e = S.exp[x.id];
    const travada = S.b.oficina < 1 || !temReq(x.req);
    card.classList.toggle('travada', travada);
    card.querySelector('.barra i').style.width = e ? `${100 - Math.max(0, (e.fim - Date.now()) / (x.t * 10))}%` : '0';
    if (e) { btn.textContent = fmtTempo((e.fim - Date.now()) / 1000); btn.disabled = true; }
    else if (travada) { btn.textContent = S.b.oficina < 1 ? 'Precisa de Oficina' : `Precisa de Rádio ${x.req.radio}`; btn.disabled = true; }
    else { btn.textContent = 'Mandar'; btn.disabled = l < x.gente; }
  }

  const forca = forcaHorda(S.horda.n), def = defesa(), segura = def >= forca;
  $('horda').className = 'horda-bar ' + (segura ? 'segura' : 'perigo');
  $('horda').innerHTML = `<span class="h-ico">${svg(ICO.caveira)}</span>
    <div><span class="eyebrow">Horda ${S.horda.n + 1} chega em</span><strong>${fmtTempo(S.horda.t)}</strong></div>
    <div><span class="eyebrow">Força da horda</span><strong>${forca}</strong></div>
    <div><span class="eyebrow">${svg(ICO.escudo)} Sua defesa</span><strong>${def}</strong></div>
    <p>${segura ? 'O muro segura essa.' : 'Não segura! Bote guardas ou suba o muro.'}</p>`;

  const pts = pontosWipe(), falta = HORDAS_PRO_WIPE - S.horda.vitorias, bw = $('btn-wipe');
  $('w-mem').textContent = `Memória ${S.mem} · +${S.mem * 10}% em tudo`;
  $('w-info').textContent = `Hordas seguradas nesta temporada: ${S.horda.vitorias} · recorde: ${S.recorde}`;
  bw.disabled = falta > 0;
  bw.className = 'button ' + (falta > 0 ? 'secondary' : 'primary');
  bw.textContent = falta > 0 ? `Faltam ${falta} ${falta === 1 ? 'horda segurada' : 'hordas seguradas'}`
    : wipeArmado && Date.now() - wipeArmado < 4000 ? 'Clique de novo pra confirmar o wipe' : `Dar wipe e ganhar +${pts} de memória`;
}

function desenharDiario() {
  const ul = $('diario');
  if (!ul) return;
  if (!S.log.length) { ul.innerHTML = '<li class="muted">Dia 1. Você chegou sozinho num prédio vazio perto da prefeitura. Vasculhe os arredores e bote você mesmo como catador antes que a comida acabe.</li>'; return; }
  ul.innerHTML = S.log.slice(0, 15).map(e =>
    `<li class="${e.tipo}"><time>${new Date(e.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time> ${esc(e.txt)}</li>`).join('');
}

function flash(tipo) {
  const h = $('horda');
  h.classList.remove('flash-bom', 'flash-ruim'); void h.offsetWidth; h.classList.add('flash-' + tipo);
}

function mostrarAusencia(seg, antes, resumo) {
  const itens = [];
  for (const k in RECURSOS) {
    const d = S.r[k] - antes[k];
    if (Math.abs(d) >= 1) itens.push(`<li>${d >= 0 ? '+' : ''}${fmt(d)} ${RECURSOS[k].nome.toLowerCase()}</li>`);
  }
  if (resumo.exps.length) itens.push(`<li>${resumo.exps.length} ${resumo.exps.length === 1 ? 'equipe voltou' : 'equipes voltaram'}</li>`);
  if (resumo.chegaram) itens.push(`<li>+${resumo.chegaram} ${resumo.chegaram === 1 ? 'sobrevivente chegou' : 'sobreviventes chegaram'} pelo rádio</li>`);
  if (resumo.perdidos) itens.push(`<li>${resumo.perdidos} não ${resumo.perdidos === 1 ? 'voltou' : 'voltaram'} da rua</li>`);
  if (!itens.length) return;
  const h = Math.floor(seg / 3600), m = Math.floor(seg % 3600 / 60);
  $('ausente-t').textContent = `Você ficou ${h ? h + 'h ' : ''}${m}min fora.`;
  $('ausente-lista').innerHTML = itens.join('') + (seg >= OFFLINE_MAX ? '<li class="muted">O abrigo guarda no máximo 8 horas de produção.</li>' : '') + '<li class="muted">Sem você olhando o pessoal rende metade, mas as hordas também não vêm.</li>';
  $('ausente').hidden = false;
  $('btn-ausente').focus();
}

// progresso de quem estava fora (ou de uma aba em segundo plano)
function recuperar(seg) {
  seg = Math.min(seg, OFFLINE_MAX);
  if (seg < 30) { avancar(seg, false); return; }
  const antes = { ...S.r }, resumo = { loot: {}, exps: [] };
  // em pedaços pra fome, rádio e expedições baterem certo
  const passo = Math.max(10, seg / 500);
  for (let t = 0; t < seg; t += passo) avancar(Math.min(passo, seg - t), true, resumo);
  if (seg > 60) mostrarAusencia(seg, antes, resumo);
}

// ---------- ligações ----------
$('btn-vasculhar').onclick = vasculhar;
$('btn-recrutar').onclick = recrutar;
$('jobs').onclick = e => { const b = e.target.closest('[data-job]'); if (b) mudarTrabalho(b.dataset.job, +b.dataset.d); };
$('obras').onclick = e => { const b = e.target.closest('[data-obra]'); if (b) construir(b.dataset.obra); };
$('exps').onclick = e => { const b = e.target.closest('[data-mandar]'); if (b) mandar(b.dataset.mandar); };
$('btn-ausente').onclick = () => { $('ausente').hidden = true; };
$('ausente').onclick = e => { if (e.target.id === 'ausente') $('ausente').hidden = true; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('ausente').hidden = true; });

$('btn-exportar').onclick = () => {
  salvar();
  $('save-txt').value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  $('save-txt').select();
  $('save-msg').textContent = 'Código gerado. Copie e guarde.';
};
$('btn-importar').onclick = () => {
  try {
    const o = normalizar(JSON.parse(decodeURIComponent(escape(atob($('save-txt').value.trim())))));
    if (!o) throw 0;
    S = o; S.ultimo = Date.now();
    montar(); desenhar(); salvar();
    $('save-msg').textContent = 'Save carregado.';
  } catch { $('save-msg').textContent = 'Esse código não é um save válido.'; }
};
let zerarArmado = 0;
$('btn-zerar').onclick = e => {
  if (Date.now() - zerarArmado > 4000) { zerarArmado = Date.now(); e.currentTarget.textContent = 'Clique de novo pra apagar'; return; }
  S = novoEstado(); montar(); desenhar(); salvar();
  e.currentTarget.textContent = 'Apagar tudo';
  $('save-msg').textContent = 'Progresso apagado. Bem-vindo de volta ao dia 1.';
};

// ---------- relógio ----------
let ultimoTick = Date.now();
montar();
recuperar((Date.now() - S.ultimo) / 1000);
desenhar();

setInterval(() => {
  const agora = Date.now(), dt = (agora - ultimoTick) / 1000;
  ultimoTick = agora;
  if (dt > 30) recuperar(dt); else avancar(dt, false);
  desenhar();
}, 250);
setInterval(salvar, 5000);
addEventListener('pagehide', salvar);
document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });
})();
