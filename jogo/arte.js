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
  const P = (x, y) => { const p = iso(x, y); return { x: p.x + ox, y: p.y + oy }; };
  const quad = (x0, y0, x1, y1, cor) => { const a = P(x0, y0), b = P(x1, y0), cc = P(x1, y1), d = P(x0, y1); g.fillStyle = cor; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y); g.closePath(); g.fill(); };
  const linha = (x0, y0, x1, y1, cor, l = 1) => { const a = P(x0, y0), b = P(x1, y1); g.strokeStyle = cor; g.lineWidth = l; g.beginPath(); g.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5); g.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5); g.stroke(); };
  const ponto = (x, y, w, h, cor) => { const p = P(x, y); g.fillStyle = cor; g.fillRect(Math.round(p.x), Math.round(p.y), w, h); };
  const tipo = (x, y) => x < 0 || y < 0 || x >= LARG || y >= ALT ? -1 : chao[y * LARG + x];
  const VERDE = ['#3a5230', '#4c6a3e', '#5e7e4a', '#7a9a5a'];

  for (let y = 0; y < ALT; y++) for (let x = 0; x < LARG; x++) {
    const t = chao[y * LARG + x], st = CHAO[t], r = rng(x * 7349 + y * 1931 + t * 17), m = st.marca;
    const q = r(); quad(x, y, x + 1, y + 1, q < 0.6 ? st.base : st.var[Math.floor(q * 7) % st.var.length]);
    if (m === 'grama') {
      // tufos de capim em três tons, uma ou outra flor
      for (let k = 0; k < 46; k++) { const u = r(), v = r(), cor = VERDE[Math.floor(r() * 4)]; ponto(x + u, y + v, 1, 2 + Math.floor(r() * 2), cor); }
      if (r() > 0.55) { const u = 0.2 + r() * 0.6, v = 0.2 + r() * 0.6; for (let k = 0; k < 5; k++) ponto(x + u + (r() - 0.5) * 0.2, y + v + (r() - 0.5) * 0.2, 2, 2, VERDE[0]); }
      if (r() > 0.7) { const cor = ['#d8c070', '#e8e2d0', '#c65345', '#b58ac0'][Math.floor(r() * 4)]; const u = r(), v = r(); ponto(x + u, y + v, 2, 1, cor); ponto(x + u + 0.03, y + v - 0.03, 1, 1, '#f4efe2'); }
    } else if (m === 'terra' || m === 'arado') {
      for (let k = 0; k < 22; k++) ponto(x + r(), y + r(), 2, 1, r() > 0.5 ? tom(st.base, 1.18) : tom(st.base, 0.78));
      if (r() > 0.75) { const p = P(x + 0.3 + r() * 0.4, y + 0.3 + r() * 0.4); g.fillStyle = tom(st.base, 0.85); g.beginPath(); g.ellipse(p.x, p.y, 9, 4, 0, 0, 7); g.fill(); }
      if (m === 'arado') for (let k = 0; k < 3; k++) { linha(x + 0.1, y + 0.2 + k * 0.3, x + 0.9, y + 0.2 + k * 0.3, '#33281e', 2); for (let j = 0; j < 4; j++) ponto(x + 0.15 + j * 0.2, y + 0.12 + k * 0.3, 1, 2, '#6f8a4a'); }
    } else if (m === 'cascalho') {
      for (let k = 0; k < 40; k++) { const cor = ['#857f70', '#5a554c', '#9a9484', '#6e685c'][Math.floor(r() * 4)]; ponto(x + r(), y + r(), 2, 1 + Math.floor(r() * 2), cor); }
    } else if (m === 'concreto') {
      // placas com junta de dilatação e mancha
      linha(x + 0.5, y, x + 0.5, y + 1, tom(st.base, 0.74)); linha(x, y + 1, x + 1, y + 1, tom(st.base, 0.74)); linha(x + 1, y, x + 1, y + 1, tom(st.base, 0.74));
      linha(x + 0.02, y + 0.02, x + 0.98, y + 0.02, tom(st.base, 1.14));
      for (let k = 0; k < 18; k++) ponto(x + r(), y + r(), 1, 1, r() > 0.5 ? tom(st.base, 1.12) : tom(st.base, 0.84));
      if (r() > 0.7) { const p = P(x + 0.3 + r() * 0.4, y + 0.3 + r() * 0.4); g.fillStyle = '#3a383422'; g.beginPath(); g.ellipse(p.x, p.y, 10, 5, 0, 0, 7); g.fill(); }
      if (r() > 0.75) { const u = r() * 0.6 + 0.2, v = r() * 0.6 + 0.2; linha(x + u, y + v, x + u + 0.15, y + v + 0.1, tom(st.base, 0.6)); linha(x + u + 0.15, y + v + 0.1, x + u + 0.12, y + v + 0.28, tom(st.base, 0.6)); }
    } else if (m === 'calcada') {
      // ladrilho 2×2 por célula, cada um com tom próprio, rejunte escuro e quina clara
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const a = x + i / 2, b = y + j / 2, f = 0.92 + r() * 0.14;
        quad(a, b, a + 0.5, b + 0.5, tom(st.base, f));
        linha(a + 0.03, b + 0.03, a + 0.47, b + 0.03, tom(st.base, f + 0.12)); linha(a + 0.03, b + 0.03, a + 0.03, b + 0.47, tom(st.base, f + 0.08));
        linha(a + 0.5, b, a + 0.5, b + 0.5, tom(st.base, 0.68)); linha(a, b + 0.5, a + 0.5, b + 0.5, tom(st.base, 0.68));
        if (r() > 0.9) { ponto(a + 0.45, b + 0.2, 1, 2, VERDE[1]); ponto(a + 0.46, b + 0.22, 1, 1, VERDE[3]); }    // mato no rejunte
        if (r() > 0.93) linha(a + 0.1, b + 0.15, a + 0.35, b + 0.4, tom(st.base, 0.7));
      }
    } else if (m === 'asfalto' || m === 'faixaX' || m === 'faixaY') {
      for (let k = 0; k < 50; k++) ponto(x + r(), y + r(), 1, 1, r() > 0.55 ? '#4a4d4e' : '#323536');
      if (r() > 0.8) { const u = r() * 0.5, v = r() * 0.5; quad(x + u, y + v, x + u + 0.4, y + v + 0.35, '#353839'); linha(x + u, y + v, x + u + 0.4, y + v, '#2a2c2d'); }   // remendo
      if (r() > 0.6) { let u = r(), v = r(); for (let k = 0; k < 4; k++) { const nu = u + (r() - 0.3) * 0.25, nv = v + (r() - 0.3) * 0.25; linha(x + Math.min(0.98, Math.max(0.02, u)), y + Math.min(0.98, Math.max(0.02, v)), x + Math.min(0.98, Math.max(0.02, nu)), y + Math.min(0.98, Math.max(0.02, nv)), '#25272a'); u = nu; v = nv; } if (r() > 0.5) ponto(x + Math.min(0.95, Math.max(0.05, u)), y + Math.min(0.95, Math.max(0.05, v)), 1, 2, VERDE[1]); }
      if (r() > 0.9) { const p = P(x + 0.3 + r() * 0.4, y + 0.3 + r() * 0.4); g.fillStyle = '#2a3a44'; g.beginPath(); g.ellipse(p.x, p.y, 12, 5, 0, 0, 7); g.fill(); g.fillStyle = '#5a7480'; g.fillRect(Math.round(p.x - 6), Math.round(p.y - 2), 6, 1); }   // poça
      if (m !== 'asfalto' && r() > 0.25) { if (m === 'faixaX') { quad(x + 0.15, y + 0.45, x + 0.85, y + 0.55, '#b8a860'); quad(x + 0.15, y + 0.45, x + 0.85, y + 0.48, '#d0c078'); } else { quad(x + 0.45, y + 0.15, x + 0.55, y + 0.85, '#b8a860'); quad(x + 0.45, y + 0.15, x + 0.48, y + 0.85, '#d0c078'); } }
    } else if (m === 'madeira') {
      for (let k = 0; k < 4; k++) { const b = y + k / 4; quad(x, b, x + 1, b + 0.25, tom(st.base, 0.9 + r() * 0.18)); linha(x, b + 0.25, x + 1, b + 0.25, tom(st.base, 0.6)); linha(x, b + 0.02, x + 1, b + 0.02, tom(st.base, 1.12)); const e = r() * 0.8 + 0.1; linha(x + e, b, x + e, b + 0.25, tom(st.base, 0.65)); ponto(x + 0.08, b + 0.12, 1, 1, '#2a2016'); ponto(x + 0.92, b + 0.12, 1, 1, '#2a2016'); }
    } else if (m === 'agua') {
      for (let k = 0; k < 8; k++) { const u = r(), v = r(); linha(x + u, y + v, x + Math.min(1, u + 0.18), y + v, r() > 0.5 ? '#5f8a90' : '#3e6670'); }
      if (r() > 0.8) ponto(x + r(), y + r(), 2, 1, '#a8c8d0');
    }
  }
  // borda da grama invade o que está do lado, em tufos irregulares
  for (let y = 0; y < ALT; y++) for (let x = 0; x < LARG; x++) {
    if (CHAO[chao[y * LARG + x]].marca !== 'grama') continue;
    const r = rng(x * 31 + y * 977 + 5);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = tipo(x + dx, y + dy); if (v < 0 || CHAO[v].marca === 'grama' || CHAO[v].marca === 'agua') continue;
      for (let k = 0; k < 6; k++) {
        const s = r(), fora = 0.04 + r() * 0.16;
        const bx = dx ? (dx > 0 ? x + 1 + fora : x - fora) : x + s, by = dy ? (dy > 0 ? y + 1 + fora : y - fora) : y + s;
        const p = P(bx, by); g.fillStyle = VERDE[1]; g.beginPath(); g.ellipse(Math.round(p.x), Math.round(p.y), 3 + r() * 5, 2 + r() * 2, 0, 0, 7); g.fill();
        g.fillStyle = VERDE[0]; g.fillRect(Math.round(p.x - 1), Math.round(p.y + 1), 3, 1);
        for (let j = 0; j < 3; j++) ponto(bx + (r() - 0.5) * 0.12, by + (r() - 0.5) * 0.08, 1, 2, VERDE[2 + (j % 2)]);
      }
    }
  }
  // detalhes soltos: folhas embaixo das árvores, papel e lata na rua
  for (const o of mundo.OBJ || []) {
    const r = rng(o.x * 409 + o.y * 211 + 3);
    if (o.tipo === 'arvore') for (let k = 0; k < 18; k++) { const a = r() * 6.28, d = 0.3 + r() * 0.9; ponto(o.x + 0.5 + Math.cos(a) * d, o.y + 0.5 + Math.sin(a) * d, 2, 1, ['#8a6a3a', '#a65f3d', '#5e7e4a', '#c98a3a'][Math.floor(r() * 4)]); }
  }
  for (let y = 0; y < ALT; y++) for (let x = 0; x < LARG; x++) {
    const m = CHAO[chao[y * LARG + x]].marca, r = rng(x * 53 + y * 7907 + 11);
    if ((m === 'asfalto' || m === 'calcada') && r() > 0.86) { const u = r(), v = r(); if (r() > 0.5) { ponto(x + u, y + v, 3, 2, '#d8d2c0'); ponto(x + u, y + v + 0.02, 3, 1, '#a8a290'); } else { ponto(x + u, y + v, 2, 2, '#8a3a2a'); ponto(x + u, y + v, 1, 1, '#c9c2b0'); } }
  }
  // sombra projetada: a luz vem do alto à esquerda, a sombra cai pra baixo à direita (eixo +x do mundo)
  const sc = document.createElement('canvas'); sc.width = c.width; sc.height = c.height;
  const sg = sc.getContext('2d'); sg.fillStyle = '#0c1014';
  const sq = (x0, y0, x1, y1) => { const a = P(x0, y0), b = P(x1, y0), cc = P(x1, y1), d = P(x0, y1); sg.beginPath(); sg.moveTo(a.x, a.y); sg.lineTo(b.x, b.y); sg.lineTo(cc.x, cc.y); sg.lineTo(d.x, d.y); sg.closePath(); sg.fill(); };
  for (const o of mundo.OBJ || []) {
    const h = o.h || ALTURA[o.tipo] || 20; if (h < 14 || o.tipo === 'placaRua') continue;
    const L = Math.min(1.9, h / 52);
    if (o.tipo === 'arvore') { const p = P(o.x + 0.5 + 1.0, o.y + 0.5); sg.beginPath(); sg.ellipse(p.x, p.y, 34, 16, 0, 0, 7); sg.fill(); sq(o.x + 0.45, o.y + 0.42, o.x + 1.3, o.y + 0.58); }
    else if (o.tipo === 'poste' || o.tipo === 'antena') { sq(o.x + 0.45, o.y + 0.45, o.x + 0.55 + L, o.y + 0.55); sq(o.x + 0.4 + L, o.y + 0.35, o.x + 0.65 + L, o.y + 0.75); }
    else if (o.tipo === 'pneus' || o.tipo === 'tambor') { const p = P(o.x + 0.75, o.y + 0.5); sg.beginPath(); sg.ellipse(p.x, p.y, 14, 7, 0, 0, 7); sg.fill(); }
    else sq(o.x + 0.05, o.y + 0.05, o.x + o.w + L * 0.9, o.y + o.d - 0.05);
  }
  g.globalAlpha = 0.4; g.drawImage(sc, 0, 0); g.globalAlpha = 1;
  return { canvas: c, ox, oy };
}

