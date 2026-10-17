# Arquitetura

Este documento explica como o projeto está organizado, por que cada decisão foi tomada e quais são os limites conhecidos. Instruções de uso estão no [README](./README.md).

## Estrutura

```
src/
  api/          contratos zod, cliente Axios, chaves de cache e funções por recurso
  app/          QueryClient, roteador e serialização da busca na URL
  components/   layout (header, footer, tab bar), ui (shadcn/ui) e componentes de NFT
  features/     uma pasta por domínio: auth, catalog, nft, favorites, cart, checkout, orders, account, realtime
  lib/          matemática de ETH, storage seguro, erros de formulário
  mocks/        API simulada: banco, regras de negócio, handlers REST, Socket.IO, cenários e painel
  routes/       rotas por arquivo do TanStack Router (_privado agrupa as rotas autenticadas)
e2e/            testes Playwright, helpers e imagens de referência
scripts/        automação do Lighthouse
lighthouse/     relatórios versionados
```

As pastas de `features/` concentram componentes, hooks e regras de cada domínio. `api/` não conhece React; `features/` não conhece o MSW. O mock só conversa com a aplicação pela rede (HTTP e WebSocket), exatamente como um back-end real, e a única ponte direta é `window.__kurioMocks`, usada pelo painel de cenários e pelos testes.

## Decisões

### Estado do servidor no TanStack Query, sem store global

Quase todo o estado é do servidor (catálogo, carrinho, perfil, pedidos), então ele mora no cache do TanStack Query, com chaves centralizadas em `api/query-keys.ts`. As chaves privadas incluem o `userId` (`['private', userId, ...]`), o que torna trivial descartar tudo de um usuário ao sair ou quando a sessão expira, e impede que dados de uma conta apareçam em outra.

O que não é do servidor fica em lugares pequenos e explícitos:

- sessão: `session-store.ts`, um store externo lido com `useSyncExternalStore`, persistido no `localStorage` e sincronizado entre abas pelo evento `storage`;
- id do carrinho de visitante: `guest-cart.ts`, no mesmo formato;
- filtros, busca, ordenação e página: na URL, validados por zod no TanStack Router. Isso dá link compartilhável, refresh e botão voltar de graça;
- rascunho do pagamento e tentativa de pedido em andamento: `localStorage`, para sobreviver ao refresh.

### TanStack Router

Rotas por arquivo com tipagem de parâmetros e de busca. `validateSearch` com `.catch(undefined)` faz parâmetros inválidos caírem para o padrão em vez de quebrar a página. O layout `_privado` verifica a sessão em `beforeLoad`, antes de renderizar, e manda para `/entrar?redirect=...`. O destino do redirecionamento passa por `safeRedirect`, que só aceita caminhos internos (evita open redirect como `//site-externo`).

### Contratos com zod

Cada resposta da API é validada em `apiRequest`. Uma resposta fora do contrato vira `ApiError` com código `INVALID_RESPONSE`, tratada como qualquer outro erro, em vez de propagar `undefined` pela interface. Os mesmos schemas validam os formulários (react-hook-form + zodResolver) e as regras do mock, então cliente e servidor simulado concordam sobre o que é válido. Erros de campo do servidor (`fields`) são aplicados nos inputs por `applyApiFieldErrors`.

zod roda em modo `jitless`: os validadores não são compilados com `new Function`, o que reduz o custo na inicialização e evita `unsafe-eval` se houver CSP.

### Axios e erros

Um único cliente com interceptors injeta o token e o id do carrinho de visitante e converte qualquer falha em `ApiError` com `code`, `status` e `fields`. `isTransient` (rede, timeout ou 5xx) decide o que pode ser repetido. O timeout padrão é 8 s.

### Dinheiro sem ponto flutuante

Preços trafegam como string decimal e todo cálculo (subtotal, desconto, taxa, comparação) é feito em wei com `BigInt` em `lib/eth.ts`. Exibição e cálculo são separados: `formatEth` só formata.

### Carrinho no servidor, inclusive para visitante

O visitante também tem carrinho no servidor (header `X-Cart-Id`). Assim existe uma única regra de negócio para limites, preços e cupons, o carrinho sobrevive ao refresh e a união no login é uma chamada (`/cart/merge`) em vez de uma reconciliação feita no cliente. Cada item guarda `acknowledgedPriceEth`; quando o preço atual diverge, o item fica `price_changed` e só volta a `ok` quando o usuário aceita.

