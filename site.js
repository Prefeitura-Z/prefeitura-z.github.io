// Configuração do site. Troque o link de convite aqui quando tiver um permanente.
const SITE = {
  discord: '', // ex.: 'https://discord.gg/XXXXXXX'
};

// Mesmas facções do mapa (mapa/index.html).
const FACTIONS = [
  {id:'last_honest_man', name:'União da Margem',       street:'Marvin Pl', town:'Riverside',           x:6230,  y:5494,  color:'#236eb9'},
  {id:'muldraugh',       name:'Guarda da Sucata',      street:'Harris St', town:'Muldraugh',           x:10846, y:9533,  color:'#c81e19'},
  {id:'salvage_rites',   name:'Vigília do Crepúsculo', street:'Winter Dr', town:'Echo Creek (igreja)', x:3542,  y:11207, color:'#823caa'},
];

document.querySelectorAll('[data-discord]').forEach(a => {
  if (SITE.discord) { a.href = SITE.discord; }
  else { a.removeAttribute('target'); a.href = '#como-entrar'; a.title = 'Link do Discord em breve'; }
});

const box = document.getElementById('facs');
if (box) {
  for (const f of FACTIONS) {
    const d = document.createElement('div');
    d.className = 'fac'; d.style.setProperty('--c', f.color);
    d.innerHTML = `<img src="img/emb_${f.id}.png" alt="Brasão da ${f.name}">
      <h3>${f.name}</h3>
      <p class="where">Base: ${f.street} · ${f.town}</p>
      <p class="coords">X ${f.x} · Y ${f.y}</p>
      <a class="go" href="mapa/#${f.x},${f.y}">Ver no mapa →</a>`;
    box.appendChild(d);
  }
}
