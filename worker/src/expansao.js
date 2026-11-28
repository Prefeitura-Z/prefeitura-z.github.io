// Os contratos seguem as três vias transitáveis de cada mapa da expansão.
export const AREAS_NOVAS = {
  subestacao: { nome: 'Pátio da Subestação', requer: 'mastim_vencido', faixa: '31–40',
    detalhe: 'Restabeleça o rádio e use as peças da rede para preparar as incursões.' },
  neblina: { nome: 'Bairro da Neblina', requer: 'vigia_vencido', faixa: '41–50',
    detalhe: 'Siga as marcas dos ocultistas até a clínica e descubra a origem da sirene.' },
  reservatorio: { nome: 'Reservatório de Knox', requer: 'zelador_vencido', faixa: '51–60',
    detalhe: 'Investigue os canais de drenagem e aprenda os sinais de caça dos predadores.' },
};

export const ITENS_NOVOS = {
  rele_ceramico: { nome: 'Relé cerâmico', tipo: 'material', venda: 18, desc: 'Recuperado de painéis da subestação. O Wolf usa nos contatos da bancada.' },
  filtro_clinico: { nome: 'Filtro da clínica', tipo: 'material', venda: 28, desc: 'Encontrado nas revistas do bairro. Serve para tecido de proteção leve.' },
  liga_pressao: { nome: 'Liga de pressão', tipo: 'material', venda: 42, desc: 'Retirada dos registros do reservatório. Reforça o equipamento industrial.' },
  caderno_neblina: { nome: 'Caderno da sirene', tipo: 'missao', desc: 'Troféu da clínica. As notas ligam a sirene aos canais de Knox.' },
  placa_vigia: { nome: 'Placa da Subestação', tipo: 'missao', desc: 'Troféu da sala de comando. O Prefeito usa o número da placa no registro da rede.' },
  selo_comporta: { nome: 'Selo da comporta', tipo: 'missao', desc: 'Troféu do Reservatório. O Prefeito guarda a estação no mapa de abastecimento.' },
  ticket_origem: { nome: 'Ticket de Troca de Classe', tipo: 'missao', desc: 'Vinculado ao personagem. Use uma vez no abrigo para mudar de Origem.' },
  curativo_selado: { nome: 'Curativo selado', tipo: 'consumivel', desc: 'Fabricado com o filtro da clínica. Consome uma unidade e trata o ferimento no abrigo.' },
  kit_reserva: { nome: 'Pacote de kits de campo', tipo: 'consumivel', desc: 'Separe este pacote no abrigo para obter três kits de campo.' },
  faca_cabos: { nome: 'Faca de cabos', tipo: 'arma', ataque: 22, cadencia: 1.15, compra: 850, requer: 'reles_recuperados', desc: 'Disponível com o Wolf após recuperar os relés. Golpes rápidos para evitar alertas.' },
  perfurador_knox: { nome: 'Perfurador de manutenção', tipo: 'arma', ataque: 50, penetracao: 42, cadencia: 1.52, valor: 2800, desc: 'Bancada do Reservatório. A ponta perfura placas e carapaças.' },
  malho_isolado: { nome: 'Malho isolado do Vigia', tipo: 'arma', ataque: 40, penetracao: 24, cadencia: 1.65, desc: 'Prêmio da primeira vitória sobre o Vigia. Penetra a defesa de infectados pesados.' },
  lamina_comporta: { nome: 'Lâmina da Comporta', tipo: 'arma', ataque: 64, penetracao: 32, cadencia: 1.38, desc: 'Prêmio da primeira vitória sobre a Matriarca. Penetração alta e golpes rápidos.' },
  colete_dieletrico: { nome: 'Colete dielétrico', tipo: 'protecao', defesa: 44, isolamento: 0.4, valor: 1150, desc: 'Bancada da Subestação. Reduz surto elétrico e protege contra dano comum.' },
  capa_filtro: { nome: 'Capa de filtro leve', tipo: 'protecao', defesa: 48, evasao: 0.09, valor: 1850, desc: 'Bancada da clínica. Ajuda a esquivar de perseguições e a ler ataques na neblina.' },
  couraca_pressao: { nome: 'Couraça de pressão', tipo: 'protecao', defesa: 78, isolamento: 0.25, valor: 3250, desc: 'Bancada do Reservatório. Feita para investidas longas contra predadores.' },
  bolsa_reles: { nome: 'Bolsa de relés', tipo: 'mochila', capacidade: 58, compra: 720, requer: 'reles_recuperados', desc: 'Wolf, depois dos relés. Divisórias grandes para voltar com a carga inteira.' },
  mochila_silencio: { nome: 'Mochila de correias silenciosas', tipo: 'mochila', capacidade: 56, alerta: 2, respiro: 7, desc: 'Prêmio da primeira vitória sobre o Zelador. Atrasa alertas e melhora a recuperação entre paradas.' },
  cargueira_knox: { nome: 'Cargueira de Knox', tipo: 'mochila', capacidade: 74, valor: 2150, desc: 'Bancada do Reservatório. Feita para desmontagem e saque volumoso.' },
  sonda_reles: { nome: 'Sonda de relés', tipo: 'ferramenta', recupera: 'rele_ceramico', extra: 1, isolamento: 0.2, valor: 850, desc: 'Bancada da Subestação. Recupera mais um relé onde houver relés e reduz surtos.' },
  chave_industrial: { nome: 'Chave de desmontagem industrial', tipo: 'ferramenta', recupera: 'liga_pressao', extra: 1, sucataExtra: 1, valor: 1650, desc: 'Bancada do Reservatório. Recupera liga de pressão e sucata a mais.' },
};