O total exibido nunca é calculado na interface: vem da cotação (`/cart/quote`), cuja chave de cache inclui a versão do carrinho e a rede.

### Pagamento idempotente

1. A revisão congela a cotação e gera uma `Idempotency-Key` (UUID).
2. Antes do POST, a tentativa (chave, corpo e usuário) vai para o `localStorage`.
3. Em erro transitório o cliente repete com a mesma chave, até 3 vezes. O servidor devolve o pedido já criado para a mesma chave e recusa a mesma chave com corpo diferente (`IDEMPOTENCY_CONFLICT`).
4. Ao abrir `/pagamento` com uma tentativa salva, a página retoma: se já conhece o pedido, navega para ele; senão reenvia com a mesma chave.
5. O servidor revalida preço, disponibilidade e taxa contra a cotação. Divergência gera `QUOTE_OUTDATED` (pede nova confirmação com os valores atualizados) ou `AVAILABILITY_CONFLICT` (volta para o carrinho).

O botão de confirmar fica desabilitado enquanto o pedido está em voo, mas a garantia real é a chave: mesmo vários cliques no mesmo tick geram um único pedido (há teste para isso).

### Tempo real e reconciliação

`RealtimeBridge` mantém um único socket por aba e assina eventos privados com o token (`session.subscribe`), trocando a assinatura quando o usuário muda.

Regras para aplicar um evento (`event-tracker.ts` e `apply-events.ts`):

- `eventId` já visto é descartado (eventos duplicados);
- a versão precisa ser maior que a maior versão conhecida, considerando tanto eventos anteriores quanto o que veio do REST e está no cache (eventos antigos ou reordenados são descartados);
- o evento vira um patch no cache (detalhe, listagens e destaques), sem nova requisição;
- se o NFT está no carrinho, o carrinho é invalidado (o servidor recalcula status e cotação) e um aviso explica a mudança;
- `order.updated` só é aplicado ao dono do pedido e dispara a revalidação do pedido.

Na reconexão, catálogo, carrinho e dados privados são invalidados. O REST é a fonte de verdade: qualquer evento perdido durante a queda é recuperado pela próxima leitura. O recibo de pedido pendente ainda faz polling a cada 5 s como rede de segurança.

### API simulada no navegador

O MSW atende o REST pelo Service Worker e o Socket.IO interceptando o `WebSocket`. O "banco" (`mocks/db.ts`) fica no `localStorage`, com seed determinístico, e as regras de negócio ficam em `mocks/domain.ts` (estoque, cotação, liquidação de pedidos) e nos handlers. Os cenários alteram latência e injetam falhas sem tocar no código da aplicação.

A aplicação renderiza sem esperar o mock: `main.tsx` carrega o app e o MSW em paralelo, e `api/backend.ts` expõe uma promessa que o cliente HTTP e o socket aguardam antes da primeira chamada. Com `VITE_ENABLE_MOCKS=false` a promessa resolve na hora e nada do mock entra no carregamento.

O MSW importa `tough-cookie` (com `tldts`) para o seu cookie store. A API desta aplicação autentica por header `Bearer` e não usa cookies, então o build aponta `tough-cookie` para um stub mínimo (`mocks/shims/tough-cookie.ts`). Isso reduziu o chunk do mock de 147 KB para 26 KB gzip.

#### Limitações do `@mswjs/socket.io-binding`

- Só transporte `websocket`: o cliente é configurado com `transports: ['websocket']`, sem long-polling.
- Sem namespaces nem salas. A entrega para "o dono do pedido" é feita no mock, filtrando os clientes conectados pelo usuário da assinatura.
- O binding não implementa o heartbeat do Engine.IO, então o mock envia o ping (`2`) a cada 20 s para o cliente não encerrar a conexão por `pingTimeout`.
- O host `https://realtime.kurio.local` é fictício e só existe dentro do MSW. Em produção bastaria apontar `VITE_REALTIME_URL` para o servidor real.
- Uma conexão recusada fechada sem evento `error` deixa o socket.io esperando o timeout de conexão. O mock emite `error` antes de fechar, como o navegador faz numa recusa real, e o cliente usa `timeout: 5000` como defesa adicional.
- O binding está em versão 0.x e exige MSW 2 (não é compatível com MSW 3).

### Acessibilidade

