# Teste visual · 10/11/2026

## Resultado

Aprovados os testes locais de arte e motor desta revisão. A versão pública ainda não foi atualizada.

## Teste no navegador

- Oficina: nove peças detalhadas do cenário carregadas, visão geral, roupas Jaqueta e Colete alternadas dentro do abrigo, mochila visível na galeria de ícones.
- Interface principal: mesmo `index.html` e `app.js` do jogo, servidos com perfil temporário local, sem API. Entrada no abrigo, caminhada por teclado, direção do sprite, câmera, caminhada por clique até a central e diálogo do Bashar verificados.
- Diálogo do Bashar aberto por clique no personagem e reaberto pela tecla E; fechamento devolveu o foco ao jogo.
- Bancada do Wolf e retrato no diálogo conferidos na oficina, com caminhada automática até o NPC.
- A rota normal `/jogo/`, sem perfil de teste, apresentou a tela de login com Discord. Nenhuma conta ou permissão real foi alterada.
- Visão geral possui câmera fixa; voltar a acompanhar o jogador ou usar um destino retoma a câmera de caminhada.

## Verificação automatizada

`scripts/verificar-arte.cjs` passou com dez personagens, 160 poses originais, nove objetos raster detalhados, um ícone raster detalhado, 720 referências de quadro válidas, 70 PNGs principais válidos e 16 ícones transparentes. Oito caminhos e oito percursos simulados até NPCs passaram; 144 segmentos de parede contíguos e seis encontros foram conferidos.

Checks de sintaxe nos scripts alterados e `git diff --check` passaram.

## O que permanece pendente

Teste da nova arte no site público com login e conta reais, banco, salvamento e operações do servidor. A demonstração local da interface não substitui esse teste online.

A mochila é arte e ícone; a nova interface funcional de inventário ainda não foi criada. Vários objetos secundários ainda usam a arte em código. Os quatro presets detalhados do jogador não cobrem todas as combinações de corpo, cabelo e pele do editor; as demais combinações mantêm o desenho anterior.
