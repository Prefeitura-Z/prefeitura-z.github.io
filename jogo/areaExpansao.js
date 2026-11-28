// Mapas isométricos. As vias em y=6.5, 12.5 e 19.5 e suas travessas
// são usadas pelas trilhas emitidas pelo Worker.
(() => {
'use strict';
const PZ = window.PZ;
const T = { GRAMA: 0, TERRA: 1, CONCRETO: 2, MADEIRA: 3, AGUA: 4, CASCALHO: 5, ARADO: 6, ASFALTO: 7, CALCADA: 8, FAIXA_X: 9, FAIXA_Y: 10, TRILHO: 11, PEDRA: 12, PLATAFORMA: 13 };
const LARG = 44, ALT = 26;

function mapa(nome, ambiente, piso, decorar) {
  const chao = new Uint8Array(LARG * ALT).fill(piso), OBJ = [], marcos = [];
  const preencher = (t, x0, y0, w, d) => {
    for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) chao[y * LARG + x] = t;
  };
  const obj = (tipo, x, y, w = 1, d = 1, propriedades = {}) => OBJ.push({ tipo, x, y, w, d, solido: true, ...propriedades });
  const predio = (x0, y0, w, d, h, cor) => {
    for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) obj('bloco', x0 + x, y0 + y, 1, 1, {
      h, cor, sul: y === d - 1, leste: x === w - 1, norte: y === 0, oeste: x === 0, topo: x < w - 1 && y < d - 1,
      porta: y === d - 1 && x === Math.floor(w / 2) ? 'esq' : null,
    });
  };
  const placa = (x, y, texto) => { obj('placaRua', x, y, 1, 1, { cor: ambiente.placa, solido: false }); marcos.push({ x: x + 0.5, y: y + 0.5, texto }); };
  preencher(T.ASFALTO, 0, 11, 44, 3);
  preencher(T.FAIXA_X, 4, 12, 38, 1);
  for (const y of [6, 19]) preencher(piso === T.AGUA ? T.CONCRETO : T.CASCALHO, 0, y - 1, 44, 3);
  for (const x of [2, 10, 21, 31, 32, 38]) preencher(T.CONCRETO, x, 5, 1, 17);
  for (const [x, y] of [[5, 10], [16, 14], [25, 10], [36, 14], [41, 18]]) obj('poste', x, y);
  placa(2, 11, 'Retorno ao abrigo');
  decorar({ preencher, obj, predio, placa });
  return { nome, ambiente, chao, OBJ, marcos, T, LARG, ALT, NPCS: [], MORADORES: [], _mata: true, SPAWN: { x: 2.5, y: 12.5, dir: 'SE' } };
}

PZ.areas.subestacao = mapa('Pátio da Subestação', { cor: '37,26,13', escuro: 0.26, placa: '#c3a16a' }, T.CONCRETO, ({ obj, predio, placa }) => {
  predio(4, 2, 5, 2, 64, '#64696d');
  for (const x of [13, 16, 24, 27, 34, 37]) {
    obj('transformador', x, 3, 2, 1);
    for (const y of [2, 4]) obj('cerca', x, y, 1, 1, { lado: 'n' });
  }
  obj('carro', 12, 9, 4, 2, { modelo: 'caminhao', cor: '#7e865e', h: 56 });
  obj('carro', 25, 15, 1, 2, { modelo: 'picape', cor: '#a98a52', reverso: true });
  obj('gerador', 15, 22, 2, 1); obj('antena', 36, 22);
  predio(36, 23, 7, 3, 86, '#565a64');
  placa(10, 10, 'Caixas de relés'); placa(21, 5, 'Transformadores'); placa(32, 18, 'Disjuntores'); placa(38, 22, 'Sala de comando');
});

PZ.areas.neblina = mapa('Bairro da Neblina', { cor: '43,27,34', escuro: 0.24, nevoa: 0.42, placa: '#bd9aab' }, T.TERRA, ({ obj, predio, placa }) => {
  for (const [x, y, w, d, h, cor] of [
    [3, 1, 5, 3, 60, '#756663'], [13, 2, 5, 2, 75, '#615355'], [24, 1, 5, 3, 70, '#685b61'],
    [13, 15, 4, 2, 65, '#71605d'], [25, 22, 5, 4, 81, '#5e565e'], [36, 23, 7, 3, 94, '#7c6c74'],
  ]) predio(x, y, w, d, h, cor);
  obj('carro', 13, 9, 2, 1, { modelo: 'seda', cor: '#6c6471', reverso: true });
  obj('carro', 24, 15, 1, 2, { modelo: 'van', cor: '#cbc3b7' });
  for (const [x, y] of [[6, 8], [15, 12], [22, 6], [27, 19], [37, 19]]) obj('marcaEco', x, y, 1, 1, { solido: false });
  obj('maca', 35, 17); obj('caixaMedica', 36, 17); obj('transformador', 40, 16, 2, 1);
  placa(10, 10, 'Marcas do Eco'); placa(21, 18, 'Ambulância'); placa(32, 18, 'Quadro de alarmes'); placa(38, 22, 'Clínica · Ala da Sirene');
});

PZ.areas.reservatorio = mapa('Reservatório de Knox', { cor: '11,36,45', escuro: 0.4, nevoa: 0.15, placa: '#82bcbe' }, T.AGUA, ({ obj, predio, preencher, placa }) => {
  preencher(T.CONCRETO, 0, 9, 44, 7);
  for (const x of [2, 10, 21, 31, 32, 38]) preencher(T.PLATAFORMA, x, 5, 1, 17);
  preencher(T.CONCRETO, 4, 16, 5, 3);
  preencher(T.CONCRETO, 13, 16, 5, 3);
  preencher(T.CONCRETO, 24, 22, 20, 4);
  for (const x of [3, 12, 20, 24, 35, 40]) obj('cerca', x, 5, 1, 1, { lado: 'n', solido: false, h: 12 });
  obj('barco', 5, 2, 3, 2, { cor: '#48777d', solido: false });
  obj('carro', 14, 16, 3, 2, { modelo: 'caminhao', cor: '#646d53', reverso: true, h: 56 });
  obj('tanque', 27, 22, 2, 2); obj('guindaste', 34, 23, 2, 2);
  obj('comporta', 39, 22, 4, 2);
  predio(25, 2, 5, 2, 66, '#405a60');
  placa(10, 10, 'Canal de drenagem'); placa(21, 18, 'Casa de Bombas'); placa(32, 18, 'Túnel de inspeção'); placa(38, 22, 'Comporta principal');
});
})();
