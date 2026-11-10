// Conta do site: login com Discord e compras com PRZcoins (API no Cloudflare Workers).
// Enquanto CONTA_API estiver vazio, o login fica escondido e a loja só mostra a vitrine.
const CONTA_API = 'https://prz-site.prefeituraz.workers.dev';

const Conta = {
  ativo: !!CONTA_API,
  token() { try { return localStorage.getItem('przToken') || ''; } catch { return ''; } },
  salvar(t) { try { t ? localStorage.setItem('przToken', t) : localStorage.removeItem('przToken'); } catch {} },
  entrar() { location.href = CONTA_API + '/auth/login'; },
  async api(caminho, opcoes = {}) {
    const t = this.token();
    const r = await fetch(CONTA_API + caminho, {
      ...opcoes,
      headers: { ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) this.salvar('');
    if (!r.ok) throw new Error(d.erro || 'Não deu certo. Tente de novo.');
    return d;
  },
  // Primeira chamada fica guardada (o topo e a página usam a mesma); eu(true) busca de novo.
  eu(novo) {
    if (!this.ativo || !this.token()) return Promise.resolve(null);
    if (!this._p || novo) this._p = this.api('/me').catch(() => null);
    return this._p;
  },
};

document.querySelectorAll('[data-conta]').forEach(a => { if (!Conta.ativo) a.hidden = true; });

// Mostra o nome/foto no botão "Minha conta" do topo quando a pessoa está logada.
Conta.topo = eu => {
  const a = document.getElementById('topo-conta');
  if (!a || !eu) return;
  const sp = a.querySelector('span');
  if (eu.avatar) a.querySelector('svg').outerHTML = `<img src="${esc(eu.avatar)}" alt="">`;
  if (sp) sp.textContent = eu.nome;
};

Conta.eu().then(Conta.topo);