// ---------- caixas isométricas ----------
const CONTORNO = { ligado: true };
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
  // contorno escuro da silhueta, no estilo dos bonecos (o prédio desenha o dele à parte)
  if (CONTORNO.ligado && h >= 3) {
    g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath();
    g.moveTo(D.x, D.y - z); g.lineTo(C.x, C.y - z); g.lineTo(B.x, B.y - z); g.lineTo(B.x, B.y - up); g.lineTo(A.x, A.y - up); g.lineTo(D.x, D.y - up); g.closePath(); g.stroke();
  }
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
  muro: 70, pilar: 92, portao: 62, guarita: 84, sacos: 14, mesa: 18, arquivo: 46, estante: 58, caixas: 30, caixa: 14,
  bancada: 20, gerador: 22, pneus: 16, carcaca: 26, tambor: 22, ferramentas: 42, antena: 120, mesaRadio: 20,
  beliche: 40, cama: 18, armario: 62, barraca: 56, tenda: 76, maca: 14, caixaMedica: 16, tanque: 96, planta: 10,
  quadro: 44, poste: 124, fogueira: 10, banco: 10, cerca: 18, casinha: 22, arvore: 110,
  bloco: 104, carro: 38, barricada: 22, entulho: 8, placaRua: 40,
};

// caixote de madeira: tábuas, travessa em X e contorno
function caixote(g, x, y, w, d, h, z) {
  caixa(g, x, y, w, d, h, '#8a6a46', z);
  for (const f of ['esq', 'dir']) {
    const esc = f === 'dir' ? 0.72 : 1;
    placa(g, x, y, w, d, f, 0, 1, 0.48, 0.54, h + z, tom('#5a4430', esc));
    placa(g, x, y, w, d, f, 0, 0.08, z / (h + z), 1, h + z, tom('#6e5038', esc)); placa(g, x, y, w, d, f, 0.92, 1, z / (h + z), 1, h + z, tom('#6e5038', esc));
  }
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d);
  g.strokeStyle = '#5a4430'; g.beginPath(); g.moveTo(D.x, D.y - z - h); g.lineTo(B.x, B.y - z - h); g.stroke();
}
// cama de campanha: estrutura, colchão listrado, travesseiro e cobertor dobrado
function cama(g, x, y, d, z, r, semPe) {
  const cobertor = ['#6a3a2a', '#3f5a6a', '#566D4A', '#7a6a3a'][Math.floor(r() * 4)];
  if (!semPe) for (const [a, b] of [[0.14, 0.1], [0.86, 0.1], [0.14, d - 0.1], [0.86, d - 0.1]]) caixa(g, x + a - 0.04, y + b - 0.04, 0.08, 0.08, 6, '#3a2a1e', z);
  caixa(g, x + 0.1, y + 0.05, 0.8, d - 0.1, 3, '#5a4430', z + 6);
  caixa(g, x + 0.13, y + 0.08, 0.74, d - 0.16, 4, '#c9c2b0', z + 9);
  for (let k = 1; k < 6; k++) { const A1 = iso(x + 0.13 + k * 0.74 / 6, y + 0.08), B1 = iso(x + 0.13 + k * 0.74 / 6, y + d - 0.08); g.strokeStyle = '#a8a290'; g.beginPath(); g.moveTo(A1.x, A1.y - z - 13); g.lineTo(B1.x, B1.y - z - 13); g.stroke(); }
  caixa(g, x + 0.2, y + 0.12, 0.6, 0.3, 4, '#ece6d6', z + 13);
  caixa(g, x + 0.12, y + d * 0.5, 0.76, d * 0.5 - 0.1, 3, cobertor, z + 13);
  placa(g, x + 0.12, y + d * 0.5, 0.76, d * 0.5 - 0.1, 'esq', 0, 1, 0, 1, 3, tom(cobertor, 0.8));
  const F1 = iso(x + 0.12, y + d * 0.5 + 0.15), F2 = iso(x + 0.88, y + d * 0.5 + 0.15); g.strokeStyle = tom(cobertor, 1.25); g.beginPath(); g.moveTo(F1.x, F1.y - z - 16); g.lineTo(F2.x, F2.y - z - 16); g.stroke();
}

