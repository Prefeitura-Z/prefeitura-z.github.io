# Prefeitura Z — Mapa interativo de Knox County

Site estático (sem build). Para publicar no GitHub Pages:
Settings → Pages → Source: "Deploy from a branch" → branch `main`, pasta `/ (root)`.

`preview.jpg` é a imagem que aparece quando o link é colado no Discord.
A URL do `og:image` já aponta para https://sirrakx.github.io/mapa-prefeitura-z/preview.jpg.

## Abrir dentro do Discord (Activity)

O site já está pronto para rodar como Discord Activity: as fontes ficam no próprio site e,
quando aberto em `*.discordsays.com`, a página carrega `discord-sdk.js` (@discord/embedded-app-sdk 2.4.0)
e faz o handshake com o Discord. Fora do Discord nada muda.

No [Discord Developer Portal](https://discord.com/developers/applications):
1. New Application → nome "Mapa Prefeitura Z".
2. Activities → URL Mappings → Root Mapping: prefixo `/`, alvo `sirrakx.github.io/mapa-prefeitura-z`.
3. Activities → Settings → ligar "Enable Activities".
4. Installation → marcar "Guild Install" → copiar o Install Link e adicionar ao servidor.
5. No Discord: canal de voz → ícone de foguete (Activities) → "Mapa Prefeitura Z".
