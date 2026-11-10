# Prefeitura Z · arte integrada à primeira fase

Revisão de 10/11/2026. Base integrada: `origin/main` em `04ffbd0`, com a primeira área, expedições, estoque, oficina, combate e presença feitos pelo Claude. A integração mantém as regras e os endpoints dessa fase.

## Entregue

- Quatro folhas novas do jogador: jaqueta, moletom, colete e macacão. Cada uma contém quatro repousos, 32 poses de caminhada e 24 poses de ataque. Atlas de 384 × 960, células de 48 × 80 e pés em (24, 74).
- Oito poses de marcha por direção, com o ciclo selecionado pela distância percorrida. Parar encerra a marcha; girar mantém sua fase. O ritmo acompanha a velocidade do abrigo, da expedição e da presença remota.
- No conjunto de dez personagens há 336 poses originais usadas pelos atlas. As 816 referências de estados incluem repetições de repouso e trabalho; não representam 816 desenhos distintos.
- 21 PNGs de cenário detalhados, contando variantes de tamanho/orientação: as nove peças anteriores, mesa do Prefeito, cama, banco, quadro, guarita, gerador, tanque, sacos e variantes para carros da rua, banco curto e maca. Variantes de carro/maca reaproveitam a fonte existente, com orientação e tamanho declarados.
- Acabamento em código dos prédios da rua e objetos modulares: alvenaria, molduras, peitoris, portas, telhados, metal, armários, arquivos, estantes, pneus, postes, cercas e pequenos elementos.
- Onze materiais de piso com oito variantes cada: os sete do abrigo mais asfalto, calçada e duas orientações de faixa. O muro externo da primeira área também usa trechos contínuos.
- Dezenove novas fontes de ícones geradas, usadas em 30 entradas raster com reaproveitamentos. Todos os 15 itens do catálogo da fase têm imagem, além dos créditos. Os ícones aparecem na mochila, loja, fabricação, reparo e relatório; os controles mantêm rótulos e atalhos.
- Quatro visuais prontos disponíveis no criador de personagem. Selecioná-los preenche os campos de aparência já aceitos pelo servidor.
- Corrigido o retorno do relatório: o botão “Voltar pro abrigo” agora recria a cena do abrigo. Antes ele apenas fechava o painel e deixava a expedição parada na tela.

## Fontes, prompts e geração

ImageGen integrado, sem CLI ou chave de API. Fontes e prompts exatos em `jogo/assets-src/movimento-v4/` e `jogo/assets-src/props-v4/`. Os PNGs consumidos pelo jogo ficam em `jogo/assets/personagens/pixel-v4/`, `jogo/assets/objetos/pixel-v4/` e `jogo/assets/icones/`.

`scripts/importar-movimento.cjs` identifica as silhuetas completas antes de recortar: pontas de armas podem atravessar a divisão matemática de uma célula sem encostar na figura vizinha. O importador confere a contagem de figuras e não recorta braços ou armas nessa divisão. A folha de moletom recebeu uma edição específica de transparência pelo ImageGen; o prompt também foi preservado.

## Verificação

`scripts/verificar-arte.cjs` passou: dez personagens, 336 poses, 21 variantes raster do cenário, 816 referências válidas, oito percursos até NPCs, 144 segmentos de parede e seis encontros. As quatro folhas novas possuem oito desenhos distintos de marcha por direção.

`scripts/verificar-fase1.cjs` passou: 12 combinações de roupa/rota, 2.368 instantes renderizados, incluindo 1.704 estados de ataque. Usa o simulador e o catálogo reais de `worker/src/regras.js`. Verifica também os 15 itens, os quatro pisos da rua, a fase dos passos independente do fps e a compatibilidade da presença remota.

O teste de navegador usa a interface principal com perfil local temporário: mochila com ícones, guarda, seleção de rota, saída para a Rua de Cima, combate e retorno. O retorno corrigido foi conferido com nova caminhada no abrigo. Também foram abertas as listas de compra, reparo e fabricação do Wolf e selecionado o visual de colete no criador. As capturas ficam em `qa/`. Esse ambiente não chama a API online e não movimenta a conta do usuário. Compras, vendas, fabricação e equipamento estão bloqueados nessa prévia local; os arquivos normais do jogo mantêm a API original.

## Abrir e preparar para Git

Na raiz do projeto: `node scripts/servir-jogo-teste.cjs`. Abrir `http://127.0.0.1:8767/jogo/teste-interface.html`. A rota normal `/jogo/` continua pedindo login. O servidor de teste deve continuar apenas no computador local.

Para reconstruir os assets, executar `npm install` na raiz: `package.json` fixa `@napi-rs/canvas` em 0.1.100, a mesma versão usada nos testes. Executar `npm run assets:build`, `npm run verify:arte` e `npm run verify:fase1`. Também é possível chamar os scripts diretamente com Node e definir `PRZ_CANVAS_MODULE`. O ambiente usado aqui tem Node e a biblioteca já disponíveis, sem npm; por isso a validação foi executada diretamente pelos scripts.

Carregamento: `mundo.js`, `arte.js`, `arte-v2.js`, `abrigo-refino.js`, `objetos-pixel.js`, `cenario-detalhes.js`, `area.js`, `motor.js`, `expedicao.js`, `rede.js`, `icones-itens.js`, `app.js`. Os arquivos desta entrega já usam essa ordem. Não copiar somente os PNGs: carregamento, manifesto, pivôs, estados e renderizador são parte da integração.

As alterações estão preparadas na branch local `codex/arte-jogo-v1`. Antes de integrar com trabalho posterior do Claude, atualizar a branch e conferir os arquivos compartilhados, especialmente `app.js`, `index.html`, `motor.js` e `area.js`. O pacote inclui um patch binário relativo à base informada, para aplicar em um checkout compatível com `git apply --check` e depois `git apply`.

## Limites desta revisão

Os infectados ainda usam os sprites originais do Claude. Os ataques novos usam uma barra genérica; a aparência específica de cada arma ainda pede folhas próprias. As combinações de cabelo, pele e corpo fora dos quatro visuais prontos mantêm o renderizador anterior. O estado de trabalho ainda reaproveita o repouso. O cenário mistura as peças raster listadas com materiais e objetos em código.

Teste online com autenticação real, gravação no D1 e versão publicada permanece separado desta homologação local. Esta entrega não foi enviada ou publicada automaticamente no GitHub.
