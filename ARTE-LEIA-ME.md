# Pacote de arte funcional — Depois da Queda

**Versão atual: 1.4, integrada à primeira fase.** Consulte `ENTREGA-VISUAL-1.4.md` para o conjunto atualizado, animação, itens, testes e preparação para Git. As seções de revisões anteriores abaixo preservam o histórico; seus totais e limites foram atualizados pela entrega 1.4.

## Revisão de cenário e equipamentos 1.3

Nove peças do abrigo e o ícone da mochila agora usam PNGs detalhados: caixas, bancada, mesa de rádio, árvores, fogueira, carro, barraca, tenda médica e beliche. São peças separadas integradas ao motor, com pivôs e caixas de desenho próprios. A oficina permite alternar entre quatro roupas do jogador e uma visão geral do abrigo. Ver `CENARIO-PIXEL-V3.md` para dimensões, fontes, prompts e limites desta revisão.

## Revisão de sprites 1.2

As dez bases de personagem foram refeitas em pixel art detalhada e importadas como atlas raster: Prefeito, Wolf, Bashar, guarda, dois moradores e quatro roupas de sobrevivente. São **160 poses originais**, organizadas em dez folhas de 16 poses. Os braços extras identificados nas poses iniciais dos NPCs foram corrigidos antes da integração.

Os nomes e a dica de interação ficam acima das cabeças. Os pés continuam ancorados no pivô original e a área clicável acompanha a silhueta nova. Ver `SPRITES-PIXEL-V3.md` para fontes, prompts, animações e limites de personalização.

O ciclo atual usa uma pose de repouso e três poses de marcha por direção. O estado de trabalho aguarda uma animação própria; não confundir as 72 referências de compatibilidade do motor com 72 desenhos distintos por personagem.

## Revisão do abrigo 1.1

Muros e paredes agora usam eixos e extremidades explícitos, encontros contínuos e textura de alvenaria alinhada entre segmentos. As placas acompanham a face da parede e não são escondidas pela ordenação das peças vizinhas. A colisão usa a espessura visível, sem bloquear toda a célula perto da alvenaria. O desenho é dividido em segmentos para corrigir sobreposição e transparência junto ao personagem.

Corrigida também a oscilação da caminhada automática quando um frame ultrapassava o destino de uma etapa da rota. Validação: 144 segmentos contíguos, seis encontros, colisão física e oito caminhadas completas, simuladas a 20 fps. Inspeção visual no navegador e visão geral em `jogo/assets/previa-abrigo.png`.

**Integração desta revisão:** incluir `abrigo-refino.js` depois de `arte-v2.js` e antes de `motor.js`, junto das versões atualizadas de `mundo.js` e `motor.js`. O comportamento novo depende desse conjunto de arquivos.

Entrega local de 10/11/2026 para o jogo da Prefeitura Z. O site público não foi publicado ou alterado por esta entrega.

## O que está entregue

- 10 folhas PNG detalhadas de personagens, cada uma com 16 poses em 4 direções, mapeadas aos estados compatíveis com o motor.
- Personagens: Prefeito, Wolf, Bashar, guarda, dois moradores e quatro roupas de sobrevivente.
- Dimensões preservadas do motor: quadro 48 × 80, pés em (24, 74).
- 16 ícones PNG de 48 × 48, com transparência, e atlas conjunto.
- 7 materiais de piso com 8 variantes cada, total de 56 tiles isométricos de 64 × 32.
- 36 exportações de objetos do cenário, incluindo o encontro de muro. Parte usa a arte existente com detalhes adicionais; não são 36 modelos inéditos.
- Retratos de diálogo de Prefeito, Wolf e Bashar num atlas de três colunas.
- Bashar corrigido conforme a imagem do usuário: cabelo e barba com grisalho, lenço estampado e rádio; aparência diferente do Wolf.
- Manifesto com coordenadas, quadros, duração, dimensões e pivôs.
- Renderizador que preserva personalização e gera as combinações não exportadas.
- Integração dos PNGs, dos retratos e dos ícones com os arquivos reais do jogo.
- Oficina navegável para testar caminhada, NPCs e animações sem chamar a API nem salvar progresso.

