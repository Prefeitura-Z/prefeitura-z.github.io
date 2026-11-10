// Abrigo Z: idle de batalha da Prefeitura Z. Roda só no navegador e salva no localStorage.
// Separado do servidor de propósito: nada daqui vira item, vantagem ou PRZcoin no jogo.
// As áreas e criaturas são inspiradas nos mapas e mods do servidor, mas toda a arte é desenhada aqui no canvas.
(() => {
'use strict';

// ---------- balanceamento ----------
const CHAVE = 'przAbrigo.v2';
const OFFLINE_MAX = 8 * 3600;   // segundos de progresso com a página fechada, no máximo
const OFFLINE_EF = 0.5;         // com a página fechada rende metade
const ABATES_PRO_CHEFE = 10;
const TEMPO_CHEFE = 30;         // segundos pra derrubar o chefe (+5 por nível de enfermaria)
const ATAQUE_HEROI = 1.0;       // segundos entre golpes automáticos
const ATAQUE_EQUIPE = 1.5;

const RECURSOS = {
  comida:  { nome: 'Comida',  cor: '#b5ca92', ico: '<path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5m3-5v5m-3 3h3M17 3c-2 2-2 6 0 9v9"/>' },
  madeira: { nome: 'Madeira', cor: '#d3a46c', ico: '<path d="M3 17 17 3l4 4L7 21H3v-4Zm11-11 4 4"/>' },
  sucata:  { nome: 'Sucata',  cor: '#aab4b8', ico: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/>' },
  remedio: { nome: 'Remédio', cor: '#e88a80', ico: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>' },
};
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO_GENTE = '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>';

// os mapas do servidor, na ordem em que a coisa vai ficando feia
const ZONAS = [
  { nome: 'Muldraugh',          cena: 'abrigo',  ceu: ['#3b3a2c', '#1a1d16'], chao: '#262b1f', chefe: 'Zé do Posto',        chefeTipo: 'mecanico',
    zumbis: ['andarilho'], loot: { comida: [2, 4], madeira: [1, 3], sucata: [1, 2] } },
  { nome: 'Falcon Ridge',       cena: 'mata',    ceu: ['#2c3a30', '#141a15'], chao: '#1f2a1c', chefe: 'Lenhador Podre',     chefeTipo: 'lenhador',
    zumbis: ['andarilho', 'lenhador', 'cacador'], loot: { madeira: [6, 10], comida: [2, 4], sucata: [1, 2] } },
  { nome: 'Constown',           cena: 'casas',   ceu: ['#4a3a32', '#1c1816'], chao: '#2a2722', chefe: 'Xerife de Constown', chefeTipo: 'policial',
    zumbis: ['andarilho', 'bombeiro', 'policial'], loot: { comida: [10, 18], sucata: [4, 7] } },
  { nome: 'New Hartburg',       cena: 'lojas',   ceu: ['#33343c', '#15161a'], chao: '#25262a', chefe: 'Gordão do Guincho',  chefeTipo: 'gordao',
    zumbis: ['medico', 'mecanico', 'gordao'], loot: { sucata: [18, 30], comida: [12, 20], remedio: [1, 2] } },
  { nome: 'Big Bear Lake',      cena: 'lago',    ceu: ['#2e3a40', '#12181a'], chao: '#22281f', chefe: 'Mutante do Lago',    chefeTipo: 'mutante',
    zumbis: ['andarilho', 'corredor', 'cacador', 'mutante'], loot: { comida: [40, 60], madeira: [30, 45], sucata: [20, 30] } },
  { nome: 'Atlas Underground',  cena: 'lab',     ceu: ['#1a201c', '#0c0e0d'], chao: '#1c201d', chefe: 'Experimento Ômega-0', chefeTipo: 'omega',
    zumbis: ['cientista', 'omega', 'militar'], loot: { remedio: [3, 6], sucata: [70, 110], comida: [30, 45] } },
  { nome: 'Sector-7 Breach',    cena: 'militar', ceu: ['#38402c', '#171a12'], chao: '#272c1c', chefe: 'Tanque Mutante',     chefeTipo: 'tanque',
    zumbis: ['militar', 'predador', 'corredor', 'mutante'], loot: { sucata: [260, 380], remedio: [4, 8], madeira: [90, 140] } },
  { nome: 'Brink',              cena: 'nevoa',   ceu: ['#4a2c26', '#170f0e'], chao: '#24221f', chefe: 'Carrasco da Névoa',  chefeTipo: 'carrasco',
    zumbis: ['predador', 'omega', 'enfermeira', 'militar'], loot: { comida: [500, 750], madeira: [400, 600], sucata: [700, 1000], remedio: [8, 14] } },
];

const TIPOS = {
  andarilho:  { nome: 'Andarilho',   camisa: '#5d5248', calca: '#3a3a44', pele: '#8d9c7a' },
  lenhador:   { nome: 'Lenhador',    camisa: '#8a3a30', calca: '#3c4a5c', pele: '#8a9a72', xadrez: true },
  cacador:    { nome: 'Caçador',     camisa: '#b8622a', calca: '#4a4a3a', pele: '#8a9a72', chapeu: '#b8622a' },
  bombeiro:   { nome: 'Bombeiro',    camisa: '#8a7a30', calca: '#5a5020', pele: '#90a07c', chapeu: '#a83a28', hp: 1.15 },
  policial:   { nome: 'Policial',    camisa: '#2e3d5c', calca: '#22283a', pele: '#889878', chapeu: '#1a2030' },
  mecanico:   { nome: 'Mecânico',    camisa: '#3e5068', calca: '#3e5068', pele: '#8a9a76' },
  gordao:     { nome: 'Gordão',      camisa: '#6a6a60', calca: '#3a3a40', pele: '#94a080', largo: 1.5, hp: 1.7 },
  medico:     { nome: 'Médico',      camisa: '#c8ccc0', calca: '#5a7a80', pele: '#8c9c7c' },
  cientista:  { nome: 'Cientista',   camisa: '#d8dcd4', calca: '#3a3e44', pele: '#9aa48c', hp: 0.9 },
  militar:    { nome: 'Militar',     camisa: '#4a5a38', calca: '#3e4a30', pele: '#86967a', chapeu: '#3e4a30', hp: 1.3 },
  corredor:   { nome: 'Corredor',    camisa: '#7a3a5a', calca: '#2a2a30', pele: '#90a080', magro: true, hp: 0.75 },
  enfermeira: { nome: 'Enfermeira',  camisa: '#b8a8a0', calca: '#b8a8a0', pele: '#c8b8a8', magro: true, hp: 1.2, sem: true },
  mutante:    { nome: 'Mutante',     camisa: '#4a3a30', calca: '#2e2a26', pele: '#7a9a5a', largo: 1.35, hp: 1.6, forma: 'mutante' },
  omega:      { nome: 'Experimento Ômega', camisa: '#9aa8a0', calca: '#9aa8a0', pele: '#c8d0c4', hp: 1.5, forma: 'omega' },
  predador:   { nome: 'Predador Blackout', camisa: '#14161a', calca: '#14161a', pele: '#1c1f24', magro: true, hp: 1.7, forma: 'predador', olho: '#7af0ff' },
  tanque:     { nome: 'Tanque',      camisa: '#5a6a48', calca: '#33362c', pele: '#7a8a6a', largo: 2.1, forma: 'mutante' },
  carrasco:   { nome: 'Carrasco',    camisa: '#5a3a2a', calca: '#2a2420', pele: '#8a7a6a', largo: 1.3, forma: 'carrasco' },
};

const ARMAS = ['Cano de ferro', 'Taco de beisebol', 'Taco com prego', 'Machado', 'Facão', 'Marreta', 'Machado de bombeiro', 'Machado de bombeiro afiado'];

const MELHORIAS = {
  arma:       { nome: 'Arma',       desc: '+50% de dano',                custo: { sucata: 6 },                fator: 1.62 },
  mochila:    { nome: 'Mochila',    desc: '+15% de loot',                custo: { madeira: 12 },              fator: 1.5 },
  treino:     { nome: 'Treino',     desc: '+25% de dano da equipe',      custo: { comida: 25, madeira: 10 },  fator: 1.55 },
  barraca:    { nome: 'Barraca',    desc: '+1 vaga na equipe',           custo: { madeira: 20 },              fator: 1.6 },
  horta:      { nome: 'Horta',      desc: '+0,3 comida/s parado',        custo: { madeira: 30, sucata: 10 },  fator: 1.5 },
  oficina:    { nome: 'Oficina',    desc: '+0,15 sucata/s parado',       custo: { madeira: 40, sucata: 30 },  fator: 1.6 },
  enfermaria: { nome: 'Enfermaria', desc: '+5s pra derrubar chefe',      custo: { sucata: 60, remedio: 2 },   fator: 1.7 },
};

// ---------- estado ----------
const novoEstado = (mem = 0, temporada = 1, recorde = 0) => ({
  v: 2,
  r: { comida: 0, madeira: 0, sucata: 0, remedio: 0 },
  zona: 0, abates: {}, chefes: {},
  equipe: 0,
  up: Object.fromEntries(Object.keys(MELHORIAS).map(k => [k, 0])),
  xp: 0, nivel: 1,
  totalAbates: 0,
  mem, temporada, recorde,
  log: [],
  ultimo: Date.now(),
});

let S = null; // carregado depois que as regras existem

function carregar() {
  try { const t = localStorage.getItem(CHAVE); return t ? normalizar(JSON.parse(t)) : null; } catch { return null; }
}
function normalizar(o) {
  if (!o || o.v !== 2) return null;
  const b = novoEstado();
  const s = { ...b, ...o, r: { ...b.r, ...o.r }, up: { ...b.up, ...o.up }, abates: o.abates || {}, chefes: o.chefes || {},
    log: Array.isArray(o.log) ? o.log.slice(0, 40) : [] };
  s.zona = Math.max(0, Math.min(ZONAS.length - 1, s.zona | 0));
  if (!liberada(s.zona, s)) s.zona = 0;
  return s;
}
function salvar() {
  S.ultimo = Date.now();
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch {}
}

// ---------- regras ----------
const memMult = () => 1 + 0.1 * S.mem;
const liberada = (i, s = S) => i === 0 || !!s.chefes[i - 1];
const dano = () => 2 * Math.pow(1.5, S.up.arma) * (1 + 0.05 * (S.nivel - 1)) * memMult();
const danoEquipe = () => dano() * 0.25 * (1 + 0.25 * S.up.treino);
const dps = () => dano() / ATAQUE_HEROI + S.equipe * danoEquipe() / ATAQUE_EQUIPE;
const vidaZona = i => 10 * Math.pow(2.6, i);
const vagas = () => 1 + S.up.barraca;
const custoUp = k => Object.fromEntries(Object.entries(MELHORIAS[k].custo).map(([r, c]) => [r, Math.ceil(c * Math.pow(MELHORIAS[k].fator, S.up[k]))]));
const custoRecruta = () => Math.ceil(15 * Math.pow(1.55, S.equipe));
const pode = c => Object.entries(c).every(([r, q]) => S.r[r] >= q);
const pagar = c => { for (const [r, q] of Object.entries(c)) S.r[r] -= q; };
const xpProximo = () => Math.round(10 * Math.pow(S.nivel, 1.5));
const xpAbate = i => Math.round(2 * Math.pow(1.6, i));
const lootMult = () => (1 + 0.15 * S.up.mochila) * memMult();
const tempoChefe = () => TEMPO_CHEFE + 5 * S.up.enfermaria;
const armaTier = () => Math.min(ARMAS.length - 1, Math.floor(S.up.arma / 2));
const pontosWipe = () => 2 + Math.floor(S.totalAbates / 300);
const passivo = () => ({ comida: 0.3 * S.up.horta * memMult(), sucata: 0.15 * S.up.oficina * memMult() });

S = carregar() || novoEstado();

function ganharXp(q) {
  S.xp += q;
  while (S.xp >= xpProximo()) {
    S.xp -= xpProximo(); S.nivel++;
    diario(`Você subiu pro nível ${S.nivel}. Bate 5% mais forte.`, 'bom');
  }
}

function diario(txt, tipo = '') {
  S.log.unshift({ t: Date.now(), txt, tipo });
  S.log.length = Math.min(S.log.length, 40);
  desenharDiario();
}

// ---------- arena (estado só de tela) ----------
const cv = document.getElementById('cena'), ctx = cv.getContext('2d');
const W = 800, H = 360, CHAO = 300, X_HEROI = 300, X_INIMIGO = 510;
const A = {
  inimigo: null, espera: 0.6,
  heroiT: 0.3, golpe: 0, equipeT: [], equipeGolpe: [],
  textos: [], pedacos: [],
  chefe: null,
  tempo: 0, tremor: 0,
};

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const sortear = ([a, b]) => a + Math.random() * (b - a);

function novoInimigo() {
  const z = ZONAS[S.zona];
  if (A.chefe) {
    const max = vidaZona(S.zona) * 15;
    A.inimigo = { tipo: z.chefeTipo, chefe: true, nome: z.chefe, hp: max, max, x: 900, estado: 'entrando', t: 0, morte: 0 };
    return;
  }
  const tipo = z.zumbis[Math.floor(Math.random() * z.zumbis.length)], T = TIPOS[tipo];
  const max = vidaZona(S.zona) * (T.hp || 1) * (0.9 + Math.random() * 0.2);
  A.inimigo = { tipo, nome: T.nome, hp: max, max, x: 880, estado: 'entrando', t: 0, morte: 0 };
}

function bater(q, cor = '#f1eee5', grande = false) {
  const e = A.inimigo;
  if (!e || e.estado !== 'luta') return;
  e.hp -= q; e.t = 0.12;
  A.textos.push({ x: e.x + (Math.random() * 30 - 15), y: CHAO - (e.chefe ? 105 : 75), txt: fmt(q), cor, t: 0, tam: grande ? 22 : 15 });
  if (e.hp <= 0) matar();
}

function matar() {
  const e = A.inimigo, z = ZONAS[S.zona];
  e.estado = 'morrendo'; e.morte = 0; e.hp = 0;
  const m = lootMult() * (e.chefe ? 12 : 1);
  let dy = 0;
  for (const [r, faixa] of Object.entries(z.loot)) {
    if (r === 'remedio' && !e.chefe && Math.random() > 0.45) continue;
    const q = Math.max(1, Math.round(sortear(faixa) * m));
    S.r[r] += q;
    A.textos.push({ x: e.x, y: CHAO - 40 - dy, txt: `+${fmt(q)} ${RECURSOS[r].nome.toLowerCase()}`, cor: RECURSOS[r].cor, t: 0, tam: 13, sobe: true });
    dy += 18;
  }
  const sangue = TIPOS[e.tipo]?.forma === 'omega' ? '#7ad06a' : TIPOS[e.tipo]?.forma === 'predador' ? '#3a6a7a' : '#6a2a22';
  for (let i = 0; i < 10; i++) A.pedacos.push({ x: e.x, y: CHAO - 50, vx: Math.random() * 160 - 40, vy: -Math.random() * 180 - 40, t: 0, cor: i % 3 ? '#4a5a3a' : sangue });
  ganharXp(xpAbate(S.zona) * (e.chefe ? 10 : 1));
  S.totalAbates++;
  if (e.chefe) {
    const primeira = !S.chefes[S.zona];
    S.chefes[S.zona] = true; A.chefe = null;
    S.recorde = Math.max(S.recorde, S.zona + 1);
    A.tremor = 0.5;
    if (S.zona === ZONAS.length - 1) diario(`Você derrubou ${e.nome}! Não sobrou nada de pé. Dá pra dar wipe e começar outra temporada mais forte.`, 'bom');
    else diario(`Você derrubou ${e.nome}!${primeira ? ` ${ZONAS[S.zona + 1].nome} liberada.` : ''}`, 'bom');
  } else {
    S.abates[S.zona] = (S.abates[S.zona] || 0) + 1;
    if (S.abates[S.zona] === ABATES_PRO_CHEFE && !S.chefes[S.zona]) diario(`${z.chefe} apareceu em ${z.nome}. Enfrente quando quiser.`);
  }
}

function atualizar(dt) {
  A.tempo += dt;
  const p = passivo();
  for (const r in p) S.r[r] += p[r] * dt;

  const e = A.inimigo;
  if (!e) { A.espera -= dt; if (A.espera <= 0) novoInimigo(); }
  else if (e.estado === 'entrando') {
    const T = TIPOS[e.tipo] || {};
    const vel = T.magro ? 340 : T.largo > 1.6 ? 170 : 240;
    e.x = Math.max(X_INIMIGO, e.x - vel * dt);
    if (e.x <= X_INIMIGO) { e.estado = 'luta'; if (e.chefe) A.tremor = 0.3; }
  } else if (e.estado === 'luta') {
    e.t = Math.max(0, e.t - dt);
    A.heroiT -= dt;
    if (A.heroiT <= 0) { A.heroiT += ATAQUE_HEROI; A.golpe = 0.22; bater(dano(), '#f1eee5'); }
    while (A.equipeT.length < S.equipe) { A.equipeT.push(Math.random() * ATAQUE_EQUIPE); A.equipeGolpe.push(0); }
    for (let i = 0; i < S.equipe; i++) {
      A.equipeT[i] -= dt;
      if (A.equipeT[i] <= 0) { A.equipeT[i] += ATAQUE_EQUIPE; A.equipeGolpe[i] = 0.2; bater(danoEquipe(), '#efa360'); }
    }
  } else if (e.estado === 'morrendo') {
    e.morte += dt;
    if (e.morte > 0.8) { A.inimigo = null; A.espera = A.chefe ? 0.8 : 0.35; }
  }

  if (A.chefe) {
    A.chefe.tempo -= dt;
    if (A.chefe.tempo <= 0 && A.inimigo && A.inimigo.chefe && A.inimigo.estado !== 'morrendo') {
      diario(`${ZONAS[S.zona].chefe} aguentou e sumiu. Fica mais forte e tenta de novo.`, 'ruim');
      A.chefe = null; A.inimigo = null; A.espera = 0.6;
    }
  }

  A.golpe = Math.max(0, A.golpe - dt);
  A.equipeGolpe = A.equipeGolpe.map(g => Math.max(0, g - dt));
  A.tremor = Math.max(0, A.tremor - dt);
  for (const t of A.textos) { t.t += dt; t.y -= (t.sobe ? 34 : 50) * dt; }
  A.textos = A.textos.filter(t => t.t < 1.1);
  for (const q of A.pedacos) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 520 * dt; if (q.y > CHAO) { q.y = CHAO; q.vx *= 0.5; q.vy = 0; } }
  A.pedacos = A.pedacos.filter(q => q.t < 1.4);
}

// ---------- desenho ----------
let dpr = 1, VX = 0, VW = W;   // no celular a câmera fecha no meio da cena
const fundos = {};
function ajustarTela() {
  const novoDpr = Math.min(2, window.devicePixelRatio || 1);
  const estreito = (cv.parentElement.clientWidth || W) < 600;
  const nVX = estreito ? 150 : 0, nVW = estreito ? 520 : W;
  if (novoDpr === dpr && nVX === VX && cv.width === VW * dpr) return;
  dpr = novoDpr; VX = nVX; VW = nVW;
  cv.width = VW * dpr; cv.height = H * dpr;
  cv.style.aspectRatio = `${VW} / ${H}`;
  for (const k in fundos) delete fundos[k];
}

function fundo(i) {
  if (fundos[i]) return fundos[i];
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const z = ZONAS[i], r = rng(1234 + i * 977), cena = z.cena;
  const ceu = g.createLinearGradient(0, 0, 0, CHAO);
  ceu.addColorStop(0, z.ceu[1]); ceu.addColorStop(1, z.ceu[0]);
  g.fillStyle = ceu; g.fillRect(0, 0, W, CHAO);
  if (cena !== 'lab') {
    g.fillStyle = '#ffffff10'; g.beginPath(); g.arc(640, 70, 34, 0, 7); g.fill();
    g.fillStyle = '#ffffff08'; g.beginPath(); g.arc(640, 70, 60, 0, 7); g.fill();
  }
  const sil = (cor, f) => { g.fillStyle = cor; f(); };
  const longe = '#00000035', perto = '#0000005a';
  const pinheiros = (n, cor) => {
    for (let k = 0; k < n; k++) {
      const x = r() * W, h = 70 + r() * 110, base = CHAO - 10 + r() * 6;
      sil(cor || (k % 2 ? longe : perto), () => { g.beginPath(); g.moveTo(x - h * 0.28, base); g.lineTo(x, base - h); g.lineTo(x + h * 0.28, base); g.fill(); });
    }
  };
  const predios = (cor, janelaQuente) => {
    for (let k = 0; k < 9; k++) {
      const x = k * 92 + r() * 20, w = 70 + r() * 20, h = 130 + r() * 130;
      sil(cor, () => g.fillRect(x, CHAO - h, w, h));
      for (let wy = CHAO - h + 12; wy < CHAO - 20; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) {
        g.fillStyle = r() > 0.92 ? janelaQuente : '#ffffff08'; g.fillRect(wx, wy, 8, 10);
      }
    }
  };
  const carros = cor => {
    for (let k = 0; k < 7; k++) {
      const x = r() * W, w = 70 + r() * 30, y = CHAO - 6;
      sil(cor, () => { g.beginPath(); g.roundRect(x, y - 22, w, 22, 5); g.fill(); g.beginPath(); g.roundRect(x + w * 0.2, y - 38, w * 0.55, 18, 5); g.fill(); });
      g.fillStyle = '#00000080'; g.beginPath(); g.arc(x + 16, y, 8, 0, 7); g.arc(x + w - 16, y, 8, 0, 7); g.fill();
    }
  };

  if (cena === 'abrigo') {
    pinheiros(10);
    sil('#0000006a', () => { g.fillRect(40, 170, 200, CHAO - 170); g.beginPath(); g.moveTo(30, 172); g.lineTo(140, 128); g.lineTo(250, 172); g.fill(); });
    g.fillStyle = '#efa36030'; g.fillRect(84, 200, 26, 22); g.fillRect(170, 200, 26, 22);
    sil('#0000005a', () => { g.fillRect(470, 190, 160, 14); g.fillRect(480, 204, 8, CHAO - 204); g.fillRect(612, 204, 8, CHAO - 204); });
    g.fillStyle = '#d7c2a240'; g.font = '600 11px "IBM Plex Mono", monospace'; g.fillText('POSTO', 528, 201);
    g.strokeStyle = '#00000060'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 12) { g.beginPath(); g.moveTo(x, CHAO - 46); g.lineTo(x + 12, CHAO - 34); g.moveTo(x + 12, CHAO - 46); g.lineTo(x, CHAO - 34); g.stroke(); }
    g.fillStyle = '#00000060'; for (let x = 0; x < W; x += 60) g.fillRect(x, CHAO - 50, 3, 50);
  }
  if (cena === 'mata') pinheiros(30);
  if (cena === 'casas') {
    for (let k = 0; k < 6; k++) {
      const x = k * 140 + r() * 30, w = 100 + r() * 20, h = 60 + r() * 30, b = CHAO - 4;
      sil(perto, () => { g.fillRect(x, b - h, w, h); g.beginPath(); g.moveTo(x - 8, b - h); g.lineTo(x + w / 2, b - h - 38); g.lineTo(x + w + 8, b - h); g.fill(); });
      g.fillStyle = r() > 0.6 ? '#efa36028' : '#ffffff0a'; g.fillRect(x + 16, b - h + 18, 18, 16); g.fillRect(x + w - 34, b - h + 18, 18, 16);
      g.fillStyle = '#ffffff10'; for (let px = x; px < x + w; px += 9) g.fillRect(px, b - 18, 3, 18);
    }
    g.fillStyle = '#3a5a8a40'; g.fillRect(690, CHAO - 120, 70, 14);
  }
  if (cena === 'lojas') {
    for (let k = 0; k < 5; k++) {
      const x = k * 170, h = 120 + r() * 40;
      sil(perto, () => g.fillRect(x + 4, CHAO - h, 160, h));
      g.fillStyle = ['#7a3a3060', '#3a5a6a60', '#5a6a3a60'][k % 3];
      g.beginPath(); g.moveTo(x + 10, CHAO - 74); g.lineTo(x + 158, CHAO - 74); g.lineTo(x + 168, CHAO - 58); g.lineTo(x, CHAO - 58); g.fill();
      g.fillStyle = '#ffffff0c'; g.fillRect(x + 20, CHAO - 52, 120, 40);
    }
    g.fillStyle = '#5ab07a70'; g.fillRect(372, CHAO - 136, 8, 24); g.fillRect(364, CHAO - 128, 24, 8);
    carros('#0000004a');
  }
  if (cena === 'lago') {
    pinheiros(14, longe);
    g.fillStyle = '#2a3e4a'; g.fillRect(0, CHAO - 70, W, 62);
    for (let k = 0; k < 40; k++) { g.fillStyle = '#ffffff12'; g.fillRect(r() * W, CHAO - 66 + r() * 54, 10 + r() * 30, 1.5); }
    g.fillStyle = '#ffffff18'; g.fillRect(620, CHAO - 66, 40, 2); g.fillRect(610, CHAO - 56, 60, 2);
    for (let k = 0; k < 3; k++) sil('#00000070', () => { const x = 60 + k * 230; g.fillRect(x, CHAO - 110, 80, 50); g.beginPath(); g.moveTo(x - 8, CHAO - 110); g.lineTo(x + 40, CHAO - 140); g.lineTo(x + 88, CHAO - 110); g.fill(); });
    sil('#3a2a1e', () => g.fillRect(420, CHAO - 74, 120, 6));
  }
  if (cena === 'lab') {
    g.fillStyle = '#151a17'; g.fillRect(0, 0, W, CHAO);
    for (let x = 0; x < W; x += 100) { g.fillStyle = '#00000060'; g.fillRect(x, 0, 6, CHAO); }
    for (const y of [40, 62, 90]) { g.fillStyle = '#2a312c'; g.fillRect(0, y, W, 8); g.fillStyle = '#ffffff08'; g.fillRect(0, y, W, 2); }
    for (let x = 50; x < W; x += 200) { g.fillStyle = '#7ad06a30'; g.beginPath(); g.arc(x, 130, 30, 0, 7); g.fill(); g.fillStyle = '#7ad06a'; g.fillRect(x - 10, 126, 20, 6); }
    for (let k = 0; k < 4; k++) {
      const x = 80 + k * 190;
      g.fillStyle = '#7ad06a18'; g.fillRect(x, CHAO - 150, 50, 130);
      g.strokeStyle = '#9ab0a060'; g.lineWidth = 2; g.strokeRect(x, CHAO - 150, 50, 130);
      g.fillStyle = '#00000050'; g.fillRect(x + 18, CHAO - 120, 14, 40);
    }
    g.fillStyle = '#d7c2a230'; g.font = '600 12px "IBM Plex Mono", monospace'; g.fillText('SETOR Ω · ACESSO RESTRITO', 300, 180);
  }
  if (cena === 'militar') {
    sil(perto, () => { g.fillRect(620, 90, 8, CHAO - 90); g.fillRect(690, 90, 8, CHAO - 90); g.fillRect(606, 70, 106, 30); });
    for (let k = 0; k < 3; k++) sil(longe, () => { g.beginPath(); g.moveTo(60 + k * 170, CHAO - 4); g.lineTo(120 + k * 170, CHAO - 64); g.lineTo(180 + k * 170, CHAO - 4); g.fill(); });
    g.strokeStyle = '#00000070'; g.lineWidth = 1.5;
    for (const y of [CHAO - 70, CHAO - 50, CHAO - 30]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#00000070'; for (let x = 0; x < W; x += 50) g.fillRect(x, CHAO - 76, 4, 76);
    g.fillStyle = '#c8a03a50'; g.font = '700 12px "IBM Plex Mono", monospace'; g.fillText('SECTOR-7 · QUARENTENA', 40, CHAO - 84);
    g.fillStyle = '#6a6040'; for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse(560 + (k % 4) * 26, CHAO - 6 - Math.floor(k / 4) * 12, 14, 7, 0, 0, 7); g.fill(); }
  }
  if (cena === 'nevoa') {
    predios('#00000045', '#e0453a30');
    carros('#00000050');
  }
  // chão
  g.fillStyle = z.chao; g.fillRect(0, CHAO - 8, W, H - CHAO + 8);
  g.fillStyle = '#00000030'; g.fillRect(0, CHAO - 8, W, 3);
  for (let k = 0; k < 140; k++) { g.fillStyle = r() > 0.5 ? '#ffffff07' : '#00000022'; g.fillRect(r() * W, CHAO + r() * (H - CHAO), 2 + r() * 10, 2); }
  if (cena === 'lab') { for (let x = 0; x < W; x += 40) { g.fillStyle = x % 80 ? '#c8a03a40' : '#00000040'; g.fillRect(x, CHAO + 40, 40, 6); } }
  else if (cena === 'mata' || cena === 'lago') for (let k = 0; k < 50; k++) { g.fillStyle = '#3a5a2a60'; g.fillRect(r() * W, CHAO - 10 + r() * 6, 2, 8); }
  else { g.fillStyle = '#ffffff0d'; for (let x = 0; x < W; x += 60) g.fillRect(x, CHAO + 32, 30, 3); }
  if (cena === 'nevoa') {
    const nv = g.createLinearGradient(0, 80, 0, H);
    nv.addColorStop(0, '#b8a8a000'); nv.addColorStop(0.6, '#b8a8a03a'); nv.addColorStop(1, '#b8a8a055');
    g.fillStyle = nv; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 90; k++) { g.fillStyle = '#d8d0c840'; g.fillRect(r() * W, r() * H, 2, 2); }
  }
  const v = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 480);
  v.addColorStop(0, '#00000000'); v.addColorStop(1, '#00000080');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return (fundos[i] = c);
}

