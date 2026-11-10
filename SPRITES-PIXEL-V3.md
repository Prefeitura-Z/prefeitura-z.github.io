# Personagens — pixel art detalhada v3

Direção escolhida pelo usuário: pixel art detalhada, proporções humanas e leitura semelhante à referência de idle enviada, com personagens e roupas originais da Prefeitura Z.

## Mudança de produção

As bases principais passam a usar imagens raster desenhadas por ImageGen, recortadas e empacotadas para o motor, no lugar dos corpos geométricos do primeiro protótipo. A referência do Bashar determina cabelo e barba grisalhos, lenço e rádio. Wolf mantém bandana e avental, e o Prefeito mantém óculos e registro.

Conjunto desta entrega: **10 bases e 160 poses originais**. Inclui os três NPCs centrais, guarda, duas aparências de moradores e quatro roupas básicas do sobrevivente.

As poses inicialmente geradas com um braço extra foram rejeitadas e corrigidas. As versões finais substituem esses quadros. A revisão de anatomia é visual; os testes automáticos verificam recorte, alpha, coordenadas, diferenças entre poses e integração.

## Formato

- Fontes em `jogo/assets-src/pixel-v3/`, junto dos prompts e do registro de importação.
- Folhas usadas pelo jogo em `jogo/assets/personagens/pixel-v3/`.
- Cada folha tem 4 colunas × 4 linhas, total de **16 poses originais**.
- Linhas: SE, SW, NE, NW; as duas últimas mostram as costas.
- Colunas: repouso, passo esquerdo, passagem e passo direito.
- Atlas final: 192 × 320 px; células 48 × 80; pés em (24, 74).
- Recorte transparente, sem alteração da escala lógica nem das colisões do abrigo.
- Ciclo de caminhada usa três poses com tempos de exposição. Não se trata de oito desenhos diferentes de caminhada.
- Os estados internos mantêm 72 referências por personagem para compatibilidade com o motor. Isso não significa 72 poses originais por personagem.
- O estado `trabalha` usa repouso enquanto não existir uma animação de trabalho própria. Os demais estados continuam disponíveis para a API do motor.

## Integração

O exportador lê `registro.json` e só importa entradas marcadas para uso. O manifesto aponta para os atlas novos. `A.carregarAssets()` os carrega antes de criar os personagens, e a galeria oferece o PNG correto para download.

O exportador preserva a escala e o pivô, confere que cada figura cabe na célula e converte o alpha para borda de pixel art. Não desenha membros nem inventa novos movimentos.

Os nomes e a dica de interação foram reposicionados acima das cabeças. A área clicável e a oclusão acompanham a largura dos personagens novos.

## Personalização

Os quatro presets de roupa correspondem à base de sobrevivente com cabelo curto preto e aparência registrada no manifesto. Outras combinações de cabelo, pele ou corpo continuam preservadas pela geração anterior quando não há atlas equivalente. Expandir essas variantes com a mesma direção de arte é trabalho adicional; o pacote não afirma que todas as combinações já foram redesenhadas.

## Geração e verificação

Ferramenta de criação: **ImageGen integrado**, sem CLI de geração externa. Os prompts efetivamente usados estão ao lado das fontes. Não foram usados assets do Fab ou do Project Zomboid como entrada dessas imagens.

Reconstruir com `node scripts/exportar-arte.cjs` e verificar com `node scripts/verificar-arte.cjs`, com `@napi-rs/canvas` disponível conforme `ARTE-LEIA-ME.md`.

Abrir `jogo/arte.html` por servidor local para conferir as animações em quatro direções e a apresentação no próprio abrigo. A validação visual no navegador complementa os testes automáticos e não deve ser substituída pela contagem de frames.

A galeria permite selecionar cada direção e pausar a animação para inspecionar mãos, pernas e recortes sem depender de capturar um frame em movimento.