function desenharObjeto(g, o, t) {
  const { x, y, w, d } = o, h = o.h || ALTURA[o.tipo] || 20, r = rng(x * 131 + y * 71);
  switch (o.tipo) {
    // prédio da rua, uma célula por vez (ordena certo com quem passa). o.sul / o.leste = tem fachada pra rua
    case 'bloco': {
      // andar de 52px: porta de 44px, um pouco mais alta que o boneco (56px com a cabeça)
      const cor = o.cor || '#6b6258', AND = 52, andares = Math.max(1, Math.floor((h - 6) / AND));
      const teto = { topo: tom(cor, 0.66), esq: cor, dir: tom(cor, 0.72) };
      CONTORNO.ligado = false; caixa(g, x, y, 1, 1, h, teto); CONTORNO.ligado = true;
      { // contorno só nas quinas do prédio inteiro, sem riscar a emenda entre células
        const A = iso(x, y), B = iso(x + 1, y), C = iso(x + 1, y + 1), D = iso(x, y + 1), L = (a, b) => { g.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5); g.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5); };
        const up = p => ({ x: p.x, y: p.y - h });
        g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath();
        if (o.sul) { L(D, C); L(up(D), up(C)); if (o.oeste) L(D, up(D)); }
        if (o.leste) { L(C, B); L(up(C), up(B)); if (o.norte) L(B, up(B)); }
        if (o.sul && o.leste) L(C, up(C));
        if (o.norte) L(up(A), up(B)); if (o.oeste) L(up(A), up(D));
        g.stroke();
      }
      // telhado: manta escura com cascalho
      { const c = iso(x + 0.5, y + 0.5); for (let k = 0; k < 10; k++) { g.fillStyle = r() > 0.5 ? '#55524c' : '#3e3c38'; g.fillRect(Math.round(c.x + (r() - 0.5) * 40), Math.round(c.y - h + (r() - 0.5) * 18), 2, 1); } }
      for (const face of ['esq', 'dir']) {
        if (!(face === 'esq' ? o.sul : o.leste)) continue;
        const sombraF = face === 'dir' ? 0.72 : 1;
        // textura: fiadas de tijolo/placa e sujeira subindo do chão
        for (let v = 6; v < h - 4; v += 6) placa(g, x, y, 1, 1, face, 0, 1, v / h, (v + 1) / h, h, tom(cor, 0.9 * sombraF) + '66');
        for (let k = 0; k < 14; k++) { const u = r(), v = r(); placa(g, x, y, 1, 1, face, u, Math.min(1, u + 0.04), v, Math.min(1, v + 2 / h), h, (r() > 0.5 ? tom(cor, 1.15) : tom(cor, 0.75)) + '88'); }
        placa(g, x, y, 1, 1, face, 0, 1, 0, 10 / h, h, '#00000030'); placa(g, x, y, 1, 1, face, 0, 1, 0, 4 / h, h, '#00000030');
        for (let k = 0; k < andares; k++) {
          const b0 = k * AND, s = r();
          // laje entre andares
          if (k > 0) { placa(g, x, y, 1, 1, face, 0, 1, (b0 - 2) / h, (b0 + 2) / h, h, tom(cor, 1.12 * sombraF)); placa(g, x, y, 1, 1, face, 0, 1, (b0 - 3) / h, (b0 - 2) / h, h, '#00000040'); }
          if (k === 0 && o.porta === face) {
            placa(g, x, y, 1, 1, face, 0.26, 0.74, 0, 46 / h, h, tom(cor, 0.6));                  // batente
            placa(g, x, y, 1, 1, face, 0.3, 0.7, 0, 43 / h, h, '#1c1a18');
            placa(g, x, y, 1, 1, face, 0.32, 0.5, 2 / h, 40 / h, h, '#4e3e2e');                   // folha entreaberta
            placa(g, x, y, 1, 1, face, 0.45, 0.48, 18 / h, 22 / h, h, '#a89a58');
            placa(g, x, y, 1, 1, face, 0.22, 0.78, 46 / h, 49 / h, h, '#A65F3D');                 // toldo
            continue;
          }
          if (k === 0 && o.vitrine) {
            placa(g, x, y, 1, 1, face, 0.04, 0.96, 4 / h, 38 / h, h, '#2a3032');
            placa(g, x, y, 1, 1, face, 0.07, 0.93, 6 / h, 36 / h, h, '#1a2022');
            placa(g, x, y, 1, 1, face, 0.12, 0.2, 18 / h, 34 / h, h, '#ffffff14');
            if (s > 0.5) { placa(g, x, y, 1, 1, face, 0.15, 0.55, 6 / h, 22 / h, h, '#6e5a44'); placa(g, x, y, 1, 1, face, 0.6, 0.85, 6 / h, 14 / h, h, '#5a4a38'); }
            else placa(g, x, y, 1, 1, face, 0.5, 0.56, 8 / h, 34 / h, h, '#3a4244');   // vidro quebrado
            placa(g, x, y, 1, 1, face, 0.02, 0.98, 39 / h, 47 / h, h, o.vitrine);       // letreiro
            placa(g, x, y, 1, 1, face, 0.1, 0.9, 42 / h, 44 / h, h, tom(o.vitrine, 1.35));
            continue;
          }
          // janela: moldura, vidro, peitoril; umas acesas, umas tapadas com tábua
          const v0 = (b0 + 18) / h, v1 = (b0 + 42) / h;
          if (v1 > 1) continue;
          placa(g, x, y, 1, 1, face, 0.2, 0.8, v0 - 2 / h, v1 + 2 / h, h, tom(cor, 0.62 * sombraF));
          const acesa = s > 0.8;
          if (acesa && !o._luzes) (o._novas = o._novas || []).push(naFace(x, y, 1, 1, face, 0.5, (v0 + v1) / 2, h));
          placa(g, x, y, 1, 1, face, 0.24, 0.76, v0, v1, h, acesa ? '#c9a05a' : '#1e2628');
          if (acesa) placa(g, x, y, 1, 1, face, 0.24, 0.76, v0, (v0 + v1) / 2, h, '#e0bc72');
          else placa(g, x, y, 1, 1, face, 0.26, 0.36, (v0 + v1) / 2, v1 - 2 / h, h, '#ffffff12');
          placa(g, x, y, 1, 1, face, 0.49, 0.51, v0, v1, h, tom(cor, 0.55 * sombraF));          // caixilho
          placa(g, x, y, 1, 1, face, 0.18, 0.82, v0 - 4 / h, v0 - 1 / h, h, tom(cor, 1.2 * sombraF)); // peitoril
          if (s < 0.3) { for (let j = 0; j < 3; j++) placa(g, x, y, 1, 1, face, 0.2, 0.8, v0 + (4 + j * 7) / h, v0 + (8 + j * 7) / h, h, j % 2 ? '#7a6650' : '#6e5a44'); }
          else if (s < 0.42) placa(g, x, y, 1, 1, face, 0.24, 0.5, v0, v1, h, '#3a4648');
          if (s > 0.55 && s < 0.65 && k > 0) { placa(g, x, y, 1, 1, face, 0.62, 0.86, v0 - 12 / h, v0 - 3 / h, h, '#8a9094'); placa(g, x, y, 1, 1, face, 0.66, 0.82, v0 - 10 / h, v0 - 5 / h, h, '#5a6064'); }  // ar-condicionado
        }
        if (r() > 0.7) placa(g, x, y, 1, 1, face, 0.02, 0.35, 0, 0.12 + r() * 0.2, h, '#566D4A77');   // mato subindo
        if (r() > 0.85) placa(g, x, y, 1, 1, face, 0.15, 0.6, 8 / h, 16 / h, h, ['#C65345aa', '#74A6A1aa', '#D4AC66aa'][Math.floor(r() * 3)]);  // pichação
        // platibanda: borda clara no alto da fachada
        placa(g, x, y, 1, 1, face, 0, 1, 1 - 4 / h, 1, h, tom(cor, 1.22 * sombraF));
        placa(g, x, y, 1, 1, face, 0, 1, 1 - 5 / h, 1 - 4 / h, h, '#00000050');
      }
      if (!o._luzes) { o._luzes = o._novas || []; delete o._novas; }
      if (o.topo) { const q = r(); if (q > 0.965) { caixa(g, x + 0.3, y + 0.35, 0.36, 0.28, 9, '#5e6468', h); placa(g, x + 0.3, y + 0.35, 0.36, 0.28, 'esq', 0.15, 0.85, 0.3, 0.7, 9, '#2a2e30'); } else if (q > 0.93) { const c = iso(x + 0.5, y + 0.5); cilindro(g, c.x, c.y - h - 2, 8, 4, 14, '#4e6260'); } else if (q > 0.88) caixa(g, x + 0.42, y + 0.42, 0.16, 0.16, 8, '#3a3a36', h); else if (q > 0.7) { const c = iso(x + 0.5, y + 0.5); g.fillStyle = '#00000022'; g.beginPath(); g.ellipse(c.x + (r() - 0.5) * 16, c.y - h, 10, 4, 0, 0, 7); g.fill(); } }
      break;
    }
    case 'carro': {
      // carro largado na escala do boneco: carroceria até a cintura, teto um pouco abaixo da cabeça
      const cor = o.cor || '#5a6a72', ao = w >= d, vid = { topo: '#2a3438', esq: '#1e2a2e', dir: '#162024' };
      const bx = x + 0.06, by = y + 0.1, bw = w - 0.12, bd = d - 0.2;
      // rodas por baixo
      for (const [a, b] of ao ? [[0.45, d - 0.12], [w - 0.45, d - 0.12]] : [[w - 0.12, 0.45], [w - 0.12, d - 0.45]]) { const p = iso(x + a, y + b); g.fillStyle = '#121212'; g.beginPath(); g.ellipse(p.x, p.y - 6, 7, 7, 0, 0, 7); g.fill(); g.fillStyle = '#4a4a4a'; g.fillRect(p.x - 2, p.y - 8, 3, 3); }
      caixa(g, bx, by, bw, bd, 14, cor, 6);
      // capô e porta-malas mais baixos, cabine no meio com vidro
      const cab = ao ? [bx + bw * 0.28, by + 0.06, bw * 0.48, bd - 0.12] : [bx + 0.06, by + bd * 0.28, bw - 0.12, bd * 0.48];
      caixa(g, cab[0], cab[1], cab[2], cab[3], 12, vid, 20);
      caixa(g, cab[0] + (ao ? 0.04 : 0), cab[1] + (ao ? 0 : 0.04), cab[2] - (ao ? 0.08 : 0), cab[3] - (ao ? 0 : 0.08), 3, cor, 32);
      const f = ao ? 'esq' : 'dir';
      placa(g, cab[0], cab[1], cab[2], cab[3], f, 0.08, 0.3, 0.25, 0.9, 12, '#ffffff1a');     // reflexo no vidro
      placa(g, bx, by, bw, bd, f, 0, 1, 0.45, 0.52, 14, tom(cor, 0.7));                         // friso
      placa(g, bx, by, bw, bd, f, 0.49, 0.51, 0.05, 1, 14, tom(cor, 0.6));                       // linha da porta
      placa(g, bx, by, bw, bd, f, 0.55, 0.85, 0.2, 0.9, 14, '#A65F3D66');                         // ferrugem
      placa(g, bx, by, bw, bd, f, 0.1, 0.32, 0.6, 0.85, 14, '#00000033');
      // farol e lanterna nas pontas
      const ff = ao ? 'dir' : 'esq';
      placa(g, bx, by, bw, bd, ff, 0.1, 0.25, 0.4, 0.75, 14, '#d8d0b0'); placa(g, bx, by, bw, bd, ff, 0.75, 0.9, 0.4, 0.75, 14, '#d8d0b0');
      { const c = iso(x + w / 2, y + d / 2); for (let k = 0; k < 4; k++) { g.fillStyle = '#c8d4d888'; g.fillRect(Math.round(c.x + (r() - 0.5) * 30), Math.round(c.y + 4 + (r() - 0.5) * 10), 2, 1); } }   // caco de vidro no chão
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
      // cerca de chapa ondulada e tábua remendada, fina, com mourão e arame farpado no alto
      const ex = o.eixo === 'y', bx = ex ? x + 0.36 : x, by = ex ? y : y + 0.36, bw = ex ? 0.28 : 1, bd = ex ? 1 : 0.28;
      const cores = ['#6b7072', '#7b6a58', '#5e665c', '#706a62'], cor = cores[Math.floor(r() * cores.length)];
      const topo = h - Math.floor(r() * 6);
      caixa(g, bx, by, bw, bd, topo, cor);
      const face = ex ? 'dir' : 'esq';
      // ondulação: listras verticais claras e escuras
      for (let k = 0; k < 12; k++) placa(g, bx, by, bw, bd, face, k / 12, k / 12 + 0.035, 0.02, 0.98, topo, k % 2 ? tom(cor, 1.18) + '99' : tom(cor, 0.7) + '99');
      // tábua pregada atravessada e ferrugem escorrendo
      if (r() > 0.5) { placa(g, bx, by, bw, bd, face, 0, 1, 0.4, 0.52, topo, '#7a5a3e'); placa(g, bx, by, bw, bd, face, 0, 1, 0.5, 0.52, topo, '#4a3626'); placa(g, bx, by, bw, bd, face, 0.1, 0.13, 0.44, 0.48, topo, '#c9c2b0'); }
      for (let k = 0; k < 2; k++) { const u = r(); placa(g, bx, by, bw, bd, face, u, u + 0.06, 0.25 + r() * 0.3, 0.95, topo, '#A65F3D88'); }
      placa(g, bx, by, bw, bd, face, 0, 1, 0, 0.12, topo, '#2a2e2244');
      if (r() > 0.6) placa(g, bx, by, bw, bd, face, 0.05, 0.3 + r() * 0.3, 0, 0.22, topo, '#566D4A99');
      // mourão de madeira na emenda
      const m0 = ex ? [x + 0.32, y - 0.04] : [x - 0.04, y + 0.32];
      caixa(g, m0[0], m0[1], ex ? 0.36 : 0.12, ex ? 0.12 : 0.36, h + 8, '#5a4430');
      // arame farpado
      const a0 = iso(ex ? x + 0.5 : x, ex ? y : y + 0.5), a1 = iso(ex ? x + 0.5 : x + 1, ex ? y + 1 : y + 0.5);
      g.strokeStyle = '#8f979c'; g.lineWidth = 1; g.beginPath();
      for (let k = 0; k <= 8; k++) { const f = k / 8, px = a0.x + (a1.x - a0.x) * f, py = a0.y + (a1.y - a0.y) * f - h - 4 - (k % 2) * 3; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      break;
    }
    case 'pilar': {
      // pilar de tijolo com lampião em cima
      caixa(g, x + 0.12, y + 0.12, 0.76, 0.76, h, '#7a4e3a');
      for (let v = 5; v < h - 4; v += 5) { const off = (v / 5) % 2 ? 0.25 : 0; for (const f of ['esq', 'dir']) { placa(g, x + 0.12, y + 0.12, 0.76, 0.76, f, 0, 1, v / h, (v + 1) / h, h, '#00000040'); for (let u = off; u < 1; u += 0.5) placa(g, x + 0.12, y + 0.12, 0.76, 0.76, f, u, u + 0.03, (v - 5) / h, v / h, h, '#00000033'); } }
      caixa(g, x + 0.05, y + 0.05, 0.9, 0.9, 6, '#6e6a62', h);
      const p = iso(x + 0.5, y + 0.5);
      g.fillStyle = '#141412'; g.fillRect(p.x - 5, p.y - h - 20, 10, 15);
      g.fillStyle = '#3a3a36'; g.fillRect(p.x - 4, p.y - h - 19, 8, 13); g.fillStyle = COR.luz; g.fillRect(p.x - 3, p.y - h - 16, 6, 8); g.fillStyle = '#f0d8a0'; g.fillRect(p.x - 1, p.y - h - 14, 2, 4);
      g.fillStyle = '#3a3a36'; g.fillRect(p.x - 6, p.y - h - 21, 12, 2);
      break;
    }
    case 'portao': {
      caixa(g, x, y + 0.4, w, 0.2, h, '#6b5a48');
      for (let k = 0; k < 9; k++) placa(g, x, y + 0.4, w, 0.2, 'esq', k / 9 + 0.01, k / 9 + 0.07, 0.05, 0.95, h, '#3a302688');
      placa(g, x, y + 0.4, w, 0.2, 'esq', 0, 1, 0.45, 0.55, h, '#A65F3D');
      placa(g, x, y + 0.4, w, 0.2, 'esq', 0.42, 0.58, 0.6, 0.85, h, COR.aviso);
      break;
    }
    case 'guarita': caixa(g, x, y, w, d, h - 10, '#6c6a60'); caixa(g, x - 0.1, y - 0.1, w + 0.2, d + 0.2, 6, '#4a463e', h - 10);
      placa(g, x, y, w, d, 'esq', 0.2, 0.8, 0.45, 0.75, h - 10, '#1e2224'); placa(g, x, y, w, d, 'esq', 0.25, 0.4, 0.5, 0.7, h - 10, '#D4AC6644'); break;
    case 'sacos': {
      // sacos de areia empilhados, cada um arredondado com amarra
      const p0 = iso(x + 0.5, y + 0.5);
      const saco = (dx, dy, z) => {
        const cx = Math.round(p0.x + dx), cy = Math.round(p0.y + dy - z);
        g.fillStyle = '#141412'; g.beginPath(); g.ellipse(cx, cy, 13, 6, -0.46, 0, 7); g.fill();
        g.fillStyle = '#9B8D66'; g.beginPath(); g.ellipse(cx, cy, 12, 5, -0.46, 0, 7); g.fill();
        g.fillStyle = '#b8aa80'; g.beginPath(); g.ellipse(cx - 2, cy - 2, 7, 2, -0.46, 0, 7); g.fill();
        g.fillStyle = '#6e6448'; g.fillRect(cx + 8, cy - 5, 2, 3); g.fillRect(cx - 9, cy + 3, 2, 2);
      };
      saco(-8, -4, 0); saco(8, 4, 0); saco(0, 0, 8); if (r() > 0.4) saco(-4, -2, 15);
      break;
    }
    case 'mesa': {
      // mesa de madeira com pés, tampo de tábuas e papéis; lampião aceso numa ponta
      for (const [a, b] of [[0.15, 0.25], [w - 0.15, 0.25], [0.15, d - 0.25], [w - 0.15, d - 0.25]]) caixa(g, x + a - 0.05, y + b - 0.05, 0.1, 0.1, h - 4, '#4a3626');
      caixa(g, x + 0.05, y + 0.15, w - 0.1, d - 0.3, 4, '#8a6a46', h - 4);
      for (let k = 1; k < 4; k++) { const A1 = iso(x + 0.05, y + 0.15 + k * (d - 0.3) / 4), B1 = iso(x + w - 0.05, y + 0.15 + k * (d - 0.3) / 4); g.strokeStyle = '#5a4430'; g.beginPath(); g.moveTo(A1.x, A1.y - h); g.lineTo(B1.x, B1.y - h); g.stroke(); }
      const p = iso(x + 0.8, y + 0.5); g.fillStyle = '#e8e2d0'; g.fillRect(p.x - 6, p.y - h - 3, 9, 4); g.fillStyle = '#c9c2b0'; g.fillRect(p.x + 6, p.y - h - 5, 7, 5); g.fillStyle = '#24282B'; g.fillRect(p.x - 4, p.y - h - 2, 5, 1);
      const q = iso(x + 2.2, y + 0.5); g.fillStyle = '#141412'; g.fillRect(q.x - 3, q.y - h - 13, 7, 13); g.fillStyle = '#3a3a36'; g.fillRect(q.x - 2, q.y - h - 12, 5, 11); g.fillStyle = COR.luz; g.fillRect(q.x - 1, q.y - h - 10, 3, 6);
      const c2 = iso(x + 1.5, y + 0.5); g.fillStyle = '#6a3a2a'; g.fillRect(c2.x - 2, c2.y - h - 6, 5, 6); g.fillStyle = '#8a5a3e'; g.fillRect(c2.x - 2, c2.y - h - 6, 5, 1);
      break;
    }
    case 'arquivo': {
      // arquivo de aço com três gavetas
      const ax = x + 0.15, ay = y + 0.15, cor = '#6a7072';
      caixa(g, ax, ay, 0.7, 0.7, h, cor);
      for (let k = 0; k < 3; k++) for (const f of ['esq', 'dir']) { placa(g, ax, ay, 0.7, 0.7, f, 0.08, 0.92, 0.06 + k * 0.31, 0.3 + k * 0.31, h, tom(cor, f === 'dir' ? 0.62 : 0.88)); placa(g, ax, ay, 0.7, 0.7, f, 0.38, 0.62, 0.2 + k * 0.31, 0.24 + k * 0.31, h, '#c9c2b0'); }
      if (r() > 0.5) placa(g, ax, ay, 0.7, 0.7, 'esq', 0.1, 0.9, 0.36, 0.42, h, '#141412');
      break;
    }
    case 'estante': caixa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, h, '#6e5038');
      for (let k = 0; k < 3; k++) { placa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, 'esq', 0.05, 0.95, 0.08 + k * 0.32, 0.3 + k * 0.32, h, '#2a2016'); for (let j = 0; j < 6; j++) placa(g, x + 0.1, y + 0.2, w - 0.2, 0.6, 'esq', 0.08 + j * 0.15, 0.18 + j * 0.15, 0.1 + k * 0.32, 0.26 + k * 0.32, h, ['#9B8D66', '#74A6A1', '#A65F3D', '#c9c2b0'][(j + k) % 4]); } break;
    case 'caixas': caixote(g, x + 0.08, y + 0.1, 0.8, 0.78, 16, 0); caixote(g, x + 0.2, y + 0.22, 0.58, 0.55, 14, 16); break;
    case 'caixa': caixote(g, x + 0.2, y + 0.2, 0.6, 0.6, h, 0); break;
    case 'bancada': {
      // bancada de oficina: pés, tampo grosso, morsa, ferramenta e lata de óleo
      for (const [a, b] of [[0.12, 0.3], [w - 0.12, 0.3], [0.12, d - 0.3], [w - 0.12, d - 0.3]]) caixa(g, x + a - 0.05, y + b - 0.05, 0.1, 0.1, h - 5, '#3a3a36');
      caixa(g, x + 0.2, y + 0.35, w - 0.4, d - 0.7, 2, '#4a3a2a', 6);
      caixa(g, x + 0.05, y + 0.2, w - 0.1, d - 0.4, 5, '#6a5a48', h - 5);
      placa(g, x + 0.05, y + 0.2, w - 0.1, d - 0.4, 'esq', 0, 1, 0, 1, 5, '#00000030');
      caixa(g, x + 0.3, y + 0.35, 0.25, 0.3, 7, '#5a6a72', h);
      const p = iso(x + 1.2, y + 0.5); g.fillStyle = '#141412'; g.fillRect(p.x - 7, p.y - h - 4, 12, 4); g.fillStyle = '#8f979c'; g.fillRect(p.x - 6, p.y - h - 3, 10, 2); g.fillStyle = COR.ferrugem; g.fillRect(p.x + 5, p.y - h - 4, 3, 3);
      const q = iso(x + 2.3, y + 0.5); cilindro(g, q.x, q.y - h, 4, 2, 9, '#7a3a2a'); g.fillStyle = '#D4AC66'; g.fillRect(q.x - 3, q.y - h - 6, 6, 2);
      const k = iso(x + 1.7, y + 0.45); g.fillStyle = '#24282B'; g.fillRect(k.x - 9, k.y - h - 3, 8, 3); g.fillStyle = '#c9c2b0'; g.fillRect(k.x - 1, k.y - h - 2, 6, 1);
      break;
    }
    case 'gerador': {
      // gerador sobre estrado: motor amarelo, aletas, painel e escapamento
      caixa(g, x + 0.05, y + 0.1, 0.9, 0.8, 4, '#4a3626');
      caixa(g, x + 0.12, y + 0.18, 0.76, 0.64, h - 4, '#a8902e', 4);
      for (let k = 0; k < 5; k++) placa(g, x + 0.12, y + 0.18, 0.76, 0.64, 'esq', 0.1 + k * 0.16, 0.16 + k * 0.16, 0.25, 0.8, h, '#3a3226');
      placa(g, x + 0.12, y + 0.18, 0.76, 0.64, 'dir', 0.15, 0.6, 0.35, 0.8, h, '#24282B');
      placa(g, x + 0.12, y + 0.18, 0.76, 0.64, 'dir', 0.2, 0.3, 0.55, 0.65, h, Math.floor(t * 2) % 2 ? '#74A6A1' : '#2f4a48');
      const p = iso(x + 0.3, y + 0.3); g.fillStyle = '#2a2a26'; g.fillRect(p.x - 1, p.y - h - 12, 3, 12); g.fillStyle = '#141412'; g.fillRect(p.x - 2, p.y - h - 13, 5, 2);
      for (let k = 0; k < 2; k++) { const u = (t * 0.6 + k / 2) % 1; g.fillStyle = `rgba(120,118,112,${0.4 * (1 - u)})`; g.fillRect(Math.round(p.x - 2 + u * 6), Math.round(p.y - h - 16 - u * 16), 3 + Math.round(u * 4), 3 + Math.round(u * 3)); }
      break;
    }
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
    case 'mesaRadio': {
      // mesa do rádio: pés, tampo, rádio com mostrador, microfone, papéis e caneca
      for (const [a, b] of [[0.15, 0.25], [w - 0.15, 0.25], [0.15, d - 0.25], [w - 0.15, d - 0.25]]) caixa(g, x + a - 0.05, y + b - 0.05, 0.1, 0.1, h - 4, '#3a2a1e');
      caixa(g, x + 0.05, y + 0.15, w - 0.1, d - 0.3, 4, '#5c4a38', h - 4);
      caixa(g, x + 1.0, y + 0.3, 0.9, 0.4, 14, '#3a4a46', h);
      const q = naFace(x + 1.0, y + 0.3, 0.9, 0.4, 'esq', 0.15, 0.65, 14);
      g.fillStyle = '#141412'; g.fillRect(q.x - 1, q.y - h - 1, 14, 6); g.fillStyle = Math.floor(t * 3) % 3 ? COR.radio : '#2f4a48'; g.fillRect(q.x, q.y - h, 12, 4); g.fillStyle = '#e8e2a8'; g.fillRect(q.x + 3 + Math.floor(t * 2) % 6, q.y - h, 1, 4);
      const k = naFace(x + 1.0, y + 0.3, 0.9, 0.4, 'esq', 0.75, 0.4, 14); g.fillStyle = '#c9c2b0'; g.fillRect(k.x, k.y - h, 3, 3); g.fillRect(k.x + 5, k.y - h, 3, 3);
      const a = iso(x + 1.6, y + 0.35); g.fillStyle = '#8f979c'; g.fillRect(a.x, a.y - h - 32, 1, 18);
      const p = iso(x + 0.5, y + 0.5); g.fillStyle = '#e8e2d0'; g.fillRect(p.x - 8, p.y - h - 2, 10, 4); g.fillStyle = '#24282B'; g.fillRect(p.x - 6, p.y - h - 1, 6, 1);
      const m = iso(x + 0.9, y + 0.5); g.fillStyle = '#24282B'; g.fillRect(m.x, m.y - h - 8, 2, 8); g.fillRect(m.x - 2, m.y - h - 10, 5, 3);
      const c2 = iso(x + 2.3, y + 0.5); g.fillStyle = '#d8d0c0'; g.fillRect(c2.x - 2, c2.y - h - 6, 5, 6); g.fillStyle = '#3a2a1e'; g.fillRect(c2.x - 1, c2.y - h - 6, 3, 1);
      break;
    }
    case 'beliche': {
      // beliche: dois estrados, quatro colunas e escadinha
      const cols = [[0.12, 0.08], [0.88, 0.08], [0.12, d - 0.08], [0.88, d - 0.08]];
      for (const [a, b] of cols.slice(0, 2)) caixa(g, x + a - 0.05, y + b - 0.05, 0.1, 0.1, h + 6, '#4a3626');
      cama(g, x, y, d, 0, r, true); cama(g, x, y, d, 28, r, true);
      for (const [a, b] of cols.slice(2)) caixa(g, x + a - 0.05, y + b - 0.05, 0.1, 0.1, h + 6, '#5a4430');
      // escada na lateral
      const e0 = iso(x + 0.95, y + d - 0.5); g.fillStyle = '#5a4430'; g.fillRect(e0.x - 1, e0.y - 40, 2, 40); g.fillRect(e0.x + 7, e0.y - 36, 2, 36);
      for (let k = 0; k < 5; k++) g.fillRect(e0.x - 1, e0.y - 6 - k * 7, 10, 2);
      break;
    }
    case 'cama': cama(g, x, y, d, 0, r); break;
    case 'armario': {
      // armário de metal com porta, puxador e ventilação
      const ax = x + 0.15, ay = y + 0.2, aw = 0.7, ad = 0.6, cor = '#5d6a6c';
      caixa(g, ax, ay, aw, ad, h, cor);
      for (const f of ['esq', 'dir']) {
        placa(g, ax, ay, aw, ad, f, 0.06, 0.94, 0.04, 0.96, h, tom(cor, f === 'dir' ? 0.66 : 0.92));
        for (let k = 0; k < 3; k++) placa(g, ax, ay, aw, ad, f, 0.2, 0.8, 0.82 - k * 0.04, 0.83 - k * 0.04, h, '#141412aa');
      }
      placa(g, ax, ay, aw, ad, 'esq', 0.49, 0.51, 0.06, 0.94, h, '#141412aa');
      placa(g, ax, ay, aw, ad, 'esq', 0.4, 0.46, 0.45, 0.5, h, '#c9c2b0'); placa(g, ax, ay, aw, ad, 'esq', 0.54, 0.6, 0.45, 0.5, h, '#c9c2b0');
      placa(g, ax, ay, aw, ad, 'esq', 0.6, 0.85, 0.1, 0.4, h, '#A65F3D55');
      break;
    }
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
      placa(g, x, y, w, d, 'dir', 0.3, 0.7, 0, 0.8, up, '#3a3a3466');  for (let k = 1; k < 4; k++) placa(g, x, y, w, d, 'esq', k / 4, k / 4 + 0.008, 0, 1, up, '#00000022');
      placa(g, x, y, w, d, 'dir', 0.32, 0.68, 0, 0.82, up, '#2a2a26');
      placa(g, x, y, w, d, 'dir', 0.5, 0.68, 0, 0.82, up, '#c9c4b4'); placa(g, x, y, w, d, 'dir', 0.5, 0.52, 0, 0.82, up, '#8f8a7a');
      g.strokeStyle = '#d8d3c4aa'; g.lineWidth = 1; for (const [a2, b2] of [[0, 0], [w, 0], [0, d], [w, d]]) { const top = iso(x + a2, y + (b2 ? d : 0)), peg = iso(x + a2 + (a2 ? 0.35 : -0.35), y + (b2 ? d + 0.35 : -0.35)); g.beginPath(); g.moveTo(top.x, top.y - up); g.lineTo(peg.x, peg.y); g.stroke(); g.fillStyle = '#4a3626'; g.fillRect(peg.x - 1, peg.y - 3, 2, 4); }
      } break;
    case 'maca': {
      // maca de campanha: armação de metal, lona verde, lençol e travesseiro
      for (const [a, b] of [[0.18, 0.3], [w - 0.18, 0.3], [0.18, 0.7], [w - 0.18, 0.7]]) caixa(g, x + a - 0.03, y + b - 0.03, 0.06, 0.06, 10, '#8f979c');
      caixa(g, x + 0.1, y + 0.25, w - 0.2, 0.5, 2, '#5e6a52', 10);
      caixa(g, x + 0.3, y + 0.27, w - 0.45, 0.46, 2, '#e8e2d0', 12);
      caixa(g, x + 0.12, y + 0.3, 0.3, 0.4, 3, '#f4efe2', 12);
      const p = iso(x + w * 0.6, y + 0.5); g.fillStyle = '#C65345'; g.fillRect(p.x - 2, p.y - 18, 4, 2);
      break;
    }
    case 'caixaMedica': caixa(g, x + 0.2, y + 0.2, 0.6, 0.6, h, '#d8d3c4'); placa(g, x + 0.2, y + 0.2, 0.6, 0.6, 'esq', 0.35, 0.65, 0.2, 0.8, h, COR.radio); break;
    case 'tanque': { const p = iso(x + w / 2, y + d / 2); caixa(g, x + 0.2, y + 0.2, w - 0.4, d - 0.4, 12, '#4a463e'); cilindro(g, p.x, p.y - 12, 26, 13, h - 12, '#5e7472');
      g.fillStyle = '#00000030'; g.fillRect(p.x - 26, p.y - 40, 52, 2); g.fillRect(p.x - 26, p.y - 58, 52, 2); g.fillStyle = '#ffffff20'; g.fillRect(p.x - 18, p.y - h + 4, 3, h - 22); } break;
    case 'planta': {
      // canteiro da horta: monte de terra com pés de verdura e um tomate aqui e ali
      const p = iso(x + 0.5, y + 0.5);
      g.fillStyle = '#2a2018'; g.beginPath(); g.ellipse(p.x, p.y, 26, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#4a3a2c'; g.beginPath(); g.ellipse(p.x, p.y - 1, 24, 10, 0, 0, 7); g.fill();
      for (let k = 0; k < 5; k++) {
        const cx = Math.round(p.x - 16 + k * 8), cy = Math.round(p.y - 2 + (k % 2) * 3);
        g.fillStyle = '#141412'; g.fillRect(cx - 4, cy - 10, 9, 10);
        g.fillStyle = '#4c6a3e'; g.fillRect(cx - 3, cy - 9, 7, 8); g.fillStyle = '#6f8a4a'; g.fillRect(cx - 2, cy - 9, 3, 4); g.fillStyle = '#8aa65a'; g.fillRect(cx - 1, cy - 8, 1, 2);
        if ((k + x) % 3 === 0) { g.fillStyle = COR.aviso; g.fillRect(cx + 1, cy - 4, 2, 2); }
      }
      break;
    }
    case 'quadro': { caixa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, h, '#5a4a38', 0);
      placa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, 'esq', 0.06, 0.94, 0.3, 0.95, h, '#8a7258');
      for (let k = 0; k < 5; k++) placa(g, x + 0.1, y + 0.4, w - 0.2, 0.2, 'esq', 0.1 + k * 0.17, 0.22 + k * 0.17, 0.45 + (k % 2) * 0.2, 0.7 + (k % 2) * 0.2, h, ['#e8e2d0', '#d4c890', '#c9c2b0'][k % 3]); } break;
    case 'poste': { const p = iso(x + 0.5, y + 0.5);
      g.fillStyle = '#1e1e1c'; g.fillRect(p.x - 4, p.y - 6, 8, 6); g.fillRect(p.x - 3, p.y - h - 1, 6, h);
      g.fillStyle = '#4a4a44'; g.fillRect(p.x - 2, p.y - h, 3, h - 2); g.fillStyle = '#34342f'; g.fillRect(p.x + 1, p.y - h, 1, h - 2);
      g.fillStyle = '#5a5a52'; g.fillRect(p.x - 3, p.y - 5, 6, 4);
      g.fillStyle = '#1e1e1c'; g.fillRect(p.x - 1, p.y - h - 1, 16, 4); g.fillStyle = '#4a4a44'; g.fillRect(p.x, p.y - h, 14, 2);
      g.fillStyle = '#2a2a26'; g.fillRect(p.x + 8, p.y - h + 2, 9, 3); g.fillStyle = COR.luz; g.fillRect(p.x + 9, p.y - h + 5, 7, 2); g.fillStyle = '#f0d8a0'; g.fillRect(p.x + 11, p.y - h + 5, 3, 1);
      g.fillStyle = '#9B8D66'; g.fillRect(p.x - 2, p.y - 40, 3, 8); } break;
    case 'fogueira': {
      // fogueira: anel de pedra, lenha cruzada, chama em três camadas, fagulhas e caldeirão no tripé
      const p = iso(x + 0.5, y + 0.5);
      g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(p.x, p.y, 20, 10, 0, 0, 7); g.fill();
      g.fillStyle = '#2a201a'; g.beginPath(); g.ellipse(p.x, p.y, 14, 7, 0, 0, 7); g.fill();
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28, sx = Math.round(p.x + Math.cos(a) * 17 - 3), sy = Math.round(p.y + Math.sin(a) * 8.5 - 3); g.fillStyle = '#141412'; g.fillRect(sx - 1, sy - 1, 8, 6); g.fillStyle = k % 3 ? '#6e6a62' : '#5a5550'; g.fillRect(sx, sy, 6, 4); g.fillStyle = '#8a857a'; g.fillRect(sx, sy, 3, 1); }
      // lenha
      g.fillStyle = '#141412'; g.fillRect(p.x - 12, p.y - 4, 24, 5); g.fillStyle = '#5a4430'; g.fillRect(p.x - 11, p.y - 3, 22, 3); g.fillStyle = '#c65345'; g.fillRect(p.x - 4, p.y - 3, 8, 1);
      g.fillStyle = '#4a3626'; g.fillRect(p.x - 3, p.y - 7, 6, 8);
      // brasa
      for (let k = 0; k < 6; k++) { g.fillStyle = (k + Math.floor(t * 6)) % 3 ? '#C65345' : '#e8903a'; g.fillRect(p.x - 8 + k * 3, p.y - 1 + (k % 2), 2, 1); }
      // chamas (balançam com o tempo)
      const lingua = (dx, alt, larg, cor, fase) => { const f = Math.sin(t * 9 + fase) * 2, w2 = larg / 2; g.fillStyle = cor; g.beginPath(); g.moveTo(p.x + dx - w2, p.y - 3); g.quadraticCurveTo(p.x + dx - w2 - 1, p.y - alt * 0.5, p.x + dx + f, p.y - alt - Math.abs(f)); g.quadraticCurveTo(p.x + dx + w2 + 1, p.y - alt * 0.5, p.x + dx + w2, p.y - 3); g.closePath(); g.fill(); };
      lingua(-5, 18, 9, '#a8402e', 0); lingua(5, 20, 9, '#a8402e', 1.7); lingua(0, 28, 13, '#C65345', 0.8);
      lingua(-2, 20, 8, '#e8903a', 2.3); lingua(3, 16, 7, '#e8903a', 0.4); lingua(0, 12, 5, '#f4d47a', 1.1);
      // fagulhas subindo
      for (let k = 0; k < 5; k++) { const u = (t * 0.7 + k / 5) % 1, sx = Math.round(p.x + Math.sin(k * 2.1 + u * 5) * 6), sy = Math.round(p.y - 20 - u * 34); g.fillStyle = u < 0.5 ? '#f4d47a' : '#e8903a'; g.globalAlpha = 1 - u; g.fillRect(sx, sy, 1, 1); }
      g.globalAlpha = 1;
      // tripé com caldeirão
      g.strokeStyle = '#2a2a26'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - 16, p.y + 2); g.lineTo(p.x, p.y - 40); g.lineTo(p.x + 16, p.y + 2); g.moveTo(p.x, p.y - 40); g.lineTo(p.x + 3, p.y - 6); g.stroke();
      g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y - 40); g.lineTo(p.x, p.y - 30); g.stroke();
      g.fillStyle = '#141412'; g.beginPath(); g.ellipse(p.x, p.y - 24, 9, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#3a3a36'; g.beginPath(); g.ellipse(p.x, p.y - 24, 8, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#5a5a52'; g.fillRect(p.x - 5, p.y - 28, 3, 2);
      g.fillStyle = '#1e1e1c'; g.beginPath(); g.ellipse(p.x, p.y - 29, 7, 2.5, 0, 0, 7); g.fill();
      g.fillStyle = '#9a8a5a'; g.fillRect(p.x - 4, p.y - 30, 8, 1);
      // vapor
      for (let k = 0; k < 3; k++) { const u = (t * 0.4 + k / 3) % 1; g.fillStyle = `rgba(220,215,205,${0.35 * (1 - u)})`; const r2 = 2 + u * 4; g.fillRect(Math.round(p.x - r2 + Math.sin(u * 4 + k) * 3), Math.round(p.y - 32 - u * 22), Math.round(r2 * 2), Math.round(r2)); }
      break;
    }
    case 'banco': {
      // banco de praça: pés de ferro, assento de três ripas e encosto
      const ao = d >= w, L = ao ? d : w;
      for (const f of [0.15, L - 0.15]) { const [a, b] = ao ? [0.5, f] : [f, 0.5]; caixa(g, x + a - 0.18, y + b - 0.04, ao ? 0.36 : 0.08, ao ? 0.08 : 0.36, 9, '#2a2a26'); }
      for (let k = 0; k < 3; k++) { const o2 = 0.3 + k * 0.14; ao ? caixa(g, x + o2, y + 0.06, 0.11, L - 0.12, 3, '#8a6040', 9) : caixa(g, x + 0.06, y + o2, L - 0.12, 0.11, 3, '#8a6040', 9); }
      // encosto do lado de trás (norte/oeste)
      ao ? caixa(g, x + 0.24, y + 0.06, 0.06, L - 0.12, 12, '#7a5236', 12) : caixa(g, x + 0.06, y + 0.24, L - 0.12, 0.06, 12, '#7a5236', 12);
      break;
    }
    case 'cerca': caixa(g, x + 0.4, y + 0.4, 0.2, 0.2, h, '#6e5a44'); caixa(g, x + 0.05, y + 0.45, 0.9, 0.1, 3, '#7e6a54', 12); caixa(g, x + 0.45, y + 0.05, 0.1, 0.9, 3, '#7e6a54', 6); break;
    case 'casinha': caixa(g, x + 0.15, y + 0.15, 0.7, 0.7, 14, '#8a6a46'); { const A = iso(x + 0.15, y + 0.5), B = iso(x + 0.85, y + 0.5); const C = iso(x + 0.85, y + 0.85), D = iso(x + 0.15, y + 0.85);
      g.fillStyle = COR.ferrugem; g.beginPath(); g.moveTo(D.x, D.y - 14); g.lineTo(C.x, C.y - 14); g.lineTo(B.x, B.y - h); g.lineTo(A.x, A.y - h); g.closePath(); g.fill(); placa(g, x + 0.15, y + 0.15, 0.7, 0.7, 'esq', 0.35, 0.65, 0, 0.6, 14, '#1a1612'); } break;
    case 'arvore': { const p = iso(x + 0.5, y + 0.5);
      // tronco com raiz e lado na sombra
      g.fillStyle = '#2a2018'; g.fillRect(p.x - 5, p.y - 42, 10, 42); g.fillRect(p.x - 8, p.y - 4, 16, 4);
      g.fillStyle = '#5a4430'; g.fillRect(p.x - 4, p.y - 42, 5, 41); g.fillRect(p.x - 7, p.y - 3, 6, 2);
      g.fillStyle = '#3e2f22'; g.fillRect(p.x + 1, p.y - 42, 3, 41); g.fillRect(p.x + 1, p.y - 3, 6, 2);
      g.fillStyle = '#6e5640'; g.fillRect(p.x - 3, p.y - 30, 1, 6); g.fillRect(p.x - 2, p.y - 16, 1, 4);
      const sway = Math.round(Math.sin(t * 0.8 + x) * 1.5);
      // copa em tufos: contorno escuro, massa, sombra embaixo à direita, brilho em cima à esquerda
      const tufos = [[0, -60, 24], [-16, -72, 18], [16, -70, 19], [-6, -88, 18], [10, -90, 15], [0, -102, 12], [-20, -56, 13], [20, -55, 13]];
      const seco = r() > 0.8, base = seco ? ['#4a4a32', '#5a5a3c', '#6e6c48', '#2e2e20'] : ['#2f4a2c', '#3f5f38', '#557a46', '#1c2a1a'];
      const bola = (cx, cy, rr) => { g.beginPath(); g.arc(Math.round(cx), Math.round(cy), rr, 0, 7); g.fill(); };
      g.fillStyle = base[3]; for (const [dx, dy, rr] of tufos) bola(p.x + dx + sway, p.y + dy, rr + 2);
      g.fillStyle = base[0]; for (const [dx, dy, rr] of tufos) bola(p.x + dx + sway, p.y + dy, rr);
      g.fillStyle = base[1]; for (const [dx, dy, rr] of tufos) bola(p.x + dx + sway - 3, p.y + dy - 3, rr - 4);
      g.fillStyle = base[2]; for (const [dx, dy, rr] of tufos) if (rr > 13) bola(p.x + dx + sway - 6, p.y + dy - 7, rr * 0.4);
      // folhas soltas em pixel pra quebrar o contorno redondo
      for (let k = 0; k < 26; k++) { const a = r() * 6.28, d = 14 + r() * 16; g.fillStyle = r() > 0.5 ? base[2] : base[1]; g.fillRect(Math.round(p.x + sway + Math.cos(a) * d * 1.1), Math.round(p.y - 76 + Math.sin(a) * d), 2, 2); }
      if (!seco && r() > 0.6) { g.fillStyle = '#c98a3a'; for (let k = 0; k < 4; k++) g.fillRect(Math.round(p.x + sway + (r() - 0.5) * 36), Math.round(p.y - 64 - r() * 34), 2, 2); }
    } break;
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
  inchado: { torso: '#7a7462', detalhe: '#5a5648', calca: '#4a4438', bota: '#2a2522', manga: '#a39c86' },
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
  inchado: [{ corpo: 'b', pele: 'z2', cabelo: 'raspado', corCabelo: 'c5', roupa: 'inchado', zumbi: true, escala: 1.2 }],
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
  lanca_vergalhao: { haste: '#7a6f5e', bico: '#cfd5d8' },
  armadura_placas: { colete: '#8a9298' },
  mochila_cargueira: { bolsa: '#7a6448', alca: '#4a3a28', armacao: '#9aa0a4', grande: true },
  kit_desmonte: { cinto: '#c99a3a' },
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
    if (vArma.bico) { px(x - 1, y - 1, 4, 4, vArma.bico); px(sx > 0 ? x + 3 : x - 2, y, 2, 2, vArma.bico); px(sx > 0 ? x + 5 : x - 3, y + 1, 1, 1, tom(vArma.bico, 1.15)); px(x, y + 2, 2, 2, '#c99a3a'); }
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

  // pescoço e cabeça: cabeça grande (estilo chibi), 16×14, com sombra do lado direito e brilho no cabelo
  const HL = 16, HA = 14;
  px(cx - 2, topo + 9, 4, 4, tom(pele, 0.85));
  const hx = cx - HL / 2 + (frente ? lado : 0), hy = topo - 5;
  px(hx + 1, hy, HL - 2, HA, pele); px(hx, hy + 1, HL, HA - 3, pele);
  px(hx + (lado > 0 ? HL - 4 : 0), hy + 1, 4, HA - 2, tom(pele, 0.86));
  px(hx + 2, hy + HA - 1, HL - 4, 1, tom(pele, 0.78));                 // queixo
  if (frente) { px(hx + (lado > 0 ? 0 : HL - 1), hy + 6, 1, 3, tom(pele, 0.8)); px(hx + (lado > 0 ? HL - 1 : 0), hy + 6, 1, 3, tom(pele, 0.7)); }  // orelhas
  // cabelo
  const est = ap.cabelo, brilho = tom(cab, 1.35);
  if (est !== 'raspado') {
    px(hx - 1, hy - 2, HL + 2, 5, cab); px(hx + 1, hy - 3, HL - 2, 2, cab);
    if (!frente) px(hx - 1, hy, HL + 2, est === 'longo' ? 16 : 10, cab);
    else {
      px(hx - 1, hy + 2, 2, est === 'longo' ? 13 : 5, cab); px(hx + HL - 1, hy + 2, 2, est === 'longo' ? 13 : 5, cab);
      px(hx + (lado > 0 ? 2 : HL - 7), hy + 3, 5, 2, cab);             // franja caindo de um lado
    }
    px(hx + (lado > 0 ? 2 : 5), hy - 2, 5, 1, brilho); px(hx + (lado > 0 ? 1 : 9), hy - 1, 3, 1, brilho);
    if (est === 'coque') { px(hx + 4, hy - 8, 8, 6, cab); px(hx + 5, hy - 8, 3, 1, brilho); }
    if (est === 'moicano') { px(hx + 6, hy - 8, 4, 7, cab); px(hx + 6, hy - 8, 2, 1, brilho); }
    if (est === 'cacheado') { px(hx - 2, hy - 4, HL + 4, 7, cab); px(hx - 2, hy + 2, 3, 7, cab); px(hx + HL - 1, hy + 2, 3, 7, cab); for (let k = 0; k < 6; k++) px(hx - 1 + k * 3, hy - 5, 2, 1, brilho); }
    if (est === 'longo' && frente) px(hx + (lado > 0 ? -1 : HL - 2), hy + 12, 3, 6, cab);
  } else { px(hx, hy - 1, HL, 3, tom(cab, 1.15)); px(hx + 3, hy - 1, 4, 1, tom(cab, 1.4)); }
  if (frente) {
    const ox = lado > 0 ? 4 : 2, oy = hy + 6;
    // olhos grandes com brilho; boca pequena
    px(hx + ox, oy, 3, 3, '#1a1612'); px(hx + ox + 6, oy, 3, 3, '#1a1612');
    px(hx + ox, oy, 1, 1, '#f4efe2'); px(hx + ox + 6, oy, 1, 1, '#f4efe2');
    px(hx + ox + 3, oy + 5, 3, 1, tom(pele, 0.68));
    px(hx + ox - 1, oy + 3, 2, 1, tom(pele, 0.93)); px(hx + ox + 8, oy + 3, 2, 1, tom(pele, 0.93));
    if (zumbi) { px(hx + ox - 1, oy - 1, 5, 5, '#2a2420'); px(hx + ox + 5, oy - 1, 5, 5, '#2a2420'); px(hx + ox + 1, oy + 1, 2, 2, '#e8e2a8'); px(hx + ox + 7, oy + 1, 2, 2, '#e8e2a8'); px(hx + ox + 1, oy + 5, 7, 2, '#6a1f1a'); px(hx + ox + 2, oy + 5, 1, 1, '#d8d0b8'); px(hx + ox + 5, oy + 5, 1, 1, '#d8d0b8'); }
    if (ap.barba) { px(hx + 1, hy + 10, HL - 2, 4, tom(cab, 1.05)); px(hx + 3, hy + 13, HL - 6, 2, tom(cab, 1.05)); px(hx + ox + 3, oy + 5, 3, 1, tom(cab, 0.7)); }
    if (ap.oculos) { px(hx + ox - 1, oy - 1, 5, 5, '#2a2a2a'); px(hx + ox + 5, oy - 1, 5, 5, '#2a2a2a'); px(hx + ox, oy, 3, 3, '#a8c8d0'); px(hx + ox + 6, oy, 3, 3, '#a8c8d0'); px(hx + ox, oy, 1, 1, '#eef6f8'); px(hx + ox + 6, oy, 1, 1, '#eef6f8'); px(hx + ox + 4, oy + 1, 1, 1, '#2a2a2a'); }
  }
  if (ap.bandana) { px(hx - 1, hy, HL + 2, 3, COR.aviso); px(hx - 1, hy, HL + 2, 1, tom(COR.aviso, 1.2)); if (!frente) px(hx + (lado > 0 ? -3 : HL), hy + 1, 3, 5, COR.aviso); }
  if (ap.bone) { px(hx - 1, hy - 3, HL + 2, 5, '#3e4636'); px(hx + 2, hy - 3, 5, 1, '#5a6450'); if (frente) px(hx + (lado > 0 ? 7 : -4), hy + 1, 13, 2, '#2e3428'); }
  if (ap.fone) { px(hx - 2, hy + 4, 3, 6, '#24282B'); px(hx + HL - 1, hy + 4, 3, 6, '#24282B'); px(hx - 1, hy - 4, HL + 2, 2, '#24282B'); if (frente) px(hx + (lado > 0 ? HL - 1 : -2), hy + 10, 1, 4, '#24282B'); }

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
