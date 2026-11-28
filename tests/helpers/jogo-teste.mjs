import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { d1 } from './d1.mjs';
import { XP_NIVEIS } from '../../worker/src/regras.js';

registerHooks({ resolve(s, c, next) {
  return s === 'cloudflare:workers' ? { url: 'data:text/javascript,export class DurableObject {}', shortCircuit: true } : next(s, c);
} });
const { default: worker } = await import('../../worker/src/index.js');

export const BASE_FLAGS = {
  registrado: 1700000000, kit_recebido: 1700000000, contrato_visto: 1700000000, rota1_concluida: 1700000000,
  registro_entregue: 1700000000, porteiro_vencido: 1700000000, rota4_concluida: 1700000000, feira_concluida: 1700000000,
  linha_concluida: 1700000000, plataforma_concluida: 1700000000, manobras_concluida: 1700000000,
  maquinista_vencido: 1700000000, cais1_concluida: 1700000000, cais2_concluida: 1700000000, cais3_concluida: 1700000000,
  cais4_concluida: 1700000000, mastim_vencido: 1700000000,
};
export const APARENCIA = { corpo: 'b', pele: 'p3', cabelo: 'curto', corCabelo: 'c2', roupa: 'jaqueta' };
const ids = { dono: '1000001', veterano: '1000002', jogador: '1000003', admin: '1000004', incursao: '1000005', ferido: '1000006' };
export async function montarJogo(site = 'http://127.0.0.1:8765') {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../../worker/schema.sql', import.meta.url), 'utf8'));
  db.exec(await readFile(new URL('../../worker/migrations/0001_expansao.sql', import.meta.url), 'utf8'));
  const tokens = {};
  const agora = Math.floor(Date.now() / 1000);
  for (const [perfil, nome, xp, creditos, flags, equip] of [
    ['dono', 'Dono de Teste', XP_NIVEIS[17], 1600000, { ...BASE_FLAGS }, ['gancho_estiva', 'armadura_placas', 'mochila_cargueira']],
    ['veterano', 'Veterano do Cais', XP_NIVEIS[34], 1400000, { ...BASE_FLAGS }, ['gancho_estiva', 'armadura_placas', 'mochila_cargueira', 'kit_desmonte']],
    ['jogador', 'Recruta de Teste', 0, 5, {}, []],
    ['admin', 'Administrador', XP_NIVEIS[29], 250, { registrado: true }, []],
    ['incursao', 'Batedora de Knox', XP_NIVEIS[59] + 290, 1850000, { ...BASE_FLAGS }, ['malho_isolado', 'couraca_pressao', 'cargueira_knox', 'chave_industrial']],
    ['ferido', 'Socorrista Ferida', XP_NIVEIS[30], 300, { ...BASE_FLAGS, ferido_ate: agora + 3600 }, ['cano_rebite', 'colete_lona', 'mochila_lona']],
  ]) {
    const id = ids[perfil];
    tokens[perfil] = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO users (discord_id,nome,login,criado) VALUES (?,?,?,?)').run(id, nome, 'TestePZ' + id, agora);
    db.prepare('INSERT INTO sessions (token,discord_id,expira) VALUES (?,?,?)').run(tokens[perfil], id, agora + 86400);
    db.prepare('INSERT INTO game_accounts (discord_id,estado,criado) VALUES (?,\'ativo\',?)').run(id, agora);
    db.prepare('INSERT INTO characters (discord_id,nome,aparencia,origem,nivel,xp,flags,versao,criado,atualizado) VALUES (?,?,?,?,?,?,?,1,?,?)')
      .run(id, nome, JSON.stringify(APARENCIA), perfil === 'ferido' ? 'socorrista' : 'mecanico', xp >= XP_NIVEIS[29] ? 30 : xp ? 18 : 1, xp, JSON.stringify(flags), agora, agora);
    db.prepare("INSERT INTO game_inventory (discord_id,item,qtd) VALUES (?,'creditos',?)").run(id, creditos);
    for (const item of equip) db.prepare('INSERT INTO game_equipment (id,discord_id,item,condicao,equipado,criado) VALUES (?,?,?,100,1,?)')
      .run(id + ':' + item, id, item, agora);
    if (equip.length) db.prepare("INSERT INTO game_inventory (discord_id,item,qtd) VALUES (?,'suprimento',50),(?,'curativo',4)").run(id, id);
    if (perfil === 'incursao') {
      for (const [item, qtd] of [['liga_pressao', 99], ['filtro_clinico', 52], ['rele_ceramico', 46], ['tecido', 240], ['sucata', 1000], ['pecas', 150], ['peca_eletrica', 90]])
        db.prepare('INSERT INTO game_inventory (discord_id,item,qtd) VALUES (?,?,?)').run(id, item, qtd);
      for (const item of ['cano_rebite', 'armadura_placas', 'faca_cabos', 'sonda_reles', 'mochila_lona', 'bolsa_reles', 'capa_filtro'])
        db.prepare('INSERT INTO game_equipment (id,discord_id,item,condicao,equipado,criado) VALUES (?,?,?,72,0,?)').run(id + ':' + item, id, item, agora);
    }
  }
  db.prepare("INSERT INTO role_assignments (id,discord_id,papel,autor,motivo,criado) VALUES ('equipe-teste',?,'administrador',?,'Teste',?)").run(ids.admin, ids.dono, agora);
  const env = { SITE: site, DISCORD_CLIENT_ID: 'local-preview', DISCORD_CLIENT_SECRET: 'previa-isolada', OWNER_DISCORD_ID: ids.dono, DB: d1(db) };
  async function chamar(perfil, url, body) {
    const r = await worker.fetch(new Request(site + url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + (tokens[perfil] || ''), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), env);
    return { status: r.status, corpo: await r.json() };
  }
  return { db, worker, env, chamar, tokens, ids };
}
