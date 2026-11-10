// Prefeitura Z: Depois da Queda — presença no abrigo: quem está online aparece andando.
// Só troca posição e visual. Nada daqui vale recurso; o servidor limita frequência e velocidade.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const A = PZ.arte;
const INTERVALO = 200;                       // ms entre envios de posição
const ESPERAS = [1000, 2000, 5000, 15000, 30000];
const DIRS = new Set(['SE', 'SW', 'NE', 'NW']);

class Presenca {
  // op: { url, bilhete: async () => string, mudou: (estado) => void }
  constructor(op) {
    this.op = op;
    this.outros = new Map();
    this.estado = 'desligado';               // desligado | conectando | online | caiu | outraAba
    this.tentativa = 0;
    this.ultimoEnvio = 0; this.ultimo = null;
    this.ligado = false;
  }
  get quantos() { return this.outros.size; }
  mudar(e) { this.estado = e; this.op.mudou?.(e, this.outros.size); }

  ligar() { if (this.ligado) return; this.ligado = true; this.tentativa = 0; this.conectar(); }
  desligar() {
    this.ligado = false;
    clearTimeout(this.tRe); clearInterval(this.tPing);
    const ws = this.ws; this.ws = null;
    if (ws) { ws.onclose = null; try { ws.close(1000); } catch {} }
    this.outros.clear();
    this.mudar('desligado');
  }

  async conectar() {
    if (!this.ligado || this.ws) return;
    this.mudar('conectando');
    let b;
    try { b = await this.op.bilhete(); } catch (e) { if (e && e.status === 401) return this.desligar(); return this.reagendar(); }
    if (!this.ligado || this.ws) return;
    let ws;
    try { ws = new WebSocket(this.op.url + '?b=' + encodeURIComponent(b)); } catch { return this.reagendar(); }
    this.ws = ws;
    ws.onmessage = e => this.receber(e.data);
    ws.onclose = e => {
      if (this.ws !== ws) return;
      this.ws = null; clearInterval(this.tPing); this.outros.clear();
      // 4001: a mesma conta abriu o jogo em outro lugar. Não disputar a vaga com a outra aba.
      if (e.code === 4001) { this.ligado = false; return this.mudar('outraAba'); }
      if (e.code === 4008) { this.ligado = false; return this.mudar('caiu'); }
      this.reagendar();
    };
    ws.onerror = () => {};
  }
  reagendar() {
    if (!this.ligado) return;
    this.mudar('caiu');
    const espera = ESPERAS[Math.min(this.tentativa++, ESPERAS.length - 1)];
    clearTimeout(this.tRe);
    this.tRe = setTimeout(() => this.conectar(), espera * (0.8 + Math.random() * 0.4));
  }

  receber(txt) {
    if (txt === 'pong') return;
    let m; try { m = JSON.parse(txt); } catch { return; }
    if (!m) return;
    if (m.t === 'oi') {
      this.tentativa = 0; this.outros.clear();
      for (const j of m.lista || []) this.entrou(j);
      clearInterval(this.tPing);
      this.tPing = setInterval(() => { try { this.ws?.send('ping'); } catch {} }, 30000);
      this.ultimo = null;                    // manda a posição atual logo depois de entrar
      this.mudar('online');
    } else if (m.t === 'e') { this.entrou(m); this.mudar('online'); }
    else if (m.t === 's') { this.outros.delete(m.id); this.mudar('online'); }
    else if (m.t === 'p') {
      const o = this.outros.get(m.id);
      if (!o || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
      o.tx = m.x; o.ty = m.y; o.andaRede = !!m.a;
      if (DIRS.has(m.d)) o.dirRede = m.d;
    }
  }
  entrou(j) {
    if (!j || typeof j.id !== 'string' || !Number.isFinite(j.x) || !Number.isFinite(j.y)) return;
    // o visual vem do servidor, mas só entra o que o desenho conhece
    const v = j.ap || {};
    const ap = {
      corpo: v.corpo === 'b' ? 'b' : 'a',
      pele: A.PELE[v.pele] ? v.pele : 'p3',
      cabelo: ['curto', 'raspado', 'longo', 'coque', 'moicano', 'cacheado'].includes(v.cabelo) ? v.cabelo : 'curto',
      corCabelo: A.CABELO[v.corCabelo] ? v.corCabelo : 'c1',
      roupa: A.ROUPA[v.roupa] ? v.roupa : 'jaqueta',
    };
    const dir = DIRS.has(j.d) ? j.d : 'SE';
    this.outros.set(j.id, {
      id: j.id, nome: String(j.n || 'Sobrevivente').slice(0, 20), papel: typeof j.pp === 'string' ? j.pp : '',
      folha: A.folha(ap), px: j.x, py: j.y, tx: j.x, ty: j.y, dir, dirRede: dir, anda: false, andaRede: !!j.a,
    });
  }

  // chamado pelo motor a cada quadro; só manda quando mudou e no ritmo combinado
  posicao(p, agora) {
    if (this.estado !== 'online' || !this.ws || this.ws.readyState !== 1) return;
    if (agora - this.ultimoEnvio < INTERVALO) return;
    const u = this.ultimo, a = p.anda ? 1 : 0;
    if (u && Math.abs(u.x - p.x) < 0.01 && Math.abs(u.y - p.y) < 0.01 && u.d === p.dir && u.a === a) return;
    const x = Math.round(p.x * 100) / 100, y = Math.round(p.y * 100) / 100;
    this.ultimo = { x: p.x, y: p.y, d: p.dir, a };
    this.ultimoEnvio = agora;
    try { this.ws.send(JSON.stringify({ t: 'p', x, y, d: p.dir, a })); } catch {}
  }
}

PZ.Presenca = Presenca;
})();
