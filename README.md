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

## Jogo: jogadores online no abrigo

Quem está no abrigo vê os outros andando, com o nome do personagem (e a etiqueta Dono/Admin/Mod/Suporte quando tiver).
Isso roda numa sala em Durable Object (`worker/src/sala.js`, ligação `ABRIGO` no `wrangler.toml`), por WebSocket:

- O navegador pede um bilhete de 30 s em `POST /game/presenca/bilhete` (com a sessão) e abre `wss://…/game/presenca?b=…`.
- Só passam posição, direção e visual. O ID do Discord nunca vai pros outros jogadores. Não tem chat.
- O servidor limita ritmo, tamanho e velocidade das mensagens, e a mesma conta só fica conectada em um lugar por vez.
- `GET /game/publico` devolve só quantos estão no abrigo (usado na página inicial).
- Dá pra desligar em Ajustes → "Ver quem está no abrigo".

As áreas de fora do abrigo não têm presença: cada jogador sai sozinho.
