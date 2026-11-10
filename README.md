# Prefeitura Z — site do servidor

- `index.html`, `site.css`, `site.js`: página inicial (Discord, como entrar pelo launcher, mapa, facções). O link do Discord fica em `site.js` (`SITE.discord`).
- `mapa/`: mapa interativo de Knox County. `mapa/#X,Y` abre o mapa já centralizado na coordenada.
- `jogo/`: **Prefeitura Z: Depois da Queda**, etapa 1 (prova visual do abrigo da União da Margem). Entra com a mesma conta do site (Discord); personagem e progresso ficam na API (`worker/src/jogo.js`, tabelas `characters`, `role_assignments`, `admin_audit`).

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
5. No Discord: canal de voz → ícone de foguete (Activities) → "Mapa Prefeitura Z"..

## Jogo: dono e equipe

O proprietário do jogo vem só do segredo `OWNER_DISCORD_ID` (o ID numérico da sua conta do Discord), nunca do primeiro cadastro.
Crie em Settings → Secrets and variables → Actions → `OWNER_DISCORD_ID`; o deploy da API grava no Worker.
O proprietário dá e tira os papéis administrador, moderador e suporte pelo painel Gestão (tecla G), sempre com motivo, e tudo fica na auditoria.

Para testar local: `wrangler dev` na pasta `worker` com `SITE=http://localhost:8765`, e abrir `http://localhost:8765/jogo/?api=http://localhost:8787` (o `?api=` só vale em localhost).
