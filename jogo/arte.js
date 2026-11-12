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
  { base: '#5d5850', var: ['#635e55', '#57524a', '#69645a'], marca: 'trilho' },
  { base: '#6a6258', var: ['#706860', '#625a50', '#766e62'], marca: 'pedra' },
  { base: '#8a8a80', var: ['#8f8f85', '#84847a', '#939389'], marca: 'plataforma' },
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
    } else if (m === 'trilho') {
      // brita, dormente de madeira atravessado e dois trilhos correndo em x
      for (let k = 0; k < 34; k++) { const cor = ['#857f70', '#4a463e', '#9a9484', '#6e685c'][Math.floor(r() * 4)]; ponto(x + r(), y + r(), 2, 1, cor); }
      for (let k = 0; k < 3; k++) { const u = x + 0.08 + k / 3; quad(u, y + 0.1, u + 0.16, y + 0.9, tom('#5a4430', 0.9 + r() * 0.2)); linha(u, y + 0.1, u, y + 0.9, '#3a2c20'); }
      for (const v of [0.3, 0.7]) { linha(x, y + v + 0.03, x + 1, y + v + 0.03, '#2a2826', 2); linha(x, y + v, x + 1, y + v, '#8a8c8e', 2); linha(x, y + v - 0.02, x + 1, y + v - 0.02, '#c4c6c8'); }
    } else if (m === 'pedra') {
      // paralelepípedo da feira: pedras desencontradas com rejunte de terra
      for (let j = 0; j < 4; j++) { const off = j % 2 ? 0.125 : 0; for (let i = -1; i < 4; i++) { const a = Math.max(x, x + off + i / 4), b2 = Math.min(x + 1, x + off + (i + 1) / 4); if (b2 <= a) continue; const f = 0.85 + r() * 0.3; quad(a + 0.015, y + j / 4 + 0.02, b2 - 0.015, y + (j + 1) / 4 - 0.02, tom(st.base, f)); linha(a + 0.02, y + j / 4 + 0.03, b2 - 0.02, y + j / 4 + 0.03, tom(st.base, f + 0.14)); } }
      if (r() > 0.8) { ponto(x + r(), y + r(), 1, 2, VERDE[1]); }
    } else if (m === 'plataforma') {
      // laje da plataforma com faixa amarela de borda e piso tátil
      linha(x, y + 1, x + 1, y + 1, tom(st.base, 0.7)); linha(x + 1, y, x + 1, y + 1, tom(st.base, 0.7));
      for (let k = 0; k < 14; k++) ponto(x + r(), y + r(), 1, 1, r() > 0.5 ? tom(st.base, 1.1) : tom(st.base, 0.86));
      if (tipo(x, y - 1) >= 0 && CHAO[tipo(x, y - 1)].marca === 'trilho') { quad(x, y + 0.04, x + 1, y + 0.16, '#c8a83a'); quad(x, y + 0.18, x + 1, y + 0.28, '#a89a6a'); for (let k = 0; k < 8; k++) ponto(x + k / 8 + 0.03, y + 0.22, 1, 1, '#6a6040'); }
      if (r() > 0.85) { const p = P(x + 0.3 + r() * 0.4, y + 0.4 + r() * 0.4); g.fillStyle = '#3a383422'; g.beginPath(); g.ellipse(p.x, p.y, 9, 4, 0, 0, 7); g.fill(); }
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
    const L = Math.min(1.2, h / 95);
    // sombra da caixa: a base mais a base deslocada pra baixo à direita, ligadas (casco convexo)
    const proj = (x0, y0, x1, y1, l) => { const k = l * 0.45, pts = [P(x0, y0), P(x1, y0), P(x1 + l, y0 + k), P(x1 + l, y1 + k), P(x0 + l, y1 + k), P(x0, y1)]; sg.beginPath(); pts.forEach((q, i) => i ? sg.lineTo(q.x, q.y) : sg.moveTo(q.x, q.y)); sg.closePath(); sg.fill(); };
    if (o.tipo === 'arvore') { const p = P(o.x + 0.5 + 0.8, o.y + 0.5 + 0.36); sg.beginPath(); sg.ellipse(p.x, p.y, 30, 14, 0, 0, 7); sg.fill(); }
    else if (o.tipo === 'poste' || o.tipo === 'antena') { sq(o.x + 0.45, o.y + 0.45, o.x + 0.55 + L, o.y + 0.55); sq(o.x + 0.4 + L, o.y + 0.35, o.x + 0.65 + L, o.y + 0.75); }
    else if (o.tipo === 'pneus' || o.tipo === 'tambor') { const p = P(o.x + 0.75, o.y + 0.5); sg.beginPath(); sg.ellipse(p.x, p.y, 14, 7, 0, 0, 7); sg.fill(); }
    else proj(o.x + 0.04, o.y + 0.04, o.x + o.w - 0.04, o.y + o.d - 0.04, L);
  }
  g.globalAlpha = 0.3; g.filter = 'blur(2px)'; g.drawImage(sc, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
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
  bancada: 20, gerador: 22, pneus: 16, carcaca: 26, carroOficina: 44, tambor: 22, ferramentas: 42, antena: 120, mesaRadio: 20,
  beliche: 40, cama: 18, armario: 62, barraca: 56, tenda: 76, maca: 14, caixaMedica: 16, tanque: 96, planta: 10,
  quadro: 44, poste: 124, fogueira: 10, banco: 10, cerca: 18, casinha: 24, galinheiro: 40, arvore: 110,
  bloco: 104, carro: 44, banca: 44, vagao: 58, barricada: 22, entulho: 8, placaRua: 40,
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

// carro largado: sedã, hatch, picape ou van, com roda de aro, para-choque, farol, lanterna, retrovisor,
// vidro trincado, ferrugem e amassado. queimado = carcaça preta, sem vidro e sem pneu.
function veiculo(g, o, r, queimado) {
  const { x, y, w, d } = o, ao = w >= d;
  const modelos = ['seda', 'hatch', 'picape', 'van'];
  const mod = o.modelo || modelos[Math.floor(r() * 4)];
  const cor = queimado ? '#3a3632' : (o.cor || '#5a6a72');
  const vid = queimado ? { topo: '#1a1816', esq: '#141210', dir: '#100e0c' } : { topo: '#2c3a40', esq: '#24323a', dir: '#1a262c' };
  const bx = x + 0.06, by = y + 0.1, bw = w - 0.12, bd = d - 0.2;
  // sub-caixa por fração do comprimento (u) e da largura (v), seja o carro deitado em x ou em y
  const sub = (u0, u1, v0, v1, h, c, z) => ao ? caixa(g, bx + bw * u0, by + bd * v0, bw * (u1 - u0), bd * (v1 - v0), h, c, z) : caixa(g, bx + bd * v0 * (bw / bd), by + bd * u0, bw * (v1 - v0), bd * (u1 - u0), h, c, z);
  const lado = ao ? 'esq' : 'dir', ponta = ao ? 'dir' : 'esq';
  // cabine inclinada de verdade: base larga no capô, teto recuado; lateral e para-brisa são trapézios de vidro
  const W = (u, v, z) => { const p = ao ? iso(bx + bw * u, by + bd * v) : iso(bx + bw * v, by + bd * u); return { x: p.x, y: p.y - z }; };
  const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.fill(); };
  const linhaV = (a, b, c, l = 1) => { g.strokeStyle = c; g.lineWidth = l; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
  const cabine = (c0, c1, zb, hc, recuoF, recuoT) => {
    const b = [W(c0, 0.1, zb), W(c1, 0.1, zb), W(c1, 0.9, zb), W(c0, 0.9, zb)];
    const t = [W(c0 + recuoT, 0.18, zb + hc), W(c1 - recuoF, 0.18, zb + hc), W(c1 - recuoF, 0.82, zb + hc), W(c0 + recuoT, 0.82, zb + hc)];
    poly([b[3], b[2], t[2], t[3]], vid.esq);                                   // lateral
    poly([b[1], b[2], t[2], t[1]], vid.dir);                                   // para-brisa
    if (!queimado) {
      const m0 = W(c0 + (c1 - c0) * 0.5, 0.9, zb), m1 = W(c0 + recuoT + (c1 - recuoF - c0 - recuoT) * 0.5, 0.82, zb + hc);
      linhaV(m0, m1, tom(cor, 0.8), 2);                                          // coluna do meio
      const r0 = W(c1 - (c1 - c0) * 0.1, 0.2, zb + 1), r1 = W(c1 - recuoF * 0.6, 0.4, zb + hc - 2);
      linhaV(r0, r1, '#ffffff30', 2);                                            // reflexo no para-brisa
      const s0 = W(c0 + (c1 - c0) * 0.2, 0.9, zb + 2), s1 = W(c0 + (c1 - c0) * 0.3, 0.86, zb + hc - 2);
      linhaV(s0, s1, '#ffffff22', 1);
    }
    linhaV(b[2], t[2], cor, 2); linhaV(b[3], t[3], cor, 2);                      // colunas da frente e de trás
    poly(t, tom(cor, 1.08));                                                    // teto
    g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath(); [b[3], b[2], b[1], t[1], t[0], t[3]].forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.stroke();
  };
  const comprimento = mod === 'hatch' ? 0.86 : 1, u0 = (1 - comprimento) / 2, u1 = 1 - u0;
  // rodas com aro (atrás da carroceria)
  const rodas = ao ? [[u0 + 0.18, 1], [u1 - 0.18, 1]] : [[1, u0 + 0.18], [1, u1 - 0.18]];
  const furado = !queimado && r() > 0.7;
  for (const [a, b] of rodas) {
    const p = ao ? iso(bx + bw * a, by + bd + 0.02) : iso(bx + bw + 0.02, by + bd * b);
    if (queimado) { g.fillStyle = '#2a2622'; g.fillRect(p.x - 4, p.y - 6, 8, 5); continue; }
    if (o.calco) { // sem roda, apoiado em bloco de concreto
      g.fillStyle = '#141412'; g.fillRect(p.x - 6, p.y - 9, 12, 9); g.fillStyle = '#8a8a82'; g.fillRect(p.x - 5, p.y - 8, 10, 7);
      g.fillStyle = '#6a6a64'; g.fillRect(p.x - 3, p.y - 6, 2, 3); g.fillRect(p.x + 1, p.y - 6, 2, 3); g.fillStyle = '#a6a69c'; g.fillRect(p.x - 5, p.y - 8, 10, 1); continue;
    }
    const ry = furado && a === rodas[0][0] && b === rodas[0][1] ? 5 : 7;
    g.fillStyle = '#0e0e0e'; g.beginPath(); g.ellipse(p.x, p.y - ry, 8, ry + 1, 0, 0, 7); g.fill();
    g.fillStyle = '#1e1e1e'; g.beginPath(); g.ellipse(p.x, p.y - ry, 7, ry, 0, 0, 7); g.fill();
    g.fillStyle = '#7a8084'; g.beginPath(); g.ellipse(p.x, p.y - ry, 3.5, ry * 0.5, 0, 0, 7); g.fill();
    g.fillStyle = '#b8bec2'; g.fillRect(p.x - 1, p.y - ry - 2, 2, 1);
  }
  const altCorpo = mod === 'van' ? 34 : 16, zc = 7;
  // carroceria
  sub(u0, u1, 0, 1, altCorpo, cor, zc);
  sub(u0 + 0.01, u1 - 0.01, 0.04, 0.96, 1, tom(cor, 1.12), zc + altCorpo);   // borda clara do capô e da tampa
  // faixa escura da saia e para-choques
  sub(u1 - 0.03, u1 + 0.02, 0.05, 0.95, 5, '#2a2a28', zc - 1);
  if (mod === 'seda' || mod === 'hatch') {
    const c0 = mod === 'seda' ? 0.28 : 0.38, c1 = mod === 'seda' ? 0.74 : 0.9;
    cabine(c0, c1, zc + altCorpo, 14, mod === 'seda' ? 0.1 : 0.12, mod === 'seda' ? 0.08 : 0.03);
  } else if (mod === 'picape') {
    // caçamba funda: fundo escuro, parede do fundo e lateral de trás, tralha, e só depois a lateral da frente e a cabine
    const zb = zc + altCorpo, cb = tom(cor, 0.9), u2 = 0.5;
    sub(u0 + 0.02, u2, 0.06, 0.94, 1, queimado ? '#1a1816' : tom(cor, 0.45), zb);
    sub(u0 + 0.02, u2, 0.04, 0.12, 7, cb, zb);                   // lateral do fundo
    sub(u0 + 0.02, u0 + 0.07, 0.04, 0.96, 7, cb, zb);            // tampa traseira
    if (!queimado) { sub(0.12, 0.27, 0.16, 0.48, 8, '#7a6448', zb + 1); sub(0.3, 0.42, 0.2, 0.42, 5, '#3f5a6a', zb + 1); }
    sub(u2 - 0.04, u2, 0.04, 0.96, 7, cb, zb);                   // parede atrás da cabine
    sub(u0 + 0.02, u2, 0.88, 0.96, 7, cb, zb);                   // lateral da frente
    cabine(0.52, 0.82, zb, 16, 0.08, 0.02);
  } else {
    // van: frente com vidro alto, lateral com janela só na cabine
    sub(u0 + 0.02, u1 - 0.02, 0.06, 0.94, 3, tom(cor, 1.1), zc + altCorpo);
    // para-brisa na frente e janela da cabine na lateral
    const hv = altCorpo + zc;
    ao ? placa(g, bx + bw * u0, by, bw * (u1 - u0), bd, ponta, 0.08, 0.92, 0.6, 0.92, hv, vid.esq) : placa(g, bx, by + bd * u0, bw, bd * (u1 - u0), ponta, 0.08, 0.92, 0.6, 0.92, hv, vid.esq);
    ao ? placa(g, bx + bw * u0, by, bw * (u1 - u0), bd, lado, 0.76, 0.97, 0.6, 0.9, hv, vid.esq) : placa(g, bx, by + bd * u0, bw, bd * (u1 - u0), lado, 0.76, 0.97, 0.6, 0.9, hv, vid.esq);
    if (!queimado) ao ? placa(g, bx + bw * u0, by, bw * (u1 - u0), bd, lado, 0.08, 0.5, 0.15, 0.5, hv, tom(cor, 0.85)) : placa(g, bx, by + bd * u0, bw, bd * (u1 - u0), lado, 0.08, 0.5, 0.15, 0.5, hv, tom(cor, 0.85));
  }
  if (!queimado) {
    // friso, maçaneta, ferrugem e amassado na lateral
    const P = (uu0, uu1, vv0, vv1, c, hh = altCorpo + zc) => ao ? placa(g, bx + bw * u0, by, bw * (u1 - u0), bd, lado, uu0, uu1, vv0, vv1, hh, c) : placa(g, bx, by + bd * u0, bw, bd * (u1 - u0), lado, uu0, uu1, vv0, vv1, hh, c);
    P(0, 1, 0.5, 0.56, tom(cor, 0.68)); P(0, 1, 0.92, 0.98, tom(cor, 1.18));
    P(0.42, 0.46, 0.66, 0.7, '#c9c2b0'); P(0.7, 0.74, 0.66, 0.7, '#c9c2b0');
    P(0.06 + r() * 0.5, 0.3 + r() * 0.5, 0.25, 0.48, '#A65F3D77'); P(0.6, 0.78, 0.35, 0.6, '#00000030');
    P(0.03, 0.07, 0.2, 0.6, '#24282B');
    // farol e lanterna
    const PF = (uu0, uu1, vv0, vv1, c) => ao ? placa(g, bx + bw * u0, by, bw * (u1 - u0), bd, ponta, uu0, uu1, vv0, vv1, altCorpo + zc, c) : placa(g, bx, by + bd * u0, bw, bd * (u1 - u0), ponta, uu0, uu1, vv0, vv1, altCorpo + zc, c);
    PF(0.08, 0.26, 0.55, 0.8, '#e8e2c8'); PF(0.74, 0.92, 0.55, 0.8, r() > 0.5 ? '#e8e2c8' : '#3a3a36'); PF(0.3, 0.7, 0.55, 0.75, '#2a2a28');
    // retrovisor
    const rv = ao ? iso(bx + bw * 0.72, by + bd + 0.04) : iso(bx + bw + 0.04, by + bd * 0.72); g.fillStyle = '#141412'; g.fillRect(rv.x - 2, rv.y - altCorpo - zc - 4, 4, 3); g.fillStyle = tom(cor, 0.8); g.fillRect(rv.x - 1, rv.y - altCorpo - zc - 3, 2, 1);
  } else {
    // fuligem e ferrugem por cima de tudo
    const c = iso(x + w / 2, y + d / 2);
    for (let k = 0; k < 18; k++) { g.fillStyle = ['#A65F3D', '#6a3a2a', '#1a1816', '#5a4a3a'][k % 4]; g.fillRect(Math.round(c.x + (r() - 0.5) * 50), Math.round(c.y - 10 - r() * 22), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
  }
  // caco de vidro no chão
  { const c = iso(x + w / 2, y + d / 2); for (let k = 0; k < 5; k++) { g.fillStyle = '#c8d4d888'; g.fillRect(Math.round(c.x + (r() - 0.5) * 40), Math.round(c.y + 6 + (r() - 0.5) * 12), 2, 1); } }
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
    case 'carro': veiculo(g, o, r, false); break;
    case 'banca': {
      // banca de feira: quatro paus, bancada com pano, caixote de fruta e lona listrada caída de um lado
      const lona = o.cor || ['#9a3a2a', '#3f5a6a', '#566D4A', '#b08a3a'][Math.floor(r() * 4)];
      for (const [px, py] of [[0.08, 0.12], [0.86, 0.12], [0.08, 0.8], [0.86, 0.8]]) caixa(g, x + px, y + py, 0.06, 0.06, 40, '#6e5a44');
      caixa(g, x + 0.1, y + 0.3, 0.8, 0.5, 4, '#7a6048', 14);
      placa(g, x + 0.1, y + 0.3, 0.8, 0.5, 'esq', 0, 1, -3, 1, 18, tom(lona, 0.8));                       // pano na frente
      for (let k = 0; k < 3; k++) {
        const cx = x + 0.16 + k * 0.25; caixote(g, cx, y + 0.38, 0.2, 0.3, 6, 18);
        const c = iso(cx + 0.1, y + 0.53), fr = ['#c65345', '#d8902a', '#6f8a4a', '#d8c070', '#7a3a5a'][Math.floor(r() * 5)], podre = r() > 0.5;
        for (let j = 0; j < 6; j++) { g.fillStyle = podre && j % 2 ? '#4a4030' : fr; g.fillRect(Math.round(c.x - 5 + (j % 3) * 3), Math.round(c.y - 26 - Math.floor(j / 3) * 2), 3, 2); }
      }
      // lona: plano inclinado de trás (alto) pra frente (baixo), com listra
      const L = (u, v, z) => { const q = iso(x + u, y + v); return { x: q.x, y: q.y - z }; };
      const pts = [L(0.02, 0.06, 44), L(0.98, 0.06, 44), L(0.98, 0.92, 36), L(0.02, 0.92, 36)];
      g.fillStyle = lona; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.fill();
      for (let k = 1; k < 6; k += 2) { const a = L(k / 6, 0.06, 44), b = L((k + 1) / 6, 0.06, 44), c = L((k + 1) / 6, 0.92, 36), d = L(k / 6, 0.92, 36); g.fillStyle = '#e8e2d0bb'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill(); }
      { const a = L(0.02, 0.92, 36), b = L(0.98, 0.92, 36); g.fillStyle = tom(lona, 0.7); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(b.x, b.y + 4); g.lineTo(a.x, a.y + 4); g.closePath(); g.fill(); }   // barra da lona
      if (r() > 0.6) { const a = L(0.7, 0.92, 32); g.fillStyle = '#141412'; g.fillRect(Math.round(a.x), Math.round(a.y), 6, 3); }                                    // rasgo
      g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.stroke();
      break;
    }
    case 'vagao': {
      // um pedaço de vagão por célula (ordena certo com quem passa do lado). o.ini/o.fim = pontas; o.tipoV: 'passageiro', 'carga', 'loco', 'onibus'
      const tv = o.tipoV || 'carga', cor = o.cor || '#7a3a2a', bus = tv === 'onibus';
      const zb = bus ? 8 : 12, hc = bus ? 34 : tv === 'loco' ? 44 : 42, by0 = y + 0.12, bd0 = 0.76;
      // truque/rodas embaixo
      if (bus) { if (o.ini || o.fim) { const c = iso(x + 0.5, y + 0.9); g.fillStyle = '#0e0e0e'; g.beginPath(); g.ellipse(c.x, c.y - 6, 7, 6, 0, 0, 7); g.fill(); g.fillStyle = '#5a6064'; g.beginPath(); g.ellipse(c.x, c.y - 6, 3, 2.5, 0, 0, 7); g.fill(); } }
      else { caixa(g, x + 0.05, y + 0.2, 0.9, 0.6, 5, '#2a2826', 2); if (o.ini || o.fim) for (const u of [0.25, 0.7]) { const c = iso(x + u, y + 0.82); g.fillStyle = '#141412'; g.beginPath(); g.ellipse(c.x, c.y - 5, 5, 4, 0, 0, 7); g.fill(); g.fillStyle = '#4a4c4e'; g.beginPath(); g.ellipse(c.x, c.y - 5, 2.5, 2, 0, 0, 7); g.fill(); } }
      const x0 = x + (o.ini ? 0.06 : 0), w0 = 1 - (o.ini ? 0.06 : 0) - (o.fim ? 0.06 : 0);
      CONTORNO.ligado = false;
      caixa(g, x0, by0, w0, bd0, hc, { topo: tom(cor, 1.15), esq: cor, dir: tom(cor, 0.72) }, zb);
      CONTORNO.ligado = true;
      const F = (u0, u1, v0, v1, c) => placa(g, x0, by0, w0, bd0, 'esq', u0, u1, v0, v1, hc + zb, c);
      if (tv === 'carga') {
        for (let k = 0; k < 4; k++) F(k / 4 + 0.02, k / 4 + 0.06, 0.25, 1, tom(cor, 0.78));                  // nervuras
        if (r() > 0.5) { F(0.2, 0.8, 0.28, 0.95, tom(cor, 0.88)); F(0.48, 0.52, 0.3, 0.92, '#2a2826'); }      // porta de correr
        if (r() > 0.6) F(0.1 + r() * 0.4, 0.5 + r() * 0.4, 0.4, 0.62, ['#c8b23a88', '#e8e2d088', '#3f8a7a88'][Math.floor(r() * 3)]); // pichação
      } else {
        const vid = '#1e2a30';
        F(0, 1, 0.28 + (bus ? 0.04 : 0), 0.34 + (bus ? 0.04 : 0), bus ? '#c8a83a' : '#d8d3c4');            // faixa
        for (const [a, b2] of bus ? [[0.04, 0.46], [0.54, 0.96]] : [[0.1, 0.4], [0.6, 0.9]]) { F(a, b2, 0.5, 0.86, vid); F(a, a + (b2 - a) * 0.4, 0.82, 0.86, '#ffffff22'); if (r() > 0.65) F(a + 0.05, a + 0.12, 0.55, 0.8, '#3a4a50'); }
        if (tv === 'loco' && o.fim) { placa(g, x0, by0, w0, bd0, 'dir', 0.15, 0.85, 0.55, 0.85, hc + zb, vid); placa(g, x0, by0, w0, bd0, 'dir', 0.35, 0.65, 0.12, 0.25, hc + zb, '#e8d8a0'); }
      }
      F(0, 1, 0, 0.08, '#00000040'); F(r() * 0.6, r() * 0.6 + 0.3, 0.1, 0.4, '#A65F3D55');                    // sujeira e ferrugem
      if (o.fim && tv !== 'loco') placa(g, x0, by0, w0, bd0, 'dir', 0.3, 0.7, 0.15, 0.85, hc + zb, tom(cor, 0.6));
      // teto arredondado (vagão de passageiro) ou reto
      if (tv !== 'carga') caixa(g, x0 + 0.02, by0 + 0.08, w0 - 0.04, bd0 - 0.16, 3, tom(cor, 1.2), hc + zb);
      // contorno só nas bordas de fora
      { const A2 = iso(x0, by0), B = iso(x0 + w0, by0), C = iso(x0 + w0, by0 + bd0), D = iso(x0, by0 + bd0), Z = zb, U = hc + zb; const Lx = (a, b2) => { g.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5); g.lineTo(Math.round(b2.x) + 0.5, Math.round(b2.y) + 0.5); };
        const up = (q, z) => ({ x: q.x, y: q.y - z });
        g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath(); Lx(up(D, Z), up(C, Z)); Lx(up(D, U), up(C, U)); Lx(up(A2, U), up(B, U));
        if (o.ini) { Lx(up(D, Z), up(D, U)); Lx(up(A2, U), up(D, U)); } if (o.fim) { Lx(up(C, Z), up(C, U)); Lx(up(B, U), up(C, U)); Lx(up(C, Z), up(B, Z)); Lx(up(B, Z), up(B, U)); } g.stroke(); }
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
      // barreira de sacos de areia: fileiras desencontradas como tijolo, cada saco estufado com a costura e a dobra amarrada
      // cada saco é um travesseiro: a mesma forma arredondada empilhada de 1 em 1 px, mais estufada no meio
      const espelho = o.eixo === 'y', c0 = iso(x + 0.5, y + 0.5);
      const forma = (cx, cy, L, D, k) => { g.beginPath(); g.save(); g.translate(cx, cy); g.transform(32 * k, 16 * k, -32 * k, 16 * k, 0, 0); g.roundRect(-L / 2, -D / 2, L, D, D / 2.1); g.restore(); };
      const saco = (u, v, z, k) => {
        const cor = ['#a39370', '#968762', '#ad9d78'][k % 3], H = 7;
        const p = iso(x + u, y + v), cx = espelho ? 2 * c0.x - p.x : p.x, cy = p.y - z;
        forma(cx, cy, 0.46, 0.27, 0.9); g.fillStyle = '#141412'; g.fill();
        for (let i = 0; i <= H; i++) { const f = 0.9 + 0.1 * Math.sin(i / H * Math.PI); forma(cx, cy - i, 0.46, 0.27, f); g.fillStyle = i < 3 ? tom(cor, 0.62) : tom(cor, 0.8); g.fill(); }
        forma(cx, cy - H - 0.5, 0.42, 0.23, 1); g.fillStyle = cor; g.fill(); g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.stroke();
        g.fillStyle = tom(cor, 1.25); g.beginPath(); g.ellipse(cx - 2, cy - H - 2, 6, 1.6, espelho ? -0.46 : 0.46, 0, 7); g.fill();
        const e = espelho ? -1 : 1; g.fillStyle = '#4a3e2a'; g.fillRect(Math.round(cx + e * 8) - 1, Math.round(cy - H + 2), 2, 3);   // ponta amarrada
      };
      // fileiras de trás pra frente, de baixo pra cima, desencontradas como tijolo
      for (let c = 0; c < 3; c++) {
        const z = c * 7, n = 3 - c, vs = c === 2 ? [0.5] : [0.36, 0.64];
        for (const v of vs) for (let i = 0; i < n; i++) saco(0.5 + (i - (n - 1) / 2) * 0.48, v, z, c + i);
      }
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
    case 'carcaca': veiculo(g, o, r, true); break;
    case 'carroOficina': veiculo(g, o, r, false); break;
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
    case 'cerca': {
      // cerca de tela de galinheiro numa aresta da célula: mourões de madeira, tela fina e travessa em cima
      const lado = o.lado || 'n', H = 18;
      const [ax, ay, bx2, by2] = lado === 'n' ? [x, y, x + 1, y] : lado === 's' ? [x, y + 1, x + 1, y + 1] : lado === 'w' ? [x, y, x, y + 1] : [x + 1, y, x + 1, y + 1];
      const P = iso(ax, ay), Q = iso(bx2, by2);
      if (!o.portao) {
        g.fillStyle = '#d8d8cc18'; g.beginPath(); g.moveTo(P.x, P.y - 1); g.lineTo(Q.x, Q.y - 1); g.lineTo(Q.x, Q.y - H + 3); g.lineTo(P.x, P.y - H + 3); g.closePath(); g.fill();
        g.strokeStyle = '#c8c8bc55'; g.lineWidth = 1; g.beginPath();
        for (let k = 0; k <= 8; k++) { const t0 = k / 8, mx = P.x + (Q.x - P.x) * t0, my = P.y + (Q.y - P.y) * t0; g.moveTo(mx, my - 1); g.lineTo(mx + (Q.x - P.x) / 16, my + (Q.y - P.y) / 16 - H + 3); g.moveTo(mx, my - H + 3); g.lineTo(mx + (Q.x - P.x) / 16, my + (Q.y - P.y) / 16 - 1); }
        g.stroke();
      } else { // porteira de ripa
        g.strokeStyle = '#8a6a46'; g.lineWidth = 2; g.beginPath(); g.moveTo(P.x, P.y - 3); g.lineTo(Q.x, Q.y - 3); g.moveTo(P.x, P.y - H + 4); g.lineTo(Q.x, Q.y - H + 4); g.moveTo(P.x, P.y - 3); g.lineTo(Q.x, Q.y - H + 4); g.stroke();
      }
      g.strokeStyle = '#7e6448'; g.lineWidth = 2; g.beginPath(); g.moveTo(P.x, P.y - H + 2); g.lineTo(Q.x, Q.y - H + 2); g.stroke();
      for (const M of [P, Q]) { g.fillStyle = '#141412'; g.fillRect(Math.round(M.x) - 2, Math.round(M.y) - H - 1, 4, H + 1); g.fillStyle = '#7a5e40'; g.fillRect(Math.round(M.x) - 1, Math.round(M.y) - H, 2, H); g.fillStyle = '#a0825e'; g.fillRect(Math.round(M.x) - 1, Math.round(M.y) - H, 2, 1); }
      break;
    }
    case 'galinheiro': {
      // casinha das galinhas em palafita, com rampa de ripas e poleiro
      for (const [px, py] of [[0.12, 0.12], [0.82, 0.12], [0.12, 0.82], [0.82, 0.82]]) caixa(g, x + px, y + py, 0.06, 0.06, 10, '#5a4430');
      caixa(g, x + 0.1, y + 0.1, 0.8, 0.8, 18, '#8a6a46', 10);
      for (let k = 1; k < 5; k++) { placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0, 1, k / 5, k / 5 + 0.04, 18 + 10, '#5a443088'); placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'dir', 0, 1, k / 5, k / 5 + 0.04, 18 + 10, '#5a443088'); }
      placa(g, x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0.38, 0.62, 0.36, 0.64, 18 + 10, '#1a1410');   // portinhola
      { const A = iso(x + 0.02, y + 0.5), B = iso(x + 0.98, y + 0.5), C = iso(x + 0.98, y + 0.98), D = iso(x + 0.02, y + 0.98), E = iso(x + 0.98, y + 0.02), F = iso(x + 0.02, y + 0.02);
        const T = 28, Tc = 40;
        g.fillStyle = '#7a3a2a'; g.beginPath(); g.moveTo(D.x, D.y - T); g.lineTo(C.x, C.y - T); g.lineTo(B.x, B.y - Tc); g.lineTo(A.x, A.y - Tc); g.closePath(); g.fill();
        g.fillStyle = '#5a2a1e'; g.beginPath(); g.moveTo(C.x, C.y - T); g.lineTo(E.x, E.y - T); g.lineTo(B.x, B.y - Tc); g.closePath(); g.fill();
        g.fillStyle = '#9a4a34'; g.beginPath(); g.moveTo(F.x, F.y - T); g.lineTo(E.x, E.y - T); g.lineTo(B.x, B.y - Tc); g.lineTo(A.x, A.y - Tc); g.closePath(); g.fill();
        g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath(); g.moveTo(D.x, D.y - T); g.lineTo(C.x, C.y - T); g.lineTo(E.x, E.y - T); g.lineTo(B.x, B.y - Tc); g.lineTo(A.x, A.y - Tc); g.closePath(); g.stroke(); }
      { const a0 = naFace(x + 0.1, y + 0.1, 0.8, 0.8, 'esq', 0.5, 0.36, 28), a1 = iso(x + 0.5, y + 1.25); // rampa
        g.strokeStyle = '#141412'; g.lineWidth = 5; g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
        g.strokeStyle = '#9a7a54'; g.lineWidth = 3; g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
        g.fillStyle = '#5a4430'; for (let k = 1; k < 4; k++) { const mx = a0.x + (a1.x - a0.x) * k / 4, my = a0.y + (a1.y - a0.y) * k / 4; g.fillRect(Math.round(mx) - 2, Math.round(my), 4, 1); } }
      break;
    }
    case 'casinha': {
      // casinha de cachorro com telhado de duas águas, porta em arco e tigela
      caixa(g, x + 0.15, y + 0.2, 0.7, 0.6, 14, '#a07a50');
      for (let k = 1; k < 4; k++) placa(g, x + 0.15, y + 0.2, 0.7, 0.6, 'dir', 0, 1, k / 4, k / 4 + 0.05, 14, '#6a4c3088');
      const A = iso(x + 0.1, y + 0.5), B = iso(x + 0.9, y + 0.5), C = iso(x + 0.9, y + 0.85), D = iso(x + 0.1, y + 0.85), E = iso(x + 0.9, y + 0.15), F = iso(x + 0.1, y + 0.15);
      g.fillStyle = '#3f5a6a'; g.beginPath(); g.moveTo(D.x, D.y - 14); g.lineTo(C.x, C.y - 14); g.lineTo(B.x, B.y - 24); g.lineTo(A.x, A.y - 24); g.closePath(); g.fill();
      g.fillStyle = '#56788a'; g.beginPath(); g.moveTo(F.x, F.y - 14); g.lineTo(E.x, E.y - 14); g.lineTo(B.x, B.y - 24); g.lineTo(A.x, A.y - 24); g.closePath(); g.fill();
      g.fillStyle = '#a07a50'; g.beginPath(); g.moveTo(C.x, C.y - 14); g.lineTo(E.x, E.y - 14); g.lineTo(B.x, B.y - 24); g.closePath(); g.fill();
      g.strokeStyle = '#141412aa'; g.lineWidth = 1; g.beginPath(); g.moveTo(D.x, D.y - 14); g.lineTo(C.x, C.y - 14); g.lineTo(E.x, E.y - 14); g.lineTo(B.x, B.y - 24); g.lineTo(A.x, A.y - 24); g.closePath(); g.stroke();
      const pt = naFace(x + 0.15, y + 0.2, 0.7, 0.6, 'esq', 0.5, 0, 14);
      g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(pt.x, pt.y - 6, 4, 6, 0, Math.PI, 0); g.lineTo(pt.x + 4, pt.y); g.lineTo(pt.x - 4, pt.y); g.closePath(); g.fill();
      const tg = iso(x + 0.8, y + 0.95); g.fillStyle = '#141412'; g.beginPath(); g.ellipse(tg.x, tg.y - 1, 4, 2, 0, 0, 7); g.fill(); g.fillStyle = '#9a3a2a'; g.beginPath(); g.ellipse(tg.x, tg.y - 1.5, 3, 1.4, 0, 0, 7); g.fill();
      break;
    }
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
const ALTOS = new Set(['muro', 'pilar', 'portao', 'guarita', 'arquivo', 'estante', 'antena', 'beliche', 'armario', 'barraca', 'tenda', 'tanque', 'quadro', 'poste', 'arvore', 'ferramentas', 'caixas', 'bloco', 'vagao', 'banca']);

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
  feirante: { torso: '#8a7a5a', detalhe: '#c9c2b0', calca: '#3e4f66', bota: '#2a2522', manga: '#c9c2b0', colete: true, coleteCor: '#e0d8c0' },
  gritador: { torso: '#4a5a70', detalhe: '#34404e', calca: '#5a5446', bota: '#2a2522', manga: '#a0a8b0' },
  ferroviario: { torso: '#c8642a', detalhe: '#e0d040', calca: '#3a3c40', bota: '#1e1c1a', manga: '#c8642a', colete: true, coleteCor: '#e0d040' },
  maquinista: { torso: '#3a4e6a', detalhe: '#2a3a50', calca: '#3a4e6a', bota: '#1e1c1a', manga: '#3a4e6a', alcas: true },
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
  feirante: [
    { corpo: 'b', pele: 'z2', cabelo: 'curto', corCabelo: 'c5', roupa: 'feirante', zumbi: true },
    { corpo: 'a', pele: 'z1', cabelo: 'coque', corCabelo: 'c3', roupa: 'feirante', zumbi: true },
  ],
  gritador: [{ corpo: 'a', pele: 'z3', cabelo: 'longo', corCabelo: 'c1', roupa: 'gritador', zumbi: true }],
  ferroviario: [{ corpo: 'b', pele: 'z1', cabelo: 'raspado', corCabelo: 'c2', roupa: 'ferroviario', zumbi: true, bone: true, escala: 1.15 }],
  maquinista: [{ corpo: 'b', pele: 'z2', cabelo: 'raspado', corCabelo: 'c5', roupa: 'maquinista', zumbi: true, bone: true, barba: true, escala: 1.45 }],
};

// o que cada equipamento muda no desenho do boneco (ap.eq = { arma, protecao, mochila, ferramenta })
const EQUIP_VIS = {
  barra_portao: { haste: '#8f979c', forma: 'barra', fita: '#7a3a2a' },
  cano_rebite: { haste: '#7d858a', cabeca: '#4f5559', forma: 'cano', fita: '#24282B', comp: 1.1 },
  machadinha: { haste: '#7a5a3e', lamina: '#b9c0c4', forma: 'machado', fita: '#3a2a1e' },
  chave_linha: { haste: '#5a6064', cabeca: '#3a3e42', forma: 'cano', fita: '#9a3a2a', comp: 1.2 },
  jaqueta_ronda: { reforco: '#5a3a26' },
  colete_lona: { colete: '#b7a67a' },
  mochila_lona: { bolsa: '#6b7350', alca: '#4c5238' },
  mochila_reforcada: { bolsa: '#4a5560', alca: '#333b44', armacao: '#aab1b5', grande: true },
  ferramenta_recuperacao: { cinto: '#a8443a' },
  lanca_vergalhao: { haste: '#7a6f5e', bico: '#cfd5d8', forma: 'lanca', fita: '#3f5a6a', comp: 1.4 },
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
  const bob = estado === 'anda' ? Math.round(1 - Math.abs(Math.sin(fase))) : (estado === 'parado' && f % 4 >= 2 ? 1 : 0);
  // a cabeça acompanha o corpo com um pequeno atraso: dá peso à passada
  const bobCab = estado === 'anda' ? Math.round(1 - Math.abs(Math.sin(fase - 0.7))) : bob;
  const px = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const zumbi = !!ap.zumbi, atq = estado === 'ataca' ? f : -1, golpe = atq >= 2 && atq <= 3;
  const cx = PX + (golpe && zumbi ? lado * 2 : 0), topo = 22 + bob + (zumbi ? 1 : 0);
  const eq = ap.eq || {}, vArma = EQUIP_VIS[eq.arma], vProt = EQUIP_VIS[eq.protecao], vMoch = EQUIP_VIS[eq.mochila], vFerr = EQUIP_VIS[eq.ferramenta];

  // pernas: a coxa gira no quadril (meia passada), a canela vai inteira, e o pé que está no ar sobe
  const pernaY = 56 + bob, pernaH = PY - pernaY;
  const pernaE = cx - 5 - largo / 2, pernaD = cx + 1 + largo / 2;
  const anda = estado === 'anda', AMP = 3.4;
  const avE = anda ? -Math.round(Math.cos(fase) * AMP) * lado : 0, avD = -avE;
  const sobeE = anda ? Math.round(Math.max(0, Math.sin(fase)) * 2.6) : 0, sobeD = anda ? Math.round(Math.max(0, -Math.sin(fase)) * 2.6) : 0;
  const meio = Math.round(pernaH * 0.48);
  const perna = (x0, av, sobe, cor, bota) => {
    const coxa = Math.round(av / 2);
    px(x0 + coxa, pernaY, 4, meio + 1, cor);
    px(x0 + av, pernaY + meio, 4, pernaH - meio - 2 - sobe, cor);
    if (sobe) px(x0 + Math.round(av * 0.75) + (lado > 0 ? 1 : -1), pernaY + meio - 1, 4, 2, tom(cor, 1.12));   // joelho dobrado
    // bota: de bico pra frente; no ar o bico aponta pra baixo
    px(x0 + av + (lado > 0 ? 0 : -1), PY - 3 - sobe, 5, 3, bota);
    px(x0 + av + (lado > 0 ? 0 : -1), PY - 1 - sobe, 5, 1, tom(bota, 0.7));
  };
  // a perna de trás primeiro, mais escura
  const ordem = lado > 0 ? [[pernaD, avD, sobeD, tom(R.calca, 0.82), tom(R.bota, 0.85)], [pernaE, avE, sobeE, R.calca, R.bota]] : [[pernaE, avE, sobeE, R.calca, R.bota], [pernaD, avD, sobeD, tom(R.calca, 0.82), tom(R.bota, 0.85)]];
  for (const [x0, av, sb, cor, bt] of ordem) perna(x0, av, sb, cor, bt);
  const passo = Math.sin(fase), pa = Math.round(passo * 2);

  // braço do fundo (atrás do tronco)
  const tw = 14 + largo, tx = cx - tw / 2, ty = topo + 12;
  const bracoBalanço = estado === 'anda' ? Math.round(-passo * 3) : 0;
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
  // arma desenhada ao longo da direção da haste: cabo enrolado em fita, corpo com brilho e a cabeça certa de cada uma.
  // haste() desenha da mão até a ponta (esticando as armas longas); ponta() desenha a cabeça na ponta real.
  let pontaReal = null;
  const P2 = (x, y, cor) => px(x, y, 2, 2, cor), P1 = (x, y, cor) => px(x, y, 1, 1, cor);
  const haste = (x0, y0, x1, y1) => {
    const forma = vArma ? vArma.forma : 'barra', k = vArma && vArma.comp || 1;
    let dx = x1 - x0, dy = y1 - y0; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const ext = L * k, ex = x0 + dx * ext, ey = y0 + dy * ext, n = Math.ceil(ext);
    // perpendicular "pra cima" na tela, pra pôr o brilho de um lado só
    let vx = -dy, vy = dx; if (vy > 0) { vx = -vx; vy = -vy; }
    pontaReal = { x: ex, y: ey, dx, dy, vx, vy };
    const grosso = forma === 'cano' ? 3 : 2, fita = vArma && vArma.fita || '#2a2a26', corpo = metal, claro = tom(metal, 1.3), escuro = tom(metal, 0.7);
    // pomo atrás da mão
    P2(x0 - dx * 2, y0 - dy * 2, tom(fita, 0.8));
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i, y = y0 + dy * i, cabo = i < Math.min(5, n * 0.35);
      let cor = cabo ? (i % 2 ? fita : tom(fita, 1.3)) : corpo;
      if (!cabo && forma === 'lanca' && i % 3 === 0) cor = escuro;               // nervura do vergalhão
      if (!cabo && forma === 'machado') cor = i % 4 === 0 ? tom(corpo, 0.82) : corpo; // veio da madeira
      px(x, y, grosso, grosso, cor);
      if (!cabo && i % 2 === 0) P1(x + vx, y + vy, claro);                        // brilho correndo pela haste
    }
  };
  const ponta = () => {
    if (!vArma || !pontaReal) return;
    const { x, y, dx, dy, vx, vy } = pontaReal, f = vArma.forma;
    const at = (u, v) => ({ x: x + dx * u + vx * v, y: y + dy * u + vy * v });
    if (f === 'cano') {
      // cabeça de rebites: bola de metal com cravos claros
      for (let u = -2; u <= 3; u++) for (let v = -3; v <= 3; v++) { if (Math.abs(v) === 3 && (u === -2 || u === 3)) continue; const q = at(u, v); P2(q.x, q.y, v < 0 ? tom(vArma.cabeca, 1.15) : vArma.cabeca); }
      for (const [u, v] of [[-1, -2], [2, -2], [0, 1], [3, 0], [-1, 3], [2, 3]]) { const q = at(u, v); P2(q.x, q.y, '#c9c2b0'); P1(q.x, q.y, '#f4efe2'); }
    } else if (f === 'machado') {
      // lâmina larga pro lado de fora, fio claro e tope atrás
      const lado2 = -1;
      for (let u = -2; u <= 3; u++) for (let v = 1; v <= 3 + Math.max(0, u + 1); v++) { const q = at(u, v * lado2); P2(q.x, q.y, v >= 2 + Math.max(0, u + 1) ? '#e8eef0' : vArma.lamina); }
      for (let u = -1; u <= 2; u++) { const q = at(u, 2); P2(q.x, q.y, tom(vArma.lamina, 0.7)); }
      const c0 = at(0, 0); P2(c0.x, c0.y, '#3a3a36');
    } else if (f === 'lanca') {
      // ponta afiada, amarração de arame e fita colorida
      for (let u = 0; u <= 5; u++) { const w2 = u < 2 ? 1 : u < 4 ? 0.5 : 0; for (let v = -w2; v <= w2; v += 1) { const q = at(u, v); P2(q.x, q.y, u > 3 ? '#f4f8fa' : vArma.bico); } }
      for (let u = -3; u <= -1; u++) { const q = at(u, 0); P2(q.x, q.y, u % 2 ? '#c99a3a' : '#8f979c'); }
    } else {
      // barra de portão: ponta dobrada em gancho, com a quina gasta e clara
      for (const [u, v] of [[0, 0], [1, 0], [2, 1], [3, 2], [3, 3]]) { const q = at(u, v); P2(q.x, q.y, metal); }
      const q = at(3, 3); P1(q.x, q.y, '#e8eef0'); const q2 = at(1, -1); P1(q2.x, q2.y, tom(metal, 1.3));
    }
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
  const hx = cx - HL / 2 + (frente ? lado : 0), hy = topo - 5 + (bobCab - bob);
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


// ---------- bichos do abrigo ----------
// desenhados direto no canvas, olhando pra esquerda ou direita da tela. b: { tipo, px, py, fl, anda, t0 }
function desenharBicho(g, b, t) {
  const c = iso(b.px, b.py), passo = b.anda ? Math.sin(t * (b.tipo === 'cao' ? 16 : 20) + b.t0) : 0;
  g.save(); g.translate(Math.round(c.x), Math.round(c.y)); const esc = b.tipo === 'cao' ? 1.25 : 1.5; g.scale(b.fl ? -esc : esc, esc);
  const R = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
  if (b.tipo === 'cao') {
    g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(0, 0, 11, 3.5, 0, 0, 7); g.fill();
    const cor = b.cor || '#b5773c', esc = tom(cor, 0.7), cla = tom(cor, 1.25), bob = b.anda ? Math.round(Math.abs(passo)) : 0;
    const ab = b.anda ? Math.round(passo * 2) : 0;
    R(-8 - ab, -6, 3, 6, '#141412'); R(4 + ab, -6, 3, 6, '#141412');                      // patas do fundo
    R(-7 - ab, -6, 2, 5, esc); R(5 + ab, -6, 2, 5, esc);
    R(-10, -13 - bob, 18, 8, '#141412'); R(-9, -12 - bob, 16, 6, cor); R(-9, -12 - bob, 16, 2, cla); R(-6, -7 - bob, 10, 1, cla); // corpo
    const rabo = b.anda ? Math.round(Math.sin(t * 22) * 2) : Math.round(Math.sin(t * 9) * 1.5);
    R(-13, -16 - bob + rabo, 4, 3, '#141412'); R(-12, -15 - bob + rabo, 3, 2, cor);
    R(-6 + ab, -6, 3, 6, '#141412'); R(2 - ab, -6, 3, 6, '#141412'); R(-5 + ab, -6, 2, 5, cor); R(3 - ab, -6, 2, 5, cor); // patas da frente
    const cab = b.anda ? 0 : Math.round(Math.sin(t * 1.3 + b.t0));
    R(5, -19 - bob + cab, 8, 8, '#141412'); R(6, -18 - bob + cab, 6, 6, cor); R(11, -15 - bob + cab, 4, 4, '#141412'); R(11, -14 - bob + cab, 3, 2, cla); // cabeça e focinho
    R(14, -15 - bob + cab, 1, 1, '#141412'); R(9, -16 - bob + cab, 1, 1, '#141412');      // nariz e olho
    R(5, -20 - bob + cab, 3, 4, esc);                                                    // orelha
  } else {
    const galo = b.tipo === 'galo', cor = b.cor || (galo ? '#a4532a' : '#ece6d6'), esc = tom(cor, 0.72), cla = tom(cor, 1.15);
    const E = (x, y, rx, ry, a, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, 7); g.fill(); };
    E(0, 0, 6, 2.2, 0, '#00000038');
    const pa = b.anda ? Math.round(passo) : 0, s = galo ? 1 : 0;
    R(-1 + pa, -4, 1, 4, '#d8902a'); R(2 - pa, -4, 1, 4, '#d8902a');                      // pernas
    const bica = !b.anda && Math.sin(t * 2.2 + b.t0) > 0.75;                                 // ciscando
    const hx = bica ? 6 : 4, hy = bica ? -5 : -12 - s;
    // contorno: tudo um pouco maior em escuro, depois a cor por cima
    if (galo) E(-5, -11, 3.6, 5, -0.5, '#141412');
    E(-4.5, -9, 3, 3.5, -0.6, '#141412'); E(0, -7 - s / 2, 6.2, 4.4 + s / 2, 0, '#141412'); E(hx - 1, hy + 3, 2.6, 4, 0.4, '#141412'); E(hx, hy, 3, 3, 0, '#141412');
    if (galo) { E(-5, -11, 2.8, 4.2, -0.5, '#2a4a3a'); E(-6, -10, 1.4, 3, -0.3, '#3a2a4a'); }
    E(-4.5, -9, 2.2, 2.7, -0.6, esc);                                                    // rabo
    E(0, -7 - s / 2, 5.2, 3.5 + s / 2, 0, cor); E(-1, -8.5 - s / 2, 3.5, 1, 0, cla);        // corpo
    E(-1, -6.5, 3, 1.8, 0.2, esc);                                                       // asa
    E(hx - 1, hy + 3, 1.8, 3.2, 0.4, cor); E(hx, hy, 2.2, 2.2, 0, cor);                    // pescoço e cabeça
    R(hx + 2, hy - 0.5, 2.5, 1.5, '#e0a020');                                            // bico
    E(hx - 0.5, hy - 2.5 - s / 2, 1.8 + s / 2, 1 + s / 2, 0, '#d03a2a'); R(hx + 1, hy + 1, 1, 1.5 + s, '#d03a2a'); // crista e barbela
    R(hx + 0.5, hy - 1, 1, 1, '#141412');                                                // olho
  }
  g.restore();
}

PZ.arte = { desenharBicho, COR, TW, TH, HW, HH, iso, tom, desenharChao, desenharObjeto, caixaTela, ALTOS, ALTURA, folha, silhueta, NPC_AP, INIMIGO_AP, PELE, CABELO, ROUPA, EQUIP_VIS, QW, QH, PX, PY, DIRS };
})();
