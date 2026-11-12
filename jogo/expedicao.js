// Prefeitura Z: Depois da Queda — a expedição na tela.
// O servidor já decidiu tudo quando o portão abriu e mandou o roteiro (log). Aqui a cena é só uma função do
// relógio do servidor: recarregar a página, trocar de aba ou travar o navegador não muda o que acontece nem o prêmio.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const A = PZ.arte;

const DUR_GOLPE = 0.5, DUR_NUMERO = 0.95, DUR_SAQUE = 2.6, REVISTA = 3;
// o golpe não anda em ritmo igual: arma devagar, desce rápido, recolhe com calma
const IMPACTO = 0.2;   // segundos entre começar o golpe e ele acertar
const quadroGolpe = d => { const u = d / DUR_GOLPE; return u < 0.2 ? 0 : u < 0.38 ? 1 : u < 0.46 ? 2 : u < 0.58 ? 3 : u < 0.8 ? 4 : 5; };
const QUEDA = 0.35, SOME = 2.2;   // inimigo tomba, fica caído um tempo e some
const RUA_Y = 12.5;

class Expedicao {
  // op: { expedicao, catalogo, aparencia, reduzir, agora(): ms do servidor, mudou(hud), fim() }
  constructor(canvas, op) {
    this.op = op;
    this.ex = op.expedicao;
    this.cat = op.catalogo;
    this.rota = this.cat.rotas[this.ex.rota] || { nome: this.ex.rota, pontos: [] };
    this.preparar();
    this.acabou = false;
    this.ultimoHud = '';
    // cada rota diz em que área fica; sem área (ou área que este cliente ainda não tem) cai no Quarteirão
    this.mapa = (PZ.areas && PZ.areas[this.rota.area]) || PZ.area;
    this.motor = new PZ.Motor(canvas, this.mapa, {
      aparencia: op.aparencia, reduzir: op.reduzir, assistir: true,
      roteiro: m => this.passo(m), sobre: (m, g) => this.sobre(m, g), chao: (m, g) => this.noChao(m, g),
    });
    this.passo(this.motor);
    const ps = A.iso(this.motor.p.x, this.motor.p.y); this.motor.cam.x = ps.x; this.motor.cam.y = ps.y - 30;
  }
  parar() { this.motor.parar(); }

