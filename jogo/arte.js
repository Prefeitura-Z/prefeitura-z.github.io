// Prefeitura Z: Depois da Queda — arte desenhada em código (provisória, original).
// Escala: losango de piso 64×32; personagem num quadro 48×80 com os pés em (24, 74).
// Luz vem do alto à esquerda: face de cima clara, face sudoeste média, face sudeste escura.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};

const COR = {
  carvao: '#24282B', concreto: '#6F7471', ferrugem: '#A65F3D', lona: '#9B8D66',
  vegetacao: '#566D4A', luz: '#D4AC66', aviso: '#C65345', radio: '#74A6A1',
};
const TW = 64, TH = 32, HW = 32, HH = 16;

// cor ± luz (fator > 1 clareia)
function tom(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

// coordenadas do mundo (células) → tela (px lógicos), origem no canto (0,0)
const iso = (x, y) => ({ x: (x - y) * HW, y: (x + y) * HH });

// ---------- chão ----------
const CHAO = [
  { base: '#4c5d3f', var: ['#566D4A', '#435436', '#5f7450'], marca: 'grama' },
  { base: '#5e5040', var: ['#66574a', '#54473a', '#6b5d4c'], marca: 'terra' },
  { base: '#6F7471', var: ['#787d79', '#666b68', '#5f6461'], marca: 'concreto' },
  { base: '#6e5640', var: ['#7a6048', '#634d39', '#76603f'], marca: 'madeira' },
  { base: '#2e4a52', var: ['#335560', '#2a434a', '#3a5e66'], marca: 'agua' },
  { base: '#6a645a', var: ['#757064', '#5d5850', '#807a6c'], marca: 'cascalho' },
  { base: '#4a3a2c', var: ['#544232', '#403226', '#5a4836'], marca: 'arado' },
  { base: '#3c3f40', var: ['#404344', '#383b3c', '#434647'], marca: 'asfalto' },
  { base: '#77786f', var: ['#7d7e75', '#70716a', '#84857b'], marca: 'calcada' },
  { base: '#3c3f40', var: ['#404344', '#383b3c', '#434647'], marca: 'faixaX' },
  { base: '#3c3f40', var: ['#404344', '#383b3c', '#434647'], marca: 'faixaY' },
];

function losango(g, cx, cy) {
  g.beginPath(); g.moveTo(cx, cy - HH); g.lineTo(cx + HW, cy); g.lineTo(cx, cy + HH); g.lineTo(cx - HW, cy); g.closePath();
}
const dentro = (dx, dy) => Math.abs(dx) / HW + Math.abs(dy) / HH <= 0.94;

function desenharChao(mundo) {
  const { LARG, ALT, chao } = mundo;
  const ox = ALT * HW, oy = HH + 4;
  const c = document.createElement('canvas');
  c.width = (LARG + ALT) * HW; c.height = (LARG + ALT) * HH + 40;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < ALT; y++) for (let x = 0; x < LARG; x++) {
    const t = chao[y * LARG + x], st = CHAO[t], r = rng(x * 7349 + y * 1931 + t * 17);
    const p = iso(x + 0.5, y + 0.5), cx = Math.round(p.x + ox), cy = Math.round(p.y + oy);
    g.fillStyle = st.var[Math.floor(r() * st.var.length)];
    losango(g, cx, cy); g.fill();
    // textura em pixels dentro do losango
    const n = st.marca === 'agua' ? 10 : 34;
    for (let k = 0; k < n; k++) {
      const dx = Math.round((r() - 0.5) * TW), dy = Math.round((r() - 0.5) * TH);
      if (!dentro(dx, dy)) continue;
      g.fillStyle = r() > 0.5 ? tom(st.base, 1.15) : tom(st.base, 0.8);
      if (st.marca === 'grama') { g.fillRect(cx + dx, cy + dy - 2, 1, 2); if (r() > 0.9) { g.fillStyle = '#a7a35a'; g.fillRect(cx + dx + 1, cy + dy - 1, 1, 1); } }
      else if (st.marca === 'madeira') g.fillRect(cx + dx, cy + dy, 3, 1);
      else if (st.marca === 'agua') { g.fillStyle = '#5f8a90'; g.fillRect(cx + dx, cy + dy, 4, 1); }
      else if (st.marca === 'arado') { g.fillRect(cx + dx, cy + dy, 2, 1); }
      else g.fillRect(cx + dx, cy + dy, 1, 1);
    }
    if (st.marca === 'concreto') {
      g.strokeStyle = tom(st.base, 0.78); g.lineWidth = 1; losango(g, cx, cy + 0.5); g.stroke();
      if (r() > 0.6) { g.strokeStyle = tom(st.base, 0.7); g.beginPath(); const a = (r() - 0.5) * 30; g.moveTo(cx + a, cy - 6); g.lineTo(cx + a + 6, cy); g.lineTo(cx + a + 3, cy + 5); g.stroke(); }
      if (r() > 0.85) { g.fillStyle = '#4c4a4433'; g.beginPath(); g.ellipse(cx + (r() - 0.5) * 20, cy, 9, 4, 0, 0, 7); g.fill(); }
    }
    if (st.marca === 'calcada') { g.strokeStyle = tom(st.base, 0.8); g.lineWidth = 1; losango(g, cx, cy + 0.5); g.stroke(); if (r() > 0.8) { g.fillStyle = '#566D4A'; g.fillRect(cx + Math.round((r() - 0.5) * 30), cy + Math.round((r() - 0.5) * 10), 3, 2); } }
    if (st.marca === 'asfalto' || st.marca === 'faixaX' || st.marca === 'faixaY') {
      if (r() > 0.7) { g.strokeStyle = '#2a2c2d'; g.lineWidth = 1; g.beginPath(); const a = (r() - 0.5) * 34; g.moveTo(cx + a, cy - 5); g.lineTo(cx + a - 5, cy); g.lineTo(cx + a + 2, cy + 6); g.stroke(); }
      if (r() > 0.88) { g.fillStyle = '#2f313233'; g.beginPath(); g.ellipse(cx + (r() - 0.5) * 20, cy, 11, 5, 0, 0, 7); g.fill(); }
      if (st.marca !== 'asfalto' && r() > 0.25) { const k = st.marca === 'faixaX' ? 1 : -1; g.strokeStyle = '#a89a58'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 9 * k, cy - 4.5); g.lineTo(cx + 9 * k, cy + 4.5); g.stroke(); }
    }
    if (st.marca === 'madeira') { g.strokeStyle = tom(st.base, 0.72); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx - HW / 2 + k * 8 - 8, cy - HH / 2 + k * 4 + 4 + 8 - 8); g.lineTo(cx + HW / 2 + k * 8 - 8, cy + HH / 2 + k * 4 + 4 - 8); g.stroke(); } }
    if (st.marca === 'arado') { g.strokeStyle = '#33281e'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(cx - 20 + k * 10, cy - 6 + k * 5 + 6); g.lineTo(cx + k * 10, cy + 4 + k * 5 - 4 + 6); g.stroke(); } }
  }
  // margem do rio mais escura
  return { canvas: c, ox, oy };
}

