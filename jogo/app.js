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
  async bilhete() { return (await this.chamar('/game/presenca/bilhete', { method: 'POST' })).bilhete; },
  salaUrl: API.replace(/^http/, 'ws') + '/game/presenca',
  async sair() { try { await fetch(API + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + Token.ler() } }); } catch {} Token.salvar(''); },
  entrar() { location.href = API + '/auth/login?volta=jogo'; },
};

// ---------- telas ----------
const TELAS = ['tela-entrar', 'tela-carregando', 'tela-criar', 'tela-jogo'];
function mostrar(id) { for (const t of TELAS) $(t).hidden = t !== id; document.body.dataset.tela = id; }

let estado = null, motor = null;

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
  } catch (e) {
    if (e.status === 401) return mostrar('tela-entrar');
    $('carregando-msg').textContent = e.message;
    $('carregando-erro').hidden = false;
    return;
  }
  if (!estado.personagem) return abrirCriacao();
  entrarNoAbrigo();
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
  $('opcoes-origem').innerHTML = ORIGENS.map(([v, n, d]) => `<button type="button" class="origem" data-origem="${v}" aria-pressed="false"><b>${n}</b><small>${d}</small></button>`).join('');
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
    estado.personagem = r.personagem;
    entrarNoAbrigo(true);
  } catch (err) {
    $('criar-erro').textContent = err.message;
  } finally { criando = false; $('btn-criar').disabled = false; $('btn-criar').textContent = 'Entrar no abrigo'; }
};

// ---------- abrigo ----------
const ajustes = (() => { try { return JSON.parse(localStorage.getItem('pzAjustes') || '{}'); } catch { return {}; } })();
const salvarAjustes = () => { try { localStorage.setItem('pzAjustes', JSON.stringify(ajustes)); } catch {} };

