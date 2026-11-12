// Prefeitura Z: Depois da Queda — motor do abrigo: entrada, colisão, caminho, câmera, ordem de desenho e oclusão.
// O mundo anda em células (x, y); a tela é só projeção. Andar no abrigo não gera recurso, então roda no cliente.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const A = PZ.arte;

const VEL = 3.4;          // células por segundo, igual em qualquer direção
const RAIO = 0.3;         // raio de colisão do personagem
const ALCANCE = 2.3;      // distância pra conversar
const TECLAS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

const ETIQUETA = { proprietario: 'Dono', administrador: 'Admin', moderador: 'Mod', suporte: 'Suporte' };
function dirDe(vx, vy) {
  const sx = vx - vy, sy = vx + vy;
  if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) return null;
  return sy >= -1e-6 ? (sx >= 0 ? 'SE' : 'SW') : (sx >= 0 ? 'NE' : 'NW');
}

class Motor {
  constructor(canvas, mundo, op) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.m = mundo; this.op = op;
    this.reduzir = !!op.reduzir;
    this.assistir = !!op.assistir;   // expedição: o boneco segue o roteiro do servidor, sem controle
    this.atores = [];                // quem mais aparece na cena (inimigos da rua)
    this.pausado = false;
    this.teclas = new Set();
    this.t = 0;
    this.chao = A.desenharChao(mundo);
    this.solido = new Uint8Array(mundo.LARG * mundo.ALT);
    for (let i = 0; i < this.solido.length; i++) if (mundo.chao[i] === mundo.T.AGUA) this.solido[i] = 1;
    this.estaticos = mundo.OBJ.map(o => {
      if (o.solido) for (let y = o.y; y < o.y + o.d; y++) for (let x = o.x; x < o.x + o.w; x++) this.marcar(x, y);
      // profundidade pelo centro da base: quem está na frente de uma mesa larga fica na frente dela
      return { ...o, prof: o.x + o.w / 2 + o.y + o.d / 2 + 0.49, caixa: A.caixaTela(o), alto: A.ALTOS.has(o.tipo) };
    });
    this.luzes = mundo.OBJ.filter(o => ['poste', 'pilar', 'fogueira', 'mesa'].includes(o.tipo)).map(o => {
      const p = A.iso(o.x + o.w / 2, o.y + o.d / 2), h = A.ALTURA[o.tipo];
      return { x: p.x + (o.tipo === 'poste' ? 12 : 0), y: p.y - (o.tipo === 'fogueira' ? 8 : o.tipo === 'mesa' ? h + 6 : o.tipo === 'poste' ? h - 7 : h - 2), r: o.tipo === 'fogueira' ? 90 : o.tipo === 'mesa' ? 50 : 70, chao: o.tipo === 'poste' ? { x: p.x + 12, y: p.y } : null };
    });
    this.fogueira = mundo.OBJ.find(o => o.tipo === 'fogueira');
    this.fumaca = [];

    this.npcs = mundo.NPCS.map(n => {
      this.marcar(n.x, n.y);
      return { ...n, px: n.x + 0.5, py: n.y + 0.5, dirBase: n.dir, dirAtual: n.dir, folha: A.folha(A.NPC_AP[n.ap]) };
    });
    this.moradores = mundo.MORADORES.map((mo, i) => ({ ...mo, folha: A.folha(A.NPC_AP[mo.ap]), px: mo.rota[0][0] + 0.5, py: mo.rota[0][1] + 0.5, alvo: 1, espera: i * 1.5, dir: 'SE', anda: false }));

    this.p = { x: mundo.SPAWN.x, y: mundo.SPAWN.y, dir: mundo.SPAWN.dir, anda: false, caminho: null, preso: 0, aoChegar: null };
    this.definirAparencia(op.aparencia);
    this.cam = { x: 0, y: 0 };
    const ps = A.iso(this.p.x, this.p.y); this.cam.x = ps.x; this.cam.y = ps.y - 30;
    this.zoom = innerWidth < 700 ? 1.5 : 2;
    this.marca = null;
    this.perto = null;
    this.outros = new Map();   // outros jogadores online (preenchido pela presença); não bloqueiam nem dão recurso

