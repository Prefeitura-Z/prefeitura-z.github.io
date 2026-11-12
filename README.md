# Prefeitura Z — site do servidor

- `index.html`, `site.css`, `site.js`: página inicial (Discord, como entrar pelo launcher, mapa, facções). O link do Discord fica em `site.js` (`SITE.discord`).
- `mapa/`: mapa interativo de Knox County. `mapa/#X,Y` abre o mapa já centralizado na coordenada.
- `jogo/`: **Prefeitura Z: Depois da Queda** (abrigo da União da Margem e a primeira área de fora, o Quarteirão da Entrada). Entra com a mesma conta do site (Discord); personagem e progresso ficam na API (`worker/src/jogo.js`, tabelas `characters`, `role_assignments`, `admin_audit`).

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
- Os jogadores só se veem no abrigo. Na rua cada um faz a sua expedição.

## Jogo: expedições, estoque e oficina

Quem decide tudo é o servidor (`worker/src/regras.js` tem as regras puras; `worker/src/expedicao.js` grava no D1):

- `POST /game/expedicao/iniciar` sorteia uma semente, simula a rota inteira na hora e guarda o resultado. O navegador recebe o roteiro e só desenha, pela hora do servidor. Recarregar a página continua do mesmo ponto.
- `POST /game/expedicao/concluir` (depois do fim) ou `/recuar` (antes) entrega o prêmio uma vez só: a expedição passa de `andamento` pra `premiando` e pra `encerrada` dentro do mesmo lote, e um índice único deixa só uma expedição ativa por personagem.
- Loja, bancada, reparo e curativo (`POST /game/loja`, `/game/usar`) usam recibo em `game_ledger`: cada clique manda uma `chave`, e o mesmo pedido repetido não cobra nem paga duas vezes.
- Créditos são moeda só do jogo, ganhos jogando. Não tem compra com dinheiro de verdade, troca entre jogadores nem PRZ Coins.
- **Farm** (`POST /game/expedicao/ronda`): numa rota já feita, o personagem fica na área por até 8 h, com o jogo aberto ou fechado. Ele não volta pro portão entre as voltas: cada volta começa onde a anterior acabou e os infectados reaparecem. O servidor decide na saída quantas voltas cabem e onde para (kit de campo, vida, equipamento, queda ou tempo). Em rota que gasta kit pra sair, um kit segura 10 voltas (a Rua de Cima não gasta kit nem no farm), só voltas inteiras rendem, kit não aberto volta pro armazém e o fechamento paga uma vez só.
- **Bancada do Wolf**: além de kit e curativo, faz equipamento com material da rua (lança de vergalhão, colete de placas, mochila cargueira, kit de desmonte). Equipamento sai um por vez, com recibo, e entra no armazém novo.
- **Barricada do Sul**: quarta rota, liberada depois de vencer o Porteiro, com o Inchado (infectado lento e resistente). Pede equipamento da bancada pra farmar com segurança.
- **Revenda** (`POST /game/loja` com `acao: venderEquip`): o Wolf recompra equipamento guardado por 30% do preço de loja, menos conforme a condição. Peça sem preço de loja não é vendida.
- Mudou algum número em `regras.js`? Suba `VERSAO`. Expedições em andamento terminam com o resultado que já estava guardado.

As áreas de fora do abrigo não têm presença: cada jogador sai sozinho.