// ---------- caixas isométricas ----------
// x,y,w,d em células; h em px; o = { topo, esq, dir } ou uma cor base
function caixa(g, x, y, w, d, h, cor, z = 0) {
  const base = typeof cor === 'string' ? { topo: tom(cor, 1.18), esq: cor, dir: tom(cor, 0.72) } : cor;
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
  const up = h + z;
  // face sudoeste (D→C)
  g.fillStyle = base.esq; g.beginPath();
  g.moveTo(D.x, D.y - z); g.lineTo(C.x, C.y - z); g.lineTo(C.x, C.y - up); g.lineTo(D.x, D.y - up); g.closePath(); g.fill();
  // face sudeste (B→C)
  g.fillStyle = base.dir; g.beginPath();
  g.moveTo(C.x, C.y - z); g.lineTo(B.x, B.y - z); g.lineTo(B.x, B.y - up); g.lineTo(C.x, C.y - up); g.closePath(); g.fill();
  // topo
  g.fillStyle = base.topo; g.beginPath();
  g.moveTo(A.x, A.y - up); g.lineTo(B.x, B.y - up); g.lineTo(C.x, C.y - up); g.lineTo(D.x, D.y - up); g.closePath(); g.fill();
  // aresta clara na quina da frente
  g.strokeStyle = '#ffffff22'; g.lineWidth = 1; g.beginPath(); g.moveTo(C.x, C.y - z); g.lineTo(C.x, C.y - up); g.stroke();
  return { A, B, C, D, up };
}

// pontos numa face, pra detalhes: face 'esq' (sudoeste) ou 'dir' (sudeste); u,v de 0 a 1
function naFace(x, y, w, d, face, u, v, h) {
  if (face === 'esq') { const D = iso(x, y + d), C = iso(x + w, y + d); return { x: D.x + (C.x - D.x) * u, y: D.y + (C.y - D.y) * u - v * h }; }
  const C = iso(x + w, y + d), B = iso(x + w, y); return { x: C.x + (B.x - C.x) * u, y: C.y + (B.y - C.y) * u - v * h };
}
function placa(g, x, y, w, d, face, u0, u1, v0, v1, h, cor) {
  const a = naFace(x, y, w, d, face, u0, v0, h), b = naFace(x, y, w, d, face, u1, v0, h), c = naFace(x, y, w, d, face, u1, v1, h), e = naFace(x, y, w, d, face, u0, v1, h);
  g.fillStyle = cor; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(e.x, e.y); g.closePath(); g.fill();
}
function sombra(g, x, y, w, d) {
  const A = iso(x + 0.15, y + 0.15), B = iso(x + w + 0.25, y + 0.1), C = iso(x + w + 0.3, y + d + 0.3), D = iso(x + 0.1, y + d + 0.25);
  g.fillStyle = '#0000002e'; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.lineTo(C.x, C.y); g.lineTo(D.x, D.y); g.closePath(); g.fill();
}
function cilindro(g, cx, cy, rx, ry, h, cor) {
  const esc = tom(cor, 0.7);
  const grad = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  grad.addColorStop(0, tom(cor, 1.1)); grad.addColorStop(0.45, cor); grad.addColorStop(1, esc);
  g.fillStyle = grad; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); g.lineTo(cx - rx, cy - h); g.ellipse(cx, cy - h, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
  g.fillStyle = tom(cor, 1.2); g.beginPath(); g.ellipse(cx, cy - h, rx, ry, 0, 0, 7); g.fill();
}

// altura de cada objeto em px e se esconde o personagem (fica translúcido quando ele passa atrás)
const ALTURA = {
  muro: 46, pilar: 62, portao: 40, guarita: 58, sacos: 14, mesa: 18, arquivo: 34, estante: 40, caixas: 30, caixa: 14,
  bancada: 20, gerador: 22, pneus: 16, carcaca: 26, tambor: 22, ferramentas: 42, antena: 120, mesaRadio: 20,
  beliche: 40, cama: 12, armario: 44, barraca: 40, tenda: 52, maca: 14, caixaMedica: 16, tanque: 70, planta: 10,
  quadro: 44, poste: 86, fogueira: 10, banco: 10, cerca: 18, casinha: 22, arvore: 110,
  bloco: 60, carro: 24, barricada: 22, entulho: 8, placaRua: 40,
};

