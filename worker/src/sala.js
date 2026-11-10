// Prefeitura Z: Depois da Queda — presença no abrigo (Durable Object com WebSocket).
// Uma sala só: quem está no abrigo vê os outros andando. Aqui não passa nada que valha recurso:
// só posição, direção e o visual do personagem. O servidor limita frequência, tamanho e velocidade.
import { DurableObject } from 'cloudflare:workers';

const MAX_NA_SALA = 60;
const MIN_INTERVALO_MS = 80;     // o cliente manda a cada 200 ms; mais rápido que isso é descartado
const VEL_MAX = 5.2;             // células por segundo (o jogo anda a 3,4), com folga pra atraso de rede
const LARG = 40, ALT = 40;
const DIRS = ['SE', 'SW', 'NE', 'NW'];
const SPAWN = { x: 19.5, y: 31.2, d: 'NE' };
const idCurto = () => [...crypto.getRandomValues(new Uint8Array(6))].map(x => x.toString(16).padStart(2, '0')).join('');

// o que os outros jogadores recebem: nunca o ID do Discord
const publico = a => ({ id: a.id, n: a.n, ap: a.ap, pp: a.pp, x: a.x, y: a.y, d: a.d, a: a.a });

export class SalaAbrigo extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // "ping" é respondido sem acordar a sala
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  avisar(msg, menos) {
    const txt = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === menos) continue;
      try { ws.send(txt); } catch { /* conexão morrendo: o close cuida */ }
    }
  }

  async fetch(req) {
    // quantos estão no abrigo agora (número público, mostrado no site)
    if (new URL(req.url).pathname === '/contar') {
      let n = 0;
      for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a && !a.fora) n++; }
      return Response.json({ n });
    }
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Esperava WebSocket.', { status: 426 });
    let quem;
    try { quem = JSON.parse(decodeURIComponent(req.headers.get('X-PZ-Jogador') || '')); } catch { return new Response('Sem jogador.', { status: 400 }); }

    const outros = [];
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a || a.fora) continue;
      if (a.did === quem.did) {
        // mesma conta em outra aba ou aparelho: a conexão nova assume
        a.fora = true; ws.serializeAttachment(a);
        this.avisar({ t: 's', id: a.id }, ws);
        try { ws.close(4001, 'Você abriu o jogo em outro lugar.'); } catch {}
        continue;
      }
      outros.push(a);
    }
    if (outros.length >= MAX_NA_SALA) return new Response('Abrigo cheio.', { status: 503 });

    const par = new WebSocketPair();
    this.ctx.acceptWebSocket(par[1]);
    const eu = { id: idCurto(), did: quem.did, n: quem.n, ap: quem.ap, pp: quem.pp, x: SPAWN.x, y: SPAWN.y, d: SPAWN.d, a: 0, t: Date.now(), ex: 0 };
    par[1].serializeAttachment(eu);
    par[1].send(JSON.stringify({ t: 'oi', eu: eu.id, lista: outros.map(publico) }));
    this.avisar({ t: 'e', ...publico(eu) }, par[1]);
    return new Response(null, { status: 101, webSocket: par[0] });
  }

  webSocketMessage(ws, bruto) {
    const a = ws.deserializeAttachment();
    if (!a || a.fora) return;
    if (typeof bruto !== 'string' || bruto.length > 120) return this.punir(ws, a, 5);
    let m;
    try { m = JSON.parse(bruto); } catch { return this.punir(ws, a, 5); }
    if (!m || m.t !== 'p') return this.punir(ws, a, 2);
    const agora = Date.now(), dt = agora - a.t;
    if (dt < MIN_INTERVALO_MS) return this.punir(ws, a, 1);
    const x = Math.round(Number(m.x) * 100) / 100, y = Math.round(Number(m.y) * 100) / 100;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > LARG || y > ALT) return this.punir(ws, a, 2);
    // andou mais do que dava no tempo: ignora, os outros continuam vendo a última posição válida
    // (a primeira posição vale sempre: quem reconecta não nasce no portão)
    if (a.ok && Math.hypot(x - a.x, y - a.y) > VEL_MAX * (dt / 1000) + 0.6) return this.punir(ws, a, 1);
    a.x = x; a.y = y; a.t = agora; a.ok = 1;
    a.d = DIRS.includes(m.d) ? m.d : a.d;
    a.a = m.a ? 1 : 0;
    a.ex = Math.max(0, a.ex - 1);
    ws.serializeAttachment(a);
    this.avisar({ t: 'p', id: a.id, x, y, d: a.d, a: a.a }, ws);
  }

  // quem insiste em mandar lixo ou rápido demais é desconectado
  punir(ws, a, peso) {
    a.ex += peso;
    if (a.ex > 150) { this.sair(ws, a); try { ws.close(4008, 'Mensagens demais.'); } catch {} return; }
    ws.serializeAttachment(a);
  }

  sair(ws, a) {
    if (!a || a.fora) return;
    a.fora = true;
    try { ws.serializeAttachment(a); } catch {}
    this.avisar({ t: 's', id: a.id }, ws);
  }

  webSocketClose(ws, codigo) {
    this.sair(ws, ws.deserializeAttachment());
    try { ws.close(codigo === 1005 || codigo === 1006 ? 1000 : codigo); } catch {}
  }
  webSocketError(ws) { this.sair(ws, ws.deserializeAttachment()); }
}
