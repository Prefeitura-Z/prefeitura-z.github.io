// Prefeitura Z: Depois da Queda — Feira da Estação, a segunda área. Abre depois da Barricada do Sul.
// Mesma entrada da primeira (oeste da avenida, y 12.5), pra volta e a saída serem iguais no servidor.
// Avenida em y 11–13, rua da estação em x 20–22, feira de paralelepípedo ao sul da avenida,
// linha do trem com plataforma ao norte e pátio de manobras ao sul, com a locomotiva no fundo.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const T = { GRAMA: 0, TERRA: 1, CONCRETO: 2, MADEIRA: 3, AGUA: 4, CASCALHO: 5, ARADO: 6, ASFALTO: 7, CALCADA: 8, FAIXA_X: 9, FAIXA_Y: 10, TRILHO: 11, PEDRA: 12, PLATAFORMA: 13 };
const LARG = 44, ALT = 26;
const chao = new Uint8Array(LARG * ALT);
const preencher = (tipo, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) chao[y * LARG + x] = tipo; };

preencher(T.GRAMA, 0, 0, 43, 25);
preencher(T.CASCALHO, 0, 2, 43, 5);          // leito da linha norte
preencher(T.TRILHO, 0, 3, 43, 3); preencher(T.TRILHO, 0, 5, 43, 5);
preencher(T.CASCALHO, 0, 9, 1, 15);          // por onde se chega
preencher(T.CALCADA, 2, 10, 43, 14);
preencher(T.ASFALTO, 0, 11, 43, 13);
preencher(T.FAIXA_X, 4, 12, 18, 12); preencher(T.FAIXA_X, 24, 12, 41, 12);
preencher(T.CALCADA, 19, 6, 23, 24);
preencher(T.ASFALTO, 20, 2, 22, 24);
preencher(T.TRILHO, 20, 3, 22, 3); preencher(T.TRILHO, 20, 5, 22, 5);   // passagem de nível
preencher(T.FAIXA_Y, 21, 7, 21, 9); preencher(T.FAIXA_Y, 21, 15, 21, 23);
preencher(T.PLATAFORMA, 24, 6, 42, 8);
preencher(T.CONCRETO, 24, 9, 43, 9);
preencher(T.PEDRA, 3, 15, 18, 18);           // feira
preencher(T.CASCALHO, 24, 15, 43, 24);       // pátio de manobras
preencher(T.TRILHO, 24, 18, 43, 18); preencher(T.TRILHO, 24, 23, 43, 23);
preencher(T.TERRA, 3, 19, 18, 19);

const OBJ = [];
const obj = (tipo, x, y, w = 1, d = 1, extra = {}) => OBJ.push({ tipo, x, y, w, d, solido: true, ...extra });

// chegada: barricada velha aberta no meio da avenida
obj('barricada', 0, 9, 2, 1); obj('barricada', 0, 15, 2, 1); obj('sacos', 2, 10); obj('sacos', 2, 14);

function predio(x0, y0, w, d, h, cor, op = {}) {
  for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) {
    const sul = y === y0 + d - 1, leste = x === x0 + w - 1;
    obj('bloco', x, y, 1, 1, { h, cor, sul, leste, oeste: x === x0, norte: y === y0, topo: !sul && !leste, vitrine: op.vitrine,
      porta: op.porta && sul && x === x0 + Math.floor(w / 2) ? 'esq' : op.portaLeste && leste && y === y0 + Math.floor(d / 2) ? 'dir' : null });
  }
}
// trem: um pedaço por célula, ao longo de x
function trem(x0, y, n, tipoV, cor) { for (let k = 0; k < n; k++) obj('vagao', x0 + k, y, 1, 1, { tipoV: typeof tipoV === 'function' ? tipoV(k) : tipoV, cor, ini: k === 0, fim: k === n - 1 }); }