function desenharObjeto(g, o, t) {
  const { x, y, w, d } = o, h = o.h || ALTURA[o.tipo] || 20, r = rng(x * 131 + y * 71);
  switch (o.tipo) {
    // prédio da rua, uma célula por vez (ordena certo com quem passa). o.sul / o.leste = tem fachada pra rua
    case 'bloco': {
      caixa(g, x, y, 1, 1, h, o.cor || '#6b6258');
      const andares = Math.max(1, Math.floor(h / 30));
      for (const face of ['esq', 'dir']) {
        if (!(face === 'esq' ? o.sul : o.leste)) continue;
        for (let k = 0; k < andares; k++) {
          const v0 = (k * 30 + 10) / h, v1 = (k * 30 + 25) / h, s = r();
          if (k === 0 && o.porta === face) { placa(g, x, y, 1, 1, face, 0.3, 0.72, 0, 24 / h, h, '#1c1a18'); placa(g, x, y, 1, 1, face, 0.3, 0.72, 10 / h, 13 / h, h, '#6e5a44'); continue; }
          if (k === 0 && o.vitrine) { placa(g, x, y, 1, 1, face, 0.08, 0.92, 5 / h, 24 / h, h, '#1e2426'); placa(g, x, y, 1, 1, face, 0.08, 0.92, 25 / h, 29 / h, h, o.vitrine); if (s > 0.5) placa(g, x, y, 1, 1, face, 0.15, 0.6, 9 / h, 20 / h, h, '#6e5a44'); continue; }
          placa(g, x, y, 1, 1, face, 0.22, 0.78, v0, v1, h, s > 0.82 ? '#D4AC6655' : '#1e2426');
          if (s < 0.35) { placa(g, x, y, 1, 1, face, 0.22, 0.78, v0 + 3 / h, v0 + 6 / h, h, '#6e5a44'); placa(g, x, y, 1, 1, face, 0.22, 0.78, v0 + 9 / h, v0 + 12 / h, h, '#7a6650'); }
          else if (s < 0.5) placa(g, x, y, 1, 1, face, 0.22, 0.5, v0, v1, h, '#3a4648');
        }
        if (r() > 0.75) placa(g, x, y, 1, 1, face, 0.05, 0.3, 0, 0.18, h, '#566D4A88');
      }
      if (o.topo && r() > 0.6) caixa(g, x + 0.3, y + 0.3, 0.4, 0.4, 8, '#4a4a46', h);
      break;
    }
    case 'carro': {
      const cor = o.cor || '#5a6a72', ao = w >= d;
      caixa(g, x + 0.08, y + 0.14, w - 0.16, d - 0.28, 11, cor, 5);
      if (ao) caixa(g, x + 0.5, y + 0.2, w - 1.05, d - 0.4, 9, { topo: tom(cor, 1.1), esq: '#1e2426', dir: '#161a1c' }, 16);
      else caixa(g, x + 0.2, y + 0.5, w - 0.4, d - 1.05, 9, { topo: tom(cor, 1.1), esq: '#1e2426', dir: '#161a1c' }, 16);
      for (const [a, b] of ao ? [[0.4, d - 0.14], [w - 0.4, d - 0.14]] : [[w - 0.14, 0.4], [w - 0.14, d - 0.4]]) { const p = iso(x + a, y + b); g.fillStyle = '#131313'; g.beginPath(); g.ellipse(p.x, p.y - 4, 5, 5, 0, 0, 7); g.fill(); g.fillStyle = '#3a3a3a'; g.fillRect(p.x - 1, p.y - 5, 2, 2); }
      placa(g, x + 0.08, y + 0.14, w - 0.16, d - 0.28, ao ? 'esq' : 'dir', 0.55, 0.9, 0.35, 0.95, 16, '#A65F3D77');
      break;
    }
    case 'barricada': { const ao = w >= d;
      for (let k = 0; k < (ao ? w : d) * 2; k++) caixa(g, ao ? x + k * 0.5 + 0.04 : x + 0.3, ao ? y + 0.3 : y + k * 0.5 + 0.04, ao ? 0.42 : 0.4, ao ? 0.4 : 0.42, 10 + (k % 2) * 3, '#9B8D66');
      caixa(g, ao ? x + 0.1 : x + 0.42, ao ? y + 0.42 : y + 0.1, ao ? w - 0.2 : 0.14, ao ? 0.14 : d - 0.2, 4, '#6e5a44', 15);
      { const p = iso(x + w / 2, y + d / 2); g.fillStyle = COR.aviso; g.fillRect(p.x - 3, p.y - 26, 6, 5); }
      break; }
    case 'entulho': { const p = iso(x + 0.5, y + 0.5); for (let k = 0; k < 7; k++) { g.fillStyle = ['#5a5550', '#6e6a62', '#4a4642', '#7a5a3e'][k % 4]; g.fillRect(Math.round(p.x + (r() - 0.5) * 30), Math.round(p.y + (r() - 0.5) * 12 - 3), 3 + Math.floor(r() * 5), 2 + Math.floor(r() * 3)); } break; }
    case 'placaRua': { const p = iso(x + 0.5, y + 0.5); g.fillStyle = '#4a4a46'; g.fillRect(p.x - 1, p.y - h, 2, h); g.fillStyle = o.cor || '#74A6A1'; g.fillRect(p.x - 12, p.y - h - 2, 24, 10); g.fillStyle = '#1b1f1c'; g.fillRect(p.x - 9, p.y - h + 1, 18, 1); g.fillRect(p.x - 9, p.y - h + 4, 12, 1); break; }
    case 'muro': {
      // chapas de metal e madeira remendadas
      const cores = ['#7b6a58', '#6b7072', '#8a5a3e', '#5e665c'];
      caixa(g, x + 0.1, y + 0.1, 0.8, 0.8, h, cores[Math.floor(r() * cores.length)]);
      placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0.15, 0.8, 0.3, 0.65, h, '#00000022');
      placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'dir', 0.2, 0.7, 0.55, 0.85, h, r() > 0.5 ? '#A65F3D88' : '#9B8D6688');
      const p = naFace(x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0.5, 0.92, h); g.fillStyle = '#c8c0a855'; g.fillRect(p.x - 1, p.y, 2, 1);
      break;
    }
    case 'pilar': caixa(g, x + 0.05, y + 0.05, 0.9, 0.9, h, '#5a5550');
      { const p = iso(x + 0.5, y + 0.5); g.fillStyle = COR.luz; g.fillRect(p.x - 2, p.y - h - 6, 4, 6); g.fillStyle = '#D4AC6630'; g.beginPath(); g.arc(p.x, p.y - h - 3, 10, 0, 7); g.fill(); } break;
    case 'portao': {
      caixa(g, x, y + 0.4, w, 0.2, h, '#6b5a48');
      for (let k = 0; k < 9; k++) placa(g, x, y + 0.4, w, 0.2, 'esq', k / 9 + 0.01, k / 9 + 0.07, 0.05, 0.95, h, '#3a302688');
      placa(g, x, y + 0.4, w, 0.2, 'esq', 0, 1, 0.45, 0.55, h, '#A65F3D');
      placa(g, x, y + 0.4, w, 0.2, 'esq', 0.42, 0.58, 0.6, 0.85, h, COR.aviso);
      break;
    }
    case 'guarita': caixa(g, x, y, w, d, h - 10, '#6c6a60'); caixa(g, x - 0.1, y - 0.1, w + 0.2, d + 0.2, 6, '#4a463e', h - 10);
      placa(g, x, y, w, d, 'esq', 0.2, 0.8, 0.45, 0.75, h - 10, '#1e2224'); placa(g, x, y, w, d, 'esq', 0.25, 0.4, 0.5, 0.7, h - 10, '#D4AC6644'); break;
    case 'sacos': for (let k = 0; k < 3; k++) caixa(g, x + 0.08, y + 0.1 + k * 0.27, 0.84, 0.25, h - (k % 2) * 3, '#9B8D66'); break;
    case 'mesa': caixa(g, x + 0.05, y + 0.15, w - 0.1, d - 0.3, h, '#7a5a3e');
      { const p = iso(x + 0.8, y + 0.5); g.fillStyle = '#e8e2d0'; g.fillRect(p.x - 5, p.y - h - 4, 8, 4); g.fillStyle = '#c9c2b0'; g.fillRect(p.x + 8, p.y - h - 7, 6, 6); const q = iso(x + 2.2, y + 0.5); g.fillStyle = COR.luz; g.fillRect(q.x, q.y - h - 9, 3, 9); g.fillStyle = '#D4AC6640'; g.beginPath(); g.arc(q.x + 1, q.y - h - 9, 9, 0, 7); g.fill(); } break;
    case 'arquivo': caixa(g, x + 0.15, y + 0.15, 0.7, 0.7, h, '#5d6466'); for (let k = 0; k < 3; k++) placa(g, x + 0.15, y + 0.15, 0.7, 0.7, 'dir', 0.1, 0.9, 0.12 + k * 0.3, 0.32 + k * 0.3, h, '#00000030'); break;
    case 'estante': caixa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, h, '#6e5038');
      for (let k = 0; k < 3; k++) { placa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, 'esq', 0.05, 0.95, 0.08 + k * 0.32, 0.3 + k * 0.32, h, '#2a2016'); for (let j = 0; j < 6; j++) placa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, 'esq', 0.08 + j * 0.15, 0.18 + j * 0.15, 0.1 + k * 0.32, 0.26 + k * 0.32, h, ['#9B8D66', '#74A6A1', '#A65F3D', '#c9c2b0'][(j + k) % 4]); } break;
    case 'caixas': caixa(g, x + 0.1, y + 0.1, 0.8, 0.8, 15, '#8a6a46'); caixa(g, x + 0.2, y + 0.2, 0.6, 0.6, 14, '#7d6040', 15); placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0.1, 0.9, 0.4, 0.5, 15, '#00000030'); break;
    case 'caixa': caixa(g, x + 0.2, y + 0.2, 0.6, 0.6, h, '#8a6a46'); break;
    case 'bancada': caixa(g, x + 0.05, y + 0.2, w - 0.1, d - 0.4, h, '#6a5a48');
      { const p = iso(x + 1.2, y + 0.5); g.fillStyle = '#8f979c'; g.fillRect(p.x - 6, p.y - h - 3, 10, 2); g.fillStyle = COR.ferrugem; g.fillRect(p.x + 6, p.y - h - 5, 5, 5); g.fillStyle = '#24282B'; g.fillRect(p.x - 18, p.y - h - 4, 7, 4); } break;
    case 'gerador': caixa(g, x + 0.1, y + 0.15, 0.8, 0.7, h, '#7a6a2e'); placa(g, x + 0.1, y + 0.15, 0.8, 0.7, 'esq', 0.15, 0.85, 0.2, 0.8, h, '#00000035'); break;
    case 'pneus': { const p = iso(x + 0.5, y + 0.5); for (let k = 0; k < 3; k++) { g.fillStyle = '#1e1e1e'; g.beginPath(); g.ellipse(p.x, p.y - k * 5, 13, 6.5, 0, 0, 7); g.fill(); g.fillStyle = '#333'; g.beginPath(); g.ellipse(p.x, p.y - k * 5 - 1, 6, 3, 0, 0, 7); g.fill(); } } break;
    case 'carcaca': caixa(g, x + 0.1, y + 0.15, w - 0.2, d - 0.3, 14, '#5a6a72', 6); caixa(g, x + 0.5, y + 0.4, w - 1, d - 0.8, 12, '#4c5a62', 20);
      for (const [a, b] of [[0.4, d - 0.15], [w - 0.4, d - 0.15]]) { const p = iso(x + a, y + b); g.fillStyle = '#151515'; g.beginPath(); g.ellipse(p.x, p.y - 4, 6, 6, 0, 0, 7); g.fill(); }
      placa(g, x + 0.1, y + 0.15, w - 0.2, d - 0.3, 'esq', 0.1, 0.4, 0.2, 0.9, 20, '#A65F3D99'); break;
    case 'tambor': { const p = iso(x + 0.5, y + 0.5); cilindro(g, p.x, p.y, 9, 4.5, h, r() > 0.5 ? '#3f5a6a' : '#7a3a2a'); g.fillStyle = '#00000040'; g.fillRect(p.x - 9, p.y - 8, 18, 2); g.fillRect(p.x - 9, p.y - 16, 18, 2); } break;
    case 'ferramentas': caixa(g, x + 0.05, y + 0.6, w - 0.1, 0.2, h, '#5a4a38');
      for (let k = 0; k < 6; k++) { const p = naFace(x + 0.05, y + 0.6, w - 0.1, 0.2, 'esq', 0.12 + k * 0.15, 0.7, h); g.fillStyle = ['#8f979c', '#A65F3D', '#c9c2b0'][k % 3]; g.fillRect(p.x - 1, p.y - 2, 2, 10); } break;
    case 'antena': { const p = iso(x + 0.5, y + 0.5); caixa(g, x + 0.25, y + 0.25, 0.5, 0.5, 10, '#4a4a44');
      g.strokeStyle = '#8f979c'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y - 8); g.lineTo(p.x, p.y - h); g.stroke();
      g.lineWidth = 1; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(p.x - 7 + k, p.y - h + k * 18); g.lineTo(p.x + 7 - k, p.y - h + k * 18); g.stroke(); }
      g.strokeStyle = '#8f979c55'; g.beginPath(); g.moveTo(p.x, p.y - h + 10); g.lineTo(p.x - 22, p.y + 4); g.moveTo(p.x, p.y - h + 10); g.lineTo(p.x + 22, p.y + 4); g.stroke();
      const pisca = Math.floor(t * 1.6) % 2 === 0; g.fillStyle = pisca ? COR.aviso : '#5a2a22'; g.fillRect(p.x - 2, p.y - h - 3, 4, 4);
      if (pisca) { g.fillStyle = '#C6534540'; g.beginPath(); g.arc(p.x, p.y - h - 1, 8, 0, 7); g.fill(); } } break;
    case 'mesaRadio': caixa(g, x + 0.05, y + 0.15, w - 0.1, d - 0.3, h, '#5c4a38');
      { const p = iso(x + 1.4, y + 0.5); caixa(g, x + 1.0, y + 0.3, 0.9, 0.4, 12, '#3a4a46', h); const q = naFace(x + 1.0, y + 0.3, 0.9, 0.4, 'esq', 0.2, 0.6, 12); g.fillStyle = Math.floor(t * 3) % 3 ? COR.radio : '#2f4a48'; g.fillRect(q.x, q.y - h, 6, 2); g.fillStyle = '#D4AC66'; g.fillRect(q.x + 12, q.y - h, 2, 2); g.fillStyle = '#c9c2b0'; g.fillRect(p.x - 26, p.y - h - 3, 9, 3); } break;
    case 'beliche': caixa(g, x + 0.1, y + 0.05, 0.8, d - 0.1, 6, '#5a4a38', 6); caixa(g, x + 0.12, y + 0.07, 0.76, d - 0.14, 4, '#7b8a7a', 12); caixa(g, x + 0.1, y + 0.05, 0.8, d - 0.1, 6, '#5a4a38', 28); caixa(g, x + 0.12, y + 0.07, 0.76, d - 0.14, 4, '#8a7a66', 34);
      { for (const [a, b] of [[0.1, d - 0.05], [0.9, d - 0.05]]) { const p = iso(x + a, y + b); g.fillStyle = '#4a3a2c'; g.fillRect(p.x - 1, p.y - h, 2, h); } } break;
    case 'cama': caixa(g, x + 0.1, y + 0.05, 0.8, d - 0.1, 8, '#5a4a38'); caixa(g, x + 0.12, y + 0.07, 0.76, d - 0.14, 4, '#6f7f8a', 8); caixa(g, x + 0.15, y + 0.1, 0.7, 0.35, 3, '#d8d0c0', 12); break;
    case 'armario': caixa(g, x + 0.15, y + 0.2, 0.7, 0.6, h, '#5d6a6c'); placa(g, x + 0.15, y + 0.2, 0.7, 0.6, 'esq', 0.48, 0.52, 0.05, 0.95, h, '#00000040'); break;
    case 'barraca': { const A = iso(x, y + d), B = iso(x + w, y + d), C = iso(x + w, y), top1 = iso(x, y + d / 2), top2 = iso(x + w, y + d / 2);
      g.fillStyle = '#7f7556'; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(B.x, B.y); g.lineTo(top2.x, top2.y - h); g.closePath(); g.fill();
      g.fillStyle = COR.lona; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.lineTo(top2.x, top2.y - h); g.lineTo(top1.x, top1.y - h); g.closePath(); g.fill();
      g.fillStyle = '#3a3428'; const m = iso(x + w * 0.5, y + d); g.beginPath(); g.moveTo(m.x - 6, m.y - 3); g.lineTo(m.x + 6, m.y + 3); g.lineTo(iso(x + w * 0.5, y + d / 2).x, iso(x + w * 0.5, y + d / 2).y - h + 4); g.closePath(); g.fill(); } break;
    case 'tenda': { caixa(g, x, y, w, d, h - 18, { topo: '#c9c4b4', esq: '#b8b2a0', dir: '#8f8a7a' });
      const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d), up = h - 18;
      const M1 = iso(x, y + d / 2), M2 = iso(x + w, y + d / 2);
      g.fillStyle = '#d8d3c4'; g.beginPath(); g.moveTo(D.x, D.y - up); g.lineTo(C.x, C.y - up); g.lineTo(M2.x, M2.y - h); g.lineTo(M1.x, M1.y - h); g.closePath(); g.fill();
      g.fillStyle = '#a8a292'; g.beginPath(); g.moveTo(C.x, C.y - up); g.lineTo(B.x, B.y - up); g.lineTo(M2.x, M2.y - h); g.closePath(); g.fill();
      placa(g, x, y, w, d, 'esq', 0.42, 0.58, 0.25, 0.75, up, COR.radio); placa(g, x, y, w, d, 'esq', 0.3, 0.7, 0.42, 0.58, up, COR.radio);
      placa(g, x, y, w, d, 'dir', 0.3, 0.7, 0, 0.8, up, '#3a3a3466'); } break;
    case 'maca': caixa(g, x + 0.1, y + 0.25, w - 0.2, 0.5, 12, '#8f979c'); caixa(g, x + 0.12, y + 0.27, w - 0.24, 0.46, 3, '#e8e2d0', 12); break;
    case 'caixaMedica': caixa(g, x + 0.2, y + 0.2, 0.6, 0.6, h, '#d8d3c4'); placa(g, x + 0.2, y + 0.2, 0.6, 0.6, 'esq', 0.35, 0.65, 0.2, 0.8, h, COR.radio); break;
    case 'tanque': { const p = iso(x + w / 2, y + d / 2); caixa(g, x + 0.2, y + 0.2, w - 0.4, d - 0.4, 12, '#4a463e'); cilindro(g, p.x, p.y - 12, 26, 13, h - 12, '#5e7472');
      g.fillStyle = '#00000030'; g.fillRect(p.x - 26, p.y - 40, 52, 2); g.fillRect(p.x - 26, p.y - 58, 52, 2); g.fillStyle = '#ffffff20'; g.fillRect(p.x - 18, p.y - h + 4, 3, h - 22); } break;
    case 'planta': { const p = iso(x + 0.5, y + 0.5); for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#6f8a4a' : '#566D4A'; g.fillRect(p.x - 10 + k * 6, p.y - 6 - (k % 2) * 3, 3, 7 + (k % 2) * 3); } g.fillStyle = COR.aviso; g.fillRect(p.x - 4, p.y - 9, 2, 2); } break;
    case 'quadro': { caixa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, h, '#5a4a38', 0);
      placa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, 'esq', 0.06, 0.94, 0.3, 0.95, h, '#8a7258');
      for (let k = 0; k < 5; k++) placa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, 'esq', 0.1 + k * 0.17, 0.22 + k * 0.17, 0.45 + (k % 2) * 0.2, 0.7 + (k % 2) * 0.2, h, ['#e8e2d0', '#d4c890', '#c9c2b0'][k % 3]); } break;
    case 'poste': { const p = iso(x + 0.5, y + 0.5); g.fillStyle = '#3a3a36'; g.fillRect(p.x - 2, p.y - h, 4, h); g.fillRect(p.x - 2, p.y - h, 12, 3); g.fillStyle = COR.luz; g.fillRect(p.x + 6, p.y - h + 3, 6, 3); } break;
    case 'fogueira': { const p = iso(x + 0.5, y + 0.5); g.fillStyle = '#4a4440'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; g.fillRect(p.x + Math.cos(a) * 12 - 2, p.y + Math.sin(a) * 6 - 2, 4, 3); }
      g.fillStyle = '#2a201a'; g.fillRect(p.x - 7, p.y - 3, 14, 3);
      const f = Math.sin(t * 9) * 1.5; g.fillStyle = '#C65345'; g.beginPath(); g.moveTo(p.x - 6, p.y - 2); g.lineTo(p.x, p.y - 15 - f); g.lineTo(p.x + 6, p.y - 2); g.fill();
      g.fillStyle = COR.luz; g.beginPath(); g.moveTo(p.x - 3, p.y - 2); g.lineTo(p.x + 1, p.y - 10 + f); g.lineTo(p.x + 4, p.y - 2); g.fill();
      caixa(g, x + 0.3, y + 0.35, 0.4, 0.3, 10, '#3a3a36', 14); } break;
    case 'banco': caixa(g, x + 0.2, y + 0.1, 0.6, d - 0.2, h, '#6e5038'); break;
    case 'cerca': caixa(g, x + 0.4, y + 0.4, 0.2, 0.2, h, '#6e5a44'); caixa(g, x + 0.05, y + 0.45, 0.9, 0.1, 3, '#7e6a54', 12); caixa(g, x + 0.45, y + 0.05, 0.1, 0.9, 3, '#7e6a54', 6); break;
    case 'casinha': caixa(g, x + 0.15, y + 0.15, 0.7, 0.7, 14, '#8a6a46'); { const A = iso(x + 0.15, y + 0.5), B = iso(x + 0.85, y + 0.5); const C = iso(x + 0.85, y + 0.85), D = iso(x + 0.15, y + 0.85);
      g.fillStyle = COR.ferrugem; g.beginPath(); g.moveTo(D.x, D.y - 14); g.lineTo(C.x, C.y - 14); g.lineTo(B.x, B.y - h); g.lineTo(A.x, A.y - h); g.closePath(); g.fill(); placa(g, x + 0.15, y + 0.15, 0.7, 0.7, 'esq', 0.35, 0.65, 0, 0.6, 14, '#1a1612'); } break;
    case 'arvore': { const p = iso(x + 0.5, y + 0.5); g.fillStyle = '#4a3a2a'; g.fillRect(p.x - 3, p.y - 40, 6, 40);
      const sway = Math.sin(t * 0.8 + x) * 1.5;
      for (const [dx, dy, rr, c] of [[0, -62, 26, '#3f5236'], [-12, -80, 20, '#4a5f3e'], [12, -78, 22, '#566D4A'], [2, -98, 16, '#5f7450']]) { g.fillStyle = c; g.beginPath(); g.arc(p.x + dx + sway, p.y + dy, rr, 0, 7); g.fill(); }
      g.fillStyle = '#ffffff10'; g.beginPath(); g.arc(p.x - 8 + sway, p.y - 92, 8, 0, 7); g.fill(); } break;
    default: caixa(g, x, y, w, d, h, '#777');
  }
}