    this.ligar();
    this.redimensionar();
    this.ultimo = performance.now();
    this.rodando = true;
    requestAnimationFrame(t => this.quadro(t));
  }

  marcar(x, y) { if (x >= 0 && y >= 0 && x < this.m.LARG && y < this.m.ALT) this.solido[y * this.m.LARG + x] = 1; }
  bloqueado(cx, cy) { return cx < 0 || cy < 0 || cx >= this.m.LARG || cy >= this.m.ALT || this.solido[cy * this.m.LARG + cx] === 1; }
  livre(x, y) {
    for (let cy = Math.floor(y - RAIO); cy <= Math.floor(y + RAIO); cy++)
      for (let cx = Math.floor(x - RAIO); cx <= Math.floor(x + RAIO); cx++) {
        if (!this.bloqueado(cx, cy)) continue;
        // círculo contra quadrado da célula
        const nx = Math.max(cx, Math.min(x, cx + 1)), ny = Math.max(cy, Math.min(y, cy + 1));
        if ((x - nx) ** 2 + (y - ny) ** 2 < RAIO * RAIO) return false;
      }
    return true;
  }

  definirAparencia(ap) { this.p.folha = A.folha(ap); }
  pausar(sim) { this.pausado = sim; this.teclas.clear(); this.p.caminho = null; this.p.aoChegar = null; }
  parar() { this.rodando = false; this.desligar(); }

  ligar() {
    const ehCampo = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
    this.h = {
      kd: e => {
        if (this.pausado || ehCampo(e)) return;
        if (this.assistir) { if (e.key === '+' || e.key === '=') this.mudarZoom(1); else if (e.key === '-') this.mudarZoom(-1); return; }
        if (TECLAS[e.code]) { this.teclas.add(e.code); this.p.caminho = null; this.p.aoChegar = null; e.preventDefault(); }
        else if (e.code === 'KeyE' || (e.code === 'Space' && this.perto)) { if (this.perto) { e.preventDefault(); this.op.interagir(this.perto); } }
        else if (e.key === '+' || e.key === '=') this.mudarZoom(1);
        else if (e.key === '-') this.mudarZoom(-1);
      },
      ku: e => this.teclas.delete(e.code),
      blur: () => this.teclas.clear(),
      vis: () => { if (document.hidden) this.teclas.clear(); },
      click: e => this.clique(e),
      wheel: e => { e.preventDefault(); this.mudarZoom(e.deltaY < 0 ? 1 : -1); },
      resize: () => this.redimensionar(),
    };
    addEventListener('keydown', this.h.kd); addEventListener('keyup', this.h.ku); addEventListener('blur', this.h.blur);
    document.addEventListener('visibilitychange', this.h.vis);
    this.cv.addEventListener('click', this.h.click); this.cv.addEventListener('wheel', this.h.wheel, { passive: false });
    addEventListener('resize', this.h.resize);
  }
  desligar() {
    removeEventListener('keydown', this.h.kd); removeEventListener('keyup', this.h.ku); removeEventListener('blur', this.h.blur);
    document.removeEventListener('visibilitychange', this.h.vis);
    this.cv.removeEventListener('click', this.h.click); this.cv.removeEventListener('wheel', this.h.wheel);
    removeEventListener('resize', this.h.resize);
  }
  mudarZoom(s) { this.zoom = Math.max(1.25, Math.min(3, Math.round((this.zoom + s * 0.25) * 4) / 4)); }

  redimensionar() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
  }

  // tela (px CSS no canvas) → mundo (células)
  paraMundo(cx, cy) {
    const sx = (cx - this.W / 2) / this.zoom + this.cam.x, sy = (cy - this.H / 2) / this.zoom + this.cam.y;
    return { x: sx / A.TW + sy / A.TH, y: sy / A.TH - sx / A.TW, sx, sy };
  }
  paraTela(wx, wy, alt = 0) {
    const p = A.iso(wx, wy);
    return { x: (p.x - this.cam.x) * this.zoom + this.W / 2, y: (p.y - alt - this.cam.y) * this.zoom + this.H / 2 };
  }

  clique(e) {
    if (this.pausado || this.assistir) return;
    const r = this.cv.getBoundingClientRect();
    const w = this.paraMundo(e.clientX - r.left, e.clientY - r.top);
    // NPC tem prioridade: clicar no corpo dele conta, mesmo com chão ou objeto atrás
    const npc = this.npcs.filter(n => {
      const p = A.iso(n.px, n.py);
      return w.sx > p.x - 12 && w.sx < p.x + 12 && w.sy > p.y - 58 && w.sy < p.y + 4;
    }).sort((a, b) => (b.px + b.py) - (a.px + a.py))[0];
    if (npc) {
      if (this.dist(npc) <= ALCANCE) { this.p.caminho = null; this.op.interagir(npc); return; }
      const cam = this.buscar(c => Math.hypot(c.x + 0.5 - npc.px, c.y + 0.5 - npc.py) <= ALCANCE - 0.3);
      if (!cam) return this.aviso('Não dá pra chegar perto dele daqui.', npc.x, npc.y);
      if (!cam.length) { this.op.interagir(npc); return; }
      this.p.caminho = cam; this.p.aoChegar = () => this.op.interagir(npc);
      this.marca = { x: npc.x, y: npc.y, ok: true, t: 0 };
      return;
    }
    const cx = Math.floor(w.x), cy = Math.floor(w.y);
    if (this.bloqueado(cx, cy)) return this.aviso('Não dá pra andar ali.', cx, cy);
    const cam = this.buscar(c => c.x === cx && c.y === cy);
    if (!cam) return this.aviso('Não tem caminho até ali.', cx, cy);
    this.p.caminho = cam; this.p.aoChegar = null;
    this.marca = { x: cx, y: cy, ok: true, t: 0 };
  }
  aviso(txt, x, y) { this.marca = { x, y, ok: false, t: 0 }; this.op.aviso?.(txt); }
  dist(n) { return Math.hypot(this.p.x - n.px, this.p.y - n.py); }

  // busca em largura com 8 vizinhos, sem cortar quina de obstáculo
  buscar(objetivo) {
    const L = this.m.LARG, sx = Math.floor(this.p.x), sy = Math.floor(this.p.y);
    const de = new Int32Array(L * this.m.ALT).fill(-1);
    const fila = [sy * L + sx]; de[sy * L + sx] = sy * L + sx;
    for (let i = 0; i < fila.length; i++) {
      const k = fila[i], x = k % L, y = (k - x) / L;
      if (objetivo({ x, y }) && k !== -1) {
        const cam = []; let c = k;
        while (c !== de[c]) { cam.push({ x: c % L + 0.5, y: Math.floor(c / L) + 0.5 }); c = de[c]; }
        return cam.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (this.bloqueado(nx, ny)) continue;
        if (dx && dy && (this.bloqueado(x + dx, y) || this.bloqueado(x, y + dy))) continue;
        const nk = ny * L + nx;
        if (de[nk] !== -1) continue;
        de[nk] = k; fila.push(nk);
      }
    }
    return null;
  }

  mover(vx, vy, dt) {
    const p = this.p, ax = p.x, ay = p.y;
    const nx = p.x + vx * dt; if (this.livre(nx, p.y)) p.x = nx;
    const ny = p.y + vy * dt; if (this.livre(p.x, ny)) p.y = ny;
    return Math.hypot(p.x - ax, p.y - ay);
  }

  atualizar(dt) {
    this.t += dt;
    const p = this.p;
    let vx = 0, vy = 0;
    if (!this.pausado) {
      let sx = 0, sy = 0;
      for (const k of this.teclas) { sx += TECLAS[k][0]; sy += TECLAS[k][1]; }
      if (sx || sy) {
        // direção da tela → mundo, normalizada: diagonal não fica mais rápida
        const wx = sx / A.TW + sy / A.TH, wy = sy / A.TH - sx / A.TW, n = Math.hypot(wx, wy);
        vx = wx / n * VEL; vy = wy / n * VEL;
      } else if (p.caminho && p.caminho.length) {
        const alvo = p.caminho[0], dx = alvo.x - p.x, dy = alvo.y - p.y, d = Math.hypot(dx, dy);
        if (d < 0.08) { p.caminho.shift(); if (!p.caminho.length) { p.caminho = null; const f = p.aoChegar; p.aoChegar = null; if (f) f(); } }
        else { vx = dx / d * VEL; vy = dy / d * VEL; }
      }
    }
    p.anda = false;
    if (vx || vy) {
      const andou = this.mover(vx, vy, dt);
      p.dir = dirDe(vx, vy) || p.dir;
      p.anda = andou > 1e-4;
      if (p.caminho) { p.preso = andou < 1e-4 ? p.preso + dt : 0; if (p.preso > 0.5) { p.caminho = null; p.aoChegar = null; p.preso = 0; } }
    }

    if (this.op.roteiro) this.op.roteiro(this, dt);

    // NPC mais perto no alcance
    let perto = null, melhor = ALCANCE;
    for (const n of this.npcs) { const d = this.dist(n); if (d <= melhor) { melhor = d; perto = n; } }
    if (perto !== this.perto) { this.perto = perto; this.op.perto?.(perto); }
    for (const n of this.npcs) n.dirAtual = this.dist(n) < 3.2 && !n.trabalha ? (dirDe(this.p.x - n.px, this.p.y - n.py) || n.dirBase) : n.dirBase;

    for (const mo of this.moradores) {
      if (mo.espera > 0) { mo.espera -= dt; mo.anda = false; continue; }
      const [tx, ty] = mo.rota[mo.alvo], dx = tx + 0.5 - mo.px, dy = ty + 0.5 - mo.py, d = Math.hypot(dx, dy);
      if (d < 0.05) { mo.alvo = (mo.alvo + 1) % mo.rota.length; mo.espera = 1.5 + Math.random() * 2; continue; }
      const v = Math.min(d, 1.3 * dt); mo.px += dx / d * v; mo.py += dy / d * v; mo.dir = dirDe(dx, dy) || mo.dir; mo.anda = true;
    }

    // outros jogadores: a rede manda a posição 5x por segundo; aqui o boneco anda até ela
    for (const o of this.outros.values()) {
      const dx = o.tx - o.px, dy = o.ty - o.py, d = Math.hypot(dx, dy);
      if (d > 5) { o.px = o.tx; o.py = o.ty; o.anda = false; o.dir = o.dirRede; }
      else if (d > 0.03) { const v = Math.min(d, VEL * 1.25 * dt); o.px += dx / d * v; o.py += dy / d * v; o.dir = dirDe(dx, dy) || o.dir; o.anda = true; }
      else { o.anda = false; o.dir = o.dirRede; }
    }
    this.op.posicao?.(p, performance.now());

    if (this.fogueira && !this.reduzir) {
      this.fumacaT = (this.fumacaT || 0) - dt;
      if (this.fumacaT <= 0) { this.fumacaT = 0.18; const c = A.iso(this.fogueira.x + 0.5, this.fogueira.y + 0.5); this.fumaca.push({ x: c.x + (Math.random() - 0.5) * 4, y: c.y - 30, t: 0, v: 14 + Math.random() * 8 }); }
      for (const f of this.fumaca) { f.t += dt; f.y -= f.v * dt; f.x += Math.sin(f.t * 2 + f.v) * 6 * dt + 4 * dt; }
      this.fumaca = this.fumaca.filter(f => f.t < 3.5);
    }
    if (this.marca) { this.marca.t += dt; if (this.marca.t > 0.8) this.marca = null; }

    // câmera segue com suavização e não mostra além do mapa
    const ps = A.iso(p.x, p.y), alvoX = ps.x, alvoY = ps.y - 30;
    const k = this.reduzir ? 1 : 1 - Math.exp(-dt * 6);
    this.cam.x += (alvoX - this.cam.x) * k; this.cam.y += (alvoY - this.cam.y) * k;
    const meiaW = this.W / 2 / this.zoom, meiaH = this.H / 2 / this.zoom;
    const minX = A.iso(0, this.m.ALT).x + meiaW, maxX = A.iso(this.m.LARG, 0).x - meiaW;
    const minY = -40 + meiaH, maxY = A.iso(this.m.LARG, this.m.ALT).y - meiaH;
    this.cam.x = minX > maxX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, this.cam.x));
    this.cam.y = minY > maxY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, this.cam.y));
  }

  quadroDe(folha, dir, estado, ritmo) {
    const fs = folha[dir][estado];
    return fs[Math.max(0, Math.floor(this.t * ritmo)) % fs.length];
  }

  desenhar() {
    const g = this.g, z = this.zoom, d = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#1b1f1c'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    // tremor curto da câmera em golpe pesado ou crítico (desligado com "reduzir movimento")
    const tr = this.reduzir ? 0 : (this.tremor || 0), trx = tr ? Math.sin(this.t * 90) * tr : 0, try_ = tr ? Math.cos(this.t * 70) * tr * 0.6 : 0;
    const tx = Math.round((this.W / 2 - (this.cam.x + trx) * z) * d), ty = Math.round((this.H / 2 - (this.cam.y + try_) * z) * d);
    g.setTransform(z * d, 0, 0, z * d, tx, ty);
    g.imageSmoothingEnabled = false;
    g.drawImage(this.chao.canvas, -this.chao.ox, -this.chao.oy);
    if (this.op.chao) this.op.chao(this, g);   // marcas no chão (sangue, anel de golpe), por baixo de todo mundo

    if (this.marca) {
      const c = A.iso(this.marca.x + 0.5, this.marca.y + 0.5), a = 1 - this.marca.t / 0.8;
      g.strokeStyle = (this.marca.ok ? '#D4AC66' : '#C65345') + Math.round(a * 255).toString(16).padStart(2, '0');
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(c.x, c.y - 12); g.lineTo(c.x + 24, c.y); g.lineTo(c.x, c.y + 12); g.lineTo(c.x - 24, c.y); g.closePath(); g.stroke();
    }

    // vista atual em coordenadas lógicas, pra pular o que está fora
    const vx0 = this.cam.x - this.W / 2 / z - 40, vx1 = this.cam.x + this.W / 2 / z + 40, vy0 = this.cam.y - this.H / 2 / z - 40, vy1 = this.cam.y + this.H / 2 / z + 140;
    const lista = [];
    for (const o of this.estaticos) { const b = o.caixa; if (b.x1 < vx0 || b.x0 > vx1 || b.y1 < vy0 || b.y0 > vy1) continue; lista.push({ prof: o.prof, o }); }
    const p = this.p;
    lista.push({ prof: p.x + p.y + 0.02, ator: 'jogador' });
    for (const n of this.npcs) lista.push({ prof: n.px + n.py, npc: n });
    for (const mo of this.moradores) lista.push({ prof: mo.px + mo.py, mor: mo });
    for (const o of this.outros.values()) lista.push({ prof: o.px + o.py, mor: o });
    for (const a of this.atores) lista.push({ prof: a.x + a.y, extra: a });
    lista.sort((a, b) => a.prof - b.prof);

    const ps = A.iso(p.x, p.y), jb = { x0: ps.x - 11, x1: ps.x + 11, y0: ps.y - 56, y1: ps.y };
    const tt = this.reduzir ? 0 : this.t;
    for (const it of lista) {
      if (it.o) {
        const b = it.o.caixa;
        const cobre = it.o.alto && it.prof > p.x + p.y + 0.02 && b.x0 < jb.x1 && b.x1 > jb.x0 && b.y0 < jb.y1 && b.y1 > jb.y0;
        if (cobre) g.globalAlpha = 0.35;
        A.desenharObjeto(g, it.o, tt);
        g.globalAlpha = 1;
      } else if (it.ator) {
        this.sombra(g, p.x, p.y);
        if (p.caido) { g.save(); g.translate(Math.round(ps.x), Math.round(ps.y - 6)); g.rotate(Math.PI / 2); g.drawImage(p.folha[p.dir].parado[0], -A.PX, -A.PY + 10); g.restore(); continue; }
        const est = p.estado || (p.anda ? 'anda' : 'parado');
        const q = p.quadro != null ? p.folha[p.dir][est][p.quadro] : this.quadroDe(p.folha, p.dir, est, est === 'anda' ? 12 : est === 'trabalha' ? 6 : 4);
        g.drawImage(q, Math.round(ps.x - A.PX), Math.round(ps.y - A.PY));
        if (p.clarao > 0 && !this.reduzir) { g.globalAlpha = p.clarao; g.drawImage(A.silhueta(q), Math.round(ps.x - A.PX), Math.round(ps.y - A.PY)); g.globalAlpha = 1; }
      } else if (it.extra) {
        const a = it.extra, c = A.iso(a.x, a.y), e = a.escala || 1;
        if (a.alpha <= 0) continue;
        g.globalAlpha = a.alpha == null ? 1 : a.alpha;
        g.fillStyle = '#00000045'; g.beginPath(); g.ellipse(c.x, c.y, 11 * e, 5 * e, 0, 0, 7); g.fill();
        const q = a.quadro != null ? a.folha[a.dir][a.estado][a.quadro] : this.quadroDe(a.folha, a.dir, a.estado, a.estado === 'anda' ? 7 : 3);
        if (a.gira) {
          // tombando: gira em volta dos pés
          g.save(); g.translate(Math.round(c.x), Math.round(c.y - 2)); g.rotate(a.gira);
          g.drawImage(q, Math.round(-A.PX * e), Math.round(-A.PY * e + 2), Math.round(A.QW * e), Math.round(A.QH * e)); g.restore();
        } else {
          const dx = Math.round(c.x - A.PX * e), dy = Math.round(c.y - A.PY * e + (a.afunda || 0)), dw = Math.round(A.QW * e), dh = Math.round(A.QH * e);
          g.drawImage(q, dx, dy, dw, dh);
          if (a.clarao > 0 && !this.reduzir) { g.globalAlpha = a.clarao * (a.alpha == null ? 1 : a.alpha); g.drawImage(A.silhueta(q), dx, dy, dw, dh); }
        }
        g.globalAlpha = 1;
      } else if (it.npc) {
        const n = it.npc, c = A.iso(n.px, n.py);
        this.sombra(g, n.px, n.py);
        g.drawImage(this.quadroDe(n.folha, n.dirAtual, n.trabalha ? 'trabalha' : 'parado', n.trabalha ? 6 : 4), Math.round(c.x - A.PX), Math.round(c.y - A.PY));
      } else {
        const mo = it.mor, c = A.iso(mo.px, mo.py);
        this.sombra(g, mo.px, mo.py);
        g.drawImage(this.quadroDe(mo.folha, mo.dir, mo.anda ? 'anda' : 'parado', mo.anda ? 10 : 4), Math.round(c.x - A.PX), Math.round(c.y - A.PY));
      }
    }

    for (const f of this.fumaca) { const a = Math.max(0, 0.35 - f.t / 10); g.fillStyle = `rgba(190,185,175,${a})`; const r = 3 + f.t * 3; g.fillRect(Math.round(f.x - r / 2), Math.round(f.y - r / 2), Math.round(r), Math.round(r)); }

    // luz do dia: ciclo de 8 min, sem nunca ficar escuro demais pra usar os serviços
    const ciclo = this.reduzir ? 0.3 : (Date.now() / 480000) % 1;
    const noite = Math.max(0, Math.sin(ciclo * Math.PI * 2)) * 0.5;
    if (noite > 0.02) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(14,20,42,${noite})`; g.fillRect(0, 0, this.cv.width, this.cv.height);
      g.setTransform(z * d, 0, 0, z * d, tx, ty);
      g.globalCompositeOperation = 'lighter';
      const brilho = (x, y, r, a, cor = '212,172,102', sy = 1) => {
        if (x + r < vx0 || x - r > vx1 || y + r * sy < vy0 - 100 || y - r * sy > vy1) return;
        g.save(); g.translate(x, y); g.scale(1, sy);
        const gr = g.createRadialGradient(0, 0, 1, 0, 0, r);
        gr.addColorStop(0, `rgba(${cor},${a})`); gr.addColorStop(1, `rgba(${cor},0)`);
        g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
      };
      for (const l of this.luzes) {
        brilho(l.x, l.y, l.r, noite * 0.9);
        if (l.chao) brilho(l.chao.x, l.chao.y, 64, noite * 0.55, '222,184,112', 0.5);   // poça de luz no chão
      }
      // janelas acesas dos prédios
      for (const o of this.estaticos) if (o._luzes && o._luzes.length) for (const j of o._luzes) { brilho(j.x, j.y, 26, noite * 0.7); brilho(j.x, j.y + 30, 34, noite * 0.18, '222,184,112', 0.6); }
      g.globalCompositeOperation = 'source-over';
    }

    // vinheta: escurece de leve as bordas e puxa o olho pro centro
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.vinheta || this.vinheta.w !== this.cv.width || this.vinheta.h !== this.cv.height) {
      const W = this.cv.width, H = this.cv.height, gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
      gr.addColorStop(0, 'rgba(8,10,12,0)'); gr.addColorStop(1, 'rgba(8,10,12,0.42)');
      this.vinheta = { w: W, h: H, gr };
    }
    g.fillStyle = this.vinheta.gr; g.fillRect(0, 0, this.cv.width, this.cv.height);

    // nomes em cima dos NPCs (em px de tela, texto nítido)
    g.setTransform(d, 0, 0, d, 0, 0);
    g.textAlign = 'center';
    for (const n of this.npcs) {
      const s = this.paraTela(n.px, n.py, 64);
      if (s.x < -50 || s.x > this.W + 50 || s.y < -20 || s.y > this.H + 80) continue;
      const ativo = n === this.perto;
      g.font = '600 12px Inter, system-ui, sans-serif';
      const larg = g.measureText(n.nome).width + 14;
      g.fillStyle = ativo ? '#D4AC66' : 'rgba(20,22,20,.78)'; g.fillRect(Math.round(s.x - larg / 2), Math.round(s.y - 16), Math.round(larg), 20);
      g.fillStyle = ativo ? '#1d2119' : '#f1eee5'; g.fillText(n.nome, s.x, s.y - 2);
      if (ativo) {
        g.font = '500 11px "IBM Plex Mono", monospace';
        const msg = 'E · conversar';
        const lw = g.measureText(msg).width + 12;
        g.fillStyle = 'rgba(20,22,20,.85)'; g.fillRect(Math.round(s.x - lw / 2), Math.round(s.y + 8), Math.round(lw), 18);
        g.fillStyle = '#f1eee5'; g.fillText(msg, s.x, s.y + 21);
      }
    }
    // nomes dos outros jogadores: mais discretos que os dos NPCs, com a etiqueta da equipe quando tiver
    g.font = '500 11px Inter, system-ui, sans-serif';
    for (const o of this.outros.values()) {
      const s = this.paraTela(o.px, o.py, 62);
      if (s.x < -60 || s.x > this.W + 60 || s.y < -20 || s.y > this.H + 80) continue;
      const tag = ETIQUETA[o.papel], txt = tag ? `${o.nome} · ${tag}` : o.nome;
      const larg = g.measureText(txt).width + 12;
      g.fillStyle = 'rgba(20,22,20,.62)'; g.fillRect(Math.round(s.x - larg / 2), Math.round(s.y - 14), Math.round(larg), 17);
      g.fillStyle = tag ? '#D4AC66' : '#d9e3d2'; g.fillText(txt, s.x, s.y - 2);
    }
    g.textAlign = 'left';
    if (this.op.sobre) this.op.sobre(this, g);
  }

  sombra(g, x, y) { const c = A.iso(x, y); g.fillStyle = '#00000045'; g.beginPath(); g.ellipse(c.x, c.y, 11, 5, 0, 0, 7); g.fill(); }

  quadro(agora) {
    if (!this.rodando) return;
    // o primeiro carimbo do rAF pode vir antes do performance.now() da largada: nunca deixar dt negativo
    const dt = Math.max(0, Math.min(0.05, (agora - this.ultimo) / 1000));
    this.ultimo = agora;
    this.atualizar(dt);
    this.desenhar();
    requestAnimationFrame(t => this.quadro(t));
  }
}

PZ.Motor = Motor;
PZ.dirDe = dirDe;
})();