É o primeiro conjunto funcional de arte para o conteúdo atual. Não inclui ainda um catálogo completo de inimigos, armas, companheiros humanos ou cães. O ícone de cão não representa um animal jogável implementado.

## Abrir

Na raiz desta pasta, iniciar um servidor estático. Exemplo, se Python estiver disponível:

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8766/jogo/arte.html` para testar a arte com o motor real. `jogo/index.html` continua usando a autenticação original do site. A oficina é uma ferramenta visual separada, sem API de economia, equipe administrativa ou conta.

## Arquivos principais

- `jogo/arte-v2.js`: desenho original dos sprites, pisos, melhorias de objetos, ícones e carregamento dos atlas PNG.
- `jogo/abrigo-refino.js`: geometria, encaixe, textura contínua e desenho dos muros e paredes.
- `jogo/objetos-pixel.js`: sprites detalhados do cenário e ícone raster da mochila.
- `jogo/assets/`: PNGs exportados e `manifesto.json`.
- `jogo/assets-src/`: prompts dos retratos e referência autorizada pelo usuário para Bashar.
- `jogo/arte.html` e `jogo/oficina-arte.js`: oficina e prévia navegável.
- `scripts/exportar-arte.cjs`: gera os PNGs da mesma fonte usada no jogo.
- `scripts/verificar-arte.cjs`: verifica integração, transparência, coordenadas e acesso aos NPCs.
- `scripts/importar-pixel.cjs`: recorta as fontes aprovadas, normaliza escala e pivô e empacota os PNGs usados pelo jogo.

O exportador requer `@napi-rs/canvas`. Pode ser instalado como dependência de desenvolvimento, ou apontado pelo ambiente `PRZ_CANVAS_MODULE` para uma instalação disponível. O site servido não precisa de Node, Python ou biblioteca de canvas no navegador.

## Como integrar com trabalho do Claude

Esta pasta contém um checkout da versão pública do repositório. Comparar as alterações com a versão mais recente antes de copiar arquivos, especialmente `mundo.js`, `app.js` e `index.html`, para preservar trabalho concorrente.

Mudanças de integração: carregar `arte-v2.js`, `abrigo-refino.js` e `objetos-pixel.js`, nessa ordem, depois de `arte.js` e antes de `motor.js`; aguardar `A.carregarAssets()` antes de criar o motor; usar o atlas para os retratos; preservar a proporção quadrada do canvas de retrato. O backend, login, permissões e banco não foram reescritos.

As novas paredes possuem colisão correspondente e mantêm caminho até os NPCs. Os PNGs de objetos estão disponíveis para composição; o motor ainda desenha muitos objetos a partir do código-fonte, preservando suas variantes e luzes. Não confundir essas exportações com novos modelos 3D.

## Verificações executadas

- Validação das 720 referências de quadro do motor, preenchidas e sem pixels tocando a borda do recorte; as folhas detalhadas contêm 160 poses originais.
- Coordenadas de todos os quadros dentro dos respectivos atlas.
- 70 arquivos PNG principais com cabeçalho e dimensões válidos.
- Transparência e conteúdo nos 16 ícones.
- Atlas de retratos com três colunas quadradas.
- Oito trajetos válidos: acesso aos quatro NPCs a partir do portão e do pátio.
- Prévia aberta no navegador, caminhada por teclado, trajeto e diálogo com Bashar, Wolf e Prefeito, além das galerias de sprites/ícones.
- Checks de sintaxe JavaScript e `git diff --check`.

Não houve teste de login ou mutação de conta na versão local. O teste de arte não concede recompensas nem altera a conta real do jogador.

## Origem

Personagens, retratos, nove peças do cenário e mochila: ImageGen integrado, com prompts e fontes preservados. Demais ícones, pisos e materiais do abrigo: desenho em código, editável e exportável. Bashar usa a referência enviada pelo usuário. A cena conceitual produzida anteriormente não é usada como fundo interativo.

Os pacotes Cropout e Project Titan do Fab ainda não foram obtidos nem incorporados. Consultar `FAB-IMPORTACAO.md` para o estado dessa solicitação.