- Link "Pular para o conteúdo", landmarks e headings em ordem; títulos de página por rota.
- Diálogos e painéis do Radix prendem o foco e fecham com Escape. Diálogos abertos programaticamente (zoom e revisão do pedido) devolvem o foco ao botão de origem explicitamente, porque não têm `DialogTrigger`.
- Regiões `aria-live` para contagem de resultados, quantidade, total, status do pedido e conexão em tempo real; skeletons marcados com `aria-busy`.
- Erros de formulário com `aria-invalid` e mensagem associada; o foco vai para o primeiro campo inválido.
- Botões só com ícone têm nome acessível; imagens decorativas usam `alt=""`.

## Movimento

As animações são todas em CSS (keyframes próprios em `index.css` e utilitários do `tw-animate-css`), sem biblioteca extra no bundle, e servem para dar retorno a uma ação ou mostrar uma mudança de estado:

- **Retorno de ação:** coração com "pop" ao favoritar (só quando o usuário clica, não no carregamento), contador do carrinho que pulsa quando muda, leve compressão de botões ao clicar, quantidade que desliza ao mudar.
- **Mudança de dado:** preço e total ganham um destaque breve quando o valor muda, o que torna visível uma atualização recebida pelo Socket.IO ou a aplicação de um cupom (`FlashOnChange`).
- **Hierarquia e descoberta:** cards sobem e revelam as ações no hover, sublinhado das abas e do menu cresce a partir do centro, itens do catálogo, do carrinho e dos favoritos entram em sequência, troca de destaque no hero e de imagem na galeria com fade.
- **Status:** recibo com ícone que "explode" ao confirmar ou recusar e pulso enquanto o pedido está pendente; aviso de reconexão desliza do topo.
- **Carregamento:** imagens surgem com fade sobre um fundo neutro, sem piscar; imagens prioritárias (LCP) aparecem sem transição para não atrasar a métrica.

- **Navegação:** cada página entra com um fade curto (250 ms, só opacidade).
- **Rolagem:** links para `#catalogo` (Mercado, Explorar, busca do header, atalhos de coleção) e `#favoritos` rolam suavemente, inclusive quando a URL já aponta para a âncora; a partir do tablet, um botão "Voltar ao topo" aparece depois de rolar e devolve o foco ao conteúdo.

Regras seguidas: os blocos animam apenas `opacity`, `translate` e `scale`, que não causam layout shift (os indicadores do carrossel mudam de largura dentro de um botão de tamanho fixo); a entrada de página é só opacidade, para não criar bloco de contenção para elementos `fixed`; o hover só existe em dispositivos com ponteiro; e `prefers-reduced-motion` desliga todas as animações. O Lighthouse foi refeito depois das animações e não houve regressão (o CLS do início no celular até caiu, porque os indicadores do hero passaram a reservar a altura durante o carregamento).

## Performance

Medido com Lighthouse CI (3 execuções, mediana; detalhes em [`lighthouse/RESUMO.md`](./lighthouse/RESUMO.md)):

| Perfil | Página | Antes | Depois | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Celular | Início | 74 | 80 | 4,2 s | 211 ms | 0,019 |
| Celular | Detalhe | 77 | 82 | 4,0 s | 114 ms | 0 |
| Desktop | Início | — | 99 | 1,0 s | 3 ms | 0 |
| Desktop | Detalhe | 89 | 99 | 0,9 s | 0 ms | 0 |

O que foi feito:

- aplicação e mock carregam em paralelo, e a interface renderiza antes do Service Worker estar pronto;
- stub de `tough-cookie` (−120 KB gzip no caminho crítico);
- tempo real e menu da conta carregados sob demanda (−25 KB gzip no chunk principal);
- blocos exclusivos de um tamanho de tela (header, rodapé, filtros laterais, destaque, promoções e blog no desktop; tab bar no celular) só são renderizados no tamanho em que aparecem, em vez de ficarem montados e escondidos por CSS (TBT no celular de 257 ms para 211 ms no início e de 156 ms para 114 ms no detalhe);
- zod sem JIT (TBT de 370 ms para 277 ms no início);
- skeleton do detalhe com a altura da tela, eliminando o salto do rodapé (CLS de 0,206 para 0 no desktop);
- imagens WebP em 320/640/960 com `srcset`/`sizes`, dimensões fixas e prioridade alta só para as imagens acima da dobra;
- divisão de código por rota (TanStack Router `autoCodeSplitting`).

