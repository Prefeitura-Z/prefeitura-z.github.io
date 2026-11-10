// Prefeitura Z: Depois da Queda — dados da União da Margem (prova visual).
// Tudo aqui é declarativo: chão, objetos, NPCs e falas. O motor lê; o servidor valida as escolhas.
(() => {
'use strict';
const PZ = window.PZ = window.PZ || {};

// tipos de chão
const T = { GRAMA: 0, TERRA: 1, CONCRETO: 2, MADEIRA: 3, AGUA: 4, CASCALHO: 5, ARADO: 6 };
const LARG = 40, ALT = 40;
const chao = new Uint8Array(LARG * ALT);
const preencher = (tipo, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) chao[y * LARG + x] = tipo; };

preencher(T.GRAMA, 0, 0, 39, 39);
preencher(T.AGUA, 0, 0, 39, 3);          // o curso d'água que dá nome à União da Margem
preencher(T.CASCALHO, 0, 4, 39, 4);
preencher(T.TERRA, 7, 8, 32, 32);         // pátio
preencher(T.CONCRETO, 16, 15, 23, 23);    // praça
preencher(T.CASCALHO, 18, 24, 20, 32);    // caminho do portão
preencher(T.CASCALHO, 18, 34, 20, 39);    // estrada lá fora
preencher(T.MADEIRA, 8, 9, 13, 14);       // administração
preencher(T.CONCRETO, 25, 9, 32, 14);     // oficina
preencher(T.MADEIRA, 8, 17, 13, 22);      // central de rádio
preencher(T.MADEIRA, 8, 26, 14, 32);      // alojamento
preencher(T.CONCRETO, 26, 17, 32, 22);    // posto de saúde
preencher(T.ARADO, 26, 26, 28, 29);       // horta
preencher(T.CASCALHO, 14, 18, 15, 19);    // trilhas ligando tudo à praça
preencher(T.CASCALHO, 24, 18, 25, 19);
preencher(T.CASCALHO, 19, 10, 20, 14);

// objetos: tipo, x, y, largura (x), profundidade (y). alto = pode esconder o personagem e fica translúcido
const OBJ = [];
const obj = (tipo, x, y, w = 1, d = 1, extra = {}) => OBJ.push({ tipo, x, y, w, d, solido: true, ...extra });

// muro remendado em volta, um bloco por célula pra ordenar certo
for (let x = 6; x <= 33; x++) { obj('muro', x, 7); if (x < 17 || x > 21) obj('muro', x, 33); }
for (let y = 8; y <= 32; y++) { obj('muro', 6, y); obj('muro', 33, y); }
obj('pilar', 17, 33); obj('pilar', 21, 33);
obj('portao', 18, 33, 3, 1);
obj('guarita', 22, 34, 2, 2);
obj('sacos', 16, 31); obj('sacos', 22, 31); obj('sacos', 16, 30);

// administração (Prefeito)
obj('mesa', 10, 11, 3, 1);
obj('arquivo', 8, 9); obj('arquivo', 8, 10); obj('estante', 9, 9, 2, 1);
obj('caixas', 13, 9); obj('caixas', 12, 9);
obj('caixa', 13, 13);
// oficina (Wolf)
obj('bancada', 27, 11, 3, 1);
obj('gerador', 25, 9); obj('pneus', 31, 9); obj('pneus', 32, 10);
obj('carcaca', 30, 12, 2, 2);
obj('tambor', 25, 13); obj('tambor', 26, 14);
obj('ferramentas', 28, 9, 2, 1);
// central de rádio (Bashar)
obj('antena', 8, 17);
obj('mesaRadio', 10, 19, 3, 1);
obj('caixas', 12, 17); obj('caixa', 8, 22);
// alojamento
obj('beliche', 8, 27, 1, 2); obj('beliche', 8, 30, 1, 2);
obj('cama', 11, 27, 1, 2); obj('cama', 13, 27, 1, 2);
obj('armario', 14, 26);
obj('barraca', 11, 30, 2, 2);
// posto de saúde
obj('tenda', 28, 17, 3, 2);
obj('maca', 27, 21, 2, 1);
obj('caixaMedica', 32, 18);
// horta e água
obj('tanque', 30, 27, 2, 2); obj('tanque', 30, 30, 2, 2);
for (let x = 26; x <= 28; x++) for (let y = 26; y <= 29; y += 3) obj('planta', x, y, 1, 1, { solido: false });
// praça
obj('quadro', 19, 15, 2, 1);
obj('poste', 16, 15); obj('poste', 23, 15); obj('poste', 16, 23); obj('poste', 23, 23);
obj('fogueira', 22, 21);
obj('banco', 17, 19, 1, 2); obj('banco', 22, 17, 1, 1);
// canil (reservado pra quando os cães chegarem)
obj('cerca', 15, 9); obj('cerca', 16, 9); obj('cerca', 17, 9); obj('cerca', 15, 10); obj('cerca', 15, 11); obj('cerca', 17, 11);
obj('casinha', 16, 10, 1, 1);
// árvores
obj('arvore', 14, 24); obj('arvore', 25, 15); obj('arvore', 24, 25);
const sementes = [[2, 8], [3, 14], [1, 20], [4, 27], [2, 33], [5, 37], [9, 36], [13, 38], [26, 36], [30, 38], [35, 35], [37, 29], [36, 22], [38, 15], [35, 9], [37, 6], [1, 6], [11, 5], [24, 5], [31, 5], [3, 39], [15, 35], [38, 38], [0, 11]];
for (const [x, y] of sementes) obj('arvore', x, y);

// NPCs: ficam numa célula (sólida). dir = pra onde olham.
const NPCS = [
  { id: 'prefeito', nome: 'Prefeito', papel: 'Registro e armazém', x: 11, y: 10, dir: 'SE', ap: 'prefeito', interage: true },
  { id: 'wolf', nome: 'Wolf', papel: 'Comércio e reparo', x: 28, y: 10, dir: 'SE', ap: 'wolf', interage: true, trabalha: true },
  { id: 'bashar', nome: 'Bashar', papel: 'Contratos', x: 11, y: 18, dir: 'SE', ap: 'bashar', interage: true },
  { id: 'guarda', nome: 'Guarda', papel: 'Portão', x: 21, y: 32, dir: 'SW', ap: 'guarda', interage: true, local: true },
];
// moradores andando pela praça (só ambiente; não bloqueiam)
const MORADORES = [
  { ap: 'morador1', rota: [[17, 21], [21, 21], [21, 24], [15, 24], [15, 20]] },
  { ap: 'morador2', rota: [[24, 18], [26, 23], [20, 25], [17, 17]] },
];

const SPAWN = { x: 19.5, y: 31.2, dir: 'NE' };

// conversas. As escolhas com "acao" vão pro servidor; as respostas dependem do que ele devolver.
const DIALOGOS = {
  prefeito: {
    abertura: f => f.registrado ? 'Bom te ver de pé. O livro diz que você ainda é dos nossos.' : 'Você chegou inteiro. Já é mais do que muita gente conseguiu. Aqui a gente divide trabalho, não desespero.',
    opcoes: [
      { id: 'registro', rotulo: 'Meu registro' },
      { id: 'armazem', rotulo: 'Abrir armazém' },
      { id: 'projetos', rotulo: 'Projetos do abrigo' },
      { id: 'ajudar', rotulo: 'Como posso ajudar?' },
    ],
    respostas: {
      registro: { novo: 'Pronto, seu nome tá no livro. Isso te dá um canto no armazém e lugar na fila da sopa. Passa no Wolf, na oficina, que ele tem um kit separado pra você.', ok: 'Tá registrado desde que chegou. Ninguém some do meu livro.' },
      armazem: { ok: 'O armazém fica aqui atrás. Cada um tem a sua prateleira, e ninguém mexe na dos outros.' },
      projetos: { demo: 'Portão novo, gerador e reservatório. Uma coisa de cada vez, com o que vocês trouxerem lá de fora.' },
      ajudar: { ok: 'Fala com o Bashar no rádio. Ele sempre tem alguém pra achar.' },
    },
  },
  wolf: {
    abertura: f => f.kit_recebido ? 'Voltou com tudo inteiro? Milagre. Deixa eu ver.' : 'Isso aqui ainda funciona. Não parece, eu sei. Bate, volta e me traz antes de virar duas peças.',
    opcoes: [
      { id: 'kit', rotulo: 'Pegar meu kit' },
      { id: 'comprar', rotulo: 'Comprar' },
      { id: 'vender', rotulo: 'Vender' },
      { id: 'reparar', rotulo: 'Reparar' },
      { id: 'fabricar', rotulo: 'Usar a bancada' },
      { id: 'dica', rotulo: 'Alguma dica?' },
    ],
    respostas: {
      kit: { novo: 'Barra de portão reforçada, jaqueta de ronda remendada e uma mochila de lona. É o que sobrou do estoque, então cuida.', ok: 'Já te dei o kit. Se quebrou, traz que eu vejo.' },
      comprar: { ok: 'Olha à vontade. Fiado só pra quem já morreu.' },
      vender: { ok: 'Põe na bancada que eu avalio.' },
      reparar: { ok: 'Deixa eu ver o estrago.' },
      fabricar: { ok: 'A bancada é sua. Só não me deixa parafuso espalhado.' },
      dica: { ok: 'Mochila cheia volta pra casa. Quem insiste com mochila cheia não volta.' },
    },
  },
  bashar: {
    abertura: f => f.contrato_visto ? 'O rádio não parou. Sempre tem alguém chamando.' : 'Tem um posto sem resposta do outro lado da rua. Antes de pensar em salvar a cidade, vamos descobrir quem ainda tá lá.',
    opcoes: [
      { id: 'trabalho', rotulo: 'Tenho algum trabalho?' },
      { id: 'entregar', rotulo: 'Entregar o registro' },
      { id: 'ativos', rotulo: 'Ver contratos ativos' },
      { id: 'regiao', rotulo: 'Informações da região' },
    ],
    respostas: {
      trabalho: { novo: 'O posto da rua de cima parou de responder faz dois dias. Anotei o contrato no seu Bipe. O guarda abre o portão quando a rota estiver pronta.', ok: 'Seu contrato tá no Bipe. Não tem pressa, mas também não tem eternidade.' },
      entregar: { novo: 'Então o posto caiu faz dias e ninguém avisou. Isso muda a ronda. Toma, é o combinado. E fica esperto: o registro fala de alguém trancado no entreposto da rua de cima.', ok: 'Já tenho o registro. Agora o problema é o entreposto.' },
      ativos: { ok: 'O posto da rua de cima, a ronda do quarteirão e o entreposto. O guarda do portão tem o mapa.' },
      regiao: { ok: 'Quarteirão da Entrada: muito errante e pouca coisa boa. Dá sucata leve e tecido, pra quem tiver paciência.' },
    },
  },
  guarda: {
    abertura: f => !f.kit_recebido ? 'Sem kit ninguém passa. Fala com o Wolf na oficina.' : !f.contrato_visto ? 'Portão fechado até o Bashar te dar um contrato. Ordem dele.' : 'Quer sair? Escolhe a rota e eu abro. Mochila cheia, você volta.',
    opcoes: [{ id: 'mapa', rotulo: 'Ver o mapa de rotas', abre: 'rotas' }],
    respostas: {},
  },
};

// objetivos do Bipe, na ordem do tutorial
const OBJETIVOS = [
  { id: 'T01', titulo: 'Registro de chegada', texto: 'Fale com o Prefeito na administração.', feito: f => !!f.registrado },
  { id: 'T02', titulo: 'Ferramenta na mão', texto: 'Pegue seu kit com o Wolf, na oficina.', feito: f => !!f.kit_recebido },
  { id: 'T03', titulo: 'O rádio ainda chama', texto: 'Peça um trabalho ao Bashar na central de rádio.', feito: f => !!f.contrato_visto },
  { id: 'T04', titulo: 'Do lado de fora', texto: 'Fale com o Guarda no portão e faça a rota da Rua de Cima.', feito: f => !!f.rota1_concluida },
  { id: 'T05', titulo: 'O posto respondeu', texto: 'Entregue o registro de rota ao Bashar.', feito: f => !!f.registro_entregue },
  { id: 'T06', titulo: 'Nada se perde', texto: 'Venda alguma coisa da rua pro Wolf.', feito: f => !!f.vendeu },
  { id: 'T07', titulo: 'O dono do entreposto', texto: 'Vença o Porteiro na rota do Entreposto. Vá bem equipado.', feito: f => !!f.porteiro_vencido },
  { id: 'T08', titulo: 'Mais longe', texto: 'As próximas áreas chegam nas próximas etapas.', feito: () => false, futuro: true },
];

PZ.mundo = { T, LARG, ALT, chao, OBJ, NPCS, MORADORES, SPAWN, DIALOGOS, OBJETIVOS };
})();
