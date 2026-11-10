// Ícones usados pelos itens do catálogo e pelos controles existentes.
(() => {
'use strict';const A=window.PZ.arte;
A.arquivoIconeItem=id=>A.manifesto?.itens?.find(i=>i.id===id)?.arquivo||'icones/suprimentos.png';
for(const[id,nome]of [['btn-mochila','inventario']]){const b=document.getElementById(id);if(!b)continue;const im=document.createElement('img');im.src='assets/icones/'+nome+'.png';im.alt='';im.width=26;im.height=26;b.prepend(im);}
})();