// caixa de tela aproximada de um objeto (pra oclusão e clique)
function caixaTela(o) {
  const h = o.h || ALTURA[o.tipo] || 20;
  const l = iso(o.x, o.y + o.d).x, rr = iso(o.x + o.w, o.y).x, top = iso(o.x, o.y).y - h - 6, bot = iso(o.x + o.w, o.y + o.d).y;
  if (o.tipo === 'arvore') return { x0: l - 14, x1: rr + 14, y0: top, y1: bot };
  return { x0: l, x1: rr, y0: top, y1: bot };
}
const ALTOS = new Set(['muro', 'pilar', 'portao', 'guarita', 'arquivo', 'estante', 'antena', 'beliche', 'armario', 'barraca', 'tenda', 'tanque', 'quadro', 'poste', 'arvore', 'ferramentas', 'caixas', 'bloco']);

// ---------- pessoas ----------
const PELE = { p1: '#F1C9A5', p2: '#E0A982', p3: '#C68B62', p4: '#A0694A', p5: '#7A4E35', p6: '#5A3826' };
// pele dos infectados: fora das opções do jogador
const PELE_Z = { z1: '#93a48c', z2: '#a9ad92', z3: '#7f8f88' };
const CABELO = { c1: '#1E1A17', c2: '#4A2E1E', c3: '#7A4A2A', c4: '#B98A4A', c5: '#8A8F93', c6: '#9A3A2A' };
const ROUPA = {
  jaqueta: { torso: '#A65F3D', detalhe: '#7a4228', calca: '#33383B', bota: '#2a2522', manga: '#A65F3D' },
  moletom: { torso: '#5E7472', detalhe: '#465a58', calca: '#3E4F66', bota: '#2a2522', manga: '#5E7472', capuz: true },
  colete: { torso: '#566D4A', detalhe: '#9B8D66', calca: '#5A5446', bota: '#3a2e24', manga: '#9B8D66', colete: true },
  macacao: { torso: '#4F5D6B', detalhe: '#6a7a88', calca: '#4F5D6B', bota: '#2a2522', manga: '#C9C2B0', alcas: true },
  // dos NPCs
  bashar: { torso: '#4a5a3a', detalhe: '#3a4a2c', calca: '#3a3a34', bota: '#2a2522', manga: '#4a5a3a', bolsos: true },
  prefeito: { torso: '#C9B48A', detalhe: '#7a6a4a', calca: '#4a4438', bota: '#3a2a1e', manga: '#C9B48A', colete: true, coleteCor: '#6a5a44' },
  wolf: { torso: '#5a5a58', detalhe: '#6b4a2c', calca: '#33383B', bota: '#2a2522', manga: '#5a5a58', avental: true },
  guarda: { torso: '#5c6650', detalhe: '#3e4636', calca: '#3e4636', bota: '#1e1c1a', manga: '#5c6650', bolsos: true },
  morador1: { torso: '#7a6a8a', detalhe: '#5a4a6a', calca: '#3E4F66', bota: '#2a2522', manga: '#7a6a8a' },
  morador2: { torso: '#8a7a4a', detalhe: '#6a5a34', calca: '#4a3e34', bota: '#2a2522', manga: '#8a7a4a' },
  // infectados
  errante: { torso: '#6c6a5a', detalhe: '#4e4c40', calca: '#3a3c40', bota: '#2a2522', manga: '#6c6a5a' },
  errante2: { torso: '#5a6470', detalhe: '#444c56', calca: '#4a4034', bota: '#2a2522', manga: '#8f8a78' },
  corredor: { torso: '#8a4a3e', detalhe: '#6a342c', calca: '#33383B', bota: '#3a2e24', manga: '#b0a590' },
  porteiro: { torso: '#3e4a56', detalhe: '#9B8D66', calca: '#2c3238', bota: '#1e1c1a', manga: '#3e4a56', colete: true, coleteCor: '#9B8D66' },
};
// aparências prontas dos NPCs (mesmo corpo do jogador, pra mesma escala e pivô)
const NPC_AP = {
  prefeito: { corpo: 'b', pele: 'p3', cabelo: 'curto', corCabelo: 'c5', roupa: 'prefeito', oculos: true },
  wolf: { corpo: 'b', pele: 'p2', cabelo: 'raspado', corCabelo: 'c2', roupa: 'wolf', bandana: true, barba: true },
  bashar: { corpo: 'a', pele: 'p4', cabelo: 'curto', corCabelo: 'c1', roupa: 'bashar', fone: true, barba: true },
  guarda: { corpo: 'b', pele: 'p5', cabelo: 'raspado', corCabelo: 'c1', roupa: 'guarda', bone: true },
  morador1: { corpo: 'a', pele: 'p1', cabelo: 'coque', corCabelo: 'c6', roupa: 'morador1' },
  morador2: { corpo: 'b', pele: 'p6', cabelo: 'cacheado', corCabelo: 'c1', roupa: 'morador2' },
};
// infectados da rua. "escala" aumenta o desenho inteiro (o chefe é maior)
const INIMIGO_AP = {
  errante: [
    { corpo: 'b', pele: 'z1', cabelo: 'curto', corCabelo: 'c1', roupa: 'errante', zumbi: true },
    { corpo: 'a', pele: 'z2', cabelo: 'longo', corCabelo: 'c2', roupa: 'errante2', zumbi: true },
  ],
  corredor: [{ corpo: 'a', pele: 'z3', cabelo: 'raspado', corCabelo: 'c1', roupa: 'corredor', zumbi: true }],
  porteiro: [{ corpo: 'b', pele: 'z1', cabelo: 'raspado', corCabelo: 'c5', roupa: 'porteiro', zumbi: true, bone: true, machado: true, escala: 1.4 }],
};