  // ---------- lê o roteiro uma vez ----------
  preparar() {
    const log = [...this.ex.log].sort((a, b) => a.t - b.t);
    this.duracao = log.length ? log[log.length - 1].t : 0;
    this.pernas = []; this.paradas = []; this.golpes = []; this.saques = [];
    this.caiu = null; this.motivo = 'concluida';
    let par = null;
    for (const e of log) {
      if (e.e === 'ir') this.pernas.push({ t: e.t, d: e.d, pts: [e.de, e.para], n: e.n });
      else if (e.e === 'volta') { this.pernas.push({ t: e.t, d: e.d, pts: this.caminhoVolta(e.de, e.para), volta: true }); this.motivo = e.motivo; this.voltaT = e.t; }
      else if (e.e === 'enc') {
        const perna = this.pernas[this.pernas.length - 1];
        const [a, b] = perna.pts, dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl];
        par = {
          i: e.i, t0: e.t, aparece: perna.t, fim: Infinity, limpo: Infinity,
          ini: e.ini.map((n, k) => {
            const lado = (k - (e.ini.length - 1) / 2) * 0.95, def = this.cat.inimigos[n.tipo] || {};
            const aps = A.INIMIGO_AP[n.tipo] || A.INIMIGO_AP.errante, ap = aps[(e.i + k) % aps.length];
            return {
              k, tipo: n.tipo, nome: def.nome || n.tipo, chefe: !!def.chefe, vidaMax: n.vida, golpes: [], morre: Infinity,
              x: b[0] + u[0] * (1.15 + (k % 2) * 0.3) - u[1] * lado, y: b[1] + u[1] * (1.15 + (k % 2) * 0.3) + u[0] * lado,
              folha: A.folha(ap), escala: ap.escala || 1,
            };
          }),
        };
        this.paradas.push(par);
      } else if (e.e === 'atk' && par) {
        const g = { ...e, par };
        this.golpes.push(g);
        if (e.de !== 'j') par.ini[e.de]?.golpes.push(e.t);
      } else if (e.e === 'cai' && par) { if (par.ini[e.k]) par.ini[e.k].morre = e.t; par.limpo = e.t; }
      else if (e.e === 'saque') { this.saques.push(e); if (par) par.fim = e.t; }
      else if (e.e === 'caiu') { this.caiu = e.t; if (par) par.fim = e.t; }
    }
    this.totalParadas = this.rota.pontos.filter(p => p.enc.length).length || this.paradas.length;
  }
  // a volta segue a rua em vez de atravessar os prédios
  caminhoVolta(de, para) {
    return Math.abs(de[1] - RUA_Y) > 1.6 ? [de, [de[0], RUA_Y], para] : [de, para];
  }

  agoraT() { return Math.max(0, (this.op.agora() - this.ex.inicio) / 1000); }

  // ---------- onde cada um está neste instante ----------
  passo(m) {
    const t = this.agoraT(), p = m.p;
    this.t = t;
    let perna = null;
    for (const l of this.pernas) { if (l.t <= t) perna = l; else break; }
    p.estado = null; p.quadro = null; p.caido = false; p.anda = false;
    if (!perna) { const ini = this.pernas[0] ? this.pernas[0].pts[0] : this.cat.saida; p.x = ini[0]; p.y = ini[1]; }
    else {
      const f = perna.d > 0 ? Math.min(1, (t - perna.t) / perna.d) : 1;
      const pos = this.noCaminho(perna.pts, f);
      p.x = pos.x; p.y = pos.y;
      if (f < 1) { p.anda = true; p.dir = PZ.dirDe(pos.dx, pos.dy) || p.dir; }
    }

    // parada da vez: a última cuja perna já começou
    let par = null;
    for (const q of this.paradas) { if (q.aparece <= t) par = q; else break; }
    m.atores = [];
    this.vivos = [];
    let tremor = 0; p.clarao = 0;
    if (par && t < par.fim + 1.2) {
      for (const n of par.ini) {
        const morto = t >= n.morre, desde = t - n.morre;
        if (morto && desde > SOME) continue;
        let vida = n.vidaMax;
        for (const g of this.golpes) { if (g.t > t) break; if (g.par === par && g.de === 'j' && g.em === n.k) vida = g.v; }
        const ator = { x: n.x, y: n.y, folha: n.folha, escala: n.escala, dir: PZ.dirDe(p.x - n.x, p.y - n.y) || 'SW', estado: 'parado', quadro: null, alpha: morto ? Math.min(1, (SOME - desde) / 0.6) : 1 };
        const vx = n.x - p.x, vy = n.y - p.y, vd = Math.hypot(vx, vy) || 1, mexe = !this.op.reduzir;
        if (morto) {
          // tomba pro lado oposto ao jogador
          const k = Math.min(1, desde / QUEDA);
          ator.gira = ((n.x - n.y) - (p.x - p.y) >= 0 ? 1 : -1) * k * k * Math.PI / 2;
        }
        // levou golpe do jogador: recua um pouco e pisca claro
        for (const g of this.golpes) {
          if (g.t > t) break;
          if (g.par !== par || g.de !== 'j' || g.em !== n.k || g.erro) continue;
          const d = t - g.t - IMPACTO;
          if (d >= 0 && d < 0.22) {
            if (mexe && !morto) { const r = 0.16 * (1 - d / 0.22); ator.x += vx / vd * r; ator.y += vy / vd * r; }
            ator.clarao = Math.max(ator.clarao || 0, 0.65 * (1 - d / 0.14));
            if (g.crit) tremor = Math.max(tremor, 2.5 * (1 - d / 0.22));
          }
        }
        if (!morto) {
          for (const tg of n.golpes) {
            const d = t - tg;
            if (d >= 0 && d < DUR_GOLPE) {
              ator.estado = 'ataca'; ator.quadro = quadroGolpe(d);
              // avança no jogador na hora de bater
              if (mexe) { const a = 0.2 * Math.sin(Math.PI * Math.min(1, d / (DUR_GOLPE * 0.8))); ator.x -= vx / vd * a; ator.y -= vy / vd * a; }
            }
          }
          this.vivos.push({ n, vida, ator, lutando: t >= par.t0 });
        }
        m.atores.push(ator);
      }
      // o jogador em combate ou revistando
      if (t >= par.t0 && t < par.fim && !p.anda) {
        const alvo = this.vivos[0];
        if (alvo) p.dir = PZ.dirDe(alvo.n.x - p.x, alvo.n.y - p.y) || p.dir;
        if (this.caiu != null && t >= this.caiu) p.caido = true;
        else if (t >= par.limpo && !alvo && t >= par.fim - REVISTA) p.estado = 'trabalha';
        else for (const g of this.golpes) {
          if (g.t > t) break;
          const d = t - g.t;
          if (g.de === 'j' && d < DUR_GOLPE) {
            p.estado = 'ataca'; p.quadro = quadroGolpe(d);
            // passo à frente junto com o golpe
            const al = g.par.ini[g.em];
            if (al && !this.op.reduzir) { const ax = al.x - p.x, ay = al.y - p.y, ad = Math.hypot(ax, ay) || 1, a = 0.18 * Math.sin(Math.PI * Math.min(1, d / (DUR_GOLPE * 0.8))); p.x += ax / ad * a; p.y += ay / ad * a; }
          }
        }
      }
      // o jogador levou golpe: recua, pisca, e a câmera treme se foi pesado
      for (const g of this.golpes) {
        if (g.t > t) break;
        if (g.par !== par || g.em !== 'j' || g.erro) continue;
        const d = t - g.t - IMPACTO, de = par.ini[g.de];
        if (d >= 0 && d < 0.22 && de) {
          if (!this.op.reduzir && !p.caido) { const ax = p.x - de.x, ay = p.y - de.y, ad = Math.hypot(ax, ay) || 1, r = 0.12 * (1 - d / 0.22); p.x += ax / ad * r; p.y += ay / ad * r; }
          p.clarao = Math.max(p.clarao, 0.55 * (1 - d / 0.14));
          if (g.pesado) tremor = Math.max(tremor, 3 * (1 - d / 0.22));
        }
      }
    }
    if (this.caiu != null && t >= this.caiu && (this.voltaT == null || t < this.voltaT)) p.caido = true;

    m.tremor = tremor;
    this.avisar(t, par, perna);
    if (t >= this.duracao && !this.acabou) { this.acabou = true; this.op.fim(); }
  }
  noCaminho(pts, f) {
    let total = 0; const ds = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ds.push(d); total += d; }
    let resto = f * total;
    for (let i = 0; i < ds.length; i++) {
      if (resto <= ds[i] || i === ds.length - 1) {
        const k = ds[i] ? Math.min(1, resto / ds[i]) : 1, a = pts[i], b = pts[i + 1];
        return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0], dy: b[1] - a[1] };
      }
      resto -= ds[i];
    }
    return { x: pts[0][0], y: pts[0][1], dx: 0, dy: 0 };
  }

  // ---------- números pro painel (vida, mochila, parada, tempo, últimos acontecimentos) ----------
  avisar(t, par, perna) {
    let vida = this.ex.vidaInicial || this.ex.vidaMax, carga = 0, xp = 0, feitas = 0, vidaT = -1;
    const feed = [], nomeItem = id => this.cat.itens[id]?.nome || id;
    for (const g of this.golpes) {
      if (g.t > t) break;
      const ini = g.par.ini[g.de === 'j' ? g.em : g.de];
      if (g.em === 'j') { vida = g.v; vidaT = g.t; feed.push({ t: g.t, cls: 'dano', txt: g.erro ? `${ini.nome} errou` : `${ini.nome} acertou você: ${g.dano}${g.pesado ? ' (golpe pesado)' : ''}` }); }
      else feed.push({ t: g.t, cls: g.crit ? 'crit' : '', txt: g.erro ? `Você errou ${ini.nome}` : `Você acertou ${ini.nome}: ${g.dano}${g.crit ? ' (crítico)' : ''}${g.v <= 0 ? ' e derrubou' : ''}` });
    }
    for (const s of this.saques) {
      if (s.t > t) break;
      if (s.t >= vidaT) { vida = s.v; vidaT = s.t; } carga = s.carga; xp = s.xp; feitas++;
      const lista = Object.entries(s.itens).map(([k, q]) => `${q} ${nomeItem(k)}`);
      if (s.equip) lista.push(nomeItem(s.equip));
      feed.push({ t: s.t, cls: 'saque', txt: lista.length ? `Revistou a parada: ${lista.join(', ')}` : 'Revistou a parada: nada que valha carregar' });
    }
    if (this.caiu != null && t >= this.caiu) { vida = 0; feed.push({ t: this.caiu, cls: 'dano', txt: 'Você caiu. Alguém do abrigo vai te buscar.' }); }
    feed.sort((a, b) => a.t - b.t);
    const espera = Math.max(0, Math.ceil((this.ex.inicio - this.op.agora()) / 1000));
    let fase;
    const farm = this.ex.tipo === 'ronda', segue = farm && !(this.ex.ronda && this.ex.ronda.ultima);
    if (espera > 0) fase = 'Recuperando o fôlego';
    else if (t >= this.duracao) fase = segue ? 'Área limpa. Os infectados já voltam' : 'De volta ao portão';
    else if (perna && perna.volta) fase = this.motivo === 'derrota' ? 'Carregado de volta pro abrigo' : this.motivo === 'mochila' ? 'Mochila cheia: voltando' : 'Voltando pro abrigo';
    else if (par && t >= par.t0 && t < par.fim) fase = t >= par.limpo && !this.vivos.length ? 'Revistando' : (par.ini.some(n => n.chefe) ? 'Enfrentando ' + par.ini.find(n => n.chefe).nome : 'Em combate');
    else fase = `A caminho da parada ${Math.min(feitas + 1, this.totalParadas)}`;
    const h = {
      rota: this.rota.nome, fase, vida, vidaMax: this.ex.vidaMax, carga, capacidade: this.ex.capacidade, xp,
      feitas, total: this.totalParadas, restante: Math.max(0, Math.ceil(this.duracao - t)), voltando: !!(perna && perna.volta) || (t >= this.duracao && !segue),
      feed: feed.slice(-4), espera,
    };
    const k = JSON.stringify(h);
    if (k !== this.ultimoHud) { this.ultimoHud = k; this.op.mudou(h); }
  }

  // ---------- no chão: anel no alvo, sangue que fica até o fim da parada ----------
  noChao(m, g) {
    const t = this.t;
    // sacola de saque: cai onde o infectado tombou e voa pro jogador quando ele revista
    for (const par of this.paradas) {
      if (t < par.aparece || t > par.fim + 0.1) continue;
      for (const n of par.ini) {
        if (!(t >= n.morre + 0.45)) continue;
        let x = n.x - 0.35, y = n.y + 0.45, esc = 1;
        const voa = (t - (par.fim - 0.45)) / 0.45;
        if (voa > 0) { const k = Math.min(1, voa); x += (m.p.x - x) * k; y += (m.p.y - y) * k; esc = 1 - k * 0.7; }
        const c = A.iso(x, y), cai = Math.min(1, (t - n.morre - 0.45) / 0.18), sobe = Math.round((1 - cai) * 10 + (voa > 0 ? Math.sin(Math.min(1, voa) * Math.PI) * 14 : 0));
        const bx = Math.round(c.x - 5 * esc), by = Math.round(c.y - 9 * esc - sobe), w = Math.max(3, Math.round(10 * esc)), h = Math.max(3, Math.round(8 * esc));
        g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(Math.round(c.x), Math.round(c.y), 6 * esc, 2.5 * esc, 0, 0, 7); g.fill();
        g.fillStyle = '#141412'; g.fillRect(bx - 1, by - 1, w + 2, h + 2);
        g.fillStyle = '#9B8D66'; g.fillRect(bx, by, w, h); g.fillStyle = '#7a6e4e'; g.fillRect(bx + w - 3, by, 3, h);
        g.fillStyle = '#c9bc8a'; g.fillRect(bx + 1, by + 1, 2, 2);
        g.fillStyle = '#5a4a38'; g.fillRect(bx + 2, by - 2, w - 4, 2); g.fillStyle = '#D4AC66'; g.fillRect(bx + Math.floor(w / 2) - 1, by - 3, 2, 2);
        // brilho piscando pra chamar o olho
        if (!this.op.reduzir && voa <= 0 && Math.floor(t * 3 + n.k) % 3 === 0) { g.fillStyle = '#fff4e6'; g.fillRect(bx + w + 1, by - 3, 1, 3); g.fillRect(bx + w, by - 2, 3, 1); }
      }
    }
    for (const gp of this.golpes) {
      if (gp.t > t) break;
      if (gp.erro) continue;
      const d = t - gp.t - IMPACTO, alvo = gp.em === 'j' ? null : gp.par.ini[gp.em];
      if (d < 0) continue;
      const pos = alvo || (gp.par.ini[gp.de] ? m.p : null);
      if (!pos) continue;
      // anel que abre embaixo de quem levou o golpe
      if (d < 0.35 && !this.op.reduzir) {
        const c = A.iso(pos.x, pos.y), k = d / 0.35, cor = gp.em === 'j' ? '198,83,69' : gp.crit ? '212,172,102' : '241,238,229';
        g.strokeStyle = `rgba(${cor},${(1 - k) * 0.8})`; g.lineWidth = 2;
        g.beginPath(); g.ellipse(Math.round(c.x), Math.round(c.y), 8 + k * 16, 4 + k * 8, 0, 0, 7); g.stroke();
      }
      // gotas no chão: ficam enquanto a parada dura (só em infectado e no jogador)
      if (gp.par.fim + 1.2 > t && t >= gp.par.aparece) {
        const c = A.iso(pos.x, pos.y), sem = (gp.t * 1000) | 0, cor = gp.em === 'j' ? '#6a1f1a' : '#3e3a22';
        let s = sem || 1; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000) / 1000; };
        const n = gp.crit || gp.pesado ? 6 : 3, abre = Math.min(1, d / 0.25);
        g.fillStyle = cor;
        for (let i = 0; i < n; i++) g.fillRect(Math.round(c.x + (rnd() - 0.5) * 26 * abre), Math.round(c.y + (rnd() - 0.5) * 10 * abre), 2 + (rnd() > 0.6 ? 1 : 0), 1 + (rnd() > 0.7 ? 1 : 0));
      }
    }
  }

  // ---------- por cima da cena: placas, vida, faíscas, números de dano, o que foi achado ----------
  sobre(m, g) {
    const t = this.t, z = m.zoom;
    g.textAlign = 'center';
    // faíscas e poeira no ponto do golpe
    if (!this.op.reduzir) for (const gp of this.golpes) {
      if (gp.t > t) break;
      const d = t - gp.t - IMPACTO;
      if (d < 0 || d > 0.4 || gp.erro) continue;
      const alvo = gp.em === 'j' ? m.p : gp.par.ini[gp.em]; if (!alvo) continue;
      const s0 = m.paraTela(alvo.x, alvo.y, 30 * (alvo.escala || 1)), k = d / 0.4;
      let s = ((gp.t * 7919) | 0) || 3; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000) / 1000; };
      const n = gp.crit || gp.pesado ? 12 : 7;
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.28, v = (14 + rnd() * 18) * z, x = s0.x + Math.cos(a) * v * k, y = s0.y + Math.sin(a) * v * k * 0.7 + k * k * 10 * z;
        const tam = Math.max(1, Math.round(z * (i % 3 === 0 ? 2 : 1.5)));
        g.globalAlpha = 1 - k; g.fillStyle = i % 3 === 0 ? (gp.em === 'j' ? '#c65345' : '#fff4e6') : (gp.crit ? '#D4AC66' : '#a9a493');
        g.fillRect(Math.round(x), Math.round(y), tam, tam);
      }
      // poeira subindo devagar
      g.fillStyle = 'rgba(190,185,175,.5)';
      for (let i = 0; i < 3; i++) { const r = (3 + k * 7) * z; g.globalAlpha = 0.45 * (1 - k); g.fillRect(Math.round(s0.x + (i - 1) * 6 * z - r / 2), Math.round(s0.y + 18 * z - k * 8 * z - r / 2), Math.round(r), Math.round(r)); }
      g.globalAlpha = 1;
    }
    // placa do jogador: nome, nível e vida
    {
      const s = m.paraTela(m.p.x, m.p.y, 70), h = JSON.parse(this.ultimoHud || '{}'), nome = this.op.nome || '';
      if (nome && !m.p.caido) {
        g.font = '700 11px Inter, system-ui, sans-serif';
        const txt = `${nome}`, nv = this.op.nivel ? ` Nv ${this.op.nivel}` : '';
        const w1 = g.measureText(txt).width; g.font = '500 10px Inter, system-ui, sans-serif'; const w2 = g.measureText(nv).width;
        const larg = Math.max(44, w1 + w2), x0 = Math.round(s.x - (w1 + w2) / 2);
        g.lineWidth = 3; g.strokeStyle = 'rgba(12,14,12,.85)'; g.textAlign = 'left';
        g.font = '700 11px Inter, system-ui, sans-serif'; g.strokeText(txt, x0, s.y - 6); g.fillStyle = '#f1eee5'; g.fillText(txt, x0, s.y - 6);
        g.font = '500 10px Inter, system-ui, sans-serif'; g.strokeText(nv, x0 + w1, s.y - 6); g.fillStyle = '#D4AC66'; g.fillText(nv, x0 + w1, s.y - 6);
        g.textAlign = 'center';
        const bw = Math.round(larg * 0.8), vida = h.vida != null ? h.vida : 1, max = h.vidaMax || 1;
        g.fillStyle = 'rgba(12,14,12,.85)'; g.fillRect(Math.round(s.x - bw / 2 - 1), Math.round(s.y - 1), bw + 2, 5);
        g.fillStyle = vida / max > 0.35 ? '#7fbf6a' : '#c65345'; g.fillRect(Math.round(s.x - bw / 2), Math.round(s.y), Math.round(bw * Math.max(0, vida) / max), 3);
      }
    }
    for (const v of this.vivos) {
      const s = m.paraTela(v.n.x, v.n.y, 70 * v.n.escala), larg = v.n.chefe ? 84 : 40;
      g.fillStyle = 'rgba(12,14,12,.85)'; g.fillRect(Math.round(s.x - larg / 2 - 1), Math.round(s.y - 1), larg + 2, v.n.chefe ? 7 : 5);
      g.fillStyle = v.n.chefe ? '#D4AC66' : '#C65345'; g.fillRect(Math.round(s.x - larg / 2), Math.round(s.y), Math.round(larg * Math.max(0, v.vida) / v.n.vidaMax), v.n.chefe ? 5 : 3);
      g.font = v.n.chefe ? '700 12px Inter, system-ui, sans-serif' : '600 10px Inter, system-ui, sans-serif';
      g.lineWidth = 3; g.strokeStyle = 'rgba(12,14,12,.85)'; g.strokeText(v.n.nome, s.x, s.y - 5);
      g.fillStyle = v.n.chefe ? '#D4AC66' : '#e8b0a4'; g.fillText(v.n.nome, s.x, s.y - 5);
    }
    for (const gp of this.golpes) {
      if (gp.t > t) break;
      const d = t - gp.t;
      if (d > DUR_NUMERO) continue;
      const noJogador = gp.em === 'j', alvo = noJogador ? m.p : gp.par.ini[gp.em];
      const s = m.paraTela(alvo.x, alvo.y, 84 * (alvo.escala || 1) + d * 34);
      g.globalAlpha = Math.min(1, (DUR_NUMERO - d) * 3);
      g.font = gp.crit || gp.pesado ? '700 19px Inter, system-ui, sans-serif' : gp.erro ? '500 12px Inter, system-ui, sans-serif' : '700 15px Inter, system-ui, sans-serif';
      const txt = gp.erro ? 'errou' : `${noJogador ? '−' : ''}${gp.dano}${gp.crit ? '!' : ''}`;
      g.lineWidth = 3; g.strokeStyle = 'rgba(16,18,16,.9)'; g.strokeText(txt, s.x, s.y);
      g.fillStyle = gp.erro ? '#a9a493' : noJogador ? '#ff8b7a' : gp.crit ? '#D4AC66' : '#f1eee5'; g.fillText(txt, s.x, s.y);
    }
    for (const sq of this.saques) {
      if (sq.t > t) break;
      const d = t - sq.t;
      if (d > DUR_SAQUE) continue;
      const linhas = Object.entries(sq.itens).map(([k, q]) => `+${q} ${this.cat.itens[k]?.nome || k}`);
      if (sq.equip) linhas.push('+ ' + (this.cat.itens[sq.equip]?.nome || sq.equip));
      const s = m.paraTela(m.p.x, m.p.y, 92 + d * 14);
      g.globalAlpha = Math.min(1, (DUR_SAQUE - d) * 2);
      g.font = '600 13px Inter, system-ui, sans-serif';
      linhas.forEach((txt, i) => { const y = s.y - (linhas.length - 1 - i) * 16; g.lineWidth = 3; g.strokeStyle = 'rgba(16,18,16,.9)'; g.strokeText(txt, s.x, y); g.fillStyle = '#D4AC66'; g.fillText(txt, s.x, y); });
    }
    g.globalAlpha = 1; g.textAlign = 'left';
  }
}

PZ.Expedicao = Expedicao;
})();
