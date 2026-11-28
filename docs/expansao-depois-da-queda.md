# Depois da Queda · Expansão

## Prévia jogável

No Windows deste workspace, abra [a prévia local](http://127.0.0.1:8765/). Para iniciar em outra sessão com Node.js 24, execute o comando abaixo na raiz do repositório.

```powershell
node tools/previa-expansao.mjs
```

O navegador usa o Worker do jogo sobre um banco SQLite local. Cada perfil representa um personagem já salvo. O banco vive enquanto o processo roda. Reiniciar a prévia repõe os perfis de teste. O OAuth e a presença por WebSocket usam o Worker com as integrações configuradas e foram exercitados separadamente em Wrangler local conforme descrito abaixo.

| Perfil | Onde testar |
| --- | --- |
| Proprietário no nível 18 | **Gestão → Meu personagem**. Mude o nível ou XP, revise a Origem, adicione equipamento com condição e abra o histórico da conta. Use a busca para abrir a ficha do Recruta. |
| Veterano com XP acumulado | Abra a **Mochila** para conferir nível 35, 245.095 XP e equipamento anterior. Fale com **Bashar → Aceitar o chamado da subestação** e consulte as rotas com o guarda, com Bashar ou no Bipe. |
| Batedora de Knox no nível 60 | Aceite o chamado do Bashar para percorrer as 15 rotas com equipamento avançado. Ligue os sinais sonoros no painel da expedição. As rotas da campanha abrem na sequência dos contratos. |
| Recruta, Socorrista e Administrador | Confira armazém vazio, ferimento, filtros e restrições de Gestão. No Recruta, o Prefeito e o Wolf permitem repetir o início do jogo. |
| Proprietário, Veterano ou Batedora | **Prefeito → Ticket de Troca de Classe**. Revise preço e saldo, cancele para conferir que o saldo está intacto, compre o ticket e selecione outra Origem. Também é possível consultar o ticket no armazém. |

Teclas **I** para Mochila, **B** para Bipe e **G** para Gestão. Durante a expedição, a mochila mostra a ocupação de saque em tempo real. Equipar, tirar, usar consumíveis e efetivar a troca de Origem exigem voltar ao abrigo.

## Diagnóstico e referências

Base de implementação no commit `c842c6426bafeef1992a8d01ff935576172dca7e` da branch `main`. O site serve a interface estática de `jogo/`. O Worker controla sessão, personagem, conta, NPCs, permissões, inventário e expedições no D1. Regras puras ficam em `worker/src/regras.js`. A versão anterior somava XP total inclusive no nível 30. `nivelDe` limitava o nível calculado para a resposta. O campo `characters.nivel` não era a fonte do nível exibido.

O conjunto local de diagnóstico do Build 42.22 contém um registro de carregamento de **PrefeituraSilentHill** em `diagnostico-servidor-42.22/server-console.txt`. O arquivo `PSH_Config.lua` do mod traz o chamado da neblina e cita Anruisi e Falcon Ridge. Nos arquivos de **PrefeituraPasse**, `PB_Shared.lua` referencia PRZBlackoutPredators e `PB_Integrations.lua` reconhece as entidades Voláteis por `BP_IsVolatile` ou `BP_Volatile`. Esses arquivos fornecem referências da configuração local. A atividade dos Voláteis na instância atual e o estado de um save ativo do mapa não foram verificados.

As localizações da expansão são criações para o RPG do navegador. A arte isométrica, as silhuetas e os tons são produzidos pelo motor do jogo. A neblina, os avisos ambientais e o comportamento de caça usam referências de atmosfera, sem importar modelos, texturas ou sons do Project Zomboid ou dos mods.

| Faixa | Região e progressão |
| --- | --- |
| 31–40 | **Pátio da Subestação.** Relés do Pátio, Mapa da Rede, Energia para o Comando, Sala de Comando e Manutenção da Rede. O Vigia anuncia um golpe pesado com luz âmbar e um surto com luz azul. O malho e a placa da rede acompanham a primeira vitória. |
| 41–50 | **Bairro da Neblina.** Marcas do Eco, Última Ambulância, Quadro de Alarmes, Ala da Sirene e Arquivo de Frequências. Os Riscadores reforçam aliados. O Zelador muda de guarda e cadência com sirenes distintas. O caderno e a mochila silenciosa vêm com a primeira vitória. |
| 51–60 | **Reservatório de Knox.** Canal de Drenagem, Casa de Bombas, Túneis de Inspeção, Comporta da Matriarca e Vigília das Comportas. Rasantes emboscam, perseguem e recuam. Aos 50% de vida a Matriarca encurta a retirada. O selo e a lâmina acompanham a primeira vitória. |

Os três primeiros contratos de cada região dão um bônus de XP na primeira conclusão. Também ficam disponíveis para ronda após uma conclusão acompanhada e pagam 65% dos créditos de uma saída acompanhada. Cada primeira vitória abre uma rota recorrente separada que paga o valor integral por volta concluída. Os prêmios de chefe e troféus não entram em rondas. Os sinais de combate aparecem no roteiro do Worker e no relatório da saída.

## XP e preservação

Simulação do recálculo antes da implantação. Cada exemplo usa o mesmo XP nas duas colunas. Os desbloqueios continuam sujeitos às flags de contrato e às vitórias.

| XP total gravado | Limite anterior | Limite 60 |
| ---: | ---: | ---: |
| 57.938 | 18 | 18 |
| 219.495 | 30 | 30 |
| 224.295 | 30 | 31 |
| 245.095 | 30 | 35 |
| 274.695 | 30 | 40 |
| 341.895 | 30 | 50 |
| 421.095 | 30 | 60 |

Níveis 1–30 mantêm os limiares existentes. Acima de 30, cada próxima faixa tem um custo inicial maior e o XP necessário cresce dentro da faixa. XP excedente continua sendo acumulado no nível 60. A migração não regrava XP, Origem, aparência, créditos, itens nem flags. O Worker recalcula nível a partir de XP ao ler e grava o nível correspondente quando ajusta XP. Expedições acompanhadas já iniciadas fecham com o resultado serializado. Nas rondas antigas, o prêmio usa os totais gravados e o roteiro do combate da versão 8 foi conferido com um caso de referência.

## Balanço

O comando `node tools/simular-expansao.mjs` roda 400 sementes por configuração. As três colunas de conjunto usam equipamento comum, de bancada e com peça de chefe. Os valores abaixo seguem essa ordem. Créditos brutos incluem o valor de revenda do saque. Bônus de primeira conclusão e primeira vitória ficam fora da comparação.

| Nível e rota | Tempo médio em s | Sobrevivência | Vida final média | Desgaste médio arma/proteção | XP médio | Créditos brutos médios |
| --- | --- | --- | --- | --- | --- | --- |
| 18 · Entreposto | 54 / 53 / 53 | 100% / 100% / 100% | 88% / 93% / 91% | 5,8/3,8 em todos | 147 / 147 / 147 | 101 / 109 / 110 |
| 30 · Canil do Mastim | 89 / 89 / 87 | 98% / 100% / 100% | 38% / 46% / 51% | 5,7/3,8 · 5,8/3,8 · 5,8/3,8 | 444 / 487 / 487 | 189 / 245 / 245 |
| 31 · Relés do Pátio | 71 / 67 / 64 | 85% / 99% / 100% | 20% / 46% / 57% | 5,6/4 · 4,8/3,1 · 4,8/3 | 634 / 674 / 675 | 387 / 440 / 441 |
| 40 · Sala de Comando | 69 / 69 / 68 | 100% / 100% / 100% | 49% / 64% / 67% | 4,8/3 em todos | 880 / 880 / 880 | 676 / 712 / 711 |
| 50 · Ala da Sirene | 74 / 74 / 74 | 100% / 100% / 100% | 47% / 61% / 65% | 4,8/3 em todos | 1.300 / 1.300 / 1.300 | 1.305 / 1.285 / 1.284 |
| 60 · Comporta da Matriarca | 89 / 77 / 74 | 31% / 100% / 100% | 4% / 44% / 53% | 8,7/7,4 · 4,8/3 · 4,8/3 | 1.097 / 1.890 / 1.890 | 871 / 2.428 / 2.426 |

A mochila comum deixou parte dos ensaios do Canil sem conclusão apesar da sobrevivência. No início da expansão, o gancho do Mastim e o colete antigo de placas deram 100% de conclusão nas sementes usadas. Na Matriarca com equipamento de bancada, as cinco Origens completaram os 400 ensaios cada. Brigadista entrou com mais vida. Mecânico saiu com 4 pontos de desgaste de arma, frente a 5 das demais. Batedor e Socorrista terminaram em média com 45% de vida. Trabalhador teve capacidade 79, cinco espaços a mais.

| Ronda | Créditos líquidos/h | Horas de ronda para 1.250.000 créditos |
| --- | ---: | ---: |
| Canil do Mastim · nível 30 | 12.707 | 98,4 |
| Manutenção da Rede · nível 40 | 58.749 | 21,3 |
| Arquivo de Frequências · nível 50 | 94.442 | 13,2 |
| Vigília das Comportas · nível 60 | 170.716 | 7,3 |

As estimativas usam lotes de dez voltas, parada configurada para 50% de vida, condição inicial de 90%, venda de todos os materiais e desconto de kits e consertos. Uma estimativa para o fim de jogo é **7–13 horas de ronda**, conforme a rota seja Knox ou Neblina. O tempo de campanha, o custo de montar o conjunto inicial e os materiais guardados para fabricação aumentam o tempo até a compra. Os preços dos kits e das caixas do Prefeito seguem o catálogo anterior.

## Operações, migração e implantação

- `worker/src/expansao.js` reúne mapas lógicos, contratos, equipamentos, receitas, inimigos e marcos. `worker/src/regras.js` implementa o nível 60, efeitos dos itens, fases de combate e a versão **9**. `worker/src/expedicao.js` grava roteiro, resultados, estoque e recibos.
- `worker/src/gestao.js` usa a identidade do proprietário vinda de `OWNER_DISCORD_ID`. O proprietário pode ajustar a própria ficha. Pela busca pode consultar outra conta, suspender e reativar. O papel administrador continua com a visão de equipe. Os ajustes requerem confirmação, motivo e um alvo explícito. No teste de rota, a ficha informa as flags imediatas que serão liberadas e o nível permanece como pré-requisito.
- `worker/migrations/0001_expansao.sql` é aditiva. Cria `game_class_tickets`, garante um ticket pendente por personagem e indexa os filtros de auditoria. O recibo e os efeitos da compra ou do uso são gravados no mesmo lote D1. `TICKET_ORIGEM_PRECO` em `worker/wrangler.toml` aceita de 1.000.000 a 1.500.000 créditos.
- `jogo/areaExpansao.js`, `arte.js`, `motor.js` e `expedicao.js` entregam cenários, sinais e veículos. `jogo/app.js`, `mundo.js`, `index.html` e `jogo.css` integram personagem, diálogos, armazém, ticket e Gestão.
- A publicação da API aplica a migração depois do esquema base. A publicação em `main` dispara os deploys do Worker e do GitHub Pages. A prévia local permanece disponível para testes com os perfis de exemplo.

## O que foi verificado

- A suíte de 23 testes Node cobre a campanha e os 15 contratos, XP acumulado, vitória e derrota, loot único, recuo, mochila cheia, rondas, retomada e versão 8. Também cobre ticket concorrente e resgate único, ajuste de XP, Origem e equipamento, suspensão, reativação, autoria da auditoria, recusa para jogador e administrador, registro, loja do Wolf e caixas da ponte.
- Coordenadas de ida, volta e ronda foram amostradas nas três regiões com raio de 0,3 célula e confrontadas com objetos sólidos e água. Os sedãs, vans, picapes e caminhões foram renderizados nos dois eixos e nos quatro sentidos. Cinco carros dos mapas anteriores foram deslocados para desobstruir as travessias. O navegador foi testado no Chrome em desktop e perfil móvel com toque para mochila vazia e cheia, personagem ferido, peças equipadas, filtro, comparação, Gestão, ticket e expedição recarregada.
- Wrangler local executou a migração em D1 e rodou a API com dados representativos. Foram conferidos o redirecionamento OAuth, as sessões de teste, o ticket, a auditoria e a presença por WebSocket, incluindo o encerramento da conexão na suspensão.
- A validação com uma conta Discord e um personagem reais exige uma cópia autorizada e anonimizada dos dados de produção e um ambiente de homologação configurado com D1 e Discord. Nenhum desses recursos estava disponível neste workspace.