Por que o celular ainda fica abaixo de 90: o elemento de LCP é a imagem do primeiro NFT, que só é conhecida depois que o MSW registra o Service Worker, inicializa o banco e responde à API dentro do próprio navegador. No perfil de celular do Lighthouse (4G lento e CPU 4× mais lenta), essa cadeia (JavaScript do app e do mock, registro do worker, resposta simulada e download da imagem) custa cerca de 1,5 s depois do FCP. Com uma API real, o código do mock sai do bundle e a resposta vem da rede em paralelo ao JavaScript. Próximos passos possíveis: pré-carregar a imagem principal a partir de dados do servidor (SSR ou `Link: preload` gerado no back-end) e trocar Axios por `fetch` para enxugar o bundle.

## Testes

- Playwright com dois projetos (desktop 1440 px e celular 390 px), servidor de produção (`build` + `preview`) e contexto isolado por teste. O cenário do mock é gravado no `localStorage` por `addInitScript` antes de a aplicação carregar.
- Os testes interagem pelo papel e nome acessível dos elementos (`getByRole`), o que também valida a semântica.
- Relógio controlado (`page.clock`) para a expiração de sessão e eventos disparados pelo controle do mock para tempo real e liquidação de pedidos; nada depende de `sleep` para acontecer.
- Regressão visual com `toHaveScreenshot` em dados determinísticos (seed fixa, toasts removidos, botão de cenários mascarado).
- Trace na primeira repetição e relatório HTML.

Os testes e o Lighthouse ajudaram a encontrar e corrigir quatro problemas reais: a revisão do pagamento reaproveitava uma cotação antiga depois de aceitar novos preços; a conexão em tempo real recusada só voltava a tentar depois de 20 s; os diálogos de zoom e de revisão mandavam o foco para o `body` ao fechar; e o rodapé do detalhe saltava quando o conteúdo carregava.

## Desvios do Figma

- **Busca visível no desktop:** o campo de busca do catálogo é exibido também no desktop, porque é a forma mais rápida de navegar pelos 45 itens; o ícone de busca do header leva até ele.
- **Rodapé oculto no celular:** a tab bar fixa já cobre a navegação, então o rodapé só aparece a partir do tablet.
- **Ícones de olho via lucide:** o botão de mostrar/ocultar senha usa `Eye`/`EyeOff` do lucide, no mesmo traço dos demais ícones, em vez de um asset próprio.
- **Labels do login como `sr-only`:** o layout do login usa só placeholder. Os labels existem para leitores de tela, mas ficam visualmente ocultos para respeitar o design.
- **Login social e páginas editoriais desativados:** o enunciado tira da entrega páginas editoriais, suporte, atividade, ofertas e downloads. "Continuar com Google/Facebook", "Criadores", "Aprenda", os artigos do blog e os links do rodapé sem destino aparecem como no design, levemente esmaecidos e marcados com `aria-disabled`; ao clicar, um aviso informa que a seção estará disponível em breve, sem aparentar sucesso nem levar a páginas vazias. "Lista de interesse" aponta para os favoritos, que existem.
- **Badges do catálogo:** no Figma as badges "Novo" e "Raro" aparecem em cards escolhidos para ilustrar o layout. Aqui "Novo" segue a mesma regra da aba "Novos lançamentos" (listado nos últimos 14 dias, `isNewRelease` em `mocks/fixtures/nfts.ts`), então o primeiro item de "Listados recentemente" sempre é "Novo" e todo item da aba tem a badge. "Raro" é editorial e só aparece em itens que não são novos.
- **Ícone de agradecimento do recibo:** o envelope "THANK YOU" da confirmação foi redesenhado em SVG (`ThankYouIcon` em `components/icons.tsx`) a partir do layout, já que o asset não pôde ser exportado do arquivo; o título "Compra confirmada!" fica disponível só para leitores de tela, como no design, que mostra apenas a frase de apoio.
- **NFT em destaque:** o card lateral ganhou margens internas iguais às do título, arte quadrada sem corte, nome e preço sobre a imagem e o botão "Ver oferta"; as bolhas decorativas que ficavam por cima da arte foram para o fundo.
- **Detalhe no tablet:** entre 768 e 1023 px a galeria fica acima das informações, em vez de lado a lado, para não cortar o texto nem os botões.

## Limitações conhecidas

- Não há back-end real; toda persistência é do `localStorage` do navegador.
- A recuperação de senha e o login social são apenas visuais.
- A transação na rede é simulada: o hash e o link para o Etherscan não existem de fato.
- Performance no celular abaixo da meta pelo motivo descrito acima.