function entrarNoAbrigo(novo) {
  mostrar('tela-jogo');
  const p = estado.personagem;
  $('hud-nome').textContent = p.nome;
  $('hud-sub').textContent = `Nível ${p.nivel} · ${ORIGENS.find(o => o[0] === p.origem)?.[1] || ''}`;
  $('hud-papel').hidden = estado.papel === 'jogador';
  $('hud-papel').textContent = { proprietario: 'Proprietário', administrador: 'Administrador', moderador: 'Moderador', suporte: 'Suporte' }[estado.papel] || '';
  $('btn-gestao').hidden = !estado.permissoes?.gestao;
  $('demo-aviso').hidden = !window.PZ_DEMO;
  if (motor) motor.parar();
  motor = new PZ.Motor($('cena'), M, {
    aparencia: p.aparencia, reduzir: !!ajustes.reduzir,
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
  $(painelAberto).hidden = true;
  painelAberto = null;
  motor?.pausar(false);
  if (!semFoco) $('cena').focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && painelAberto) { e.preventDefault(); fecharPainel(); return; }
  if ($('tela-jogo').hidden) return;
  const campo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (painelAberto === 'conversa' && !campo && /^[1-9]$/.test(e.key)) { const b = $('conversa-opcoes').querySelectorAll('button')[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } return; }
  if (painelAberto || campo) return;
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
  if (npc.local || op.local) return falar(op.local || '…');
  enviando = true; botao.disabled = true; botao.setAttribute('aria-busy', 'true');
  try {
    const r = await api.interagir(npc.id, op.id);
    const R = D.respostas[op.id] || {};
    if (r.flags) estado.personagem.flags = r.flags;
    if (r.erro) falar(r.erro, 'Tente de novo');
    else if (!r.ok) falar(r.motivo || 'Agora não.', 'Falta um passo antes');
    else if (r.novo) { falar(R.novo || R.ok || '…'); concluirObjetivos(); }
    else if (r.demo) falar(R.demo || '…', 'Serviço em construção nesta prova visual');
    else falar(R.ok || R.novo || '…');
    atualizarBipe();
  } catch (e) {
    falar(e.status === 401 ? 'Sua sessão do site acabou. Entre de novo pra continuar.' : e.message, 'Erro');
    if (e.status === 401) setTimeout(() => { fecharPainel(); presenca?.desligar(); motor?.parar(); mostrar('tela-entrar'); }, 1800);
  } finally { enviando = false; botao.disabled = false; botao.removeAttribute('aria-busy'); }
}

// ---------- Bipe ----------
let feitosAntes = null;
function concluirObjetivos() {
  const f = estado.personagem.flags || {};
  for (const o of M.OBJETIVOS) if (!o.futuro && o.feito(f) && feitosAntes && !feitosAntes.has(o.id)) torrada(`Bipe: ${o.titulo} concluído`);
}
function atualizarBipe() {
  const f = estado.personagem.flags || {};
  feitosAntes = new Set(M.OBJETIVOS.filter(o => !o.futuro && o.feito(f)).map(o => o.id));
  const atual = M.OBJETIVOS.find(o => !o.feito(f));
  $('objetivo').innerHTML = atual ? `<span class="rotulo">Objetivo · ${esc(atual.id)}</span><b>${esc(atual.titulo)}</b><span>${esc(atual.texto)}</span>` : '';
  $('bipe-lista').innerHTML = M.OBJETIVOS.map(o => `<li class="${o.feito(f) ? 'feito' : o.futuro ? 'futuro' : ''}">
    <span class="estado">${o.feito(f) ? 'Concluído' : o.futuro ? 'Em breve' : 'Em andamento'}</span>
    <b>${esc(o.id)} · ${esc(o.titulo)}</b><span>${esc(o.texto)}</span></li>`).join('');
}
function abrirBipe() { atualizarBipe(); abrirPainel('bipe'); }
$('btn-bipe').onclick = abrirBipe;

// ---------- ajuda e ajustes ----------
function abrirAjuda() { abrirPainel('ajuda'); }
$('btn-ajuda').onclick = abrirAjuda;
$('btn-ajuda-ok').onclick = () => { ajustes.viuAjuda = true; salvarAjustes(); fecharPainel(); };
$('btn-ajustes').onclick = () => { $('aj-reduzir').checked = !!ajustes.reduzir; $('aj-outros').checked = ajustes.verOutros !== false; $('aj-outros').closest('label').hidden = !api.bilhete; abrirPainel('ajustes'); };
$('aj-outros').onchange = e => { ajustes.verOutros = e.target.checked; salvarAjustes(); if (motor) { motor.outros = new Map(); ligarPresenca(); } };
$('aj-reduzir').onchange = e => { ajustes.reduzir = e.target.checked; salvarAjustes(); if (motor) motor.reduzir = ajustes.reduzir; };
$('aj-zoom-mais').onclick = () => motor?.mudarZoom(1);
$('aj-zoom-menos').onclick = () => motor?.mudarZoom(-1);
$('btn-sair').onclick = async () => { fecharPainel(true); presenca?.desligar(); presenca = null; motor?.parar(); motor = null; await api.sair(); mostrar('tela-entrar'); };

// ---------- gestão ----------
const NOMES_PAPEL = { jogador: 'Jogador', suporte: 'Suporte', moderador: 'Moderador', administrador: 'Administrador', proprietario: 'Proprietário' };
const quando = s => new Date(s * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function abrirGestao() {
  abrirPainel('gestao');
  $('gestao-busca').hidden = !estado.permissoes.equipe;
  await carregarEquipe();
}
$('btn-gestao').onclick = abrirGestao;
async function carregarEquipe() {
  $('gestao-equipe').innerHTML = '<li class="vazio">Carregando…</li>';
  try {
    const r = await api.equipe();
    $('gestao-equipe').innerHTML = r.equipe.length ? r.equipe.map(m => `<li><span><b>${esc(m.nome || m.discord_id)}</b><small>${esc(NOMES_PAPEL[m.papel])} · desde ${quando(m.criado)}</small></span></li>`).join('')
      : '<li class="vazio">Ninguém além de você tem papel na equipe ainda.</li>';
    $('gestao-auditoria').innerHTML = r.auditoria.length ? r.auditoria.map(a => `<li><span><b>${esc(a.ator_nome || a.ator)}</b> ${a.acao === 'conceder_papel' ? 'deu' : 'tirou'} ${esc(NOMES_PAPEL[a.acao === 'conceder_papel' ? a.depois : a.antes])} ${a.acao === 'conceder_papel' ? 'para' : 'de'} <b>${esc(a.alvo_nome || a.alvo)}</b><small>${quando(a.criado)} · ${esc(a.motivo)}</small></span></li>`).join('')
      : '<li class="vazio">Nenhuma mudança registrada.</li>';
  } catch (e) { $('gestao-equipe').innerHTML = `<li class="vazio erro">${esc(e.message)}</li>`; }
}
let buscaT = 0;
$('gestao-q').oninput = () => { clearTimeout(buscaT); buscaT = setTimeout(buscarContas, 300); };
async function buscarContas() {
  const q = $('gestao-q').value.trim();
  if (q.length < 2) { $('gestao-resultados').innerHTML = ''; return; }
  try {
    const r = await api.contas(q);
    $('gestao-resultados').innerHTML = r.contas.length ? r.contas.map(c => `<li data-alvo="${esc(c.discord_id)}" data-nome="${esc(c.nome || c.discord_id)}">
      <span><b>${esc(c.nome || 'Sem nome')}</b><small>${esc(c.personagem ? 'Personagem: ' + c.personagem : 'Sem personagem')} · ID ${esc(c.discord_id)} · ${esc(NOMES_PAPEL[c.papel])}</small></span>
      ${c.papel === 'proprietario' ? '' : `<span class="acoes"><select aria-label="Papel"><option value="administrador">Administrador</option><option value="moderador">Moderador</option><option value="suporte">Suporte</option></select>
      <button type="button" data-acao="conceder">Dar papel</button>${c.papel !== 'jogador' ? '<button type="button" data-acao="revogar" class="perigo">Tirar acesso</button>' : ''}</span>`}</li>`).join('')
      : '<li class="vazio">Nenhuma conta com esse nome ou ID. A pessoa precisa ter entrado no site pelo menos uma vez.</li>';
  } catch (e) { $('gestao-resultados').innerHTML = `<li class="vazio erro">${esc(e.message)}</li>`; }
}
let armado = null;
$('gestao-resultados').onclick = async e => {
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
})();
