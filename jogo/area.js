// Prefeitura Z: Depois da Queda — Quarteirão da Entrada, a primeira área fora do abrigo.
// As rotas (pontos e inimigos) vêm do servidor; este arquivo só desenha as ruas por onde elas passam:
// rua principal em y 11–13, rua de cima/de baixo em x 20–22, portão do abrigo a oeste, posto a leste, entreposto ao norte.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};
const T = { GRAMA: 0, TERRA: 1, CONCRETO: 2, MADEIRA: 3, AGUA: 4, CASCALHO: 5, ARADO: 6, ASFALTO: 7, CALCADA: 8, FAIXA_X: 9, FAIXA_Y: 10 };
const LARG = 44, ALT = 26;
const chao = new Uint8Array(LARG * ALT);
const preencher = (tipo, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) chao[y * LARG + x] = tipo; };

preencher(T.GRAMA, 0, 0, 43, 25);
preencher(T.TERRA, 0, 0, 1, 25);            // lado de dentro do muro do abrigo
preencher(T.CALCADA, 2, 10, 43, 14);
preencher(T.CALCADA, 19, 3, 23, 24);
preencher(T.ASFALTO, 2, 11, 43, 13);
preencher(T.ASFALTO, 20, 3, 22, 24);
preencher(T.FAIXA_X, 4, 12, 18, 12); preencher(T.FAIXA_X, 24, 12, 41, 12);
preencher(T.FAIXA_Y, 21, 5, 21, 9); preencher(T.FAIXA_Y, 21, 15, 21, 23);
preencher(T.CONCRETO, 19, 2, 23, 4);        // pátio do entreposto
preencher(T.CONCRETO, 36, 8, 40, 10);       // posto da rua de cima
preencher(T.CASCALHO, 2, 15, 6, 19);        // terreno baldio
preencher(T.CONCRETO, 26, 15, 31, 17);      // estacionamento

const OBJ = [];
const obj = (tipo, x, y, w = 1, d = 1, extra = {}) => OBJ.push({ tipo, x, y, w, d, solido: true, ...extra });

// muro do abrigo, com o portão aberto pra rua
for (let y = 0; y <= 25; y++) if (y < 11 || y > 13) obj('muro', 1, y, 1, 1, { eixo: 'y' });
obj('pilar', 1, 10); obj('pilar', 1, 14);
obj('sacos', 2, 10); obj('sacos', 2, 14);