// estação: prédio comprido ao norte da linha
predio(25, 0, 16, 2, 112, '#7a5f48', { porta: true });
predio(3, 0, 6, 2, 112, '#5d6466'); predio(11, 0, 6, 2, 112, '#6b6258');
// quadra entre a linha e a avenida, a oeste
predio(3, 6, 4, 3, 112, '#66604e', { porta: true });
predio(8, 7, 4, 2, 112, '#6e665a', { vitrine: '#9a3a2a', porta: true });
predio(13, 6, 4, 3, 112, '#5f5a66', { portaLeste: true });
// casas ao sul da feira (baixas pra não tampar a feira)
predio(3, 20, 5, 4, 60, '#6e665a', { porta: true }); predio(9, 21, 4, 3, 60, '#7a5f48', { porta: true }); predio(14, 20, 4, 4, 60, '#5d6466', { portaLeste: true });

// trem de passageiro parado na plataforma e vagões de carga na linha de trás
trem(27, 5, 8, 'passageiro', '#3f5a6a');
trem(35, 3, 6, 'carga', '#7a3a2a');
trem(4, 3, 5, 'carga', '#5a5a4a');
// pátio de manobras: carga na linha de cima, locomotiva no fundo da linha de baixo
trem(25, 18, 5, 'carga', '#8a5a3e'); trem(32, 18, 5, 'carga', '#4a5a4a');
trem(26, 23, 6, 'carga', '#6a6a6e'); trem(36, 23, 6, k => 'loco', '#c8642a');
obj('pneus', 25, 16); obj('tambor', 29, 15); obj('caixas', 37, 16); obj('tambor', 43, 21); obj('caixa', 24, 21);

// plataforma: bancos, placas e postes do lado da linha
for (const x of [31, 37]) obj('banco', x, 6, 2, 1);
for (const x of [29, 35, 41]) obj('poste', x, 6);
obj('placaRua', 33, 6, 1, 1, { cor: '#3f5a6a' }); obj('placaRua', 43, 9, 1, 1, { cor: '#c8a83a' });
obj('caixas', 42, 7);

// feira: duas fileiras de bancas e um ônibus largado atrás
for (const x of [4, 6, 8, 10, 12, 14, 16]) obj('banca', x, 17);
for (const x of [4, 6, 8]) obj('banca', x, 15);
obj('caixa', 10, 15); obj('caixas', 18, 18); obj('tambor', 3, 18);
for (let k = 0; k < 6; k++) obj('vagao', 9 + k, 19, 1, 1, { tipoV: 'onibus', cor: '#d8d3c4', ini: k === 0, fim: k === 5 });

// avenida: carros e entulho fora da linha das rotas
obj('carro', 30, 13, 2, 1, { cor: '#8a8468', modelo: 'picape' });
obj('carro', 40, 13, 2, 1, { cor: '#5a6a72', modelo: 'seda' });
obj('carro', 22, 23, 1, 2, { cor: '#7a3a2a', modelo: 'hatch' });
obj('carro', 9, 10, 2, 1, { cor: '#4a5a4a', modelo: 'van' });
for (const [x, y] of [[6, 13], [14, 11], [25, 11], [33, 12], [42, 12], [22, 15], [20, 9], [27, 9], [35, 9], [11, 16], [26, 20], [33, 21], [39, 17]]) obj('entulho', x, y, 1, 1, { solido: false });
for (const [x, y] of [[6, 10], [13, 14], [27, 10], [33, 14], [42, 10], [19, 16], [23, 20]]) obj('poste', x, y);
obj('placaRua', 19, 10, 1, 1, { cor: '#74A6A1' }); obj('placaRua', 23, 14, 1, 1, { cor: '#9B8D66' });
for (const [x, y] of [[0, 0], [0, 18], [0, 23], [2, 25], [19, 25], [24, 25], [43, 25], [43, 14], [1, 7]]) obj('arvore', x, y);

PZ.areas = Object.assign(PZ.areas || {}, {
  estacao: { T, LARG, ALT, chao, OBJ, NPCS: [], MORADORES: [], SPAWN: { x: 2.5, y: 12.5, dir: 'SE' }, nome: 'Feira da Estação' },
});
})();
