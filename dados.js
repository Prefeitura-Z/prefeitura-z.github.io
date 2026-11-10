// Lê os dados do servidor publicados na branch "dados" (atualiza a cada ~5 min).
const DADOS_URL = (new URLSearchParams(location.search).get('dados'))
  || 'https://raw.githubusercontent.com/Prefeitura-Z/prefeitura-z.github.io/dados/dados.json';

async function carregarDados() {
  try {
    const r = await fetch(DADOS_URL + (DADOS_URL.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

const pad = n => String(n).padStart(2, '0');
function haQuanto(iso) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}
function servidorOnline(d) {
  // O servidor grava o status várias vezes por minuto; parado há mais de 15 min = offline.
  return !!(d && d.statusEm && (Date.now() - new Date(d.statusEm).getTime()) < 15 * 60000);
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