export const RECEITAS_NOVAS = {
  colete_dieletrico: { nome: ITENS_NOVOS.colete_dieletrico.nome, requer: 'reles_recuperados', gasta: { rele_ceramico: 10, tecido: 12, peca_eletrica: 8 }, equip: 'colete_dieletrico' },
  sonda_reles: { nome: ITENS_NOVOS.sonda_reles.nome, requer: 'reles_recuperados', gasta: { rele_ceramico: 6, pecas: 8 }, equip: 'sonda_reles' },
  capa_filtro: { nome: ITENS_NOVOS.capa_filtro.nome, requer: 'marcas_lidas', gasta: { filtro_clinico: 12, tecido: 18 }, equip: 'capa_filtro' },
  curativo_selado: { nome: ITENS_NOVOS.curativo_selado.nome, requer: 'marcas_lidas', gasta: { filtro_clinico: 1, tecido: 1 }, faz: { curativo_selado: 2 } },
  perfurador_knox: { nome: ITENS_NOVOS.perfurador_knox.nome, requer: 'drenagem_mapeada', gasta: { liga_pressao: 15, rele_ceramico: 8, pecas: 12 }, equip: 'perfurador_knox' },
  couraca_pressao: { nome: ITENS_NOVOS.couraca_pressao.nome, requer: 'drenagem_mapeada', gasta: { liga_pressao: 16, filtro_clinico: 8, pecas: 15 }, equip: 'couraca_pressao' },
  cargueira_knox: { nome: ITENS_NOVOS.cargueira_knox.nome, requer: 'drenagem_mapeada', gasta: { liga_pressao: 10, tecido: 22 }, equip: 'cargueira_knox' },
  chave_industrial: { nome: ITENS_NOVOS.chave_industrial.nome, requer: 'drenagem_mapeada', gasta: { liga_pressao: 8, pecas: 10 }, equip: 'chave_industrial' },
  kit_reserva: { nome: ITENS_NOVOS.kit_reserva.nome, requer: 'drenagem_mapeada', gasta: { sucata: 7, tecido: 2, liga_pressao: 1 }, faz: { kit_reserva: 1 } },
};

export const INIMIGOS_NOVOS = {
  sentinela_ruido: { nome: 'Sentinela de ruído', vida: 96, ataque: 14, defesa: 8, cadencia: 1.3, evasao: 0.05, xp: 130, comportamento: 'alerta' },
  blindado_patio: { nome: 'Blindado do pátio', vida: 142, ataque: 25, defesa: 48, cadencia: 2.15, xp: 200, comportamento: 'blindagem' },
  vigia_rede: { nome: 'O Vigia da Rede', vida: 430, ataque: 29, defesa: 38, cadencia: 1.8, xp: 550, chefe: true, comportamento: 'surto' },
  riscador: { nome: 'Riscador do Eco', vida: 138, ataque: 17, defesa: 13, cadencia: 1.25, evasao: 0.15, xp: 230, comportamento: 'ritual' },
  interno: { nome: 'Interno da Ala', vida: 195, ataque: 31, defesa: 32, cadencia: 1.95, xp: 280, comportamento: 'blindagem' },
  zelador_ala: { nome: 'O Zelador da Ala', vida: 590, ataque: 32, defesa: 44, cadencia: 1.75, evasao: 0.08, xp: 790, chefe: true, comportamento: 'sirene' },
  rasante: { nome: 'Rasante do Canal', vida: 152, ataque: 33, defesa: 22, cadencia: 1.38, evasao: 0.16, xp: 330, bicho: true, comportamento: 'caca' },
  costureiro: { nome: 'Costureiro dos Túneis', vida: 226, ataque: 35, defesa: 53, cadencia: 1.75, xp: 410, comportamento: 'ritual' },
  matriarca: { nome: 'A Matriarca do Reservatório', vida: 910, ataque: 41, defesa: 58, cadencia: 1.65, evasao: 0.12, xp: 1150, chefe: true, bicho: true, comportamento: 'caca' },
};

