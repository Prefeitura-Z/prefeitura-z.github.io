# Cropout e Project Titan — avaliação para o jogo

Consulta em 10/11/2026.

## Pacotes indicados pelo usuário

| Pacote | O que a página oferece | Aplicação possível |
|---|---|---|
| [Cropout Sample Project](https://www.fab.com/listings/bd733d81-7c29-44fe-b53f-65b14d06a9e2) | Projeto de estratégia/cultivo, gratuito, em formato Unreal Engine | Selecionar vegetação, objetos e estruturas simples após conferir os arquivos |
| [Project Titan](https://www.fab.com/listings/c05aac82-4c1a-4e42-96b3-be668dc40fca) | Projeto de mundo aberto, gratuito, em formato Unreal Engine | Selecionar pequenos conjuntos de cenário que combinem com o abrigo |

As páginas não fornecem um pacote pronto de sprites para Canvas 2D. Os arquivos reais ainda não foram baixados. Portanto, não se afirma que um item específico foi encontrado dentro dos projetos.

## Navegador

O navegador não impede usar arte derivada de modelos 3D. Para preservar o motor 2D atual, a opção técnica é renderizar objetos ou animações em câmera ortográfica, com projeção e escala consistentes, e exportar imagens transparentes mais metadados.

O navegador recebe os atlas resultantes. Não precisa carregar o mapa completo, os Blueprints ou os arquivos `.uasset`.

Migrar o jogo para 3D WebGL é outra decisão de produto e arquitetura; estes links, sozinhos, não exigem essa migração.

## Estado do acesso

O usuário informou que ainda não baixou os projetos. Ao tentar adicionar Cropout à biblioteca, o Fab encaminhou para login da Epic. Nenhum pacote foi adicionado à conta, baixado ou integrado durante esta etapa.

Para seguir, é necessário obter acesso autenticado à biblioteca e aos arquivos disponibilizados pelo Launcher/Fab. Não aceitar novos termos em nome do usuário sem a confirmação exigida para essa ação.

## Licença a confirmar

As duas páginas públicas exibiram o campo de licença sem informação conclusiva. Não tratar o formato Unreal Engine como prova de exclusividade de licença, nem presumir Fab Standard só porque o produto está no Fab.

A [síntese oficial da Fab Standard License](https://www.fab.com/eula) admite ferramentas compatíveis e uso comercial, quando essa for a licença aplicável à aquisição. O [Epic Content License Agreement](https://www.unrealengine.com/eula/content) também contempla conteúdo marcado UE-Only. É preciso registrar qual licença se aplica a estes downloads específicos antes da integração.

Ambos os anúncios marcaram “Permite uso com IA: Não”. Manter seus assets fora dos inputs da geração de imagens e seguir uma cadeia de renderização convencional, observando a licença aplicável. A arte original gerada nesta entrega não utilizou esses pacotes como entrada.

## Primeiro teste depois de obter os arquivos

1. Inventariar os assets e suas dependências, sem importar o projeto inteiro no navegador.
2. Escolher um objeto pequeno que combine com o abrigo.
3. Conferir a licença aplicável e registrar a origem.
4. Renderizar uma vista ortográfica com fundo transparente e iluminação consistente.
5. Ajustar a escala ao piso 64 × 32 e registrar pivô e ocupação lógica.
6. Inserir esse objeto no abrigo e testar colisão, profundidade e oclusão.
7. Somente depois ampliar a conversão para o conjunto aprovado.

Os personagens originais da Prefeitura Z, especialmente o Bashar da referência enviada, permanecem a base da identidade visual.

## Fontes

- As duas páginas oficiais dos pacotes, vinculadas na tabela.
- [Fab — aquisição e download](https://dev.epicgames.com/documentation/en-us/fab/purchasing-and-downloading-assets-in-fab).
- [Fab Standard License](https://www.fab.com/eula).
- [Epic Content License Agreement](https://www.unrealengine.com/eula/content).
