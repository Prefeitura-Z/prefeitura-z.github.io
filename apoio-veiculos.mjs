const DIA = 24 * 60 * 60 * 1000;
const DURACAO = 14 * DIA;
const FUSO = 'America/Sao_Paulo';
const POR_PAGINA = 8;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');
const data = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function estadoRotacao(inicio, rotacoes, agora = Date.now()) {
  const primeira = Date.parse(inicio);
  if (!Number.isFinite(primeira)) return {};
  const indice = Math.floor((agora - primeira) / DURACAO);
  const em = i => rotacoes[i] && { ...rotacoes[i], abre: primeira + i * DURACAO };
  return { atual: em(indice), proxima: em(Math.max(0, indice + 1)) };
}

const normalizar = texto => texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const textoValor = oferta => moeda.format(oferta.valorCentavos / 100);
const pasta = id => 'apoio-veiculos/' + encodeURIComponent(id) + '/';

async function lerJSON(url) {
  const resposta = await fetch(url, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error('Vitrine indisponível');
  return resposta.json();
}

function criarOpcao(texto, valor) {
  const opcao = document.createElement('option');
  opcao.value = valor;
  opcao.textContent = texto;
  return opcao;
}

function montarOferta(modelo, oferta, encerra, ticketDiscord) {
  const card = modelo.content.firstElementChild.cloneNode(true);
  const campo = nome => card.querySelector(nome);
  campo('.apoio-tipo').textContent = oferta.tipo;
  campo('h2').textContent = oferta.nome;
  campo('.apoio-valor').textContent = textoValor(oferta);

  const versoes = campo('.apoio-versao');
  const cargaTotal = campo('.apoio-carga strong');
  const compartimentos = campo('.apoio-carga ul');
  const galeria = campo('.apoio-galeria');
  const busca = campo('input');
  const contagem = campo('.apoio-contagem');
  const botoes = campo('.apoio-skins');
  const paginacao = campo('.apoio-paginacao');
  const [anterior, seguinte] = paginacao.querySelectorAll('button');
  const imagem = campo('figure img');
  const legenda = campo('figcaption');
  const mensagem = campo('.apoio-mensagem');
  const pedido = campo('.apoio-pedido');
  const copiar = campo('.apoio-copiar');
  const ticket = campo('.apoio-ticket');

  const abriuTicket = /^https:\/\/discord\.com\/channels\/\d+\/\d+(?:\/\d+)?$/.test(ticketDiscord);
  ticket.href = abriuTicket ? ticketDiscord : SITE.discord;
  ticket.textContent = abriuTicket ? 'Abrir ticket no Discord' : 'Entrar no Discord';

  let versao, catalogo, skin, pagina = 0, carga = 0;

  function atualizarImagem() {
    const base = pasta(versao.id);
    imagem.hidden = !skin?.imagem;
    if (skin?.imagem) {
      imagem.src = base + encodeURIComponent(skin.imagem);
      imagem.alt = versao.nome + ' com a pintura ' + skin.nome;
    } else {
      imagem.removeAttribute('src');
    }
    legenda.textContent = skin?.imagem
      ? skin.nome + (skin.tipoImagem === 'render' ? ' · Prévia do modelo do mod' : ' · Textura do jogo')
      : 'Prévia da pintura indisponível';
  }

  function listarPinturas() {
    const consulta = normalizar(busca.value.trim());
    const filtradas = catalogo.skins.filter(s => normalizar(s.nome + ' ' + s.codigo).includes(consulta));
    const total = filtradas.length;
    const inicio = pagina * POR_PAGINA;
    contagem.textContent = total
      ? (total > POR_PAGINA ? `${inicio + 1}–${Math.min(inicio + POR_PAGINA, total)} de ${total} pinturas`
        : total === 1 ? '1 pintura' : `${total} pinturas`)
      : 'Nenhuma pintura encontrada.';
    botoes.replaceChildren();
    for (const entrada of filtradas.slice(inicio, inicio + POR_PAGINA)) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.setAttribute('aria-pressed', String(entrada === skin));
      const nome = document.createElement('span');
      nome.textContent = entrada.nome;
      const codigo = document.createElement('span');
      codigo.className = 'apoio-skin-ref';
      codigo.textContent = entrada.codigo;
      botao.append(nome, codigo);
      botao.addEventListener('click', () => {
        skin = entrada;
        botoes.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
        botao.setAttribute('aria-pressed', 'true');
        mensagem.textContent = '';
        atualizarImagem();
      });
      botoes.append(botao);
    }
    paginacao.hidden = total <= POR_PAGINA;
    anterior.disabled = pagina === 0;
    seguinte.disabled = inicio + POR_PAGINA >= total;
  }

  async function carregarVersao() {
    const requisicao = ++carga;
    versao = oferta.versoes.find(v => v.id === versoes.value);
    const armazenamento = versao.armazenamento;
    compartimentos.replaceChildren();
    if (armazenamento?.length) {
      const total = armazenamento.reduce((soma, parte) => soma + parte.capacidade * (parte.quantidade ?? 1), 0);
      cargaTotal.textContent = numero.format(total) + ' de capacidade';
      for (const { nome, capacidade, quantidade } of armazenamento) {
        const parte = document.createElement('li');
        const valor = numero.format(capacidade);
        parte.textContent = nome + ' · ' + (quantidade ? quantidade + ' × ' : '') + valor;
        compartimentos.append(parte);
      }
    } else {
      cargaTotal.textContent = armazenamento ? 'Sem compartimento de carga' : 'Capacidade a confirmar';
    }
    galeria.hidden = true;
    pedido.hidden = true;
    mensagem.textContent = 'Carregando pinturas…';
    try {
      const dados = await lerJSON(pasta(versao.id) + 'catalogo.json');
      if (requisicao !== carga) return;
      if (dados.id !== versao.id || !dados.skins.length) throw new Error('Catálogo indisponível');
      catalogo = dados;
      skin = catalogo.skins[0];
      busca.value = '';
      pagina = 0;
      listarPinturas();
      atualizarImagem();
      galeria.hidden = false;
      pedido.hidden = false;
      mensagem.textContent = '';
    } catch {
      if (requisicao === carga) mensagem.textContent = 'Não foi possível carregar as pinturas desta versão.';
    }
  }

  for (const versao of oferta.versoes) versoes.add(criarOpcao(versao.nome, versao.id));
  campo('.apoio-label-versao').hidden = oferta.versoes.length < 2;
  versoes.addEventListener('change', carregarVersao);
  busca.addEventListener('input', () => { pagina = 0; listarPinturas(); });
  anterior.addEventListener('click', () => { pagina--; listarPinturas(); if (anterior.disabled) seguinte.focus(); });
  seguinte.addEventListener('click', () => { pagina++; listarPinturas(); if (seguinte.disabled) anterior.focus(); });
  imagem.addEventListener('error', () => {
    imagem.hidden = true;
    legenda.textContent = 'Prévia da pintura indisponível';
  });

  copiar.addEventListener('click', async () => {
    if (Date.now() >= encerra) return;
    const texto = `Olá! Gostaria de solicitar ${oferta.nome} · ${versao.nome} (${catalogo.id}), pintura ${skin.nome} (${skin.textura}), por ${textoValor(oferta)}.`;
    try {
      await navigator.clipboard.writeText(texto);
      mensagem.textContent = 'Pedido copiado. Cole o texto no ticket do Discord.';
    } catch {
      mensagem.textContent = texto;
    }
  });
  ticket.addEventListener('click', evento => {
    if (Date.now() >= encerra) evento.preventDefault();
  });

  carregarVersao();
  return card;
}

