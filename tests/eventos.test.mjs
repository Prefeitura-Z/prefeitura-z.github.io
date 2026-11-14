import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// The repo uses Worker ES modules without a package manifest.
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,nextResolve) {
  if (specifier === 'cloudflare:workers') return {url:'data:text/javascript,export class DurableObject {}',shortCircuit:true};
  return nextResolve(specifier,context);
}});
const {default:api}=await import('../worker/src/index.js');
import { visibleDrops } from '../mapa/airdrops.js';

function environment() {
  const calls=[];
  return {SITE:'https://prefeitura-z.github.io',SITE_BRIDGE_SECRET:'local-test-only',calls,
    DB:{prepare(sql) {return {bind(...args){calls.push({sql,args});return this;},async all(){
      calls.push({sql});
      if (sql.startsWith('SELECT login, discord_id')) return {results:[{login:'Ana Maria',discord_id:'900000000000000001'},{login:'bad',discord_id:'invalid'}]};
      return {results:[]};
    }};},async batch(ops){calls.push({batch:ops.length});}}
  };
}
test('private bridge rejects unauthenticated readers before consulting users',async()=>{
  const env=environment();const r=await api.fetch(new Request('https://api.test/bridge/sync',{method:'POST'}),env);
  assert.equal(r.status,401);assert.equal(env.calls.length,0);
});
test('private authenticated bridge returns verified ID with fresh timestamp; old consumers retain login column',async()=>{
  const env=environment();const r=await api.fetch(new Request('https://api.test/bridge/sync',{
    method:'POST',headers:{Authorization:'Bearer local-test-only'},body:'V|1\n'
  }),env);
  assert.equal(r.status,200);const text=await r.text();
  assert.match(text,/^V\|2\|\d{10}\nL\|Ana Maria\nD\|Ana%20Maria\|900000000000000001\nL\|bad\n$/);
  assert(!text.includes('invalid'));assert.equal(text.split('\n')[1].split('|')[1],'Ana Maria');
});
test('public root does not expose site links',async()=>{
  const env=environment();const r=await api.fetch(new Request('https://api.test/'),env);
  assert(!(await r.text()).includes('900000000000000001'));assert.equal(env.calls.length,0);
});
test('map hides expired, stale, malformed, and future-dated snapshots; supports two drops',()=>{
  const now=1800000000;const a={x:10000,y:9000,expiraEm:now+5400};
  assert.equal(visibleDrops({geradoEm:now,ativos:[a,{...a,x:11000}]},now).length,2);
  assert.deepEqual(visibleDrops({geradoEm:now-901,ativos:[a]},now),[]);
  assert.deepEqual(visibleDrops({geradoEm:now+1,ativos:[a]},now),[]);
  assert.deepEqual(visibleDrops({geradoEm:now,ativos:[{...a,expiraEm:now},{...a,x:'10000'}]},now),[]);
});
test('map inline scripts parse after adding public drop layer',async()=>{
  const html=await readFile(new URL('../mapa/index.html',import.meta.url),'utf8');
  for (const m of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) new Function(m[1]);
});
