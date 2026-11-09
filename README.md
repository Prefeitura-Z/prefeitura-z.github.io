# Prefeitura Z — site do servidor

- `index.html`, `site.css`, `site.js`: página inicial (Discord, como entrar pelo launcher, mapa, facções). O link do Discord fica em `site.js` (`SITE.discord`).
- `mapa/`: mapa interativo de Knox County. `mapa/#X,Y` abre o mapa já centralizado na coordenada.

Site estático (sem build). Para publicar no GitHub Pages:
Settings → Pages → Source: "Deploy from a branch" → branch `main`, pasta `/ (root)`.

`mapa/preview.jpg` e `img/preview-mapa.jpg` são as imagens que aparece quando o link é colado no Discord.
A URL do `og:image` já aponta para https://prefeitura-z.github.io/mapa/preview.jpg.

## Abrir dentro do Discord (Activity)

O site já está pronto para rodar como Discord Activity: as fontes ficam no próprio site e,
quando aberto em `*.discordsays.com`, a página carrega `discord-sdk.js` (@discord/embedded-app-sdk 2.4.0)
e faz o handshake com o Discord. Fora do Discord nada muda.

No [Discord Developer Portal](https://discord.com/developers/applications):
1. New Application → nome "Mapa Prefeitura Z".
2. Activities → URL Mappings → Root Mapping: prefixo `/`, alvo `prefeitura-z.github.io/mapa`.
3. Activities → Settings → ligar "Enable Activities".
4. Installation → marcar "Guild Install" → copiar o Install Link e adicionar ao servidor.
5. No Discord: canal de voz → ícone de foguete (Activities) → "Mapa Prefeitura Z".