// prédio: um bloco por célula; só as faces viradas pra fora ganham janela
function predio(x0, y0, w, d, h, cor, op = {}) {
  for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) {
    const sul = y === y0 + d - 1, leste = x === x0 + w - 1;
    obj('bloco', x, y, 1, 1, { h, cor, sul, leste, oeste: x === x0, norte: y === y0, topo: !sul && !leste, vitrine: op.vitrine,
      porta: op.porta && sul && x === x0 + Math.floor(w / 2) ? 'esq' : op.portaLeste && leste && y === y0 + Math.floor(d / 2) ? 'dir' : null });
  }
}
// quadra noroeste (de frente pra rua principal: fachada sul)
predio(3, 6, 4, 3, 164, '#6b6258', { porta: true });
predio(8, 5, 3, 4, 164, '#5d6466', { porta: true });
predio(12, 7, 3, 2, 112, '#7a5f48', { vitrine: '#A65F3D', porta: true });
predio(16, 5, 2, 4, 164, '#66604e', { portaLeste: true });
predio(4, 2, 5, 2, 112, '#5a5550'); predio(11, 2, 6, 2, 112, '#6e665a');
// quadra nordeste
predio(25, 6, 3, 3, 164, '#5f5a66', { porta: true });
predio(29, 7, 4, 2, 112, '#6b6a58', { vitrine: '#566D4A', porta: true });
predio(34, 3, 2, 3, 112, '#6b6258');
predio(41, 5, 2, 4, 164, '#5d6466');
predio(26, 2, 6, 2, 112, '#5a5550');
// quadra sudoeste (fica na frente da rua: mais baixa pra não tampar)
predio(8, 16, 4, 3, 60, '#6e665a', { portaLeste: true });
predio(13, 15, 5, 3, 60, '#7a5f48');
predio(3, 21, 6, 3, 60, '#5d6466'); predio(11, 21, 6, 3, 112, '#66604e', { portaLeste: true });
// quadra sudeste
predio(33, 15, 4, 3, 60, '#5f5a66');
predio(38, 16, 4, 3, 60, '#6b6258');
predio(25, 19, 5, 4, 60, '#6e665a'); predio(32, 20, 6, 3, 112, '#5a5550');
// entreposto do Porteiro, no fim da rua de cima
predio(19, 0, 5, 2, 112, '#4c5258', { vitrine: '#9B8D66' });
obj('barricada', 19, 3, 1, 2); obj('barricada', 23, 3, 1, 2);
obj('tambor', 19, 5); obj('caixas', 23, 5); obj('pneus', 23, 6);
// posto da rua de cima (o que parou de responder)
obj('guarita', 38, 8, 2, 2); obj('antena', 40, 8); obj('sacos', 36, 9); obj('sacos', 37, 9); obj('caixa', 40, 10);
obj('barricada', 42, 11, 1, 3);
// rua: carros largados, barricadas e entulho (fora da linha das rotas)
obj('carro', 5, 13, 2, 1, { cor: '#5a6a72', modelo: 'seda' });
obj('carro', 26, 11, 2, 1, { cor: '#7a3a2a', modelo: 'hatch' });
obj('carro', 33, 13, 2, 1, { cor: '#8a8468', modelo: 'picape' });
obj('carro', 22, 9, 1, 2, { cor: '#d8d3c4', modelo: 'van' });
obj('carro', 20, 18, 1, 2, { cor: '#6a6a6e', modelo: 'seda' });
obj('carro', 27, 15, 2, 1, { cor: '#3f5a6a', modelo: 'hatch' }); obj('carro', 30, 16, 1, 2, { cor: '#4a5a4a', modelo: 'picape' });
obj('barricada', 20, 24, 3, 1);
obj('tambor', 14, 10); obj('pneus', 18, 14); obj('caixas', 24, 14); obj('tambor', 28, 10); obj('caixa', 11, 14);
obj('carcaca', 3, 16, 2, 2); obj('pneus', 5, 18); obj('tambor', 2, 19);
for (const [x, y] of [[7, 11], [13, 13], [17, 11], [25, 13], [30, 11], [35, 12], [39, 13], [20, 7], [22, 16], [20, 21], [22, 22], [10, 12], [21, 10]]) obj('entulho', x, y, 1, 1, { solido: false });
for (const [x, y] of [[4, 10], [15, 14], [24, 10], [32, 14], [19, 17], [23, 20], [19, 6]]) obj('poste', x, y);
obj('placaRua', 19, 10, 1, 1, { cor: '#74A6A1' }); obj('placaRua', 23, 14, 1, 1, { cor: '#9B8D66' });
for (const [x, y] of [[0, 3], [0, 8], [0, 17], [0, 22], [10, 0], [18, 1], [24, 4], [33, 1], [38, 2], [43, 1], [7, 19], [19, 25], [24, 24], [31, 18], [40, 21], [43, 23], [37, 24], [30, 24], [9, 14], [39, 6]]) obj('arvore', x, y);

PZ.area = { T, LARG, ALT, chao, OBJ, NPCS: [], MORADORES: [], SPAWN: { x: 2.5, y: 12.5, dir: 'SE' }, nome: 'Quarteirão da Entrada' };
// cada área fica registrada pelo id que o servidor manda em rota.area
PZ.areas = Object.assign(PZ.areas || {}, { entrada: PZ.area });
})();