async function iniciar() {
  const modelos = document.getElementById('apoio-modelo');
  const ofertas = document.getElementById('apoio-ofertas');
  const prazo = document.getElementById('apoio-prazo');
  const status = document.getElementById('apoio-estado');
  try {
    const { inicio, rotacoes, ticketDiscord } = await lerJSON('apoio-veiculos.json');
    let exibida;
    let timer;
    function atualizar(forcar = false) {
      const agora = Date.now();
      const { atual, proxima } = estadoRotacao(inicio, rotacoes, agora);
      const termina = atual && atual.abre + DURACAO;
      if (forcar || exibida !== atual?.abre) {
        exibida = atual?.abre;
        ofertas.replaceChildren();
        prazo.hidden = !atual;
        status.hidden = Boolean(atual);
        if (atual) {
          prazo.textContent = 'Disponível até ' + data.format(termina) + ' (Brasília)';
          for (const oferta of atual.ofertas) ofertas.append(montarOferta(modelos, oferta, termina, ticketDiscord));
        } else {
          status.textContent = proxima ? 'Próxima rotação em ' + data.format(proxima.abre) + ' (Brasília).'
            : 'Nenhuma oferta ativa no momento.';
        }
      }

      clearTimeout(timer);
      const marco = Math.min(termina ?? Infinity, proxima?.abre ?? Infinity);
      if (Number.isFinite(marco)) timer = setTimeout(atualizar, Math.min(marco - agora, 2_147_483_647));
    }
    atualizar(true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
    window.addEventListener('pageshow', () => atualizar());
  } catch {
    status.textContent = 'Não foi possível carregar a rotação. Tente novamente em instantes.';
  }
}

if (typeof document !== 'undefined') iniciar();
