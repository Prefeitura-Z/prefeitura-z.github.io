// Public snapshots arrive through the existing server-data workflow (~5 minutes).
export function visibleDrops(snapshot, now = Math.floor(Date.now() / 1000)) {
  if (!snapshot || !Number.isInteger(snapshot.geradoEm) || now < snapshot.geradoEm || now - snapshot.geradoEm > 900) return [];
  return (Array.isArray(snapshot.ativos) ? snapshot.ativos : []).slice(0, 2).filter(a =>
    Number.isInteger(a.x) && Number.isInteger(a.y) && a.x >= 0 && a.y >= 0 && a.x <= 100000 && a.y <= 100000 &&
    Number.isInteger(a.expiraEm) && a.expiraEm > now && a.expiraEm <= now + 86400);
}
export function initAirdrops({draw, w2s, ctx, addHit, halo, openPopup, esc, flyTo}) {
  let snapshot = null;
  const panel = document.createElement('section');
  panel.innerHTML = '<h3>AirDrops</h3><p class="hint">Localização pública · atualização a cada ~5 min.</p><ul class="airdrops-list"></ul>';
  document.getElementById('body').appendChild(panel);
  const list = panel.querySelector('ul');
  function update() {
    const drops = visibleDrops(snapshot);list.replaceChildren();
    if (!drops.length) {const li=document.createElement('li');const fresh=snapshot?.geradoEm && Date.now()/1000-snapshot.geradoEm<=900;li.textContent=fresh ? 'Nenhum AirDrop ativo nesta atualização.' : 'Aguardando dados atuais do servidor.';list.appendChild(li);}
    for (const a of drops) {
      const li=document.createElement('li');const b=document.createElement('button');
      b.textContent=`AirDrop · ${a.zona || 'Zona de lançamento'} · ${Math.ceil((a.expiraEm-Date.now()/1000)/60)} min`;
      b.onclick=()=>flyTo(a.x,a.y,2);li.appendChild(b);list.appendChild(li);
    }
    draw();
  }
  async function poll() {
    for (const url of [
      'https://api.github.com/repos/Prefeitura-Z/prefeitura-z.github.io/contents/dados.json?ref=dados',
      'https://raw.githubusercontent.com/Prefeitura-Z/prefeitura-z.github.io/dados/dados.json'
    ]) {
      try {
        const r=await fetch(url,{headers:{Accept:'application/vnd.github.raw+json'},cache:'no-store'});
        if (!r.ok) continue;
        const data=await r.json();snapshot=data.airdrops || null;update();return;
      } catch { /* try the next existing public data source */ }
    }
    update();
  }
  poll();setInterval(poll,60000);setInterval(update,15000);
  return {
    render() {
      for (const a of visibleDrops(snapshot)) {
        const [x,y]=w2s(a.x,a.y);
        ctx.save();ctx.fillStyle='#db8e22';ctx.strokeStyle='#36220c';ctx.lineWidth=2;
        ctx.fillRect(x-8,y-8,16,16);ctx.strokeRect(x-8,y-8,16,16);ctx.restore();
        halo('AirDrop',x+12,y+4,12,'#6b4a10',{align:'left'});
        addHit({type:'airdrop',a,x,y,r:16});
      }
    },
    open(a) {
      if (a.expiraEm <= Date.now()/1000) return;
      openPopup(`<small>AirDrop público</small><b>${esc(String(a.zona || 'Zona de lançamento'))}</b><small>X ${a.x} · Y ${a.y}<br>Expira ${new Date(a.expiraEm*1000).toLocaleTimeString('pt-BR')}<br>Dados publicados a cada ~5 min.</small>`,a.x,a.y);
    }
  };
}