const ponto = (x, y, ...enc) => ({ p: [x + 0.5, y + 0.5], enc });
const chefe = (x, y, inimigo, item, marca, trofeu) => ({ ...ponto(x, y, inimigo), primeiraVez: { item, marca, trofeu } });
const contrato = (area, nome, resumo, nivel, requer, marca, pontos, creditos, op = {}) => ({
  area, nome, resumo, nivel, requer, marca, pontos, creditos, custo: 1, perigo: op.chefe ? 5 : 4,
  repete: marca || null,
  creditosRonda: op.repete ? creditos : Math.floor(creditos * 0.65),
  bonusXp: marca && !op.repete ? ({ subestacao: 2200, neblina: 3500, reservatorio: 4800 })[area] : 0,
  saque: {
    [({ subestacao: 'rele_ceramico', neblina: 'filtro_clinico', reservatorio: 'liga_pressao' })[area]]: [1, 3],
    sucata: [1, 3], tecido: [1, 2], pecas: [1, 2], peca_eletrica: [0, 1],
  },
  ...op,
});
export const ROTAS_NOVAS = {
  reles_patio: contrato('subestacao', 'Relés do Pátio', 'Bashar pede relés para recuperar o sinal do abrigo. Elimine as sentinelas antes do alarme.', 31, 'sinal_aceito', 'reles_recuperados', [
    ponto(10, 12, 'sentinela_ruido', 'gritador'), ponto(21, 6, 'sentinela_ruido', 'blindado_patio'), ponto(31, 6, 'blindado_patio'),
  ], 240),
  mapa_rede: contrato('subestacao', 'Mapa da Rede', 'Siga os postes até os transformadores do pátio leste e anote os circuitos ativos.', 33, 'reles_recuperados', 'rede_mapeada', [
    ponto(10, 19, 'blindado_patio'), ponto(21, 19, 'sentinela_ruido', 'blindado_patio'), ponto(32, 12, 'sentinela_ruido', 'blindado_patio'),
  ], 300),
  acesso_comando: contrato('subestacao', 'Energia para o Comando', 'Abra os disjuntores cercados. O Colete Dielétrico e a Sonda reduzem os surtos da próxima incursão.', 36, 'rede_mapeada', 'comando_liberado', [
    ponto(10, 12, 'sentinela_ruido', 'gritador'), ponto(21, 6, 'blindado_patio', 'sentinela_ruido'), ponto(32, 19, 'blindado_patio', 'blindado_patio'),
  ], 360),
  vigia_comando: contrato('subestacao', 'Sala de Comando', 'Luz âmbar anuncia golpe pesado. Luz azul anuncia um surto elétrico no próximo ataque.', 38, 'comando_liberado', null, [
    ponto(10, 12, 'sentinela_ruido'), ponto(21, 19, 'blindado_patio'), chefe(38, 19, 'vigia_rede', 'malho_isolado', 'vigia_vencido', 'placa_vigia'),
  ], 480, { chefe: 'vigia_rede', primeira: 3100 }),
  ronda_rede: contrato('subestacao', 'Manutenção da Rede', 'Depois do Vigia, faça a inspeção recorrente dos painéis e mantenha o rádio no ar.', 38, 'vigia_vencido', 'ronda_rede_feita', [
    ponto(10, 6, 'sentinela_ruido'), ponto(21, 6, 'blindado_patio'), ponto(32, 6, 'sentinela_ruido', 'blindado_patio'),
  ], 430, { repete: 'ronda_rede_feita' }),
  rastros_neblina: contrato('neblina', 'Marcas do Eco', 'Bashar encontrou uma frequência que repete endereços. Siga a tinta branca pelas ruas fechadas.', 41, 'vigia_vencido', 'marcas_lidas', [
    ponto(10, 12, 'riscador', 'gritador'), ponto(21, 6, 'riscador', 'interno'), ponto(32, 6, 'interno'),
  ], 570),
  ambulancia: contrato('neblina', 'Última Ambulância', 'Recupere os filtros na rua dos fundos. Derrube os Riscadores primeiro para evitar reforços.', 43, 'marcas_lidas', 'ambulancia_varrida', [
    ponto(10, 19, 'riscador', 'interno'), ponto(21, 19, 'interno'), ponto(32, 12, 'riscador', 'interno', 'gritador'),
  ], 670),
  ala_alarmes: contrato('neblina', 'Quadro de Alarmes', 'Os registros da clínica descrevem duas notas: uma grave para a guarda e duas agudas para a investida.', 46, 'ambulancia_varrida', 'alarmes_mapeados', [
    ponto(10, 6, 'riscador', 'interno'), ponto(21, 12, 'riscador', 'riscador'), ponto(32, 19, 'interno', 'interno'),
  ], 790),
  zelador_clinica: contrato('neblina', 'Ala da Sirene', 'A sirene muda o ritmo da luta. Esquiva e perfuração ajudam contra as investidas e a guarda fechada.', 48, 'alarmes_mapeados', null, [
    ponto(10, 12, 'riscador'), ponto(21, 19, 'interno'), chefe(38, 19, 'zelador_ala', 'mochila_silencio', 'zelador_vencido', 'caderno_neblina'),
  ], 1050, { chefe: 'zelador_ala', primeira: 7400 }),
  ronda_neblina: contrato('neblina', 'Arquivo de Frequências', 'Localize novas gravações e recupere filtros dos postos de triagem.', 48, 'zelador_vencido', 'ronda_neblina_feita', [
    ponto(10, 6, 'riscador'), ponto(21, 6, 'interno'), ponto(32, 6, 'riscador', 'interno'),
  ], 900, { repete: 'ronda_neblina_feita' }),
  canais_knox: contrato('reservatorio', 'Canal de Drenagem', 'O caderno aponta para Knox. Observe a água quieta e os riscos recentes no concreto.', 51, 'zelador_vencido', 'drenagem_mapeada', [
    ponto(10, 12, 'rasante'), ponto(21, 6, 'rasante', 'afogado'), ponto(32, 6, 'costureiro'),
  ], 1120),
  bombas_knox: contrato('reservatorio', 'Casa de Bombas', 'Busque liga de pressão na via sul para o Wolf preparar equipamento de manutenção.', 53, 'drenagem_mapeada', 'bombas_recuperadas', [
    ponto(10, 19, 'rasante', 'rasante'), ponto(21, 19, 'costureiro'), ponto(32, 12, 'costureiro', 'rasante'),
  ], 1280),
  tuneis_knox: contrato('reservatorio', 'Túneis de Inspeção', 'Siga as luzes amarelas. Raspões no túnel anunciam a perseguição dos Rasantes.', 56, 'bombas_recuperadas', 'tunel_aberto', [
    ponto(10, 6, 'costureiro', 'rasante'), ponto(21, 12, 'rasante', 'rasante'), ponto(32, 19, 'costureiro', 'afogado'),
  ], 1470),
  matriarca_knox: contrato('reservatorio', 'Comporta da Matriarca', 'Ondas sem vento anunciam perseguição. O silêncio interrompe a caça antes da próxima emboscada.', 58, 'tunel_aberto', null, [
    ponto(10, 12, 'rasante'), ponto(21, 19, 'costureiro'), chefe(38, 19, 'matriarca', 'lamina_comporta', 'matriarca_vencida', 'selo_comporta'),
  ], 1960, { chefe: 'matriarca', primeira: 14000 }),
  ronda_knox: contrato('reservatorio', 'Vigília das Comportas', 'Mantenha os canais abertos e recupere componentes de pressão enquanto surgem novos Rasantes.', 58, 'matriarca_vencida', 'ronda_knox_feita', [
    ponto(10, 6, 'rasante'), ponto(21, 6, 'costureiro'), ponto(32, 6, 'rasante', 'costureiro'),
  ], 1550, { repete: 'ronda_knox_feita' }),
};

export const ARCO = {
  mastim_vencido: 'Vença o Mastim no Cais do Porto.',
  sinal_aceito: 'Peça ao Bashar o contrato do sinal depois de vencer o Mastim.',
};
for (const rota of Object.values(ROTAS_NOVAS)) {
  if (rota.marca) ARCO[rota.marca] = 'Conclua ' + rota.nome + '.';
  const vitoria = rota.pontos.at(-1).primeiraVez;
  if (vitoria) ARCO[vitoria.marca] = 'Vença ' + INIMIGOS_NOVOS[rota.chefe].nome + '.';
}

export function trilhaExpansao(de, para) {
  if (de[0] === para[0] || de[1] === para[1]) return [de, para];
  return [de, [de[0], 12.5], [para[0], 12.5], para].filter((p, i, ps) => !i || p[0] !== ps[i - 1][0] || p[1] !== ps[i - 1][1]);
}
