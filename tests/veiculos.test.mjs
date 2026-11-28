import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { estadoRotacao } from '../apoio-veiculos.mjs';

const inicio = '2026-11-28T09:00:00-03:00';
const rotacoes = Array.from({ length: 6 }, (_, i) => ({ nome: 'Rotação ' + (i + 1) }));
const primeira = Date.parse(inicio);
const quinzena = 14 * 86_400_000;

test('a agenda começa no horário configurado e muda a cada 14 dias', () => {
  assert.equal(estadoRotacao(inicio, rotacoes, primeira - 1).atual, undefined);
  assert.equal(estadoRotacao(inicio, rotacoes, primeira - 1).proxima.abre, primeira);
  for (const [i, rodada] of rotacoes.entries()) {
    const abre = primeira + i * quinzena;
    assert.equal(estadoRotacao(inicio, rotacoes, abre).atual.nome, rodada.nome);
    assert.equal(estadoRotacao(inicio, rotacoes, abre + quinzena - 1).atual.nome, rodada.nome);
    assert.equal(estadoRotacao(inicio, rotacoes, abre + quinzena).atual?.nome, rotacoes[i + 1]?.nome);
  }
  assert.deepEqual(estadoRotacao(null, rotacoes, primeira), {});
  assert.equal(estadoRotacao(inicio, rotacoes, primeira + rotacoes.length * quinzena).proxima, undefined);
});

test('todas as ofertas agendadas têm preço, versões e prévias disponíveis', () => {
  const agenda = JSON.parse(readFileSync(new URL('../apoio-veiculos.json', import.meta.url)));
  assert.match(agenda.ticketDiscord, /^https:\/\/discord\.com\/channels\/\d+\/\d+$/);
  for (const rotacao of agenda.rotacoes) {
    assert.equal(rotacao.ofertas.length, 2);
    for (const oferta of rotacao.ofertas) {
      assert.ok(Number.isInteger(oferta.valorCentavos) && oferta.valorCentavos > 0);
      assert.ok(oferta.versoes.length > 0);
      for (const versao of oferta.versoes) {
        const raiz = new URL('../apoio-veiculos/' + versao.id + '/', import.meta.url);
        const catalogo = JSON.parse(readFileSync(new URL('catalogo.json', raiz)));
        assert.equal(catalogo.id, versao.id);
        assert.ok(catalogo.skins.length > 0);
        assert.equal(new Set(catalogo.skins.map(s => s.codigo)).size, catalogo.skins.length);
        for (const skin of catalogo.skins) {
          assert.ok(skin.nome && skin.textura);
          assert.ok(existsSync(new URL(skin.imagem, raiz)), versao.id + '/' + skin.imagem);
        }
      }
    }
  }
});
