// Prefeitura Z: Depois da Queda — telas, conversa com a API do site e interface por cima do abrigo.
(() => {
'use strict';
const PZ = window.PZ;
const M = PZ.mundo, A = PZ.arte;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- API ----------
// Mesma API e mesmo token do resto do site (conta.js). Em localhost dá pra apontar pra uma API de teste com ?api=.
const API_SITE = 'https://prz-site.prefeituraz.workers.dev';
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = (local && new URLSearchParams(location.search).get('api')) || API_SITE;
const Token = {
  ler() { try { return localStorage.getItem('przToken') || ''; } catch { return ''; } },
  salvar(t) { try { t ? localStorage.setItem('przToken', t) : localStorage.removeItem('przToken'); } catch {} },
};
// relógio do servidor: a expedição é desenhada pela hora dele, não pela do computador de quem joga
let desvio = 0;
const agoraServidor = () => Date.now() + desvio;
class ErroApi extends Error { constructor(msg, status, dados) { super(msg); this.status = status; this.dados = dados; } }

const api = window.PZ_DEMO ? PZ.demoApi() : {
  async chamar(caminho, { method = 'GET', body } = {}) {
    const t = Token.ler();
    if (!t) throw new ErroApi('Entre com o Discord.', 401);
    let r;
    try {
      r = await fetch(API + caminho, { method, headers: { Authorization: 'Bearer ' + t, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new ErroApi('Sem conexão com o servidor do site. Confira sua internet e tente de novo.', 0); }
    const d = await r.json().catch(() => ({}));
    if (d.agora) desvio = d.agora - Date.now();
    if (r.status === 401) Token.salvar('');
    if (!r.ok && r.status !== 409) throw new ErroApi(d.erro || 'Não deu certo. Tente de novo.', r.status, d);
    return { status: r.status, ...d };
  },
  eu() { return this.chamar('/game/me'); },
  criar(p) { return this.chamar('/game/character', { method: 'POST', body: p }); },
  interagir(npc, escolha) { return this.chamar('/game/npc/interact', { method: 'POST', body: { npc, escolha } }); },
  equipe() { return this.chamar('/game/admin/equipe'); },
  contas(q) { return this.chamar('/game/admin/contas?q=' + encodeURIComponent(q)); },
  papel(b) { return this.chamar('/game/admin/papel', { method: 'POST', body: b }); },
  ticket() { return this.chamar('/game/ticket'); },
  ticketAcao(acao, body) { return this.chamar('/game/ticket/' + acao, { method: 'POST', body }); },
  ficha(alvo) { return this.chamar('/game/admin/personagem' + (alvo ? '?alvo=' + encodeURIComponent(alvo) : '')); },
  operar(body) { return this.chamar('/game/admin/personagem', { method: 'POST', body }); },
  historico(filtros) { return this.chamar('/game/admin/historico?' + new URLSearchParams(filtros)); },
  catalogo() { return this.chamar('/game/catalogo'); },
  iniciar(rota) { return this.chamar('/game/expedicao/iniciar', { method: 'POST', body: { rota } }); },
  ronda(b) { return this.chamar('/game/expedicao/ronda', { method: 'POST', body: b }); },
  concluir(id) { return this.chamar('/game/expedicao/concluir', { method: 'POST', body: { id } }); },
  recuar(id) { return this.chamar('/game/expedicao/recuar', { method: 'POST', body: { id } }); },
  equipar(id, tirar) { return this.chamar('/game/equipar', { method: 'POST', body: { id, tirar } }); },
  usar(item, chave) { return this.chamar('/game/usar', { method: 'POST', body: { item, chave } }); },
  loja(b) { return this.chamar('/game/loja', { method: 'POST', body: b }); },
  caixas() { return this.chamar('/game/caixas'); },
  comprarCaixa(b) { return this.chamar('/game/caixas/comprar', { method: 'POST', body: b }); },
  async bilhete() { return (await this.chamar('/game/presenca/bilhete', { method: 'POST' })).bilhete; },
  salaUrl: API.replace(/^http/, 'ws') + '/game/presenca',
  async sair() { try { await fetch(API + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + Token.ler() } }); } catch {} Token.salvar(''); },
  entrar() { location.href = API + '/auth/login?volta=jogo'; },
};

// ---------- telas ----------
const TELAS = ['tela-entrar', 'tela-carregando', 'tela-criar', 'tela-jogo'];
function mostrar(id) { for (const t of TELAS) $(t).hidden = t !== id; document.body.dataset.tela = id; }

let estado = null, motor = null, catalogo = null, cena = null;

async function iniciar() {
  // volta do login: /jogo/#token=...
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('token')) Token.salvar(h.get('token'));
  if (h.get('erro')) $('entrar-erro').textContent = { cancelado: 'O login foi cancelado.', expirado: 'O login demorou demais. Tente de novo.', discord: 'O Discord não respondeu. Tente de novo.' }[h.get('erro')] || 'Não deu pra entrar.';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  if (!window.PZ_DEMO && !Token.ler()) return mostrar('tela-entrar');
  mostrar('tela-carregando');
  $('carregando-erro').hidden = true; $('carregando-msg').textContent = 'Conferindo sua conta…';
  try {
    estado = await api.eu();
    catalogo = catalogo || await api.catalogo();
  } catch (e) {
    if (e.status === 401) return mostrar('tela-entrar');
    $('carregando-msg').textContent = e.message;
    $('carregando-erro').hidden = false;
    return;
  }
  if (!estado.personagem) return abrirCriacao();
  if (estado.expedicao) entrarNaExpedicao();   // recarregou no meio da rua: continua de onde o relógio está
  else entrarNoAbrigo();
}

$('btn-entrar').onclick = () => api.entrar();
$('btn-tentar').onclick = iniciar;

// ---------- criação ----------
const OPCOES = {
  corpo: [['a', 'Corpo A'], ['b', 'Corpo B']],
  pele: Object.keys(A.PELE).map(k => [k, 'Tom ' + k.slice(1)]),
  cabelo: [['curto', 'Curto'], ['raspado', 'Raspado'], ['longo', 'Longo'], ['coque', 'Coque'], ['moicano', 'Moicano'], ['cacheado', 'Cacheado']],
  corCabelo: Object.keys(A.CABELO).map(k => [k, ['Preto', 'Castanho escuro', 'Castanho', 'Loiro', 'Grisalho', 'Ruivo'][+k.slice(1) - 1]]),
  roupa: [['jaqueta', 'Jaqueta de ronda'], ['moletom', 'Moletom'], ['colete', 'Colete de campo'], ['macacao', 'Macacão']],
};
const ORIGENS = [
  ['brigadista', 'Brigadista', 'Segurança e suporte'], ['mecanico', 'Mecânico', 'Equipamento e recursos'],
  ['batedor', 'Batedor', 'Rotas e mobilidade'], ['socorrista', 'Socorrista', 'Curativos e assistência'], ['trabalhador', 'Trabalhador', 'Produção e construção'],
];
const sorteio = arr => arr[Math.floor(Math.random() * arr.length)][0];
let ap = null, origem = 'batedor', previaT = 0, previaDir = 0;

function abrirCriacao() {
  ap = { corpo: sorteio(OPCOES.corpo), pele: sorteio(OPCOES.pele), cabelo: sorteio(OPCOES.cabelo), corCabelo: sorteio(OPCOES.corCabelo), roupa: 'jaqueta' };
  const grupos = { corpo: 'Corpo', pele: 'Tom de pele', cabelo: 'Cabelo', corCabelo: 'Cor do cabelo', roupa: 'Roupa inicial' };
  $('opcoes-aparencia').innerHTML = Object.entries(grupos).map(([k, rot]) => `
    <fieldset class="grupo"><legend>${rot}</legend><div class="escolhas ${k === 'pele' || k === 'corCabelo' ? 'amostras' : ''}">
      ${OPCOES[k].map(([v, n]) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="false" title="${esc(n)}" ${k === 'pele' ? `style="--amostra:${A.PELE[v]}"` : k === 'corCabelo' ? `style="--amostra:${A.CABELO[v]}"` : ''}><span>${esc(n)}</span></button>`).join('')}
    </div></fieldset>`).join('');
  $('opcoes-origem').innerHTML = ORIGENS.map(([v, n, d]) => `<button type="button" class="origem" data-origem="${v}" aria-pressed="false"><b>${n}</b><small>${d}</small>${catalogo?.origens?.[v] ? `<small class="bonus">${esc(catalogo.origens[v])}</small>` : ''}</button>`).join('');
  marcarEscolhas();
  $('criar-erro').textContent = '';
  mostrar('tela-criar');
  $('nome').focus();
  requestAnimationFrame(desenharPrevia);
}
function marcarEscolhas() {
  document.querySelectorAll('#opcoes-aparencia [data-k]').forEach(b => b.setAttribute('aria-pressed', ap[b.dataset.k] === b.dataset.v));
  document.querySelectorAll('[data-origem]').forEach(b => b.setAttribute('aria-pressed', b.dataset.origem === origem));
}
$('opcoes-aparencia').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; ap[b.dataset.k] = b.dataset.v; marcarEscolhas(); };
$('opcoes-origem').onclick = e => { const b = e.target.closest('[data-origem]'); if (!b) return; origem = b.dataset.origem; marcarEscolhas(); };
$('btn-girar').onclick = () => { previaDir = (previaDir + 1) % 4; };
$('btn-sortear').onclick = () => { for (const k of ['corpo', 'pele', 'cabelo', 'corCabelo', 'roupa']) ap[k] = sorteio(OPCOES[k]); marcarEscolhas(); };

function desenharPrevia(t) {
  if ($('tela-criar').hidden) return;
  const c = $('previa'), g = c.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  const esc4 = Math.max(2, Math.floor(Math.min(w / A.QW, h / A.QH) * 0.9)) * dpr;
  const f = A.folha(ap), dir = A.DIRS[[0, 1, 3, 2][previaDir]];
  const fs = f[dir].anda, q = fs[Math.floor(t / 110) % fs.length];
  const x = (c.width - A.QW * esc4) / 2, y = c.height - A.QH * esc4 - 6 * dpr;
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(c.width / 2, y + A.PY * esc4, 12 * esc4, 5 * esc4, 0, 0, 7); g.fill();
  g.drawImage(q, Math.round(x), Math.round(y), A.QW * esc4, A.QH * esc4);
  requestAnimationFrame(desenharPrevia);
}

let criando = false;
$('form-criar').onsubmit = async e => {
  e.preventDefault();
  if (criando) return;
  const nome = $('nome').value.replace(/\s+/g, ' ').trim();
  if (nome.length < 3 || nome.length > 20) { $('criar-erro').textContent = 'O nome precisa ter de 3 a 20 letras ou números.'; $('nome').focus(); return; }
  criando = true; $('btn-criar').disabled = true; $('btn-criar').textContent = 'Criando…'; $('criar-erro').textContent = '';
  try {
    const r = await api.criar({ nome, aparencia: ap, origem });
    estado = { ...estado, ...(await api.eu()), personagem: r.personagem };
    entrarNoAbrigo(true);
  } catch (err) {
    $('criar-erro').textContent = err.message;
  } finally { criando = false; $('btn-criar').disabled = false; $('btn-criar').textContent = 'Entrar no abrigo'; }
};

// ---------- abrigo ----------
const ajustes = (() => { try { return JSON.parse(localStorage.getItem('pzAjustes') || '{}'); } catch { return {}; } })();
const salvarAjustes = () => { try { localStorage.setItem('pzAjustes', JSON.stringify(ajustes)); } catch {} };

function atualizarFicha() {
  const p = estado.personagem, e = estado.estado;
  $('hud-nome').textContent = p.nome;
  $('hud-sub').textContent = `Nível ${p.nivel} · ${ORIGENS.find(o => o[0] === p.origem)?.[1] || ''}${e ? ` · ${fmt(e.creditos)} créditos` : ''}${e?.ferido ? ' · ferido' : ''}`;
}
// tudo que o servidor devolve passa por aqui: a tela nunca soma recurso por conta própria
// a aparência do boneco com o que está equipado por cima
function aparenciaAtual() {
  const eq = {};
  for (const q of estado?.estado?.equipamento || []) if (q.equipado && item(q.item)) eq[item(q.item).tipo] = q.item;
  return { ...estado.personagem.aparencia, eq };
}
function absorver(r) {
  if (!r || !estado) return;
  if (r.personagem) estado.personagem = r.personagem;
  else if (r.flags) estado.personagem.flags = r.flags;
  if (r.estado) estado.estado = r.estado;
  if ('expedicao' in r) estado.expedicao = r.expedicao;
  atualizarFicha(); atualizarBipe();
}

function entrarNoAbrigo(novo) {
  mostrar('tela-jogo');
  cena = null;
  $('tela-jogo').dataset.modo = 'abrigo';
  $('exp-hud').hidden = true;
  const p = estado.personagem;
  atualizarFicha();
  $('hud-papel').hidden = estado.papel === 'jogador';
  $('hud-papel').textContent = { proprietario: 'Proprietário', administrador: 'Administrador', moderador: 'Moderador', suporte: 'Suporte' }[estado.papel] || '';
  $('btn-gestao').hidden = !estado.permissoes?.gestao;
  $('demo-aviso').hidden = !window.PZ_DEMO;
  if (motor) motor.parar();
  motor = new PZ.Motor($('cena'), M, {
    aparencia: aparenciaAtual(), reduzir: !!ajustes.reduzir,
    interagir: abrirConversa, perto: mostrarPerto, aviso: torrada,
    posicao: (pos, agora) => presenca?.posicao(pos, agora),
  });
  ligarPresenca();
  PZ.motorAtual = motor; // só leitura, ajuda a testar e depurar no console
  atualizarBipe();
  if (novo || !ajustes.viuAjuda) abrirAjuda();
  else $('cena').focus();
}

// ---------- outros jogadores no abrigo ----------
let presenca = null;
function ligarPresenca() {
  presenca?.desligar(); presenca = null;
  const el = $('hud-online');
  if (!api.bilhete || ajustes.verOutros === false) { el.hidden = true; return; }
  presenca = new PZ.Presenca({ url: api.salaUrl, bilhete: () => api.bilhete(), mudou: mostrarOnline });
  motor.outros = presenca.outros;
  presenca.ligar();
}
function mostrarOnline(est, n) {
  const el = $('hud-online');
  el.hidden = est === 'desligado';
  el.dataset.estado = est;
  el.disabled = est !== 'outraAba';
  el.textContent = est === 'online' ? (n ? `${n + 1} no abrigo` : 'Só você no abrigo')
    : est === 'outraAba' ? 'Jogo aberto em outro lugar · voltar pra cá' : 'Procurando os outros…';
  if (est === 'outraAba') torrada('Você abriu o jogo em outra aba. Nesta aqui os outros não te veem mais.');
}
$('hud-online').onclick = () => { if (presenca?.estado === 'outraAba') presenca.ligar(); };

function mostrarPerto(npc) {
  const b = $('btn-perto');
  b.hidden = !npc;
  if (npc) b.innerHTML = `Conversar com <b>${esc(npc.nome)}</b> <kbd>E</kbd>`;
  b.onclick = () => npc && abrirConversa(npc);
}

let torradaT = 0;
function torrada(txt) {
  const t = $('torrada'); t.textContent = txt; t.hidden = false;
  clearTimeout(torradaT); torradaT = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- painéis (um por vez; sempre param o boneco e devolvem o foco) ----------
let painelAberto = null;
function abrirPainel(id, foco) {
  fecharPainel(true);
  painelAberto = id;
  $(id).hidden = false;
  motor?.pausar(true);
  (foco || $(id).querySelector('button, input, select'))?.focus();
}
function fecharPainel(semFoco) {
  if (!painelAberto) return;
  const id = painelAberto;
  $(id).hidden = true;
  painelAberto = null;
  motor?.pausar(false);
  if (id === 'relatorio') return entrarNoAbrigo();   // fechar o relatório (botão ou Esc) é voltar pro abrigo
  if (!semFoco) $('cena').focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && painelAberto) { e.preventDefault(); fecharPainel(); return; }
  if ($('tela-jogo').hidden) return;
  const campo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (painelAberto === 'conversa' && !campo && /^[1-9]$/.test(e.key)) { const b = $('conversa-opcoes').querySelectorAll('button')[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } return; }
  if (painelAberto || campo) return;
  if (e.code === 'KeyI') { e.preventDefault(); abrirMochila(); }
  if (e.code === 'KeyB') { e.preventDefault(); abrirBipe(); }
  if (e.code === 'KeyG' && estado?.permissoes?.gestao) { e.preventDefault(); abrirGestao(); }
});
document.querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => fecharPainel());

// ---------- conversa ----------
function retrato(npcAp) {
  const c = $('conversa-retrato'), g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
  const q = A.folha(npcAp).SE.parado[0];
  g.drawImage(q, 8, 12, 32, 30, 0, 0, c.width, c.width * 30 / 32);
}
function abrirConversa(npc) {
  const D = M.DIALOGOS[npc.id];
  if (!D) return;
  const flags = estado.personagem.flags || {};
  $('conversa-nome').textContent = npc.nome;
  $('conversa-papel').textContent = npc.papel;
  retrato(A.NPC_AP[npc.ap]);
  falar(D.abertura(flags));
  $('conversa-opcoes').innerHTML = D.opcoes.map((o, i) => `<button type="button" data-op="${o.id}"><kbd>${i + 1}</kbd> ${esc(o.rotulo)}</button>`).join('') +
    `<button type="button" data-sair><kbd>Esc</kbd> Até mais</button>`;
  $('conversa-opcoes').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-sair')) return fecharPainel();
    escolher(npc, D, D.opcoes.find(o => o.id === b.dataset.op), b);
  };
  abrirPainel('conversa');
}
function falar(txt, tag) {
  $('conversa-fala').textContent = txt;
  $('conversa-tag').hidden = !tag; $('conversa-tag').textContent = tag || '';
}
let enviando = false;
async function escolher(npc, D, op, botao) {
  if (!op || enviando) return;
  if (op.abre === 'rotas') return abrirRotas();
  if (npc.local || op.local) return falar(op.local || '…');
  enviando = true; botao.disabled = true; botao.setAttribute('aria-busy', 'true');
  try {
    const r = await api.interagir(npc.id, op.id);
    const R = D.respostas[op.id] || {};
    absorver(r);
    if (r.erro) falar(r.erro, 'Tente de novo');
    else if (!r.ok) falar(r.motivo || 'Agora não.', 'Falta um passo antes');
    else if (r.abre) { falar(R.ok || '…'); r.abre === 'armazem' ? abrirMochila() : r.abre === 'caixas' ? abrirCaixas() : r.abre === 'ticket' ? abrirTicket() : r.abre === 'rotas' ? abrirRotas() : abrirLoja(r.abre.split(':')[1]); }
    else if (r.novo) falar(R.novo || R.ok || '…');
    else if (r.demo) falar(R.demo || '…', 'Chega numa próxima etapa');
    else falar(typeof R.ok === 'function' ? R.ok(estado.personagem.flags) : R.ok || R.novo || '…');
    atualizarBipe();
  } catch (e) {
    falar(e.status === 401 ? 'Sua sessão do site acabou. Entre de novo pra continuar.' : e.message, 'Erro');
    if (e.status === 401) setTimeout(sessaoAcabou, 1800);
  } finally { enviando = false; botao.disabled = false; botao.removeAttribute('aria-busy'); }
}

// ---------- pedidos que mexem em recurso ----------
function sessaoAcabou() { painelAberto && ($(painelAberto).hidden = true); painelAberto = null; presenca?.desligar(); motor?.parar(); cena = null; mostrar('tela-entrar'); }
const novaChave = () => [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
let ocupado = false;
// Cada clique ganha uma chave. Se a rede cair no meio, o pedido é repetido com a MESMA chave e o servidor não conta duas vezes.
async function pedir(botao, msg, fazer) {
  if (ocupado) return null;
  ocupado = true; if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
  const chave = novaChave();
  try {
    let r;
    try { r = await fazer(chave); } catch (e) { if (e.status !== 0) throw e; r = await fazer(chave); }
    absorver(r);
    if (r.erro && msg) msg.textContent = r.erro;
    return r;
  } catch (e) {
    absorver(e.dados);
    if (msg) msg.textContent = e.status === 401 ? 'Sua sessão do site acabou. Entre de novo pra continuar.' : e.message;
    if (e.status === 401) setTimeout(sessaoAcabou, 1800);
    return null;
  } finally { ocupado = false; if (botao?.isConnected) { botao.disabled = false; botao.removeAttribute('aria-busy'); } }
}
const item = id => catalogo.itens[id] || { nome: id, tipo: '' };
const TIPO = { arma: 'Arma', protecao: 'Proteção', mochila: 'Mochila', ferramenta: 'Ferramenta', material: 'Material', consumivel: 'Consumível', missao: 'Missão' };
const efeito = d => [
  d.ataque && `+${d.ataque} de ataque`, d.defesa && `+${d.defesa} de defesa`, d.capacidade && `${d.capacidade} de espaço`,
  d.cadencia && `${d.cadencia} s entre golpes`, d.penetracao && `+${d.penetracao} de penetração`,
  d.evasao && `+${Math.round(d.evasao * 100)} p.p. de esquiva`, d.isolamento && `${Math.round(d.isolamento * 100)}% de isolamento`,
  d.alerta && `+${d.alerta} golpes antes do alerta`, d.respiro && `+${d.respiro} de cura por parada`,
  d.sucataExtra && `+${d.sucataExtra} sucata por parada`, d.recupera && `+${d.extra} ${item(d.recupera).nome.toLowerCase()} por parada`,
].filter(Boolean).join(' · ');
const faltaFlag = k => catalogo.requisitos?.[k] || FALTA[k] || 'Conclua o contrato anterior.';
function linhaVoce() {
  const e = estado.estado, a = e.atributos;
  return `<span>Vida <b>${a.vidaMax}</b></span><span>Ataque <b>${a.ataque}</b></span><span>Defesa <b>${a.defesa}</b></span><span>Mochila <b>${a.capacidade}</b></span><span>Kits de campo <b>${e.itens.suprimento || 0}</b></span><span>Créditos <b>${fmt(e.creditos)}</b></span>`;
}
const textoFerido = () => `Você está ferido: vida máxima menor até ${new Date(estado.estado.feridoAte * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ou até usar um curativo.`;

// ---------- rotas (portão) ----------
const FALTA = { contrato_visto: 'Peça um contrato ao Bashar.', rota1_concluida: 'Conclua a Rua de Cima primeiro.', registro_entregue: 'Entregue o registro de rota ao Bashar.', porteiro_vencido: 'Vença o Porteiro no Entreposto primeiro.',
  rota4_concluida: 'Conclua a Barricada do Sul primeiro.', feira_concluida: 'Conclua a Feira Livre primeiro.', linha_concluida: 'Conclua o Cruzamento da Linha primeiro.',
  plataforma_concluida: 'Conclua a Plataforma Norte primeiro.', manobras_concluida: 'Conclua o Pátio de Manobras primeiro.',
  maquinista_vencido: 'Vença o Maquinista na Feira da Estação primeiro.', cais1_concluida: 'Conclua o Portão do Cais primeiro.', cais2_concluida: 'Conclua a Pilha de Contêineres primeiro.',
  cais3_concluida: 'Conclua o Pátio do Frigorífico primeiro.', cais4_concluida: 'Conclua o Píer dos Pescadores primeiro.' };
function abrirRotas() {
  const f = estado.personagem.flags || {}, e = estado.estado;
  $('rotas-voce').innerHTML = linhaVoce() + (e.ferido ? `<span class="ferido">${esc(textoFerido())}</span>` : '');
  // agrupadas por área: a área seguinte aparece trancada com o que falta pra abrir
  const areas = catalogo.areas || { entrada: { nome: 'Quarteirão da Entrada' } };
  let areaAtual = null;
  $('rotas-lista').innerHTML = Object.entries(catalogo.rotas).map(([id, r]) => {
    const aid = r.area || 'entrada', A = areas[aid] || { nome: aid };
    const cab = aid !== areaAtual ? `<li class="area-cab${A.requer && !f[A.requer] ? ' trancada' : ''}"><b>${esc(A.nome)}${A.faixa ? ' · níveis ' + esc(A.faixa) : ''}</b>${A.detalhe ? `<small>${esc(A.detalhe)}</small>` : ''}${A.requer && !f[A.requer] ? `<small>${esc(faltaFlag(A.requer))}</small>` : ''}</li>` : '';
    areaAtual = aid;
    const falta = !f.kit_recebido ? 'Pegue seu kit com o Wolf.' : r.requer && !f[r.requer] ? faltaFlag(r.requer) : r.nivel > estado.personagem.nivel ? 'Requer nível ' + r.nivel + '.' : '';
    const semKit = !falta && r.custo > (e.itens.suprimento || 0);
    const inimigos = [...new Set(r.pontos.flatMap(p => p.enc))].map(k => catalogo.inimigos[k]?.nome || k).join(', ');
    return cab + `<li class="${falta ? 'trancada' : ''}"><span>
      <b>${esc(r.nome)}</b> <i class="perigo-n" title="Perigo ${r.perigo} de 5">${'●'.repeat(r.perigo)}${'○'.repeat(Math.max(0, 5 - r.perigo))}</i>
      <small>${esc(r.resumo)}</small>
      <small>${r.pontos.filter(p => p.enc.length).length} paradas · ${esc(inimigos)} · traz ${esc(r.saque.map(k => item(k).nome.toLowerCase()).join(', '))}</small>
      <small>${r.nivel > 1 ? `Nível ${r.nivel} · ${fmt(r.creditos)} créditos pela conclusão${r.primeira ? ' · primeira vitória +' + fmt(r.primeira) : ''}${r.bonusXp ? ' · primeiro contrato +' + fmt(r.bonusXp) + ' XP' : ''} · ` : ''}${r.custo ? `Gasta ${r.custo} kit de campo` : 'Não gasta kit de campo'}${falta ? ' · ' + esc(falta) : semKit ? ' · Falta kit de campo: o Wolf vende e a bancada dele faz.' : ''}</small></span>
      <span class="acoes"><button type="button" class="botao ${falta || semKit ? '' : 'primario'}" data-rota="${esc(id)}" ${falta || semKit ? 'disabled' : ''}>${falta ? 'Trancada' : 'Sair pelo portão'}</button>
      ${!falta && r.repete && f[r.repete] ? `<button type="button" class="botao" data-ronda="${esc(id)}" ${e.ferido || (r.custo && !(e.itens.suprimento > 0)) ? 'disabled' : ''}>Deixar farmando</button>` : ''}</span>
      ${r.repete && f[r.repete] && e.ferido ? '<small class="trava">Ferido não sai pra farmar: use um curativo na Mochila ou espere passar.</small>' : ''}</li>`;
  }).join('');
  $('ronda-config').hidden = true;
  abrirPainel('rotas', $('rotas-lista').querySelector('button:not(:disabled)') || undefined);
}
// farm: escolhe uma rota já feita e deixa o personagem lá. O servidor decide na hora quantas voltas cabem e onde para.
let rotaRonda = null;
function abrirRonda(id) {
  const r = catalogo.rotas[id], kits = estado.estado.itens.suprimento || 0, R = catalogo.ronda;
  rotaRonda = id;
  $('ronda-titulo').textContent = 'Farmar em ' + r.nome;
  $('ronda-nota').textContent = `O personagem fica dando voltas nessa rota por até ${R.limiteSeg / 3600} horas, mesmo com o jogo fechado. ${r.creditosRonda ? 'Cada volta concluída rende ' + fmt(r.creditosRonda) + ' créditos além do saque. ' : ''}Ele não volta pro portão entre as voltas: os infectados reaparecem e ele segue lá. ${r.custo ? `Cada kit de campo segura ${R.voltasPorKit} voltas (você tem ${kits}).` : 'Nessa rota o farm não gasta kit de campo.'} Ele volta sozinho ${r.custo ? 'se acabar o kit, ' : ''}se a vida baixar, se o equipamento ficar no limite ou se cair. Você pode chamar de volta quando quiser.`;
  $('ronda-voltas').innerHTML = !r.custo ? `<option value="${R.ciclosMax}">Até eu chamar ou algo parar ele</option>` + [10, 30, 60].map(n => `<option value="${n}">${n} voltas</option>`).join('') : `<option value="${R.ciclosMax}">Até acabar os kits (${kits})</option>` + [1, 2, 3, 5, 10].filter(n => n < kits).map(n => `<option value="${n * R.voltasPorKit}">${n * R.voltasPorKit} voltas (${n} ${n === 1 ? 'kit' : 'kits'})</option>`).join('');
  $('ronda-config').hidden = false;
  $('btn-ronda').focus();
}
$('ronda-config').onsubmit = async ev => {
  ev.preventDefault();
  if (!rotaRonda) return;
  await pedir($('btn-ronda'), $('rotas-msg'), () => api.ronda({ rota: rotaRonda, ciclos: +$('ronda-voltas').value, vidaMin: +$('ronda-vida').value }));
  if (estado.expedicao) { fecharPainel(true); entrarNaExpedicao(); }
};
$('rotas-lista').onclick = async ev => {
  const br = ev.target.closest('[data-ronda]'); if (br) return abrirRonda(br.dataset.ronda);
  const b = ev.target.closest('[data-rota]'); if (!b) return;
  const r = await pedir(b, $('rotas-msg'), () => api.iniciar(b.dataset.rota));
  if (estado.expedicao) { fecharPainel(true); entrarNaExpedicao(); }
  else if (r && !r.erro) $('rotas-msg').textContent = 'O portão não abriu. Tente de novo.';
};

// ---------- expedição ----------
const relogio = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function entrarNaExpedicao() {
  mostrar('tela-jogo');
  presenca?.desligar(); presenca = null; $('hud-online').hidden = true;   // na rua cada um está por conta própria
  if (motor) motor.parar();
  $('tela-jogo').dataset.modo = 'expedicao';
  $('btn-perto').hidden = true; $('demo-aviso').hidden = true;
  $('exp-hud').hidden = false; $('exp-feed').innerHTML = ''; $('exp-sinal').hidden = true; $('exp-carga-n').textContent = '';
  ajustarHudExp();
  const ex = estado.expedicao, farm = ex.tipo === 'ronda';
  textoRecuar = farm ? 'Chamar de volta pro abrigo' : 'Recuar pro abrigo';
  recuoArmado = false; $('btn-recuar').textContent = textoRecuar; $('btn-recuar').disabled = false; $('btn-recuar').hidden = false;
  const nomeArea = catalogo.areas?.[catalogo.rotas[ex.rota]?.area]?.nome || 'Quarteirão da Entrada';
  $('exp-area').textContent = farm ? `${nomeArea} · farm, volta ${ex.ronda.volta} de ${ex.ronda.voltas}` : nomeArea;
  $('exp-ronda').hidden = !farm;
  if (farm) {
    const g = Object.entries(ex.ronda.itens).map(([k, q]) => `${q} ${item(k).nome.toLowerCase()}`).join(', ');
    $('exp-ronda').textContent = `Já guardado: ${ex.ronda.feitas} ${ex.ronda.feitas === 1 ? 'volta' : 'voltas'}, ${ex.ronda.xp} XP${ex.ronda.creditos ? ', ' + fmt(ex.ronda.creditos) + ' créditos' : ''}${g ? ', ' + g : ''}. Fim previsto às ${new Date(ex.ronda.fim - desvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Pode fechar o jogo.`;
  }
  atualizarFicha();
  cena = new PZ.Expedicao($('cena'), {
    expedicao: ex, catalogo, aparencia: aparenciaAtual(), reduzir: !!ajustes.reduzir,
    nome: estado.personagem.nome, nivel: estado.personagem.nivel,
    agora: agoraServidor, mudou: mostrarExpedicao, som: tocarSinal, fim: () => farm ? proximaVolta(ex) : fecharExpedicao(ex.id, false),
  });
  motor = cena.motor; PZ.motorAtual = motor; PZ.cenaAtual = cena;
  $('cena').focus();
}
function mostrarExpedicao(h) {
  $('exp-rota').textContent = h.rota; $('exp-fase').textContent = h.fase;
  $('exp-vida-n').textContent = `${h.vida}/${h.vidaMax}`; $('exp-vida').style.width = `${100 * h.vida / h.vidaMax}%`;
  $('exp-vida').parentElement.classList.toggle('baixa', h.vida / h.vidaMax < 0.35);
  $('exp-carga-n').textContent = `${h.carga}/${h.capacidade}`; $('exp-carga').style.width = `${Math.min(100, 100 * h.carga / h.capacidade)}%`;
  $('exp-parada-n').textContent = `${h.feitas}/${h.total}`; $('exp-parada').style.width = `${100 * h.feitas / Math.max(1, h.total)}%`;
  $('exp-tempo').textContent = h.espera ? `Próxima volta em ${relogio(h.espera)}` : h.restante ? `Volta em ${relogio(h.restante)} · ${h.xp} XP até aqui` : 'Chegando ao portão…';
  $('exp-sinal').hidden = !h.sinal;
  if (h.sinal && $('exp-sinal').textContent !== h.sinal.txt) { $('exp-sinal').textContent = h.sinal.txt; $('exp-sinal').style.color = h.sinal.cor; }
  if (!h.sinal) $('exp-sinal').textContent = '';
  if (painelAberto === 'mochila') mostrarCargaMochila();
  $('exp-feed').innerHTML = h.feed.map(l => `<li class="${l.cls}">${esc(l.txt)}</li>`).join('');
  $('btn-recuar').hidden = h.voltando && !recuoArmado && estado.expedicao?.tipo !== 'ronda';
}
let sinalAudio, somAtivo = false;
$('exp-som').onclick = async () => {
  if (somAtivo) somAtivo = false;
  else {
    try {
      sinalAudio ||= new AudioContext();
      await sinalAudio.resume();
      somAtivo = true;
    } catch { $('exp-som').textContent = 'Áudio indisponível'; return; }
  }
  $('exp-som').setAttribute('aria-pressed', String(somAtivo));
  $('exp-som').textContent = somAtivo ? 'Silenciar sinais' : 'Ativar sinais sonoros';
};
function tocarSinal(tipo) {
  if (!somAtivo || sinalAudio.state !== 'running') return;
  const notas = { grave: [155], agudo: [580, 730], alarme: [310, 390], agua: [225, 130] };
  for (const [i, hz] of (notas[tipo] || []).entries()) {
    const t = sinalAudio.currentTime + i * 0.19, oscilador = sinalAudio.createOscillator(), ganho = sinalAudio.createGain();
    oscilador.type = 'triangle'; oscilador.frequency.value = hz;
    ganho.gain.setValueAtTime(0.001, t); ganho.gain.exponentialRampToValueAtTime(0.09, t + 0.025);
    ganho.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    oscilador.connect(ganho).connect(sinalAudio.destination);
    oscilador.start(t); oscilador.stop(t + 0.18);
  }
}
let recuoArmado = false, fechando = false, textoRecuar = 'Recuar pro abrigo';
// farm: acabou uma volta. Se a ronda inteira terminou, fecha; senão busca a próxima volta no servidor.
async function proximaVolta(ex) {
  if (agoraServidor() >= ex.ronda.fim) return fecharExpedicao(ex.id, false);
  await new Promise(r => setTimeout(r, 900));
  if (estado?.expedicao?.id !== ex.id || fechando || cena?.ex !== ex) return;
  try { absorver(await api.eu()); } catch (e) { if (e.status === 401) return sessaoAcabou(); return setTimeout(() => proximaVolta(ex), 5000); }
  if (estado.expedicao) entrarNaExpedicao(); else entrarNoAbrigo();
}
$('btn-recuar').onclick = () => {
  if (!estado.expedicao) return;
  if (!recuoArmado) { recuoArmado = true; $('btn-recuar').textContent = estado.expedicao.tipo === 'ronda' ? 'Confirmar: a volta pela metade não rende' : 'Confirmar: voltar com o que já revistei'; setTimeout(() => { recuoArmado = false; $('btn-recuar').textContent = textoRecuar; }, 4000); return; }
  fecharExpedicao(estado.expedicao.id, true);
};
// Pede o fechamento ao servidor. Ele confere a hora dele; se ainda não deu, a gente espera e pergunta de novo.
async function fecharExpedicao(id, recuo, tentativa = 0) {
  if (fechando && !tentativa) return;
  fechando = true; $('btn-recuar').disabled = true;
  let r = null;
  try { r = await (recuo ? api.recuar(id) : api.concluir(id)); }
  catch (e) { if (e.status === 401) { fechando = false; return sessaoAcabou(); } if (e.status === 404) r = { expedicao: null }; }
  if (r?.relatorio) { fechando = false; absorver(r); return mostrarRelatorio(r.relatorio); }
  if (r && 'expedicao' in r && !r.expedicao) { fechando = false; absorver(r); return entrarNoAbrigo(); }   // já foi fechada em outro lugar
  if (tentativa > 40) { fechando = false; $('exp-fase').textContent = 'Sem resposta do servidor. Recarregue a página: sua expedição está guardada.'; return; }
  setTimeout(() => fecharExpedicao(id, recuo, tentativa + 1), Math.min(6000, 900 + tentativa * 400));
}
const TITULO_FIM = {
  concluida: ['Rota concluída', 'Você foi até o fim da rota e voltou pro portão.'],
  mochila: ['Mochila cheia', 'Não cabia mais nada, então você voltou antes do fim da rota com tudo que pegou.'],
  recuo: ['Você recuou', 'Voltou antes do fim e ficou com o que já tinha revistado.'],
  derrota: ['Você caiu', 'Te carregaram de volta. O que estava revistado antes da queda veio junto.'],
};
const FIM_FARM = {
  ciclos: ['Farm concluído', 'Ele deu todas as voltas combinadas e voltou pro abrigo.'],
  suprimentos: ['Acabaram os kits de campo', 'Sem kit ele não segue na rua, então voltou pro abrigo.'],
  vida: ['Voltou pra não cair', 'A vida ficou abaixo do limite que você escolheu.'],
  equipamento: ['Equipamento no limite', 'A arma ou a proteção gastou demais pra continuar. O Wolf conserta.'],
  tempo: ['Limite de 8 horas', 'Ele ficou na rua o máximo permitido por saída.'],
  derrota: ['Você caiu', 'Te carregaram de volta. O que estava guardado das voltas anteriores está no armazém.'],
  chamado: ['Você chamou de volta', 'As voltas inteiras contaram. A que estava pela metade não rendeu.'],
};
const tempoLongo = s => s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min`;
function mostrarRelatorio(rel) {
  cena?.parar();
  $('exp-hud').hidden = true;
  const farm = rel.tipo === 'ronda';
  const [titulo, texto] = (farm ? FIM_FARM[rel.motivo] : TITULO_FIM[rel.motivo]) || TITULO_FIM.concluida;
  $('relatorio-rota').textContent = farm ? `Farm em ${rel.nomeRota} · ${tempoLongo(rel.fora)} fora · ${rel.voltas} ${rel.voltas === 1 ? 'volta' : 'voltas'}`
    : `${rel.nomeRota} · ${relogio(rel.fora)} fora · ${rel.paradas}/${rel.totalParadas} paradas`;
  $('relatorio-t').textContent = titulo; $('relatorio-texto').textContent = texto;
  const li = [];
  li.push(`<li><span><b>+${rel.xp} XP</b>${rel.bonus ? '<small>Inclui o bônus da primeira vez nesta rota</small>' : ''}</span></li>`);
  if (rel.nivelDepois > rel.nivelAntes) li.push(`<li class="destaque"><span><b>Nível ${rel.nivelDepois}</b><small>Mais vida e mais ataque</small></span></li>`);
  for (const [k, q] of Object.entries(rel.itens || {})) li.push(`<li><span><b>${q} × ${esc(item(k).nome)}</b><small>${esc(TIPO[item(k).tipo] || '')}</small></span></li>`);
  if (farm && (rel.kits || rel.kitsDevolvidos)) li.push(`<li><span><b>${rel.kits} ${rel.kits === 1 ? 'kit de campo gasto' : 'kits de campo gastos'}</b>${rel.kitsDevolvidos ? `<small>${rel.kitsDevolvidos} voltaram pro armazém porque nem foram abertos</small>` : ''}</span></li>`);
  if (rel.creditos) li.push(`<li><span><b>+${rel.creditos} créditos</b></span></li>`);
  if (rel.equip) li.push(`<li class="destaque"><span><b>${esc(item(rel.equip).nome)}</b><small>${esc(efeito(item(rel.equip)))} · está no seu armazém, equipe na Mochila</small></span></li>`);
  const perd = Object.entries(rel.perdidos || {}).map(([k, q]) => `${q} ${item(k).nome}`);
  if (perd.length) li.push(`<li class="vazio"><span>Ficou pra trás por falta de espaço: ${esc(perd.join(', '))}</span></li>`);
  const sinais = [...new Set((rel.sinais || []).map(s => s.txt))];
  if (sinais.length) li.push(`<li><span><b>Sinais observados</b>${sinais.map(s => `<small>${esc(s)}</small>`).join('')}</span></li>`);
  $('relatorio-lista').innerHTML = li.join('');
  const notas = [];
  if (rel.ferido) notas.push('Você está ferido por 10 minutos: vida máxima menor. Um curativo resolve na hora.');
  const g = rel.desgaste || {}; if (g.arma || g.protecao) notas.push(`O equipamento gastou (arma −${g.arma || 0}, proteção −${g.protecao || 0}). O Wolf conserta.`);
  $('relatorio-nota').textContent = notas.join(' ');
  abrirPainel('relatorio', $('btn-relatorio-ok'));
}
$('btn-relatorio-ok').onclick = () => fecharPainel();

// ---------- mochila e armazém ----------
const fmt = n => Number(n).toLocaleString('pt-BR');
const nomeOrigem = id => ORIGENS.find(o => o[0] === id)?.[1] || id;
const campoLivre = (fora, texto) => fora ? 'disabled title="Volte ao abrigo" aria-label="' + texto + ' no abrigo"' : '';

function estoqueFiltrado() {
  const e = estado.estado, fora = !!estado.expedicao, busca = $('mochila-busca').value.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
  const achou = d => (d.nome + ' ' + (d.desc || '')).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '').includes(busca);
  const categoria = $('mochila-filtro').value;
  const grupos = [];
  const guardar = (titulo, linhas) => {
    if (linhas.length) grupos.push(`<section class="estoque-grupo"><h4>${titulo}</h4><ul class="lista">${linhas.join('')}</ul></section>`);
  };
  if (!categoria || categoria === 'equip') guardar('Equipamento guardado', e.equipamento.filter(q => !q.equipado && achou(item(q.item))).map(q => {
    const d = item(q.item), delta = e.comparacoes?.[q.id];
    const chaves = { ataque: 'ataque', defesa: 'defesa', capacidade: 'espaço', cadencia: 's entre golpes', evasao: 'p.p. de esquiva', penetracao: 'penetração', isolamento: 'p.p. de isolamento', respiro: 'cura por parada', alerta: 'golpes antes de alerta', sucataExtra: 'sucata por parada' };
    const valores = Object.entries(delta || {}).map(([k, v]) => {
      const n = ['evasao', 'isolamento'].includes(k) ? v * 100 : v;
      return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} ${chaves[k] || item(k).nome.toLowerCase() + ' por parada'}`;
    });
    const atual = e.equipamento.find(p => p.equipado && item(p.item).tipo === d.tipo);
    const troca = atual ? 'Em relação a ' + item(atual.item).nome : 'Em relação ao espaço vazio';
    return `<li><span><b>${esc(d.nome)}</b><small>${esc(TIPO[d.tipo])} · condição ${q.condicao}% · ${esc(efeito(d))}</small>
      <small>${esc(d.desc || '')}</small>${delta ? `<small>${esc(troca)} · ${esc(valores.join(' · ') || 'atributos principais iguais')}</small>` : ''}</span>
      <button type="button" class="botao" data-equip="${esc(q.id)}" ${campoLivre(fora, 'Equipar')}>${fora ? 'Equipar no abrigo' : 'Equipar'}</button></li>`;
  }));
  for (const [tipo, titulo] of [['consumivel', 'Consumíveis'], ['material', 'Materiais'], ['missao', 'Missões e troféus']]) {
    if (categoria && categoria !== tipo) continue;
    guardar(titulo, Object.entries(e.itens).filter(([id, q]) => q > 0 && item(id).tipo === tipo && achou(item(id))).map(([id, q]) => {
      const d = item(id), podeUsar = id === 'kit_reserva' || ((id === 'curativo' || id === 'curativo_selado') && e.ferido);
      const acao = id === 'ticket_origem' ? '<button type="button" class="botao" data-abrir-ticket>Ver ticket</button>'
        : podeUsar ? `<button type="button" class="botao" data-usar="${id}" ${campoLivre(fora, 'Usar')}>${fora ? 'Usar no abrigo' : 'Usar'}</button>` : '';
      return `<li><span><b>${fmt(q)} × ${esc(d.nome)}</b><small>${esc(d.desc || '')}</small></span>${acao}</li>`;
    }));
  }
  $('mochila-itens').innerHTML = grupos.join('') || `<p class="nota">${busca || categoria ? 'Nenhum item com esses filtros.' : 'Nada guardado no armazém.'}</p>`;
}
function desenharMochila() {
  const e = estado.estado, p = estado.personagem, fora = !!estado.expedicao;
  $('mochila-nome').textContent = p.nome + ' · ' + nomeOrigem(p.origem);
  const cv = $('mochila-retrato'), g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
  g.drawImage(A.folha(aparenciaAtual()).SE.parado[0], 6, -5, 84, 140);
  $('mochila-voce').innerHTML = linhaVoce();
  $('mochila-xp-n').textContent = p.xpProximo ? `Nível ${p.nivel} · ${fmt(p.xpNoNivel)} / ${fmt(p.xpProximo)} XP · ${fmt(p.xp)} XP total` : `Nível ${p.nivel} (máximo) · ${fmt(p.xp)} XP total`;
  $('mochila-xp').value = p.xpProximo ? 100 * p.xpNoNivel / p.xpProximo : 100;
  $('mochila-ferido').textContent = e.ferido ? textoFerido() : 'Sem ferimentos';
  $('mochila-ferido').classList.toggle('ferido', e.ferido);
  $('mochila-trava').hidden = !fora;
  mostrarCargaMochila();
  $('mochila-espacos').innerHTML = EQUIPA.map(tipo => {
    const q = e.equipamento.find(q => q.equipado && item(q.item).tipo === tipo);
    if (!q) return `<li><span><b>${TIPO[tipo]}</b><small>Espaço vazio</small></span></li>`;
    const d = item(q.item), mod = e.comparacoes?.[q.id];
    const pontos = { arma: 'ataque', protecao: 'defesa', mochila: 'capacidade', ferramenta: 'sucataExtra' };
    const efetivo = mod?.[pontos[tipo]] || 0;
    return `<li class="destaque"><span><small>${TIPO[tipo]}</small><b>${esc(d.nome)}</b><small>Condição ${q.condicao}% · ${esc(efeito(d))}</small>
      ${q.condicao < 100 && efetivo && ['arma', 'protecao'].includes(tipo) ? `<small>Contribuição na condição atual: +${-efetivo} de ${pontos[tipo]}</small>` : ''}</span>
      <button type="button" class="botao" data-equip="${esc(q.id)}" data-tirar="1" ${campoLivre(fora, 'Tirar')}>${fora ? 'Tirar no abrigo' : 'Tirar'}</button></li>`;
  }).join('');
  estoqueFiltrado();
}
function mostrarCargaMochila() {
  const ex = estado?.expedicao;
  $('mochila-carga').textContent = ex ? `Saque nesta ${ex.tipo === 'ronda' ? 'volta' : 'expedição'}: ${$('exp-carga-n').textContent || '0/' + ex.capacidade}`
    : `Capacidade de saque: ${estado.estado.atributos.capacidade} unidades`;
}
function abrirMochila() {
  $('mochila-msg').textContent = '';
  abrirPainel('mochila');
  desenharMochila();
}
$('btn-mochila').onclick = abrirMochila;
$('mochila-busca').oninput = estoqueFiltrado;
$('mochila-filtro').onchange = estoqueFiltrado;
$('mochila').onclick = async ev => {
  const b = ev.target.closest('[data-equip], [data-usar], [data-abrir-ticket]');
  if (!b) return;
  if ('abrirTicket' in b.dataset) return abrirTicket();
  const msg = $('mochila-msg');
  msg.textContent = 'Salvando…';
  const r = await pedir(b, msg, ch => b.dataset.usar ? api.usar(b.dataset.usar, ch) : api.equipar(b.dataset.equip, b.dataset.tirar === '1'));
  if (r?.ok) {
    msg.textContent = b.dataset.usar === 'kit_reserva' ? 'Três kits de campo no armazém.' : b.dataset.usar ? 'Ferimento tratado.' : b.dataset.tirar ? 'Peça guardada no armazém.' : 'Equipamento atualizado.';
    motor?.definirAparencia(aparenciaAtual());
    desenharMochila();
    $('mochila-msg').setAttribute('tabindex', '-1');
    $('mochila-msg').focus();
  }
};

let ticketInfo;
async function abrirTicket() {
  abrirPainel('ticket');
  $('ticket-msg').textContent = '';
  await carregarTicket();
}
async function carregarTicket() {
  const box = $('ticket-conteudo');
  box.textContent = 'Carregando…';
  try {
    const r = ticketInfo = await api.ticket();
    const bloqueio = r.fora ? 'Volte ao abrigo para comprar ou usar um ticket.' : !r.registrado ? 'Faça seu registro com o Prefeito.' : '';
    const origem = `<p>Origem atual <strong>${esc(nomeOrigem(r.origem))}</strong> · ${esc(catalogo.origens[r.origem])}</p>`;
    const opcoes = Object.entries(catalogo.origens).filter(([id]) => id !== r.origem);
    box.innerHTML = `<p>Preço <strong>${fmt(r.preco)} créditos</strong> · Saldo <strong>${fmt(r.saldo)} créditos</strong></p>
      ${origem}${bloqueio ? `<p class="trava">${bloqueio}</p>` : ''}
      ${r.ticket ? `<p>Você tem 1 ticket vinculado ao personagem.</p>
        <label class="campo">Nova Origem<select id="ticket-origem"><option value="">Escolha uma Origem</option>
        ${opcoes.map(([id, bonus]) => `<option value="${esc(id)}">${esc(nomeOrigem(id))} · ${esc(bonus)}</option>`).join('')}</select></label>
        <button type="button" class="botao primario" data-ticket="usar" ${bloqueio ? 'disabled' : ''}>Revisar troca</button>`
        : `<button type="button" class="botao primario" data-ticket="comprar" ${bloqueio || r.saldo < r.preco ? 'disabled' : ''}>Revisar compra</button>
        ${r.saldo < r.preco ? '<p class="nota">Créditos insuficientes.</p>' : ''}`}
      <div id="ticket-revisao" class="acoes"></div>`;
    $('ticket-origem')?.addEventListener('change', () => { $('ticket-revisao').replaceChildren(); });
  } catch (e) {
    box.innerHTML = '<button type="button" class="botao" data-ticket="recarregar">Tentar de novo</button>';
    $('ticket-msg').textContent = e.message;
  }
}
$('ticket-conteudo').onclick = async ev => {
  const b = ev.target.closest('[data-ticket]');
  if (!b || ocupado) return;
  const acao = b.dataset.ticket, msg = $('ticket-msg');
  if (acao === 'recarregar') return carregarTicket();
  const revisao = $('ticket-revisao');
  msg.textContent = '';
  if (acao === 'cancelar') {
    revisao.replaceChildren();
    $('ticket-conteudo').querySelector('[data-ticket="comprar"], [data-ticket="usar"]')?.focus();
    return;
  }
  const origem = $('ticket-origem')?.value;
  if (acao === 'usar' && !origem) { msg.textContent = 'Escolha uma Origem.'; $('ticket-origem').focus(); return; }
  if (acao === 'comprar' || acao === 'usar') {
    const resumo = acao === 'comprar' ? `Debitar ${fmt(ticketInfo.preco)} créditos e receber um ticket?` : `Consumir o ticket e mudar para ${nomeOrigem(origem)} (${catalogo.origens[origem]})?`;
    revisao.innerHTML = `<p>${esc(resumo)}</p><button type="button" class="botao primario" data-ticket="confirmar-${acao}">Confirmar</button>
      <button type="button" class="botao" data-ticket="cancelar">Cancelar</button>`;
    revisao.querySelector('button').focus();
    return;
  }
  const compra = acao === 'confirmar-comprar';
  const dados = compra ? { preco: ticketInfo.preco, versao: ticketInfo.versao } : { origem, ticket: ticketInfo.ticket };
  msg.textContent = 'Salvando…';
  const r = await pedir(b, msg, chave => api.ticketAcao(compra ? 'comprar' : 'usar', { ...dados, chave }));
  if (r?.ok) msg.textContent = compra ? 'Ticket entregue ao personagem.' : 'Origem atualizada.';
  await carregarTicket();
  $('ticket-conteudo').querySelector('button:not(:disabled), select')?.focus();
};

// ---------- oficina do Wolf ----------
// o mesmo cálculo do servidor, só pra mostrar o preço; quem decide o valor é ele
const valorRevenda = q => Math.max(1, Math.floor((item(q.item).compra || item(q.item).valor) * catalogo.revenda * (0.5 + 0.5 * q.condicao / 100)));
let vendaArmada = null;
const EQUIPA = ['arma', 'protecao', 'mochila', 'ferramenta'];
// Comprar consumível e vender material mudam a tela na hora e vão pro servidor em fila, um atrás do outro.
// Quem manda é o servidor: quando a fila esvazia, o que ele respondeu substitui o que a tela mostrou.
let filaLoja = Promise.resolve(), naFila = 0, falhouFila = false;
function lojaRapida(d) {
  const e = estado.estado, def = item(d.item), q = +d.qtd || 1;
  if (d.loja === 'comprar') { if (e.creditos < def.compra * q) return; e.creditos -= def.compra * q; e.itens[d.item] = (e.itens[d.item] || 0) + q; $('loja-msg').textContent = `${q} × ${def.nome}: comprado.`; }
  else { if ((e.itens[d.item] || 0) < q) return; e.itens[d.item] -= q; if (!e.itens[d.item]) delete e.itens[d.item]; e.creditos += def.venda * q; $('loja-msg').textContent = `Vendido por ${q * def.venda} créditos.`; }
  desenharLoja(); atualizarFicha();
  const chave = novaChave(), corpo = { acao: d.loja, chave, item: d.item, qtd: q };
  naFila++;
  filaLoja = filaLoja.then(async () => {
    let r = null;
    try { try { r = await api.loja(corpo); } catch (x) { if (x.status !== 0) throw x; r = await api.loja(corpo); } }
    catch (x) { falhouFila = true; if (x.status === 401) return sessaoAcabou(); $('loja-msg').textContent = x.message; }
    naFila--;
    if (naFila > 0) return;
    // fila vazia: fica valendo o que o servidor disse. Se algo falhou no caminho, busca o estado de novo.
    if (falhouFila || !r) { falhouFila = false; try { r = await api.eu(); } catch { return; } }
    if (naFila === 0) { absorver(r); if (painelAberto === 'loja') desenharLoja(); }
  });
}
let abaLoja = 'comprar';
function desenharLoja() {
  const e = estado.estado, cr = e.creditos;
  $('loja-creditos').textContent = `${cr} créditos`;
  document.querySelectorAll('#loja-abas [data-aba]').forEach(b => b.setAttribute('aria-selected', b.dataset.aba === abaLoja));
  let h = '';
  if (abaLoja === 'comprar') h = catalogo.loja.filter(k => !item(k).requer || estado.personagem.flags[item(k).requer]).map(k => { const d = item(k); return `<li><span><b>${esc(d.nome)}</b><small>${esc([TIPO[d.tipo], efeito(d), d.desc].filter(Boolean).join(' · '))}</small></span>
    ${EQUIPA.includes(d.tipo)
      ? `<button type="button" class="botao" data-loja="comprar" data-item="${esc(k)}" ${cr < d.compra ? 'disabled title="Faltam créditos"' : ''}>${d.compra} créditos</button>`
      : `<span class="acoes">${[1, 5, 10].map(n => `<button type="button" class="botao" data-loja="comprar" data-item="${esc(k)}" data-qtd="${n}" ${cr < d.compra * n ? 'disabled title="Faltam créditos"' : ''}>${n === 1 ? `${d.compra} créditos` : `${n} por ${d.compra * n}`}</button>`).join('')}</span>`}</li>`; }).join('');
  else if (abaLoja === 'vender') {
    const v = Object.entries(e.itens).filter(([k]) => item(k).venda);
    h = v.length ? v.map(([k, q]) => { const d = item(k); return `<li><span><b>${q} × ${esc(d.nome)}</b><small>${d.venda} créditos cada</small></span><span class="acoes">
      <button type="button" class="botao" data-loja="vender" data-item="${esc(k)}" data-qtd="1">Vender 1</button>
      ${q > 1 ? `<button type="button" class="botao" data-loja="vender" data-item="${esc(k)}" data-qtd="${q}">Vender tudo (+${q * d.venda})</button>` : ''}</span></li>`; }).join('')
      : '<li class="vazio">Nada de material pra vender. Sucata, tecido e peças vêm da rua.</li>';
    h += e.equipamento.filter(q => item(q.item).compra || item(q.item).valor).map(q => { const d = item(q.item), val = valorRevenda(q);
      return `<li><span><b>${esc(d.nome)}</b><small>${esc(TIPO[d.tipo] || '')} · condição ${q.condicao}%${q.equipado ? ' · equipado: tire na Mochila pra vender' : ''}</small></span>
      <button type="button" class="botao" data-loja="venderEquip" data-id="${esc(q.id)}" data-valor="${val}" data-nome="${esc(d.nome)}" ${q.equipado ? 'disabled' : ''}>Vender por ${val}</button></li>`; }).join('');
  } else if (abaLoja === 'reparar') {
    const g = e.equipamento.filter(q => q.condicao < 100);
    h = g.length ? g.map(q => { const custo = Math.ceil((100 - q.condicao) * (catalogo.reparoItens?.[q.item] || catalogo.reparoPorPonto)); return `<li><span><b>${esc(item(q.item).nome)}</b><small>Condição ${q.condicao}%${q.equipado ? ' · equipado' : ''}</small></span>
      <button type="button" class="botao" data-loja="reparar" data-id="${esc(q.id)}" ${cr < custo ? 'disabled title="Faltam créditos"' : ''}>Consertar por ${custo}</button></li>`; }).join('')
      : '<li class="vazio">Tudo inteiro. Equipamento gasto bate e protege menos, então volte depois das saídas.</li>';
  } else h = Object.entries(catalogo.receitas).map(([k, r]) => {
    const falta = r.requer && !estado.personagem.flags[r.requer] ? faltaFlag(r.requer) : '';
    const pode = !falta && Object.entries(r.gasta).every(([m, n]) => (e.itens[m] || 0) >= n), d = r.equip ? item(r.equip) : null;
    return `<li><span><b>${esc(r.nome)}</b>${d ? `<small>${esc([TIPO[d.tipo], efeito(d), d.desc].filter(Boolean).join(' · '))}</small>` : ''}<small>Gasta ${esc(Object.entries(r.gasta).map(([m, n]) => `${n} ${item(m).nome.toLowerCase()} (você tem ${e.itens[m] || 0})`).join(' e '))}</small>${falta ? `<small class="trava">${esc(falta)}</small>` : ''}</span>
      <button type="button" class="botao" data-loja="fabricar" data-receita="${esc(k)}" ${pode ? '' : 'disabled title="Falta material"'}>Fazer</button></li>`; }).join('');
  $('loja-lista').innerHTML = h;
}
function abrirLoja(aba) { abaLoja = aba || 'comprar'; $('loja-msg').textContent = ''; desenharLoja(); abrirPainel('loja', $('loja-abas').querySelector(`[data-aba="${abaLoja}"]`)); }
$('loja-abas').onclick = ev => { const b = ev.target.closest('[data-aba]'); if (!b) return; abaLoja = b.dataset.aba; $('loja-msg').textContent = ''; desenharLoja(); };
$('loja-lista').onclick = async ev => {
  const b = ev.target.closest('[data-loja]'); if (!b) return;
  const d = b.dataset;
  $('loja-msg').textContent = '';
  if ((d.loja === 'comprar' && !EQUIPA.includes(item(d.item).tipo)) || d.loja === 'vender') return lojaRapida(d);
  // vender equipamento não tem volta: pede um segundo clique
  if (d.loja === 'venderEquip' && vendaArmada !== d.id) { vendaArmada = d.id; b.textContent = 'Confirmar venda'; setTimeout(() => { if (vendaArmada === d.id) { vendaArmada = null; desenharLoja(); } }, 4000); return; }
  vendaArmada = null;
  const r = await pedir(b, $('loja-msg'), chave => api.loja({ acao: d.loja, chave, item: d.item, qtd: d.qtd ? +d.qtd : 1, id: d.id, receita: d.receita }));
  if (r && !r.erro) {
    $('loja-msg').textContent = d.loja === 'comprar' ? `${item(d.item).nome}: comprado.${['arma', 'protecao', 'mochila', 'ferramenta'].includes(item(d.item).tipo) ? ' Equipe na Mochila (I).' : ''}`
      : d.loja === 'venderEquip' ? `${d.nome}: vendido por ${r.total ?? d.valor} créditos.` : d.loja === 'vender' ? `Vendido por ${(+d.qtd) * item(d.item).venda} créditos.` : d.loja === 'reparar' ? 'Consertado.' : catalogo.receitas[d.receita]?.equip ? 'Feito na bancada. Equipe na Mochila (I).' : 'Feito na bancada.';
  }
  desenharLoja();
};

// ---------- caixas pro servidor (lootbox paga com créditos, entregue no Project Zomboid) ----------
let caixasInfo = null, caixaArmada = null;
const STATUS_CAIXA = { pendente: 'A caminho: entra no servidor pra receber', entregue: 'Entregue no servidor', recusado: 'Não entregue, créditos devolvidos', reembolsado: 'Prazo acabou, créditos devolvidos' };
const milhar = n => Number(n).toLocaleString('pt-BR');
function desenharCaixas() {
  const v = caixasInfo, cr = estado.estado.creditos;
  $('caixas-creditos').textContent = `${milhar(cr)} créditos`;
  if (!v) { $('caixas-lista').innerHTML = '<li class="vazio">Carregando…</li>'; return; }
  let aviso = '';
  if (!v.vinculado) aviso = 'Vincule seu sobrevivente do servidor antes: no site, abra Minha conta, pegue o código e, no jogo, clique com o botão direito no chão em "Vincular conta do site Prefeitura Z".';
  else if (!v.ligada) aviso = 'A entrega no servidor está desligada agora. Tente mais tarde.';
  else if (v.proximaEm) aviso = `Você já pegou ${v.porDia === 1 ? 'sua caixa' : 'suas caixas'} de hoje. A próxima libera ${quando(v.proximaEm)}.`;
  else aviso = `Vai para ${v.login}. Entra no servidor em até ${v.expiraDias} dias, senão os créditos voltam. Limite de ${v.porDia} por dia.`;
  $('caixas-aviso').textContent = aviso;
  const trava = !v.vinculado || !v.ligada || v.proximaEm;
  let h = v.caixas.map(c => `<li><span><b>${esc(c.nome)}</b><small>${esc(c.desc)}</small></span>
    <button type="button" class="botao" data-caixa="${esc(c.id)}" ${trava ? 'disabled' : cr < c.preco ? 'disabled title="Faltam créditos"' : ''}>${caixaArmada === c.id ? 'Confirmar compra' : `${milhar(c.preco)} créditos`}</button></li>`).join('');
  if (v.pedidos.length) h += `<li class="vazio">Seus pedidos</li>` + v.pedidos.map(p => `<li><span><b>${esc(p.item)}</b><small>${esc(STATUS_CAIXA[p.status] || p.status)} · ${quando(p.criado)}${p.motivo ? ' · ' + esc(p.motivo) : ''}</small></span><span>${milhar(p.preco)}</span></li>`).join('');
  $('caixas-lista').innerHTML = h;
}
async function abrirCaixas() {
  caixaArmada = null; $('caixas-msg').textContent = '';
  desenharCaixas(); abrirPainel('caixas');
  try { caixasInfo = await api.caixas(); } catch (e) { $('caixas-msg').textContent = e.message; }
  desenharCaixas();
}
$('caixas-lista').onclick = async ev => {
  const b = ev.target.closest('[data-caixa]'); if (!b) return;
  const id = b.dataset.caixa;
  $('caixas-msg').textContent = '';
  // gasto grande: pede um segundo clique
  if (caixaArmada !== id) { caixaArmada = id; desenharCaixas(); setTimeout(() => { if (caixaArmada === id) { caixaArmada = null; desenharCaixas(); } }, 4000); return; }
  caixaArmada = null;
  const r = await pedir(b, $('caixas-msg'), chave => api.comprarCaixa({ caixa: id, chave }));
  if (r && !r.erro) { if (r.caixas) caixasInfo = r.caixas; $('caixas-msg').textContent = 'Comprada! Ela chega no seu inventário do servidor em alguns minutos, com você online.'; }
  desenharCaixas();
};

// ---------- Bipe ----------
let feitosAntes = null;
function atualizarBipe() {
  const f = estado.personagem.flags || {};
  // objetivo que acabou de ser cumprido avisa uma vez
  for (const o of M.OBJETIVOS) if (!o.futuro && o.feito(f) && feitosAntes && !feitosAntes.has(o.id)) torrada(`Bipe: ${o.titulo} concluído`);
  feitosAntes = new Set(M.OBJETIVOS.filter(o => !o.futuro && o.feito(f)).map(o => o.id));
  const proximoCapitulo = f.mastim_vencido && M.OBJETIVOS.find(o => o.expansao && !o.feito(f));
  const atual = proximoCapitulo || M.OBJETIVOS.find(o => !o.feito(f));
  $('bipe-rotas').hidden = !!estado.expedicao || !f.contrato_visto;
  $('objetivo').innerHTML = atual ? `<span class="rotulo">Objetivo</span><b>${esc(atual.titulo)}</b><span>${esc(atual.texto)}</span>` : '';
  $('bipe-lista').innerHTML = M.OBJETIVOS.map(o => `<li class="${o.feito(f) ? 'feito' : o.futuro ? 'futuro' : ''}">
    <span class="estado">${o.feito(f) ? 'Concluído' : o.futuro ? 'Em breve' : 'Em andamento'}</span>
    <b>${o.expansao ? '' : esc(o.id) + ' · '}${esc(o.titulo)}</b><span>${esc(o.texto)}</span></li>`).join('');
}
function abrirBipe() { atualizarBipe(); abrirPainel('bipe'); }
$('btn-bipe').onclick = abrirBipe;
$('bipe-rotas').onclick = abrirRotas;

// ---------- ajuda e ajustes ----------
function abrirAjuda() { abrirPainel('ajuda'); }
$('btn-ajuda').onclick = abrirAjuda;
$('btn-ajuda-ok').onclick = () => { ajustes.viuAjuda = true; salvarAjustes(); fecharPainel(); };
$('btn-ajustes').onclick = () => { $('aj-reduzir').checked = !!ajustes.reduzir; $('aj-outros').checked = ajustes.verOutros !== false; $('aj-outros').closest('label').hidden = !api.bilhete; abrirPainel('ajustes'); };
$('aj-outros').onchange = e => { ajustes.verOutros = e.target.checked; salvarAjustes(); if (motor) { motor.outros = new Map(); ligarPresenca(); } };
$('aj-reduzir').onchange = e => { ajustes.reduzir = e.target.checked; salvarAjustes(); if (motor) motor.reduzir = ajustes.reduzir; };
$('aj-zoom-mais').onclick = () => motor?.mudarZoom(1);
$('aj-zoom-menos').onclick = () => motor?.mudarZoom(-1);
$('btn-sair').onclick = async () => { fecharPainel(true); presenca?.desligar(); presenca = null; motor?.parar(); motor = null; cena = null; await api.sair(); mostrar('tela-entrar'); };

// ---------- gestão ----------
const NOMES_PAPEL = { jogador: 'Jogador', suporte: 'Suporte', moderador: 'Moderador', administrador: 'Administrador', proprietario: 'Proprietário' };
const quando = s => new Date(s * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function abrirGestao() {
  abrirPainel('gestao');
  $('gestao-busca').hidden = !estado.permissoes.equipe;
  $('gestao-fichas').hidden = !estado.permissoes.equipe;
  $('gestao-audit-filtros').hidden = !estado.permissoes.equipe;
  await carregarEquipe();
}
$('btn-gestao').onclick = abrirGestao;
async function carregarEquipe() {
  $('gestao-equipe').innerHTML = '<li class="vazio">Carregando…</li>';
  try {
    const r = await api.equipe();
    $('gestao-equipe').innerHTML = r.equipe.length ? r.equipe.map(m => `<li><span><b>${esc(m.nome || m.discord_id)}</b><small>${esc(NOMES_PAPEL[m.papel])} · desde ${quando(m.criado)}</small></span></li>`).join('')
      : '<li class="vazio">Ninguém além de você tem papel na equipe ainda.</li>';
    if (estado.permissoes.equipe) { await carregarHistorico(); return; }
    $('gestao-auditoria').innerHTML = r.auditoria.length ? r.auditoria.map(a => `<li><span><b>${esc(a.ator_nome || a.ator)}</b> ${a.acao === 'conceder_papel' ? 'deu' : 'tirou'} ${esc(NOMES_PAPEL[a.acao === 'conceder_papel' ? a.depois : a.antes])} ${a.acao === 'conceder_papel' ? 'para' : 'de'} <b>${esc(a.alvo_nome || a.alvo)}</b><small>${quando(a.criado)} · ${esc(a.motivo)}</small></span></li>`).join('')
      : '<li class="vazio">Nenhuma mudança registrada.</li>';
  } catch (e) { $('gestao-equipe').innerHTML = `<li class="vazio erro">${esc(e.message)}</li>`; }
}
const ACOES_GESTAO = {
  xp: 'Ajustar XP ou nível', origem: 'Trocar Origem', curar: 'Curar ferimento', creditos: 'Ajustar créditos',
  equipamento: 'Adicionar equipamento', rota: 'Liberar rota para teste', suspender: 'Suspender conta',
  reativar: 'Reativar conta', conceder_papel: 'Conceder papel', revogar_papel: 'Revogar papel',
};
const exibirAuditoria = historico => historico.length ? historico.map(a => `<li><details>
  <summary><strong>${esc(ACOES_GESTAO[a.acao] || a.acao)}</strong> · ${esc(a.alvo_nome || a.alvo)}</summary>
  <small>${quando(a.criado)} · ${esc(a.ator_nome || a.ator)} → ${esc(a.alvo_nome || a.alvo)} (${esc(a.alvo)})</small>
  <small>${esc(a.motivo)}</small><p class="gestao-alteracao">Antes · ${esc(a.antes || '—')}</p><p class="gestao-alteracao">Depois · ${esc(a.depois || '—')}</p>
  </details></li>`).join('') : '<li class="vazio">Nenhuma operação para estes filtros.</li>';
$('gestao-audit-acao').innerHTML = '<option value="">Todas</option>' + Object.entries(ACOES_GESTAO)
  .map(([id, nome]) => `<option value="${id}">${nome}</option>`).join('');
async function carregarHistorico() {
  const lista = $('gestao-auditoria');
  lista.innerHTML = '<li class="vazio">Carregando…</li>';
  try {
    const r = await api.historico({ alvo: $('gestao-audit-alvo').value.trim(), acao: $('gestao-audit-acao').value });
    lista.innerHTML = exibirAuditoria(r.historico);
  } catch (e) { lista.innerHTML = `<li class="vazio erro">${esc(e.message)}</li>`; }
}
$('gestao-audit-filtrar').onclick = carregarHistorico;

let fichaGestao = null, versaoFicha = 0;
async function carregarFichaGestao(alvo) {
  const pedido = ++versaoFicha, box = $('gestao-ficha');
  fichaGestao = null;
  box.textContent = 'Carregando ficha…';
  try {
    const ficha = await api.ficha(alvo);
    if (pedido !== versaoFicha) return;
    const { conta, personagem: p, estado: e, expedicao: ex, proprio } = fichaGestao = ficha;
    const eq = e?.equipamento.filter(q => q.equipado).map(q => `${item(q.item).nome} (${q.condicao}%)`).join(' · ') || 'Nenhuma peça equipada';
    const progresso = Object.entries(p?.flags || {}).filter(([k, v]) => v && k !== 'ferido_ate').map(([k]) => k);
    box.innerHTML = `<h3>${esc(p?.nome || conta.nome || 'Conta')} · ${proprio ? 'Meu personagem' : 'Ficha da conta'}</h3>
      <p class="nota">ID ${esc(conta.discord_id)} · ${esc(conta.estado === 'sem_conta' ? 'Ainda não entrou no jogo' : conta.estado)}</p>
      ${p ? `<p>Nível <strong>${p.nivel}</strong> · ${fmt(p.xp)} XP · ${esc(nomeOrigem(p.origem))} · ${fmt(e.creditos)} créditos</p>
      <p>${esc(eq)}</p><p>${e.ferido ? 'Ferido até ' + quando(e.feridoAte) : 'Sem ferimentos'}</p>
      <details><summary>Progresso (${progresso.length})</summary><p class="gestao-progresso">${esc(progresso.join(' · ') || 'Sem etapas concluídas')}</p></details>` : '<p>Sem personagem.</p>'}
      ${ex ? `<p class="trava">Expedição ativa · ${esc(catalogo.rotas[ex.rota]?.nome || ex.rota)}. Operações liberadas após o retorno.</p>` : ''}
      ${(proprio && p) || !proprio ? `<form id="gestao-operacao" class="gestao-operacao">
        <label class="campo">Operação<select id="gestao-acao">${(proprio ? ['xp', 'origem', 'curar', 'creditos', 'equipamento', 'rota'] : [conta.estado === 'suspenso' ? 'reativar' : 'suspender']).map(k => `<option value="${k}">${ACOES_GESTAO[k]}</option>`).join('')}</select></label>
        <div id="gestao-valores" class="filtros-estoque"></div>
        <p class="nota" id="gestao-prever" aria-live="polite"></p>
        <label class="campo">Motivo<input id="gestao-operar-motivo" required minlength="3" maxlength="200"></label>
        <div class="acoes"><button type="submit" class="botao primario" ${ex ? 'disabled' : ''}>Revisar ação</button>
        <button type="button" class="botao" data-audit-conta>Histórico da conta</button></div>
        <div id="gestao-confirmar"></div>
      </form>` : ''}`;
    const form = $('gestao-operacao');
    if (form) {
      $('gestao-acao').onchange = desenharCamposGestao;
      form.onsubmit = e => { e.preventDefault(); confirmarGestao(); };
      form.oninput = e => {
        if (e.target.id === 'gestao-acao') return;
        if (e.target.id === 'gestao-xp-modo') desenharCamposGestao();
        else preverGestao();
      };
      desenharCamposGestao();
    }
    box.querySelector('select, details summary')?.focus();
  } catch (e) {
    if (pedido !== versaoFicha) return;
    box.textContent = '';
    $('gestao-ficha-msg').textContent = e.message;
  }
}
$('gestao-eu').onclick = () => { $('gestao-ficha-msg').textContent = ''; carregarFichaGestao(); };

function desenharCamposGestao() {
  const f = fichaGestao, acao = $('gestao-acao').value, box = $('gestao-valores'), p = f.personagem;
  const numero = (rotulo, id, v, max, min = 0) => `<label class="campo">${rotulo}<input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${v}" required></label>`;
  const selecao = (rotulo, id, ops) => `<label class="campo">${rotulo}<select id="${id}">${ops.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('')}</select></label>`;
  if (acao === 'xp') {
    const xp = $('gestao-xp-modo')?.value === 'xp';
    box.innerHTML = selecao('Entrada', 'gestao-xp-modo', [['nivel', 'Nível desejado'], ['xp', 'XP total']]) +
      (xp ? numero('XP total', 'gestao-valor', p.xp, f.limites.xp) : numero('Nível', 'gestao-valor', p.nivel, catalogo.xpNiveis.length, 1));
    $('gestao-xp-modo').value = xp ? 'xp' : 'nivel';
  } else if (acao === 'origem') box.innerHTML = selecao('Nova Origem', 'gestao-valor', Object.entries(catalogo.origens).filter(([k]) => k !== p.origem).map(([k,v]) => [k, nomeOrigem(k) + ' · ' + v]));
  else if (acao === 'creditos') box.innerHTML = numero('Novo saldo', 'gestao-valor', f.estado.creditos, f.limites.creditos);
  else if (acao === 'equipamento') box.innerHTML = selecao('Item', 'gestao-valor', Object.entries(catalogo.itens).filter(([, d]) => EQUIPA.includes(d.tipo)).map(([k, d]) => [k, d.nome]).sort((a,b) => a[1].localeCompare(b[1], 'pt-BR'))) + numero('Quantidade', 'gestao-qtd', 1, f.limites.quantidade, 1) + numero('Condição %', 'gestao-cond', 100, 100);
  else if (acao === 'rota') box.innerHTML = selecao('Rota', 'gestao-valor', Object.entries(catalogo.rotas).map(([k,r]) => [k, r.nome]));
  else box.replaceChildren();
  preverGestao();
}
function preverGestao() {
  const f = fichaGestao, a = $('gestao-acao').value, v = $('gestao-valor'), p = f.personagem;
  const corpo = { alvo: f.conta.discord_id, acao: a, versao: p?.versao };
  let txt = '';
  if (a === 'xp') {
    const xpDireto = $('gestao-xp-modo').value === 'xp', n = v.valueAsNumber;
    const xp = xpDireto ? n : catalogo.xpNiveis[n - 1];
    corpo[xpDireto ? 'xp' : 'nivel'] = n;
    txt = Number.isFinite(xp) && v.validity.valid
      ? `Nível ${p.nivel} → ${Math.max(1, catalogo.xpNiveis.filter(x => x <= xp).length)} · ${fmt(p.xp)} → ${fmt(xp)} XP total`
      : 'Informe um valor dentro do limite.';
  } else if (a === 'origem') { corpo.origem = v.value; txt = `${nomeOrigem(p.origem)} → ${nomeOrigem(v.value)}`; }
  else if (a === 'creditos') { corpo.creditos = v.valueAsNumber; corpo.saldo = f.estado.creditos; txt = `${fmt(corpo.saldo)} → ${fmt(corpo.creditos)} créditos`; }
  else if (a === 'equipamento') {
    corpo.item = v.value; corpo.qtd = $('gestao-qtd').valueAsNumber; corpo.condicao = $('gestao-cond').valueAsNumber;
    txt = `${corpo.qtd} × ${item(corpo.item).nome} a ${corpo.condicao}% de condição no armazém`;
  } else if (a === 'rota') {
    corpo.rota = v.value;
    const faltam = f.flagsRotas[v.value].filter(k => !p.flags[k]), nivel = catalogo.rotas[v.value].nivel;
    txt = `Flags a liberar: ${faltam.join(', ') || 'nenhuma pendente'}. A rota exige nível ${nivel}.`;
  } else if (a === 'curar') txt = 'Remover ferimento ativo.';
  else txt = a === 'suspender' ? 'Suspender acesso ao Depois da Queda para esta conta.' : 'Reativar acesso ao Depois da Queda para esta conta.';
  $('gestao-prever').textContent = txt;
  $('gestao-confirmar').replaceChildren();
  return { corpo, txt };
}
function confirmarGestao() {
  if (ocupado) return;
  const { corpo, txt } = preverGestao(), box = $('gestao-confirmar'), msg = $('gestao-ficha-msg');
  const motivo = $('gestao-operar-motivo').value.trim();
  if (motivo.length < 3) { msg.textContent = 'Escreva um motivo de pelo menos 3 caracteres.'; return; }
  box.innerHTML = `<p>${esc(txt)} · ID ${esc(corpo.alvo)}</p>
    <button type="button" class="botao primario">Confirmar operação</button> <button type="button" class="botao">Cancelar</button>`;
  const [sim, cancelar] = box.querySelectorAll('button');
  cancelar.onclick = () => { box.replaceChildren(); $('gestao-operacao').querySelector('[type="submit"]').focus(); };
  sim.onclick = async () => {
    msg.textContent = 'Salvando…';
    const r = await pedir(sim, msg, chave => api.operar({ ...corpo, motivo, confirmado: true, chave }));
    if (!r?.ok) return;
    const propria = fichaGestao?.proprio;
    if (propria) { try { absorver(await api.eu()); } catch {} }
    msg.textContent = 'Operação salva e registrada na auditoria.';
    $('gestao-audit-alvo').value = corpo.alvo;
    await Promise.all([carregarFichaGestao(corpo.alvo), carregarHistorico()]);
  };
  sim.focus();
}
$('gestao-ficha').onclick = e => {
  if (!e.target.closest('[data-audit-conta]') || !fichaGestao) return;
  $('gestao-audit-alvo').value = fichaGestao.conta.discord_id;
  $('gestao-audit-acao').value = '';
  carregarHistorico();
  $('gestao-audit-filtrar').focus();
};

let buscaT = 0;
$('gestao-q').oninput = () => { clearTimeout(buscaT); buscaT = setTimeout(buscarContas, 300); };
async function buscarContas() {
  const q = $('gestao-q').value.trim();
  if (q.length < 2) { $('gestao-resultados').innerHTML = ''; return; }
  try {
    const r = await api.contas(q);
    if (q !== $('gestao-q').value.trim()) return;
    $('gestao-resultados').innerHTML = r.contas.length ? r.contas.map(c => `<li data-alvo="${esc(c.discord_id)}" data-nome="${esc(c.nome || c.discord_id)}">
      <span><b>${esc(c.nome || 'Sem nome')}</b><small>${esc(c.personagem ? 'Personagem: ' + c.personagem : 'Sem personagem')} · ID ${esc(c.discord_id)} · ${esc(NOMES_PAPEL[c.papel])}</small></span>
      <button type="button" class="botao" data-ficha="${esc(c.discord_id)}">Ver ficha</button>
      ${c.papel === 'proprietario' ? '' : `<span class="acoes"><select aria-label="Papel"><option value="administrador">Administrador</option><option value="moderador">Moderador</option><option value="suporte">Suporte</option></select>
      <button type="button" data-acao="conceder">Dar papel</button>${c.papel !== 'jogador' ? '<button type="button" data-acao="revogar" class="perigo">Tirar acesso</button>' : ''}</span>`}</li>`).join('')
      : '<li class="vazio">Nenhuma conta com esse nome ou ID. A pessoa precisa ter entrado no site pelo menos uma vez.</li>';
  } catch (e) { $('gestao-resultados').innerHTML = `<li class="vazio erro">${esc(e.message)}</li>`; }
}
let armado = null;
$('gestao-resultados').onclick = async e => {
  const ficha = e.target.closest('[data-ficha]');
  if (ficha) { $('gestao-ficha-msg').textContent = ''; await carregarFichaGestao(ficha.dataset.ficha); return; }
  const b = e.target.closest('[data-acao]'); if (!b) return;
  const li = b.closest('li'), acao = b.dataset.acao, papel = li.querySelector('select').value;
  const motivo = $('gestao-motivo').value.trim();
  if (motivo.length < 3) { $('gestao-msg').textContent = 'Escreva o motivo antes. Ele fica na auditoria.'; $('gestao-motivo').focus(); return; }
  const chave = acao + li.dataset.alvo + papel;
  if (armado !== chave) {
    armado = chave;
    b.textContent = acao === 'conceder' ? `Confirmar: ${NOMES_PAPEL[papel]}` : 'Confirmar retirada';
    $('gestao-msg').textContent = `Clique de novo pra ${acao === 'conceder' ? `dar ${NOMES_PAPEL[papel]} para` : 'tirar o acesso de'} ${li.dataset.nome}.`;
    return;
  }
  armado = null; b.disabled = true;
  try {
    await api.papel({ alvo: li.dataset.alvo, papel, acao, motivo });
    $('gestao-msg').textContent = acao === 'conceder' ? `${li.dataset.nome} agora é ${NOMES_PAPEL[papel]}.` : `${li.dataset.nome} voltou a ser jogador.`;
    $('gestao-motivo').value = '';
    await Promise.all([carregarEquipe(), buscarContas()]);
  } catch (err) { $('gestao-msg').textContent = err.message; b.disabled = false; }
};

iniciar();
// o painel da expedição fica logo abaixo da ficha, que muda de altura (selo de cargo, objetivo, nome comprido)
function ajustarHudExp() {
  const topo = document.querySelector('.hud-topo'), hud = $('exp-hud');
  if (!topo || !hud) return;
  hud.style.top = matchMedia('(max-width: 760px)').matches ? '' : Math.round(topo.offsetTop + topo.offsetHeight + 8) + 'px';
}
if (window.ResizeObserver) new ResizeObserver(ajustarHudExp).observe(document.querySelector('.hud-topo'));
addEventListener('resize', ajustarHudExp);
})();
