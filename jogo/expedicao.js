// Prefeitura Z: Depois da Queda — a expedição na tela.
// O servidor já decidiu tudo quando o portão abriu e mandou o roteiro (log). Aqui a cena é só uma função do
// relógio do servidor: recarregar a página, trocar de aba ou travar o navegador não muda o que acontece nem o prêmio.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const A = PZ.arte;

const DUR_GOLPE = 0.45, DUR_NUMERO = 0.95, DUR_SAQUE = 2.6, REVISTA = 3;
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
    this.motor = new PZ.Motor(canvas, PZ.area, {
      aparencia: op.aparencia, reduzir: op.reduzir, assistir: true,
      roteiro: m => this.passo(m), sobre: (m, g) => this.sobre(m, g),
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
    if (!perna) { p.x = this.cat.saida[0]; p.y = this.cat.saida[1]; }
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
    if (par && t < par.fim + 1.2) {
      for (const n of par.ini) {
        const morto = t >= n.morre, desde = t - n.morre;
        if (morto && desde > 0.8) continue;
        let vida = n.vidaMax;
        for (const g of this.golpes) { if (g.t > t) break; if (g.par === par && g.de === 'j' && g.em === n.k) vida = g.v; }
        const ator = { x: n.x, y: n.y, folha: n.folha, escala: n.escala, dir: PZ.dirDe(p.x - n.x, p.y - n.y) || 'SW', estado: 'parado', quadro: null, alpha: morto ? 1 - desde / 0.8 : 1, afunda: morto ? desde * 14 : 0 };
        if (!morto) {
          for (const tg of n.golpes) { const d = t - tg; if (d >= 0 && d < DUR_GOLPE) { ator.estado = 'ataca'; ator.quadro = Math.min(5, Math.floor(d / DUR_GOLPE * 6)); } }
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
          if (g.de === 'j' && d < DUR_GOLPE) { p.estado = 'ataca'; p.quadro = Math.min(5, Math.floor(d / DUR_GOLPE * 6)); }
        }
      }
    }
    if (this.caiu != null && t >= this.caiu && (this.voltaT == null || t < this.voltaT)) p.caido = true;

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
    let vida = this.ex.vidaMax, carga = 0, xp = 0, feitas = 0;
    const feed = [], nomeItem = id => this.cat.itens[id]?.nome || id;
    for (const g of this.golpes) {
      if (g.t > t) break;
      const ini = g.par.ini[g.de === 'j' ? g.em : g.de];
      if (g.em === 'j') { vida = g.v; feed.push({ t: g.t, cls: 'dano', txt: g.erro ? `${ini.nome} errou` : `${ini.nome} acertou você: ${g.dano}${g.pesado ? ' (golpe pesado)' : ''}` }); }
      else feed.push({ t: g.t, cls: g.crit ? 'crit' : '', txt: g.erro ? `Você errou ${ini.nome}` : `Você acertou ${ini.nome}: ${g.dano}${g.crit ? ' (crítico)' : ''}${g.v <= 0 ? ' e derrubou' : ''}` });
    }
    for (const s of this.saques) {
      if (s.t > t) break;
      vida = s.v; carga = s.carga; xp = s.xp; feitas++;
      const lista = Object.entries(s.itens).map(([k, q]) => `${q} ${nomeItem(k)}`);
      if (s.equip) lista.push(nomeItem(s.equip));
      feed.push({ t: s.t, cls: 'saque', txt: lista.length ? `Revistou a parada: ${lista.join(', ')}` : 'Revistou a parada: nada que valha carregar' });
    }
    if (this.caiu != null && t >= this.caiu) { vida = 0; feed.push({ t: this.caiu, cls: 'dano', txt: 'Você caiu. Alguém do abrigo vai te buscar.' }); }
    feed.sort((a, b) => a.t - b.t);
    let fase;
    if (t >= this.duracao) fase = 'De volta ao portão';
    else if (perna && perna.volta) fase = this.motivo === 'derrota' ? 'Carregado de volta pro abrigo' : this.motivo === 'mochila' ? 'Mochila cheia: voltando' : 'Voltando pro abrigo';
    else if (par && t >= par.t0 && t < par.fim) fase = t >= par.limpo && !this.vivos.length ? 'Revistando' : (par.ini.some(n => n.chefe) ? 'Enfrentando ' + par.ini.find(n => n.chefe).nome : 'Em combate');
    else fase = `A caminho da parada ${Math.min(feitas + 1, this.totalParadas)}`;
    const h = {
      rota: this.rota.nome, fase, vida, vidaMax: this.ex.vidaMax, carga, capacidade: this.ex.capacidade, xp,
      feitas, total: this.totalParadas, restante: Math.max(0, Math.ceil(this.duracao - t)), voltando: !!(perna && perna.volta) || t >= this.duracao,
      feed: feed.slice(-4),
    };
    const k = JSON.stringify(h);
    if (k !== this.ultimoHud) { this.ultimoHud = k; this.op.mudou(h); }
  }

  // ---------- por cima da cena: vida dos inimigos, números de dano, o que foi achado ----------
  sobre(m, g) {
    const t = this.t;
    g.textAlign = 'center';
    for (const v of this.vivos) {
      const s = m.paraTela(v.n.x, v.n.y, 62 * v.n.escala), larg = v.n.chefe ? 84 : 38;
      if (v.n.chefe || v.lutando) {
        g.fillStyle = 'rgba(20,22,20,.8)'; g.fillRect(Math.round(s.x - larg / 2 - 1), Math.round(s.y - 1), larg + 2, 7);
        g.fillStyle = v.n.chefe ? '#D4AC66' : '#C65345'; g.fillRect(Math.round(s.x - larg / 2), Math.round(s.y), Math.round(larg * Math.max(0, v.vida) / v.n.vidaMax), 5);
      }
      if (v.n.chefe) { g.font = '600 12px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(20,22,20,.8)'; const w = g.measureText(v.n.nome).width + 12; g.fillRect(Math.round(s.x - w / 2), Math.round(s.y - 22), Math.round(w), 18); g.fillStyle = '#D4AC66'; g.fillText(v.n.nome, s.x, s.y - 9); }
    }
    for (const gp of this.golpes) {
      if (gp.t > t) break;
      const d = t - gp.t;
      if (d > DUR_NUMERO) continue;
      const noJogador = gp.em === 'j', alvo = noJogador ? m.p : gp.par.ini[gp.em];
      const s = m.paraTela(alvo.x, alvo.y, 58 * (alvo.escala || 1) + d * 34);
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
      const s = m.paraTela(m.p.x, m.p.y, 70 + d * 14);
      g.globalAlpha = Math.min(1, (DUR_SAQUE - d) * 2);
      g.font = '600 13px Inter, system-ui, sans-serif';
      linhas.forEach((txt, i) => { const y = s.y - (linhas.length - 1 - i) * 16; g.lineWidth = 3; g.strokeStyle = 'rgba(16,18,16,.9)'; g.strokeText(txt, s.x, y); g.fillStyle = '#D4AC66'; g.fillText(txt, s.x, y); });
    }
    g.globalAlpha = 1; g.textAlign = 'left';
  }
}

PZ.Expedicao = Expedicao;
})();