// boneco desenhado em blocos. x,y = pés; dir 1 = olhando pra direita
function pessoa(o) {
  const u = 3.2 * (o.escala || 1), larg = o.largo || 1, magro = o.magro ? 0.8 : 1;
  const x = o.x, y = o.y, d = o.dir, forma = o.forma;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(x, y + 2, u * 5 * larg, u * 1.3, 0, 0, 7); ctx.fill();
  if (o.cair) { ctx.translate(x, y); ctx.rotate(o.cair * d * -1.45); ctx.translate(-x, -y); }
  const passo = Math.sin(o.passo || 0);
  const alto = forma === 'predador' ? 1.35 : 1;
  const tw = u * 5 * larg * magro, th = u * 6 * alto, lh = u * 5 * alto, hw = u * 4.4 * (forma === 'mutante' ? 0.8 : 1);
  const curva = forma === 'predador' ? u * 2.5 : 0;
  const topoT = y - lh - th + curva;
  // pernas
  ctx.fillStyle = o.calca;
  ctx.fillRect(x - tw / 2 + u * 0.4 + passo * u * 0.8, y - lh, u * 1.8 * magro * (larg > 1.5 ? 1.6 : 1), lh);
  ctx.fillRect(x + tw / 2 - u * 2.2 - passo * u * 0.8, y - lh, u * 1.8 * magro * (larg > 1.5 ? 1.6 : 1), lh);
  if (!o.sem) {
    ctx.fillStyle = '#1a1714';
    ctx.fillRect(x - tw / 2 + u * 0.2 + passo * u * 0.8, y - u * 0.9, u * 2.4, u * 0.9);
    ctx.fillRect(x + tw / 2 - u * 2.4 - passo * u * 0.8, y - u * 0.9, u * 2.4, u * 0.9);
  }
  if (o.mochila) { ctx.fillStyle = o.mochila; ctx.fillRect(x - d * tw / 2 - (d > 0 ? u * 2 : 0), topoT + u * 0.6, u * 2, th * 0.8); }
  if (forma === 'omega') { // tubos nas costas
    ctx.strokeStyle = '#7ad06a'; ctx.lineWidth = u * 0.6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - d * tw / 2, topoT + u * (1 + k * 1.6)); ctx.quadraticCurveTo(x - d * (tw / 2 + u * 3), topoT - u * 2 + k * u, x - d * (tw / 2 + u), topoT - u * 4); ctx.stroke(); }
  }
  // tronco
  ctx.fillStyle = o.camisa; ctx.fillRect(x - tw / 2, topoT, tw, th);
  if (o.xadrez) { ctx.fillStyle = '#00000030'; for (let k = 0; k < 3; k++) ctx.fillRect(x - tw / 2, topoT + k * u * 2, tw, u * 0.7); ctx.fillRect(x - u * 0.4, topoT, u * 0.8, th); }
  if (forma === 'mutante') { ctx.fillStyle = o.pele; ctx.fillRect(x - tw / 2 + u, topoT + u, tw * 0.35, th * 0.5); ctx.fillStyle = '#00000030'; ctx.fillRect(x - u * 0.3, topoT, u * 0.6, th); }
  if (forma === 'carrasco') { ctx.fillStyle = '#3a2418'; ctx.fillRect(x - tw / 2 + u, topoT + u * 2, tw - u * 2, th + lh * 0.6); }
  if (o.sujo) { ctx.fillStyle = forma === 'omega' ? '#7ad06a80' : '#5a1e1890'; ctx.fillRect(x - tw / 4, topoT + th * 0.4, u * 1.4, u * 1.6); ctx.fillRect(x + tw / 6, topoT + u, u, u); }
  // cabeça
  const hx = x - hw / 2 + d * u * (o.zumbi ? 0.8 : 0.3) + (forma === 'predador' ? d * u * 2 : 0), hy = topoT - hw + (o.zumbi ? u * 0.6 : 0);
  ctx.fillStyle = o.pele; ctx.fillRect(hx, hy, hw, hw);
  if (forma === 'carrasco') {
    // capacete de grade enferrujada, cobre a cabeça toda
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(hx - u * 1.2, hy - u * 2.4, hw + u * 2.4, hw + u * 2.6);
    ctx.fillStyle = '#4a2a18'; for (let k = 1; k < 4; k++) ctx.fillRect(hx - u * 1.2 + k * (hw + u * 2.4) / 4, hy - u * 2.4, u * 0.5, hw + u * 2.6);
    ctx.fillRect(hx - u * 1.2, hy + u * 0.6, hw + u * 2.4, u * 0.5);
  } else if (forma === 'predador') {
    ctx.fillStyle = '#0a0b0d'; ctx.fillRect(hx - u * 0.3, hy, hw + u * 0.6, u * 1.6);
  } else if (!o.sem) {
    ctx.fillStyle = o.cabelo || '#2a2420'; ctx.fillRect(hx, hy, hw, u * 1.1);
  }
  if (o.sem) { ctx.fillStyle = '#d8d0c8'; ctx.fillRect(hx - u * 0.2, hy - u * 0.8, hw + u * 0.4, u * 1.6); ctx.fillStyle = '#5a1e18'; ctx.fillRect(hx + u, hy + u * 1.5, hw - u * 2, u * 2); }
  if (o.chapeu && !forma) { ctx.fillStyle = o.chapeu; ctx.fillRect(hx - u * 0.4, hy - u * 0.8, hw + u * 0.8, u * 1.5); ctx.fillRect(hx + (d > 0 ? hw - u * 0.2 : -u * 1.2), hy + u * 0.3, u * 1.4, u * 0.6); }
  if (forma !== 'carrasco' && !o.sem) {
    const olhoX = hx + (d > 0 ? hw - u * 1.5 : u * 0.5);
    if (forma === 'predador' || o.brilho) { ctx.fillStyle = (o.olho || '#e0453a') + '55'; ctx.beginPath(); ctx.arc(olhoX + u * 0.45, hy + u * 2.1, u * 1.8, 0, 7); ctx.fill(); }
    ctx.fillStyle = o.olho || '#1a1a1a';
    ctx.fillRect(olhoX, hy + u * 1.7, u * 0.9, u * 0.9);
    if (forma === 'predador') ctx.fillRect(olhoX - d * u * 1.6, hy + u * 1.7, u * 0.9, u * 0.9);
  }
  if (o.zumbi && !forma && !o.sem) { ctx.fillStyle = '#3a1612'; ctx.fillRect(hx + (d > 0 ? hw - u * 2.2 : u * 0.6), hy + u * 3, u * 1.6, u * 0.6); }
  if (forma === 'omega') { ctx.fillStyle = '#7ad06a'; ctx.fillRect(hx + u * 0.6, hy + u * 0.4, u * 0.8, u * 0.8); }
  // braços
  ctx.fillStyle = o.camisa;
  const ombroY = topoT + u * 1.2;
  if (o.zumbi) {
    const bal = Math.sin((o.passo || 0) * 0.7) * u * 0.6;
    if (forma === 'predador') {
      // braços compridos com garras arrastando
      ctx.fillStyle = o.pele;
      ctx.fillRect(x + d * tw / 2 - (d < 0 ? u * 1.4 : 0), ombroY, u * 1.4, lh + th - u * 2);
      ctx.fillStyle = '#c8d0d8'; for (let k = 0; k < 3; k++) ctx.fillRect(x + d * (tw / 2 + k * u * 0.6) - (d < 0 ? u * 0.4 : 0), ombroY + lh + th - u * 2, u * 0.4, u * 1.8);
    } else if (forma === 'carrasco') {
      ctx.fillRect(x + d * tw / 2 - (d < 0 ? u * 4 : 0), ombroY + bal, u * 4, u * 1.6);
      ctx.fillStyle = '#6a6a68'; ctx.fillRect(x + d * (tw / 2 + u * 3) - (d < 0 ? u * 9 : 0), ombroY - u * 8 + bal, u * 9, u * 7);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x + d * (tw / 2 + u * 3) - (d < 0 ? u * 1 : 0), ombroY - u + bal, u, u * 4);
    } else {
      const grosso = forma === 'mutante' || forma === 'omega' ? 2.2 : 1.4;
      ctx.fillRect(x + d * tw / 2 - (d < 0 ? u * 5 : 0), ombroY + bal, u * 5, u * grosso);
      ctx.fillStyle = o.pele; ctx.fillRect(x + d * (tw / 2 + u * 5) - (d < 0 ? u * 1.6 : 0), ombroY + bal, u * 1.6, u * grosso);
    }
  } else {
    const ang = (o.golpe ? -1.9 + (1 - o.golpe / 0.22) * 2.6 : -0.5) * d;
    ctx.save();
    ctx.translate(x + d * tw * 0.3, ombroY + u * 0.5);
    ctx.rotate(ang + (d > 0 ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillRect(-u * 0.75, 0, u * 1.5, u * 4.5);
    ctx.fillStyle = o.pele; ctx.fillRect(-u * 0.75, u * 4.5, u * 1.5, u * 1.3);
    if (o.arma != null) desenharArma(o.arma, u);
    ctx.restore();
  }
  ctx.restore();
}

function desenharArma(t, u) {
  // sai da mão (0, u*5) pra frente (+y)
  const mao = u * 5.1;
  const cabo = t === 0 ? '#7a7f84' : '#6b4a2c';
  const comp = [u * 9, u * 9, u * 9, u * 8, u * 6, u * 9, u * 9.5, u * 9.5][t];
  ctx.fillStyle = cabo; ctx.fillRect(-u * 0.5, mao - u, u * (t === 1 || t === 2 ? 1.2 : 1), comp);
  if (t === 1 || t === 2) { ctx.fillStyle = '#7a5532'; ctx.fillRect(-u * 0.9, mao + comp * 0.45, u * 1.8, comp * 0.55 - u); }
  if (t === 2) { ctx.fillStyle = '#c9ccd0'; for (let k = 0; k < 4; k++) ctx.fillRect(k % 2 ? u * 0.8 : -u * 1.6, mao + comp * 0.55 + k * u * 1.2, u * 0.8, u * 0.4); }
  if (t === 3 || t === 6 || t === 7) { ctx.fillStyle = t >= 6 ? '#b8382a' : '#8f979c'; ctx.fillRect(-u * 0.4, mao + comp - u * 3, u * 3.2, u * 2.6); if (t === 7) { ctx.fillStyle = '#e8e8e0'; ctx.fillRect(u * 2.6, mao + comp - u * 3, u * 0.5, u * 2.6); } }
  if (t === 4) { ctx.fillStyle = '#b8bec4'; ctx.fillRect(-u * 0.6, mao + comp - u, u * 1.6, u * 7); }
  if (t === 5) { ctx.fillStyle = '#5a5f64'; ctx.fillRect(-u * 2, mao + comp - u * 2.4, u * 4.4, u * 2.6); }
}

const EQUIPE_CORES = ['#5a7a8a', '#7a6a4a', '#6a4a6a', '#4a6a4a', '#8a5a4a', '#4a5a7a'];

function desenhar() {
  ctx.setTransform(dpr, 0, 0, dpr, -VX * dpr, 0);
  const tr = A.tremor > 0 ? (Math.random() - 0.5) * 8 * A.tremor : 0;
  ctx.translate(tr, 0);
  ctx.drawImage(fundo(S.zona), 0, 0, W, H);

  const t = A.tempo, e = A.inimigo, lutando = e && e.estado === 'luta';
  const visiveis = Math.min(S.equipe, 6);
  for (let i = visiveis - 1; i >= 0; i--) {
    const fila = Math.floor(i / 3), col = i % 3;
    pessoa({ x: X_HEROI - 70 - col * 52 - fila * 26, y: CHAO + 6 - fila * 14, dir: 1, escala: 0.8,
      camisa: EQUIPE_CORES[i % EQUIPE_CORES.length], calca: '#2e3238', pele: ['#e0b48a', '#b07a54', '#8a5a3c'][i % 3],
      passo: lutando ? 0 : t * 8 + i, golpe: A.equipeGolpe[i] || 0, arma: i % 2 ? 1 : 0, mochila: '#4a3e2a' });
  }
  ctx.textAlign = 'center';
  if (S.equipe > 6) { ctx.fillStyle = '#d7c2a2'; ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.fillText('+' + (S.equipe - 6) + ' na equipe', X_HEROI - 110, CHAO - 80); }

  pessoa({ x: X_HEROI + (A.golpe ? 10 : 0), y: CHAO + 8, dir: 1, escala: 1.1, camisa: '#d9874a', calca: '#2f3a44', pele: '#e0b48a', cabelo: '#3a2a1e',
    passo: lutando ? 0 : t * 9, golpe: A.golpe, arma: armaTier(), mochila: '#5a4a30' });
  ctx.fillStyle = '#efa360'; ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillText('VOCÊ · NV ' + S.nivel, X_HEROI, CHAO + 34);

  if (e) {
    const T = TIPOS[e.tipo] || {}, chefe = e.chefe;
    const esc = chefe ? 1.5 : 1.05;
    const cair = e.estado === 'morrendo' ? Math.min(1, e.morte / 0.35) : 0;
    pessoa({ x: e.x + (e.t ? 6 : 0), y: CHAO + 8, dir: -1, escala: esc, zumbi: true, forma: T.forma,
      camisa: T.camisa, calca: T.calca, pele: e.t ? '#e8ecdc' : (T.pele || '#8d9c7a'),
      chapeu: T.chapeu, xadrez: T.xadrez, largo: T.largo, magro: T.magro, sem: T.sem, sujo: true,
      olho: T.olho || (chefe ? '#e0453a' : '#2a2a20'), brilho: chefe,
      passo: e.estado === 'entrando' ? t * 10 : t * 2.2, cair, alpha: e.estado === 'morrendo' ? Math.max(0, 1 - (e.morte - 0.4) / 0.4) : 1 });
    if (e.estado !== 'morrendo') {
      const alto = T.forma === 'predador' ? 1.25 : 1;
      const bw = chefe ? 160 : 100, by = CHAO - (chefe ? 175 : 128) * alto, bx = e.x - bw / 2;
      ctx.fillStyle = '#000000a0'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      ctx.fillStyle = '#3a1a16'; ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = chefe ? '#e0705a' : '#b5ca92'; ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.max), 8);
      ctx.fillStyle = chefe ? '#e0705a' : '#d7d4c8'; ctx.font = `600 ${chefe ? 13 : 11}px "IBM Plex Mono", monospace`;
      ctx.fillText((chefe ? 'CHEFE · ' : '') + e.nome.toUpperCase(), e.x, by - 8);
      ctx.fillStyle = '#a4a69c'; ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText(`${fmt(Math.max(0, e.hp))} / ${fmt(e.max)}`, e.x, by + 22);
    }
  }

  for (const q of A.pedacos) { ctx.globalAlpha = Math.max(0, 1 - q.t / 1.4); ctx.fillStyle = q.cor; ctx.fillRect(q.x, q.y, 4, 4); }
  ctx.globalAlpha = 1;
  for (const tx of A.textos) {
    ctx.globalAlpha = Math.max(0, 1 - tx.t / 1.1);
    ctx.font = `700 ${tx.tam}px Inter, sans-serif`;
    ctx.fillStyle = '#000000b0'; ctx.fillText(tx.txt, tx.x + 1, tx.y + 1);
    ctx.fillStyle = tx.cor; ctx.fillText(tx.txt, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;

  if (A.chefe) {
    const f = Math.max(0, Math.min(1, A.chefe.tempo / tempoChefe()));
    ctx.fillStyle = '#000000a0'; ctx.fillRect(250, 14, 300, 26);
    ctx.fillStyle = f < 0.25 ? '#e0705a' : '#efa360'; ctx.fillRect(252, 16, 296 * f, 22);
    ctx.fillStyle = '#111411'; ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`${Math.ceil(Math.max(0, A.chefe.tempo))}s PRA DERRUBAR O CHEFE`, 400, 31);
  }
  ctx.textAlign = 'left';
}

