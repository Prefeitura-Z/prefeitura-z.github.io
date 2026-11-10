# Cenário e mochila · revisão 1.3

Arte para o motor real do jogo de navegador. Não é uma imagem de cenário usada como fundo: cada peça é um PNG transparente separado, posicionado no mapa e ordenado com os personagens.

## Peças detalhadas

| ID | Uso | PNG final | Células do mapa |
|---|---|---|---|
| caixas | Caixas empilhadas da administração e rádio | 64 × 72 | 1 × 1 |
| bancada | Bancada da oficina do Wolf | 128 × 90 | 3 × 1 |
| mesaRadio | Mesa de rádio do Bashar | 128 × 110 | 3 × 1 |
| arvore | Árvores do abrigo e entorno | 112 × 164 | 1 × 1, copa ultrapassa a base |
| fogueira | Fogueira e equipamento de cozinha | 64 × 74 | 1 × 1 |
| carcaca | Carro disponível para sucateamento | 128 × 110 | 2 × 2 |
| barraca | Barraca de alojamento | 128 × 120 | 2 × 2 |
| tenda | Tenda do posto de saúde | 160 × 150 | 3 × 2 |
| beliche | Beliche do alojamento | 96 × 110 | 1 × 2 |
| inventario | Ícone de mochila | 48 × 48 | Ícone, sem objeto físico |

A mochila desta revisão é o ícone disponível na galeria e pronto para a futura interface de inventário; o sobrevivente também tem mochila desenhada em sua folha de poses. Não foi criado um sistema novo de inventário ou de troca visual de acessórios. As quatro roupas do jogador podem ser testadas na oficina, sem alterar uma conta.

Os muros continuam usando a geometria contínua da revisão 1.1, com textura e colisão próprias. Pisos e vários objetos secundários ainda usam a arte em código. Esta revisão cobre as peças listadas; ainda há trabalho para uniformizar todos os elementos do abrigo.

## Arquivos e origem

- `jogo/assets-src/props-v3/`: fontes PNG, prompts de cada peça e registro de importação.
- `jogo/assets/objetos/pixel-v3/`: nove sprites de cenário normalizados para o motor.
- `jogo/assets/icones/pixel-v3/inventario.png`: mochila com transparência.
- `jogo/assets/manifesto.json`: caminhos, dimensões, pivôs e bases lógicas.
- `scripts/importar-objetos.cjs`: recorte de transparência, normalização e exportação.
- `jogo/objetos-pixel.js`: carregamento e desenho dos PNGs em tempo de execução.

Gerados com ImageGen integrado, usando o sobrevivente aprovado como referência de estilo. Não foi usado CLI ou API com chave. Fontes copiadas para o projeto; o jogo não depende da pasta de imagens geradas do Codex. Os arquivos `*-prompt.txt` preservam o conjunto exato de prompts.

## Integração

Carregar os scripts nesta ordem: `mundo.js`, `arte.js`, `arte-v2.js`, `abrigo-refino.js`, `objetos-pixel.js`, `motor.js`, `app.js`. Aguardar `PZ.arte.carregarAssets()` antes de instanciar o motor. Copiar os PNGs e o manifesto junto dos scripts.

Cada objeto mantém a base sólida do mapa. A caixa de desenho usa a dimensão real do PNG, para não cortar copas, antenas ou estruturas. A substituição só se aplica a objetos do mesmo tipo e tamanho lógico declarado no manifesto.

A oficina em `jogo/arte.html` oferece visão geral pausada do abrigo, câmera seguindo o jogador, quatro roupas, caminhada e diálogos. Não chama a API de contas, não salva progresso e não concede itens.

## Teste da tela principal

Executar `node scripts/servir-jogo-teste.cjs` e abrir `http://127.0.0.1:8767/jogo/teste-interface.html`. O servidor entrega o mesmo `index.html`, `app.js`, motor e PNGs do jogo, com um perfil local temporário injetado somente nessa rota. Usa o suporte de demonstração que já existia no aplicativo. Todas as respostas ficam em memória; não acessa credenciais nem a API online.

Isso permite verificar a interface principal, entrada no abrigo, controles, câmera e diálogos com os arquivos finais. Não valida autenticação, banco, recompensas ou uma implantação pública. A rota normal `/jogo/` continua exigindo login. Não copiar a página de demonstração para produção: ela só é montada pelo servidor de QA local.