// o que cada equipamento muda no desenho do boneco (ap.eq = { arma, protecao, mochila, ferramenta })
const EQUIP_VIS = {
  barra_portao: { haste: '#8f979c' },
  cano_rebite: { haste: '#7d858a', cabeca: '#4f5559' },
  machadinha: { haste: '#5a4a38', lamina: '#b9c0c4' },
  jaqueta_ronda: { reforco: '#5a3a26' },
  colete_lona: { colete: '#b7a67a' },
  mochila_lona: { bolsa: '#6b7350', alca: '#4c5238' },
  mochila_reforcada: { bolsa: '#4a5560', alca: '#333b44', armacao: '#aab1b5', grande: true },
  ferramenta_recuperacao: { cinto: '#a8443a' },
};

const QW = 48, QH = 80, PX = 24, PY = 74;
const DIRS = ['SE', 'SW', 'NE', 'NW'];

// desenha um quadro do boneco. dir: SE/SW (de frente) ou NE/NW (de costas). estado: parado | anda | trabalha
function quadroPessoa(ap, dir, estado, f) {
  const c = document.createElement('canvas'); c.width = QW; c.height = QH;
  const g = c.getContext('2d');
  const R = ROUPA[ap.roupa] || ROUPA.jaqueta, pele = PELE[ap.pele] || PELE_Z[ap.pele] || PELE.p2, cab = CABELO[ap.corCabelo] || CABELO.c1;
  const frente = dir === 'SE' || dir === 'SW', lado = dir === 'SE' || dir === 'NE' ? 1 : -1;
  const largo = ap.corpo === 'b' ? 2 : 0;
  const fase = estado === 'anda' ? (f / 8) * Math.PI * 2 : 0;
  const passo = Math.sin(fase), bob = estado === 'anda' ? Math.round(1 - Math.abs(Math.sin(fase))) : (estado === 'parado' && f % 4 >= 2 ? 1 : 0);
  const px = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const zumbi = !!ap.zumbi, atq = estado === 'ataca' ? f : -1, golpe = atq >= 2 && atq <= 3;
  const cx = PX + (golpe && zumbi ? lado * 2 : 0), topo = 22 + bob + (zumbi ? 1 : 0);
  const eq = ap.eq || {}, vArma = EQUIP_VIS[eq.arma], vProt = EQUIP_VIS[eq.protecao], vMoch = EQUIP_VIS[eq.mochila], vFerr = EQUIP_VIS[eq.ferramenta];

  // pernas
  const pernaY = 56 + bob, pernaH = PY - pernaY;
  const pa = Math.round(passo * 2), pb = -pa;
  const pernaE = cx - 5 - largo / 2, pernaD = cx + 1 + largo / 2;
  // passada: uma perna vai à frente enquanto a outra fica pra trás; a que sobe encolhe
  const anda = estado === 'anda', avE = anda ? -Math.round(Math.cos(fase) * 2.4) * lado : 0, avD = -avE;
  const meioE = Math.round(pernaH * 0.5);
  px(pernaE, pernaY, 4, meioE, R.calca); px(pernaE + avE, pernaY + meioE, 4, pernaH - meioE - Math.max(0, pa), R.calca); px(pernaE + avE, PY - 3 - Math.max(0, pa), 5, 3, R.bota);
  px(pernaD, pernaY, 4, meioE, tom(R.calca, 0.82)); px(pernaD + avD, pernaY + meioE, 4, pernaH - meioE - Math.max(0, pb), tom(R.calca, 0.82)); px(pernaD + avD, PY - 3 - Math.max(0, pb), 5, 3, tom(R.bota, 0.85));

  // braço do fundo (atrás do tronco)
  const tw = 14 + largo, tx = cx - tw / 2, ty = topo + 12;
  const bracoBalanço = estado === 'anda' ? Math.round(-passo * 2) : 0;
  const trab = estado === 'trabalha' ? Math.round(Math.sin(f / 6 * Math.PI * 2) * 2) : 0;
  const ladoFundo = lado > 0 ? tx - 3 : tx + tw - 1;
  if (zumbi) { px(lado > 0 ? tx + tw - 3 : tx - 7, ty + 2 + (f % 2), 10, 4, tom(R.manga, 0.75)); px(lado > 0 ? tx + tw + 7 : tx - 10, ty + 2 + (f % 2), 3, 4, tom(pele, 0.8)); }
  else { px(ladoFundo, ty + 2 - bracoBalanço, 4, 13, tom(R.manga, 0.75)); px(ladoFundo, ty + 15 - bracoBalanço, 4, 3, tom(pele, 0.8)); }

  // mochila: de frente ela aparece só pelas beiradas, atrás do tronco
  if (vMoch && frente) { const mg = vMoch.grande ? 3 : 2; px(tx - mg, ty + 2, tw + mg * 2, vMoch.grande ? 17 : 14, tom(vMoch.bolsa, 0.85)); }

  // tronco
  px(tx, ty, tw, 21, R.torso);
  px(tx + tw - 4, ty, 4, 21, tom(R.torso, 0.8));             // lado na sombra (luz da esquerda)
  if (R.colete) { const cc = R.coleteCor || R.torso; px(tx, ty, 4, 18, cc); px(tx + tw - 4, ty, 4, 18, tom(cc, 0.8)); if (!R.coleteCor) { px(tx + 1, ty + 8, 3, 3, tom(cc, 0.7)); px(tx + tw - 4, ty + 8, 3, 3, tom(cc, 0.6)); } }
  if (R.alcas && frente) { px(tx + 3, ty, 2, 10, R.detalhe); px(tx + tw - 5, ty, 2, 10, R.detalhe); px(tx + 2, ty + 9, tw - 4, 3, R.detalhe); }
  if (R.avental && frente) { px(tx + 2, ty + 5, tw - 4, 18, R.detalhe); px(tx + 4, ty + 9, 3, 3, tom(R.detalhe, 0.75)); }
  if (R.bolsos && frente) { px(tx + 2, ty + 5, 4, 3, R.detalhe); px(tx + tw - 6, ty + 5, 4, 3, R.detalhe); }
  if (ap.roupa === 'jaqueta' && frente) { px(cx - 1 + lado, ty + 1, 1, 19, R.detalhe); px(tx + 2, ty, 4, 3, tom(R.torso, 1.12)); }
  if (R.capuz && frente) { px(tx + 3, ty + 12, tw - 6, 5, R.detalhe); }
  if (ap.roupa === 'prefeito' && frente) { px(cx - 1, ty, 2, 9, '#6a3a2a'); }
  // proteção por cima da roupa
  if (vProt && vProt.colete) {
    px(tx, ty, tw, 17, vProt.colete); px(tx + tw - 4, ty, 4, 17, tom(vProt.colete, 0.8));
    px(tx, ty + 8, tw, 1, tom(vProt.colete, 0.7));
    if (frente) { px(cx - 1, ty, 2, 17, tom(vProt.colete, 0.65)); px(tx + 2, ty + 11, 4, 4, tom(vProt.colete, 0.75)); }
  }
  if (vProt && vProt.reforco) { px(tx, ty, 4, 3, vProt.reforco); px(tx + tw - 4, ty, 4, 3, tom(vProt.reforco, 0.8)); if (!frente) px(tx + 3, ty + 4, tw - 6, 2, vProt.reforco); }
  if (vMoch && frente) { px(tx + 2, ty, 2, 13, vMoch.alca); px(tx + tw - 4, ty, 2, 13, vMoch.alca); }
  px(tx, ty + 19, tw, 2, tom(R.calca, 0.7)); // cinto
  if (vFerr && frente) { px(cx - lado * 6, ty + 17, 2, 8, vFerr.cinto); px(cx - lado * 6 - (lado > 0 ? 1 : -1), ty + 17, 2, 2, vFerr.cinto); }
  // de costas a mochila cobre as costas
  if (vMoch && !frente) {
    const mw = vMoch.grande ? tw - 2 : tw - 4, mh = vMoch.grande ? 18 : 14, mx = cx - mw / 2;
    px(mx, ty + 1, mw, mh, vMoch.bolsa); px(mx + mw - 3, ty + 1, 3, mh, tom(vMoch.bolsa, 0.8));
    px(mx + 2, ty + mh - 5, mw - 4, 1, tom(vMoch.bolsa, 0.65)); px(mx + 1, ty + 1, mw - 2, 2, tom(vMoch.bolsa, 1.15));
    if (vMoch.armacao) { px(mx, ty + 1, 1, mh, vMoch.armacao); px(mx + mw - 1, ty + 1, 1, mh, vMoch.armacao); }
  }

  // braço da frente
  const ladoFrente = lado > 0 ? tx + tw - 1 : tx - 3;
  const metal = vArma ? vArma.haste : '#aab1b5';
  // ponta da arma: cabeça de rebite ou lâmina. (x, y) é a ponta da haste; sx diz pra que lado a lâmina abre
  const ponta = (x, y, sx) => {
    if (!vArma) return;
    if (vArma.cabeca) px(x - 1, y - 1, 4, 5, vArma.cabeca);
    if (vArma.lamina) { px(sx > 0 ? x + 1 : x - 4, y, 5, 5, vArma.lamina); px(sx > 0 ? x + 5 : x - 5, y + 1, 1, 3, tom(vArma.lamina, 1.15)); }
  };
  // haste inclinada, pixel a pixel, da mão até a ponta
  const haste = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 2, 2, metal);
    px(x0, y0, 2, 2, tom(metal, 0.7));   // empunhadura
  };
  if (zumbi) {
    const sobe = golpe ? -3 : 0, bx = lado > 0 ? tx + tw - 2 : tx - 10;
    if (R.colete && frente) px(tx + 4, ty + 7, tw - 8, 6, '#6a1f1a');
    else if (frente) px(tx + 3 + (ap.corpo === 'b' ? 3 : 0), ty + 8, 5, 6, '#6a1f1a');
    px(bx, ty + 5 + sobe, 12, 4, R.manga); px(lado > 0 ? bx + 12 : bx - 3, ty + 5 + sobe, 3, 4, pele);
    if (ap.machado) { const mx = lado > 0 ? bx + 13 : bx - 3; px(mx, ty - 9 + sobe, 2, 18, '#5a4a38'); px(lado > 0 ? mx + 1 : mx - 5, ty - 9 + sobe, 6, 6, metal); }
  } else if (atq >= 0) {
    // golpe em três tempos: arma no alto, desce pra frente, recolhe
    // a arma acompanha a mão: armada pra trás no alto, desce na diagonal, termina baixa na frente
    const mx = ladoFrente + 1;
    if (atq < 2) {
      px(ladoFrente, ty - 7, 4, 12, R.manga); px(ladoFrente, ty - 10, 4, 3, pele);
      const tx1 = mx - lado * (atq === 0 ? 3 : 6), ty1 = ty - 23 + atq;
      haste(mx, ty - 9, tx1, ty1); ponta(tx1, ty1 - 1, -lado);
    } else if (atq < 4) {
      // braço dobrado: o cotovelo fica junto do corpo e o antebraço vai pra frente
      px(ladoFrente, ty + 2, 4, 8, R.manga);
      const fx = lado > 0 ? ladoFrente + 3 : ladoFrente - 3, fy = ty + (atq === 2 ? 5 : 7);
      px(fx, fy, 4, 4, R.manga); const hx0 = lado > 0 ? fx + 4 : fx - 3; px(hx0, fy, 3, 4, pele);
      const gx = hx0 + (lado > 0 ? 1 : 0), tx1 = gx + lado * 6, ty1 = atq === 2 ? fy - 6 : fy + 9;
      haste(gx, fy + 1, tx1, ty1); ponta(tx1, ty1 - (atq === 2 ? 2 : 0), lado);
      if (atq === 3) { px(tx1 - lado * 2, fy - 8, 2, 4, '#ffffff'); px(tx1 + lado, fy - 5, 2, 5, '#ffffff'); px(tx1 + lado * 2, fy, 2, 4, '#ffffff'); }   // rastro do golpe
    } else {
      px(ladoFrente, ty + 2, 4, 13, R.manga); px(ladoFrente, ty + 15, 4, 3, pele);
      const tx1 = mx + lado * 8, ty1 = ty + 23;
      haste(mx, ty + 16, tx1, ty1); ponta(tx1, ty1, lado);
    }
  } else {
  px(ladoFrente, ty + 2 + bracoBalanço - trab, 4, 13, R.manga);
  px(ladoFrente, ty + 15 + bracoBalanço - trab, 4, 3, pele);
  if (vProt && vProt.reforco) px(ladoFrente, ty + 9 + bracoBalanço - trab, 4, 5, vProt.reforco);
  // arma na mão, carregada baixa e apontando pra frente; acompanha o balanço do braço
  if (vArma && estado !== 'trabalha') {
    const gx = ladoFrente + 1, gy = ty + 16 + bracoBalanço, tx1 = gx + lado * 7, ty1 = gy + 9;
    haste(gx - lado * 2, gy - 3, tx1, ty1); ponta(tx1, ty1, lado);
    px(ladoFrente, gy - 1, 4, 3, pele);   // a mão fecha por cima do cabo
  }
  }
  if (estado === 'trabalha') px(ladoFrente + lado * 2, ty + 14 + bracoBalanço - trab, 2, 6, '#8f979c');

  // pescoço e cabeça
  px(cx - 2, topo + 10, 4, 3, tom(pele, 0.85));
  const hx = cx - 6 + (frente ? lado : 0), hy = topo - 2;
  px(hx, hy, 12, 12, pele);
  px(hx + (lado > 0 ? 9 : 0), hy, 3, 12, tom(pele, 0.85));
  // cabelo
  const est = ap.cabelo;
  if (est !== 'raspado') {
    px(hx - 1, hy - 2, 14, 4, cab);
    if (!frente) px(hx - 1, hy, 14, est === 'longo' ? 14 : 8, cab);
    else { px(hx - 1, hy + 1, 2, est === 'longo' ? 12 : 5, cab); px(hx + 11, hy + 1, 2, est === 'longo' ? 12 : 5, cab); }
    if (est === 'coque') px(hx + 3, hy - 6, 6, 5, cab);
    if (est === 'moicano') { px(hx + 4, hy - 6, 4, 6, cab); }
    if (est === 'cacheado') { px(hx - 2, hy - 3, 16, 6, cab); px(hx - 2, hy + 2, 3, 6, cab); px(hx + 11, hy + 2, 3, 6, cab); for (let k = 0; k < 5; k++) px(hx - 1 + k * 3, hy - 4, 2, 1, tom(cab, 1.3)); }
    if (est === 'longo' && frente) px(hx + (lado > 0 ? -1 : 10), hy + 10, 3, 6, cab);
  } else px(hx, hy - 1, 12, 3, tom(cab, 1.15));
  if (frente) {
    const ox = lado > 0 ? 3 : 1;
    px(hx + ox + 1, hy + 5, 2, 2, '#1a1612'); px(hx + ox + 6, hy + 5, 2, 2, '#1a1612');
    px(hx + ox + 3, hy + 9, 3, 1, tom(pele, 0.7));
    if (zumbi) { px(hx + ox + 1, hy + 4, 3, 3, '#2a2420'); px(hx + ox + 6, hy + 4, 3, 3, '#2a2420'); px(hx + ox + 2, hy + 5, 1, 1, '#e8e2a8'); px(hx + ox + 7, hy + 5, 1, 1, '#e8e2a8'); px(hx + ox + 2, hy + 9, 5, 2, '#6a1f1a'); }
    if (ap.barba) px(hx + 1, hy + 8, 10, 4, tom(cab, 1.05));
    if (ap.oculos) { px(hx + ox, hy + 4, 4, 4, '#2a2a2a'); px(hx + ox + 5, hy + 4, 4, 4, '#2a2a2a'); px(hx + ox + 1, hy + 5, 2, 2, '#a8c8d0'); px(hx + ox + 6, hy + 5, 2, 2, '#a8c8d0'); }
  }
  if (ap.bandana) { px(hx - 1, hy - 1, 14, 3, COR.aviso); if (!frente) px(hx + (lado > 0 ? -3 : 12), hy, 3, 4, COR.aviso); }
  if (ap.bone) { px(hx - 1, hy - 2, 14, 4, '#3e4636'); if (frente) px(hx + (lado > 0 ? 6 : -4), hy + 1, 10, 2, '#2e3428'); }
  if (ap.fone) { px(hx - 2, hy + 3, 3, 5, '#24282B'); px(hx + 11, hy + 3, 3, 5, '#24282B'); px(hx - 1, hy - 3, 14, 2, '#24282B'); if (frente) px(hx + (lado > 0 ? 11 : -2), hy + 8, 1, 4, '#24282B'); }

  // contorno escuro pra ler bem em cima de qualquer chão
  const o = document.createElement('canvas'); o.width = QW; o.height = QH;
  const og = o.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) og.drawImage(c, dx, dy);
  og.globalCompositeOperation = 'source-in'; og.fillStyle = '#141412'; og.fillRect(0, 0, QW, QH);
  og.globalCompositeOperation = 'source-over'; og.drawImage(c, 0, 0);
  return o;
}