// ---------- ações ----------
let ultimoClique = 0;
function clicar() {
  const agora = performance.now();
  if (agora - ultimoClique < 80) return;
  ultimoClique = agora;
  if (A.inimigo && A.inimigo.estado === 'luta') { A.golpe = 0.22; bater(dano() * 0.6, '#ffd36a', true); }
}
function trocarZona(i) {
  if (!liberada(i) || i === S.zona) return;
  S.zona = i; A.inimigo = null; A.chefe = null; A.espera = 0.4; A.textos = []; A.pedacos = [];
  diario(`Você foi pra ${ZONAS[i].nome}.`);
  desenharUI();
}
function enfrentarChefe() {
  if (A.chefe || S.chefes[S.zona] || (S.abates[S.zona] || 0) < ABATES_PRO_CHEFE) return;
  A.chefe = { tempo: tempoChefe() + 1.5 };
  A.inimigo = null; A.espera = 0.3;
  desenharUI();
}
function recrutar() {
  const c = custoRecruta();
  if (S.equipe >= vagas() || S.r.comida < c) return;
  S.r.comida -= c; S.equipe++;
  diario('Um sobrevivente entrou pra sua equipe.', 'bom');
  desenharUI();
}
function melhorar(k) {
  const c = custoUp(k);
  if (!pode(c)) return;
  pagar(c); S.up[k]++;
  if (k === 'arma' && S.up.arma % 2 === 0 && S.up.arma / 2 < ARMAS.length) diario(`Arma nova: ${ARMAS[armaTier()]}.`, 'bom');
  else diario(`${MELHORIAS[k].nome} subiu pro nível ${S.up[k]}.`);
  desenharUI();
}
let wipeArmado = 0;
function wipe() {
  if (!S.chefes[ZONAS.length - 1]) return;
  if (Date.now() - wipeArmado > 4000) { wipeArmado = Date.now(); desenharUI(); return; }
  const ganho = pontosWipe();
  S = novoEstado(S.mem + ganho, S.temporada + 1, S.recorde);
  A.inimigo = null; A.chefe = null; A.equipeT = []; A.equipeGolpe = [];
  diario(`Wipe! Começa a Temporada ${S.temporada}. Você lembra de tudo: +${ganho} de memória (+${ganho * 10}% em dano e loot).`, 'bom');
  wipeArmado = 0;
  montar(); desenharUI(); salvar();
}

