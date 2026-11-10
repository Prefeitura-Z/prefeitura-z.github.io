// Configuração do site. Troque o link de convite aqui quando tiver um permanente.
const SITE = {
  discord: 'https://discord.gg/QaEtPDbVpK',
};

// Mesmas facções do mapa (mapa/index.html).
const FACTIONS = [
  {id:'last_honest_man', name:'União da Margem',       street:'Marvin Pl', town:'Riverside',  x:6230,  y:5494},
  {id:'muldraugh',       name:'Guarda da Sucata',      street:'Harris St', town:'Muldraugh',  x:10846, y:9533},
  {id:'salvage_rites',   name:'Vigília do Crepúsculo', street:'Winter Dr', town:'Echo Creek', x:3542,  y:11207},
];

const ICONES = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1"/>',
  discord: '<path d="M7 5 5 4C2 8 1 13 2 17l4 2 2-3m8-11 3-1c3 4 4 9 3 13l-4 2-2-3M6 15c4 2 8 2 12 0M7 5c3-1 7-1 10 0"/><circle cx="8" cy="11" r="1"/><circle cx="16" cy="11" r="1"/>',
};
const icone = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || ''}</svg>`;

// Cabeçalho e rodapé iguais em todas as páginas.
(() => {
  const topo = document.getElementById('topo');
  if (topo) {
    const pg = topo.dataset.pagina;
    const link = (k, href, txt) => `<a href="${href}"${pg === k ? ' aria-current="page"' : ''}>${txt}</a>`;
    topo.className = 'site-header';
    topo.innerHTML = `<a class="brand" href="./" aria-label="Prefeitura Z, início"><img src="img/brasao.png" alt=""><span>PREFEITURA <b>Z</b><small>SERVIDOR DE PROJECT ZOMBOID</small></span></a>
      <nav aria-label="Navegação principal">${link('inicio', './', 'Início')}${link('mapa', 'mapa/', 'Mapa ' + icone('map'))}${link('loja', 'loja.html', 'Loja')}${link('ranking', 'ranking.html', 'Ranking')}${link('faccoes', './#faccoes', 'Facções')}</nav>
      <a class="account" id="topo-conta" href="conta.html" data-conta${pg === 'conta' ? ' aria-current="page"' : ''}>${icone('users')} <span>Minha conta</span> ${icone('chevron')}</a>`;
  }
  const rod = document.getElementById('rodape');
  if (rod) rod.innerHTML = `<span>PREFEITURA <b>Z</b><span class="footer-dash">/</span>A cidade continua.</span><small>Comunidade de Project Zomboid · Não afiliada à The Indie Stone.</small>`;
})();

document.querySelectorAll('[data-discord]').forEach(a => {
  if (SITE.discord) { a.href = SITE.discord; }
  else { a.removeAttribute('target'); a.href = '#como-entrar'; a.title = 'Link do Discord em breve'; }
});

const box = document.getElementById('facs');
if (box) {
  box.innerHTML = FACTIONS.map(f => `<a class="faction" href="mapa/#${f.x},${f.y}">
      <img src="img/emb_${f.id}.png" alt="Brasão da ${f.name}">
      <span><b>${f.name}</b><small>${f.town} · ${f.street}</small></span>${icone('arrow')}</a>`).join('');
}