// cópia toda clara do quadro, pro clarão de quando alguém leva um golpe
const cacheSilhueta = new WeakMap();
function silhueta(q) {
  let s = cacheSilhueta.get(q);
  if (!s) {
    s = document.createElement('canvas'); s.width = q.width; s.height = q.height;
    const g = s.getContext('2d'); g.drawImage(q, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff4e6'; g.fillRect(0, 0, s.width, s.height);
    cacheSilhueta.set(q, s);
  }
  return s;
}
const cacheSprites = new Map();
function folha(ap) {
  const k = JSON.stringify(ap);
  if (cacheSprites.has(k)) return cacheSprites.get(k);
  const s = {};
  for (const d of DIRS) {
    s[d] = {
      parado: [0, 1, 2, 3].map(f => quadroPessoa(ap, d, 'parado', f)),
      anda: [0, 1, 2, 3, 4, 5, 6, 7].map(f => quadroPessoa(ap, d, 'anda', f)),
      trabalha: [0, 1, 2, 3, 4, 5].map(f => quadroPessoa(ap, d, 'trabalha', f)),
      ataca: [0, 1, 2, 3, 4, 5].map(f => quadroPessoa(ap, d, 'ataca', f)),
    };
  }
  cacheSprites.set(k, s);
  return s;
}

PZ.arte = { COR, TW, TH, HW, HH, iso, tom, desenharChao, desenharObjeto, caixaTela, ALTOS, ALTURA, folha, silhueta, NPC_AP, INIMIGO_AP, PELE, CABELO, ROUPA, EQUIP_VIS, QW, QH, PX, PY, DIRS };
})();
