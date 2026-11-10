// Conta do site: login com Discord e compras com PRZcoins (API no Cloudflare Workers).
// Enquanto CONTA_API estiver vazio, o login fica escondido e a loja só mostra a vitrine.
const CONTA_API = '';

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
  async eu() {
    if (!this.ativo || !this.token()) return null;
    try { return await this.api('/me'); } catch { return null; }
  },
};

document.querySelectorAll('[data-conta]').forEach(a => { if (!Conta.ativo) a.hidden = true; });
