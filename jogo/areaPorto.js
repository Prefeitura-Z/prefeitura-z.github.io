// Prefeitura Z: Depois da Queda — Cais do Porto, a terceira área. Abre depois de vencer o Maquinista.
// Mesma entrada das outras (oeste da avenida, y 12.5). Mar ao norte com píer de madeira, cais de contêiner com
// guindaste, vila de pescador a sudoeste (onde o Seu Tião resiste) e o pátio do frigorífico com o canil no fundo.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const T = { GRAMA: 0, TERRA: 1, CONCRETO: 2, MADEIRA: 3, AGUA: 4, CASCALHO: 5, ARADO: 6, ASFALTO: 7, CALCADA: 8, FAIXA_X: 9, FAIXA_Y: 10, TRILHO: 11, PEDRA: 12, PLATAFORMA: 13 };
const LARG = 44, ALT = 26;
const chao = new Uint8Array(LARG * ALT);
const preencher = (tipo, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) chao[y * LARG + x] = tipo; };

preencher(T.GRAMA, 0, 0, 43, 25);
preencher(T.AGUA, 0, 0, 43, 3);              // o mar
preencher(T.MADEIRA, 37, 0, 40, 3);          // píer dos pescadores
preencher(T.CONCRETO, 0, 4, 43, 9);          // cais
preencher(T.CASCALHO, 0, 9, 1, 15);
preencher(T.CALCADA, 2, 10, 43, 14);
preencher(T.ASFALTO, 0, 11, 43, 13);
preencher(T.FAIXA_X, 4, 12, 18, 12); preencher(T.FAIXA_X, 24, 12, 41, 12);
preencher(T.ASFALTO, 20, 4, 22, 24);
preencher(T.FAIXA_Y, 21, 5, 21, 9); preencher(T.FAIXA_Y, 21, 15, 21, 23);
preencher(T.CONCRETO, 23, 15, 43, 22);       // pátio do frigorífico
preencher(T.TERRA, 2, 15, 18, 18);           // vila de pescador
preencher(T.CASCALHO, 3, 15, 8, 17);         // acampamento do Seu Tião

const OBJ = [];
const obj = (tipo, x, y, w = 1, d = 1, extra = {}) => OBJ.push({ tipo, x, y, w, d, solido: true, ...extra });

obj('barricada', 0, 9, 2, 1); obj('barricada', 0, 15, 2, 1); obj('sacos', 2, 10); obj('sacos', 2, 14);

function predio(x0, y0, w, d, h, cor, op = {}) {
  for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) {
    const sul = y === y0 + d - 1, leste = x === x0 + w - 1;
    obj('bloco', x, y, 1, 1, { h, cor, sul, leste, oeste: x === x0, norte: y === y0, topo: !sul && !leste, vitrine: op.vitrine,
      porta: op.porta && sul && x === x0 + Math.floor(w / 2) ? 'esq' : op.portaLeste && leste && y === y0 + Math.floor(d / 2) ? 'dir' : null });
  }
}
const cont = (x, y, w, d, pilha, cor, cor2) => obj('conteiner', x, y, w, d, { pilha, h: pilha > 1 ? 78 : 40, cor, cor2 });

// cais: pilhas de contêiner e o guindaste
cont(3, 5, 2, 1, 2, '#9a3a2a', '#3f5a6a'); cont(3, 7, 2, 1, 1, '#b08a3a');
cont(6, 5, 2, 1, 2, '#566D4A', '#8a8a84'); cont(6, 7, 2, 1, 2, '#3f5a6a', '#9a3a2a');
cont(10, 5, 2, 1, 1, '#6a4a6a'); cont(10, 7, 2, 1, 2, '#b08a3a', '#566D4A');
cont(13, 5, 1, 2, 1, '#8a8a84'); cont(15, 5, 2, 1, 2, '#9a3a2a', '#b08a3a'); cont(15, 7, 2, 1, 1, '#3f5a6a');
cont(29, 4, 2, 1, 2, '#3f5a6a', '#566D4A'); cont(29, 6, 2, 1, 1, '#9a3a2a');
cont(32, 4, 2, 1, 1, '#b08a3a'); cont(32, 6, 2, 1, 2, '#6a4a6a', '#8a8a84'); cont(35, 5, 1, 2, 1, '#566D4A');
obj('guindaste', 24, 4, 2, 2);
for (const x of [27, 36, 42]) obj('tambor', x, 9);
// mar: barcos parados (não bloqueiam, ninguém passa por lá)
obj('barco', 28, 1, 3, 2, { cor: '#3f5a6a', solido: false }); obj('barco', 41, 0, 2, 2, { cor: '#9a3a2a', solido: false }); obj('barco', 8, 1, 3, 2, { cor: '#566D4A', solido: false });

// vila de pescador e o acampamento do Seu Tião
predio(3, 19, 5, 4, 60, '#6e665a', { porta: true }); predio(10, 20, 4, 3, 60, '#5d6466', { porta: true }); predio(15, 19, 3, 4, 60, '#7a5f48', { portaLeste: true });
obj('barraca', 3, 16, 2, 2); obj('fogueira', 6, 16); obj('sacos', 8, 15); obj('sacos', 8, 16); obj('caixas', 3, 15);
obj('barco', 10, 16, 2, 1, { cor: '#c8a83a' });

// pátio do frigorífico e o canil do Mastim
predio(24, 23, 19, 2, 112, '#8a8a84', { porta: true });
for (let x = 39; x <= 43; x++) obj('cerca', x, 19, 1, 1, { lado: 'n', dprof: -0.9, portao: x === 40, h: 26 });
for (const y of [19, 20, 22]) obj('cerca', 39, y, 1, 1, { lado: 'w', dprof: -0.9, h: 26 });
obj('casinha', 42, 22); obj('caixas', 25, 21); obj('pneus', 33, 15); obj('tambor', 30, 22); obj('caixa', 36, 22);
obj('carro', 26, 20, 2, 1, { cor: '#d8d3c4', modelo: 'van' });

// avenida
obj('carro', 25, 13, 2, 1, { cor: '#5a6a72', modelo: 'seda' });
obj('carro', 11, 10, 2, 1, { cor: '#4a5a4a', modelo: 'picape' });
for (const [x, y] of [[5, 13], [16, 11], [26, 11], [34, 12], [42, 12], [22, 15], [19, 8], [27, 8], [37, 9], [12, 17], [28, 18], [35, 21]]) obj('entulho', x, y, 1, 1, { solido: false });
for (const [x, y] of [[6, 10], [14, 14], [26, 10], [34, 14], [42, 10], [19, 16], [23, 19]]) obj('poste', x, y);
obj('placaRua', 19, 10, 1, 1, { cor: '#3f5a6a' }); obj('placaRua', 23, 14, 1, 1, { cor: '#9B8D66' });
for (const [x, y] of [[0, 18], [0, 23], [2, 25], [9, 24], [19, 25], [1, 7]]) obj('arvore', x, y);

// sobrevivente que segura o acampamento perto da entrada (só aparece, não conversa na rua)
const NPCS = [{ id: 'tiao', nome: 'Seu Tião', papel: 'Pescador', x: 5, y: 15, dir: 'SE', ap: 'pescador' }];

PZ.areas = Object.assign(PZ.areas || {}, {
  porto: { T, LARG, ALT, chao, OBJ, NPCS, MORADORES: [], SPAWN: { x: 2.5, y: 12.5, dir: 'SE' }, nome: 'Cais do Porto' },
});
})();
