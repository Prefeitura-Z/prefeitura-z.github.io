// Lootbox paga com créditos do Depois da Queda: compra, limite diário, ponte (linha C) e reembolso.
// Roda a API de verdade sobre SQLite em memória (node:sqlite), com o schema.sql do Worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
import { d1 } from './helpers/d1.mjs';
registerHooks({ resolve(s, c, n) { return s === 'cloudflare:workers' ? { url: 'data:text/javascript,export class DurableObject {}', shortCircuit: true } : n(s, c); } });
const { default: api } = await import('../worker/src/index.js');
const { CAIXAS } = await import('../worker/src/regras.js');

async function montar() {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
  const t = Math.floor(Date.now() / 1000);
  for (const [n, did] of [['ana', '1'], ['bia', '2']]) {
    db.prepare('INSERT INTO users (discord_id, nome, login, criado) VALUES (?, ?, ?, ?)').run(did, n, n === 'ana' ? 'AnaPZ' : null, t);
    db.prepare('INSERT INTO sessions (token, discord_id, expira) VALUES (?, ?, ?)').run(did.repeat(64), did, t + 9999);
    db.prepare("INSERT INTO characters (discord_id, nome, aparencia, origem, nivel, xp, flags, versao, criado, atualizado) VALUES (?, ?, '{}', 'mecanico', 1, 0, ?, 1, ?, ?)")
      .run(did, n, JSON.stringify({ registrado: true, kit_recebido: true }), t, t);
    db.prepare("INSERT INTO game_inventory (discord_id, item, qtd) VALUES (?, 'creditos', 230000)").run(did);
  }
  const env = { SITE: 'https://prefeitura-z.github.io', SITE_BRIDGE_SECRET: 'segredo-teste', DB: d1(db) };
  const chamar = async (did, path, body) => {
    const r = await api.fetch(new Request('https://api.test' + path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + did.repeat(64), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), env);
    return { status: r.status, corpo: await r.json() };
  };
  const ponte = async (outbox) => (await api.fetch(new Request('https://api.test/bridge/sync', {
    method: 'POST', headers: { Authorization: 'Bearer segredo-teste' }, body: outbox,
  }), env)).text();
  const creditos = did => db.prepare("SELECT qtd FROM game_inventory WHERE discord_id = ? AND item = 'creditos'").get(did).qtd;
  return { db, chamar, ponte, creditos };
}

test('sem o servidor anunciar F|caixas, a loja não vende', async () => {
  const m = await montar();
  const v = await m.chamar('1', '/game/caixas');
  assert.equal(v.corpo.ligada, false);
  const r = await m.chamar('1', '/game/caixas/comprar', { caixa: 'rara', chave: 'chave-0001' });
  assert.equal(r.status, 503);
  assert.equal(m.creditos('1'), 230000);
});

test('compra desconta, repete sem cobrar, respeita 1 por dia e chega ao servidor como linha C', async () => {
  const m = await montar();
  await m.ponte('V|1|0\nF|caixas|1\n');
  const r = await m.chamar('1', '/game/caixas/comprar', { caixa: 'rara', chave: 'chave-0001' });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(m.creditos('1'), 130000);
  const de_novo = await m.chamar('1', '/game/caixas/comprar', { caixa: 'rara', chave: 'chave-0001' });
  assert.equal(de_novo.corpo.repetido, true);
  assert.equal(m.creditos('1'), 130000);
  const outra = await m.chamar('1', '/game/caixas/comprar', { caixa: 'comum', chave: 'chave-0002' });
  assert.equal(outra.status, 400);
  assert.match(outra.corpo.erro, /hoje/);
  assert.equal(m.creditos('1'), 130000);

  const inbox = await m.ponte('V|1|0\nF|caixas|1\n');
  const c = inbox.split('\n').filter(l => l.startsWith('C|'));
  assert.equal(c.length, 1);
  assert.match(c[0], new RegExp(`^C\\|[0-9a-f]{16}\\|AnaPZ\\|${CAIXAS.rara.tipo.replace('.', '\\.')}\\|\\d+$`));
  assert.ok(!inbox.includes('O|'), 'caixa não pode ir como pedido de PRZcoins');

  const id = c[0].split('|')[1];
  await m.ponte(`V|1|0\nF|caixas|1\nR|${id}|entregue||0\n`);
  const v = await m.chamar('1', '/game/caixas');
  assert.equal(v.corpo.pedidos[0].status, 'entregue');
  assert.ok(v.corpo.proximaEm > 0);
  // entregue não reembolsa nem se o mod repetir o resultado
  await m.ponte(`V|1|0\nR|${id}|recusado|falha|0\n`);
  assert.equal(m.creditos('1'), 130000);
});

test('sem vínculo com o personagem do servidor não compra', async () => {
  const m = await montar();
  await m.ponte('F|caixas|1\n');
  const r = await m.chamar('2', '/game/caixas/comprar', { caixa: 'comum', chave: 'chave-0003' });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /Vincule/);
});

test('recusada pelo servidor devolve os créditos uma vez só e libera a compra do dia', async () => {
  const m = await montar();
  await m.ponte('F|caixas|1\n');
  await m.chamar('1', '/game/caixas/comprar', { caixa: 'epica', chave: 'chave-0004' });
  assert.equal(m.creditos('1'), 30000);
  const id = (await m.ponte('F|caixas|1\n')).split('\n').find(l => l.startsWith('C|')).split('|')[1];
  await m.ponte(`F|caixas|1\nR|${id}|recusado|indisponivel|0\n`);
  await m.ponte(`F|caixas|1\nR|${id}|recusado|indisponivel|0\n`);
  assert.equal(m.creditos('1'), 230000);
  const v = await m.chamar('1', '/game/caixas');
  assert.equal(v.corpo.pedidos[0].status, 'recusado');
  assert.equal(v.corpo.proximaEm, 0);
});

test('pedido de caixa parado 3 dias volta como crédito', async () => {
  const m = await montar();
  await m.ponte('F|caixas|1\n');
  await m.chamar('1', '/game/caixas/comprar', { caixa: 'rara', chave: 'chave-0005' });
  assert.equal(m.creditos('1'), 130000);
  m.db.prepare("UPDATE orders SET criado = criado - 4 * 86400 WHERE listing_id LIKE 'caixa:%'").run();
  await m.ponte('F|caixas|1\n');
  assert.equal(m.creditos('1'), 230000);
  const p = m.db.prepare("SELECT status FROM orders").get();
  assert.equal(p.status, 'reembolsado');
});