// ---------- interface ----------
const $ = id => document.getElementById(id);
function fmt(n) {
  if (!isFinite(n)) return '0';
  if (Math.abs(n) < 10) return (Math.floor(n * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (Math.abs(n) < 1e4) return Math.floor(n).toLocaleString('pt-BR');
  const s = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi']; let i = 0;
  while (Math.abs(n) >= 1000 && i < s.length - 1) { n /= 1000; i++; }
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + s[i];
}
const fmtCusto = c => Object.entries(c).map(([r, q]) => `<span class="${S.r[r] >= q ? '' : 'falta'}">${fmt(q)} ${RECURSOS[r].nome.toLowerCase()}</span>`).join(' · ');
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function montar() {
  $('recursos').innerHTML = Object.entries(RECURSOS).map(([k, r]) =>
    `<div class="rec"><span>${svg(r.ico)} ${r.nome}</span><strong data-r="${k}">0</strong><small data-tx="${k}"></small></div>`).join('') +
    `<div class="rec"><span>${svg(ICO_GENTE)} Nível</span><strong id="v-nivel">1</strong><small id="v-xp"></small></div>`;

  $('zonas').innerHTML = ZONAS.map((z, i) =>
    `<button type="button" class="zona" data-zona="${i}"><span class="zona-n">${String(i + 1).padStart(2, '0')}</span>
      <span class="zona-t"><b>${z.nome}</b><small data-zinfo="${i}"></small></span><i data-zst="${i}"></i></button>`).join('');

  $('obras').innerHTML = Object.entries(MELHORIAS).map(([k, o]) =>
    `<button type="button" class="obra" data-obra="${k}"><span class="obra-t"><b data-onome="${k}">${o.nome}</b><i data-nivel="${k}"></i></span>
      <small>${o.desc}</small><span class="custo" data-custo="${k}"></span></button>`).join('');

  $('wipe').innerHTML = `<div class="panel-top"><h2>Wipe</h2><span class="muted" id="w-mem"></span></div>
    <p>Derrubou o ${escH(ZONAS[ZONAS.length - 1].chefe)} em ${escH(ZONAS[ZONAS.length - 1].nome)}? Comece uma temporada nova do zero, mas mais forte: cada ponto de memória dá +10% de dano e de loot pra sempre.</p>
    <button type="button" class="button secondary" id="btn-wipe"></button>
    <p class="muted" id="w-info"></p>`;
  $('btn-wipe').onclick = wipe;
  $('temporada').textContent = 'Temporada ' + S.temporada;
  desenharDiario();
}

function desenharUI() {
  const p = passivo();
  for (const k in RECURSOS) {
    document.querySelector(`[data-r="${k}"]`).textContent = fmt(S.r[k]);
    document.querySelector(`[data-tx="${k}"]`).textContent = p[k] ? `+${p[k].toLocaleString('pt-BR', { maximumFractionDigits: 2 })}/s` : '';
  }
  $('v-nivel').textContent = S.nivel;
  $('v-xp').textContent = `${fmt(S.xp)} / ${fmt(xpProximo())} xp`;

  const z = ZONAS[S.zona], ab = S.abates[S.zona] || 0, feito = !!S.chefes[S.zona];
  $('zona-num').textContent = `Área ${S.zona + 1} de ${ZONAS.length}`;
  $('zona-nome').textContent = z.nome;
  const bc = $('btn-chefe');
  if (A.chefe) {
    $('prog-txt').textContent = `Chefe: ${z.chefe}`;
    $('prog-barra').style.width = `${Math.max(0, Math.min(1, A.chefe.tempo / tempoChefe())) * 100}%`;
    bc.textContent = 'Lutando com o chefe'; bc.disabled = true;
  } else if (feito) {
    $('prog-txt').textContent = `${fmt(ab)} abates · chefe derrubado`;
    $('prog-barra').style.width = '100%';
    const ultima = S.zona >= ZONAS.length - 1;
    bc.textContent = ultima ? 'Tudo limpo' : 'Ir pra próxima área'; bc.disabled = ultima;
  } else {
    $('prog-txt').textContent = `${Math.min(ab, ABATES_PRO_CHEFE)} / ${ABATES_PRO_CHEFE} abates pro chefe aparecer`;
    $('prog-barra').style.width = `${Math.min(1, ab / ABATES_PRO_CHEFE) * 100}%`;
    bc.textContent = ab >= ABATES_PRO_CHEFE ? `Enfrentar ${z.chefe}` : 'Chefe ainda escondido';
    bc.disabled = ab < ABATES_PRO_CHEFE;
  }
  $('dps').innerHTML = `Dano <b>${fmt(dano())}</b> · ${escH(ARMAS[armaTier()])} · equipe <b>${S.equipe}</b> · <b>${fmt(dps())}</b> de dano por segundo`;

  ZONAS.forEach((zz, i) => {
    const b = document.querySelector(`[data-zona="${i}"]`), lib = liberada(i);
    b.disabled = !lib; b.setAttribute('aria-pressed', i === S.zona);
    document.querySelector(`[data-zinfo="${i}"]`).textContent = !lib ? `Derrube ${ZONAS[i - 1].chefe} pra liberar`
      : `${fmt(S.abates[i] || 0)} abates · zumbis com ~${fmt(vidaZona(i))} de vida`;
    document.querySelector(`[data-zst="${i}"]`).textContent = S.chefes[i] ? 'chefe ✓' : i === S.zona ? 'aqui' : '';
  });

  const cr = custoRecruta(), rc = $('btn-recrutar');
  $('vagas').textContent = `${S.equipe} de ${vagas()} ${vagas() === 1 ? 'vaga' : 'vagas'}`;
  if (S.equipe >= vagas()) { rc.innerHTML = 'Equipe cheia: construa mais barracas'; rc.disabled = true; }
  else { rc.innerHTML = `Recrutar sobrevivente <small>${fmt(cr)} comida · bate ${fmt(danoEquipe())} a cada ${ATAQUE_EQUIPE.toLocaleString('pt-BR')}s</small>`; rc.disabled = S.r.comida < cr; }

  for (const k in MELHORIAS) {
    const c = custoUp(k);
    document.querySelector(`[data-nivel="${k}"]`).textContent = S.up[k] ? 'nível ' + S.up[k] : '';
    document.querySelector(`[data-custo="${k}"]`).innerHTML = fmtCusto(c);
    document.querySelector(`[data-obra="${k}"]`).disabled = !pode(c);
  }
  document.querySelector('[data-onome="arma"]').textContent = 'Arma: ' + ARMAS[armaTier()];

  const pronto = !!S.chefes[ZONAS.length - 1], bw = $('btn-wipe');
  $('w-mem').textContent = `Memória ${S.mem} · +${S.mem * 10}%`;
  $('w-info').textContent = `Zumbis derrubados nesta temporada: ${fmt(S.totalAbates)} · melhor área já alcançada: ${S.recorde}`;
  bw.disabled = !pronto;
  bw.className = 'button ' + (pronto ? 'primary' : 'secondary');
  bw.textContent = !pronto ? `Derrube o ${ZONAS[ZONAS.length - 1].chefe} primeiro`
    : wipeArmado && Date.now() - wipeArmado < 4000 ? 'Clique de novo pra confirmar o wipe' : `Dar wipe e ganhar +${pontosWipe()} de memória`;
}

function desenharDiario() {
  const ul = $('diario');
  if (!S.log.length) { ul.innerHTML = '<li class="muted">Dia 1 em Muldraugh. Você saiu do abrigo com um cano de ferro na mão. Ele bate sozinho, e você pode clicar no zumbi pra ajudar.</li>'; return; }
  ul.innerHTML = S.log.slice(0, 15).map(e =>
    `<li class="${e.tipo}"><time>${new Date(e.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time> ${escH(e.txt)}</li>`).join('');
}

// progresso calculado de uma vez (página fechada ou aba em segundo plano)
function recuperar(seg, ef, mostrar) {
  seg = Math.min(seg, OFFLINE_MAX);
  if (seg < 1) return;
  const antes = { ...S.r }, nivelAntes = S.nivel, z = ZONAS[S.zona];
  const vidaMedia = vidaZona(S.zona) * z.zumbis.reduce((s, t) => s + (TIPOS[t].hp || 1), 0) / z.zumbis.length;
  const porAbate = vidaMedia / dps() + 1.1;
  const abates = Math.floor(seg * ef / porAbate);
  const m = lootMult();
  for (const [r, [a, b]] of Object.entries(z.loot)) S.r[r] += abates * (a + b) / 2 * m * (r === 'remedio' ? 0.55 : 1);
  const p = passivo();
  for (const r in p) S.r[r] += p[r] * seg * ef;
  S.abates[S.zona] = (S.abates[S.zona] || 0) + abates;
  S.totalAbates += abates;
  S.xp += abates * xpAbate(S.zona);
  while (S.xp >= xpProximo()) { S.xp -= xpProximo(); S.nivel++; }
  if (S.nivel > nivelAntes) diario(`Você subiu pro nível ${S.nivel} enquanto estava fora.`, 'bom');
  if (A.chefe) { A.chefe = null; A.inimigo = null; A.espera = 0.5; }
  if (!mostrar || seg < 60 || !(abates || p.comida || p.sucata)) return;
  const itens = [`<li><b>${fmt(abates)}</b> zumbis derrubados em ${escH(z.nome)}</li>`];
  for (const k in RECURSOS) { const d = S.r[k] - antes[k]; if (d >= 1) itens.push(`<li>+${fmt(d)} ${RECURSOS[k].nome.toLowerCase()}</li>`); }
  if (S.nivel > nivelAntes) itens.push(`<li>Subiu pro nível ${S.nivel}</li>`);
  const h = Math.floor(seg / 3600), mi = Math.floor(seg % 3600 / 60);
  $('ausente-t').textContent = `Você ficou ${h ? h + 'h ' : ''}${mi}min fora.`;
  $('ausente-lista').innerHTML = itens.join('') + '<li class="muted">Com a página fechada o sobrevivente rende metade' + (seg >= OFFLINE_MAX ? ', e guarda no máximo 8 horas.' : '.') + '</li>';
  $('ausente').hidden = false;
  $('btn-ausente').focus();
}

// ---------- ligações ----------
cv.tabIndex = 0;
cv.addEventListener('pointerdown', e => { e.preventDefault(); clicar(); });
cv.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); clicar(); } });
$('zonas').onclick = e => { const b = e.target.closest('[data-zona]'); if (b) trocarZona(+b.dataset.zona); };
$('obras').onclick = e => { const b = e.target.closest('[data-obra]'); if (b) melhorar(b.dataset.obra); };
$('btn-recrutar').onclick = recrutar;
$('btn-chefe').onclick = () => { if (S.chefes[S.zona]) trocarZona(S.zona + 1); else enfrentarChefe(); };
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
    S = o; S.ultimo = Date.now(); A.inimigo = null; A.chefe = null;
    montar(); desenharUI(); salvar();
    $('save-msg').textContent = 'Save carregado.';
  } catch { $('save-msg').textContent = 'Esse código não é um save válido.'; }
};
let zerarArmado = 0;
$('btn-zerar').onclick = e => {
  if (Date.now() - zerarArmado > 4000) { zerarArmado = Date.now(); e.currentTarget.textContent = 'Clique de novo pra apagar'; return; }
  S = novoEstado(); A.inimigo = null; A.chefe = null; A.equipeT = []; A.equipeGolpe = [];
  montar(); desenharUI(); salvar();
  e.currentTarget.textContent = 'Apagar tudo';
  $('save-msg').textContent = 'Progresso apagado. De volta ao dia 1.';
};

// ---------- relógio ----------
ajustarTela();
addEventListener('resize', ajustarTela);
montar();
recuperar((Date.now() - S.ultimo) / 1000, OFFLINE_EF, true);
desenharUI();

let ultimoQuadro = performance.now();
function quadro(agora) {
  const dt = Math.max(0, (agora - ultimoQuadro) / 1000);
  ultimoQuadro = agora;
  if (dt > 2) recuperar(dt, 1, false);   // aba ficou em segundo plano: rende normal
  else atualizar(dt);
  desenhar();
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
setInterval(desenharUI, 250);
setInterval(salvar, 5000);
addEventListener('pagehide', salvar);
document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });
// fontes do canvas chegam depois: redesenha os fundos com elas
if (document.fonts) document.fonts.ready.then(() => { for (const k in fundos) delete fundos[k]; });
})();
