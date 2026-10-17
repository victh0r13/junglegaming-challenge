# Kurio — marketplace de NFTs

Front-end do desafio técnico da Jungle Gaming: catálogo, detalhe, carrinho, pagamento com carteira, perfil do colecionador e atualizações em tempo real. Toda a API (REST e Socket.IO) é simulada no navegador com MSW, então o projeto roda sem back-end.

Decisões de arquitetura, trade-offs e desvios do Figma estão em [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

| Camada | Escolha |
| --- | --- |
| Build | Vite 8, TypeScript 6, pnpm |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix), lucide-react, sonner |
| Rotas | TanStack Router (rotas por arquivo em `src/routes`, busca tipada na URL) |
| Dados | TanStack Query 5, Axios, zod 4 (validação de contrato e formulários), react-hook-form |
| Tempo real | socket.io-client 4 |
| API simulada | MSW 2 + `@mswjs/socket.io-binding` |
| Testes | Playwright (desktop 1440 px e celular 390 px), Lighthouse CI |

## Como rodar

Requisitos: Node 22+ e pnpm 10+.

```bash
pnpm install
pnpm dev
```

A aplicação abre em `http://localhost:5173`. Para testar o build de produção:

```bash
pnpm build
pnpm preview
```

### Variáveis de ambiente

O arquivo `.env` é versionado com os valores da demonstração; `.env.example` documenta todas as variáveis.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST e Socket.IO simulados). Com `false`, a aplicação chama a API real. |
| `VITE_API_URL` | `/api` | Base das chamadas REST. |
| `VITE_REALTIME_URL` | `https://realtime.kurio.local` | Servidor Socket.IO. O host padrão é fictício e só existe dentro do MSW. |

### Credenciais de teste

| Usuário | E-mail | Senha | Particularidades |
| --- | --- | --- | --- |
| Ana Souza | `ana@kurio.dev` | `Kurio@2026` | 2 favoritos, carteira principal (MetaMask/Ethereum) e secundária (Coinbase/Polygon) |
| Bruno Lima | `bruno@kurio.dev` | `Kurio@2026` | Sem favoritos, apenas carteira principal |

Cupons: `KURIO10` (10%), `GENESIS25` (25%), `VERAO24` (expirado). Qualquer outro código é inválido.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Checagem de tipos (`tsc -b`) e build de produção |
| `pnpm preview` | Serve o build de produção |
| `pnpm typecheck` | Checagem de tipos de app, configs e testes |
| `pnpm lint` | oxlint |
| `pnpm test:e2e` | Suíte Playwright completa (faz o build e sobe o preview sozinha) |
| `pnpm test:e2e:ui` | Playwright em modo interativo |
| `pnpm test:e2e:update` | Regera as imagens de referência da regressão visual |
| `pnpm test:e2e:report` | Abre o último relatório HTML do Playwright |
| `pnpm lighthouse` | Build + Lighthouse CI em celular e desktop, gera `lighthouse/RESUMO.md` |

Na primeira execução do Playwright, instale o navegador com `pnpm exec playwright install chromium`. Se já existir um Chromium instalado, `PW_CHROMIUM_PATH=/caminho/do/chrome` faz o Playwright usá-lo. Para o Lighthouse, `CHROME_PATH` tem o mesmo papel.

## API simulada

### Cenários

O botão **Cenários** (canto inferior esquerdo) abre o painel de controle do mock. Também dá para escolher o cenário pela URL, em qualquer rota: `/?cenario=lento`. A escolha fica salva no `localStorage` até ser trocada.

| Cenário | Efeito |
| --- | --- |
| `padrao` | Tudo funciona com latência curta (180 ms leitura, 250 ms escrita) |
| `lento` | Todas as respostas levam 2,5 s (skeletons) |
| `latencia-variavel` | Atrasos entre 100 ms e 1,8 s com semente fixa |
| `fora-de-ordem` | Buscas antigas do catálogo respondem depois das novas |
| `offline` | Toda requisição falha por rede |
| `erro-servidor` | As 3 primeiras leituras do catálogo e do detalhe retornam 503 |
| `catalogo-vazio` | A listagem não retorna NFTs |
| `sessao-curta` | A sessão expira 30 s após o login |
| `falha-favoritos` | Favoritar e desfavoritar retornam 500 |
| `preco-alterado` | Na confirmação, o preço do primeiro item sobe 0,15 ETH |
| `edicao-esgotada` | Na confirmação, a edição do primeiro item esgota |
| `timeout-pedido` | O pedido é criado, mas a resposta chega depois do timeout do cliente (8 s) |
| `pagamento-recusado` | Os pedidos terminam recusados |
| `confirmacao-lenta` | Os pedidos ficam pendentes por 20 s |
| `carteira-recusada` | A carteira recusa a conexão |

### Ações e reset

O painel também tem ações pontuais: subir o preço do item do carrinho, esgotar a edição, derrubar a conexão em tempo real, confirmar pedidos pendentes, expirar sessões e **Restaurar dados iniciais** (recria o banco simulado, limpa sessão, carrinho de visitante e pedido pendente).

As mesmas ações existem no console em `window.__kurioMocks`, usado pelos testes:

```js
__kurioMocks.setScenario('lento')
__kurioMocks.updateEdition('golden-signal-160', '1-50', { priceEth: '0.55', available: 2 })
__kurioMocks.replayNftEvent(__kurioMocks.lastNftEvent('golden-signal-160'))
__kurioMocks.dropRealtime()
__kurioMocks.realtimeOutage(3000)
__kurioMocks.expireSessions()
__kurioMocks.settleOrder('ped_xxx')
__kurioMocks.pendingOrders()
await __kurioMocks.reset()
```

O banco simulado fica no `localStorage` (`kurio:mock-db`), então carrinho, pedidos e perfil sobrevivem ao refresh, como fariam com um servidor real.

### Reproduzindo as falhas

| Situação | Como reproduzir |
| --- | --- |
| Skeletons | `/?cenario=lento` |
| Erro e retry no catálogo | `/?cenario=erro-servidor` e clicar em **Tentar novamente** |
| Respostas fora de ordem | `/?cenario=fora-de-ordem` e digitar duas buscas seguidas |
| Rollback de favorito | Entrar, `?cenario=falha-favoritos` e favoritar um NFT |
| Sessão expirada | Entrar, abrir o painel e clicar em **Expirar sessões**, depois navegar |
| Preço mudando no carrinho | Item no carrinho e **Subir preço** no painel |
| Pedido idempotente após timeout | `?cenario=timeout-pedido` e confirmar a compra; recarregar durante o envio também retoma o mesmo pedido |
| Pedido pendente e reconexão | `?cenario=confirmacao-lenta`, confirmar, **Derrubar conexão** e depois **Confirmar pedidos pendentes** |
| Clique repetido | Clicar várias vezes em **Confirmar pagamento**: só um pedido é criado |

## Contratos

Todas as respostas passam por schemas zod em `src/api/contracts.ts`; uma resposta fora do contrato vira erro `INVALID_RESPONSE` em vez de quebrar a tela.

### REST

Autenticação por `Authorization: Bearer <token>`. O carrinho do visitante é identificado por `X-Cart-Id`. Erros seguem sempre o formato:

```json
{ "error": { "code": "COUPON_EXPIRED", "message": "Este cupom expirou.", "fields": { "code": "Cupom expirado." } } }
```

| Método e rota | Descrição |
| --- | --- |
| `GET /api/nfts` | Listagem com `busca`, `colecoes`, `redes`, `precoMin`, `precoMax`, `aba`, `ordem`, `pagina`, `porPagina`, `ids`, `excluir`; devolve itens, total, páginas e facetas |
| `GET /api/nfts/:id` | Detalhe com edições, galeria e avaliações |
| `GET /api/highlights` | Destaques do hero e NFT em destaque |
| `POST /api/auth/register` · `POST /api/auth/login` | Retornam `{ user, session }` |
| `GET /api/auth/session` · `POST /api/auth/logout` | Sessão atual e encerramento |
| `GET/PATCH /api/profile` | Perfil do colecionador |
| `PUT /api/profile/avatar` | Avatar em data URL (PNG, JPEG ou WebP) ou `null` para remover |
| `POST /api/profile/password` | Troca de senha; encerra as outras sessões |
| `GET /api/favorites` · `PUT/DELETE /api/favorites/:nftId` | Favoritos |
| `GET /api/cart` | Carrinho com status por item (`ok`, `price_changed`, `insufficient`, `sold_out`) |
| `POST /api/cart/items` · `PATCH/DELETE /api/cart/items/:itemId` | Itens e quantidades |
| `PUT/DELETE /api/cart/coupon` | Cupom |
| `POST /api/cart/acknowledge` | Aceita os preços atuais dos itens |
| `POST /api/cart/merge` | Une o carrinho do visitante ao da conta no login |
| `GET /api/cart/quote?network=` | Cotação com subtotal, desconto, taxa de rede, total, validade e pendências |
| `GET/POST /api/wallets` · `PATCH /api/wallets/:id` | Carteiras principal e secundária |
| `POST /api/wallets/:id/connect` · `/disconnect` | Conexão da carteira antes do pagamento |
| `POST /api/orders` | Cria o pedido; exige `Idempotency-Key` |
| `GET /api/orders/:id` | Status do pedido (`pending`, `confirmed`, `declined`) |

Valores em ETH trafegam como string decimal e são calculados em wei com `BigInt` (`src/lib/eth.ts`), sem ponto flutuante.

### Eventos Socket.IO

| Evento | Direção | Payload |
| --- | --- | --- |
| `session.subscribe` | cliente → servidor | `{ token }` para receber eventos privados |
| `session.unsubscribe` | cliente → servidor | Ao sair ou trocar de usuário |
| `session.subscribed` | servidor → cliente | `{ authenticated }` |
| `nft.updated` | servidor → todos | `{ eventId, type, resource: { type: 'nft', id }, version, occurredAt, data: { priceEth, available, editions[] } }` |
| `order.updated` | servidor → dono do pedido | `{ eventId, type, resource: { type: 'order', id }, version, occurredAt, data: { status, userId } }` |

## Comportamentos principais

### Sessão

- O token fica no `localStorage` e é enviado em toda requisição. Abas diferentes sincronizam login e logout pelo evento `storage`.
- Qualquer `401` com sessão ativa marca a sessão como expirada: o cache privado é descartado, aparece um aviso e, se a rota for privada, o usuário vai para `/entrar?motivo=expirada` com o endereço de retorno.
- Rotas privadas (`/perfil`, `/carteiras`, `/pagamento`, `/pedidos/:id`) redirecionam para o login antes de renderizar. O redirecionamento pós-login só aceita caminhos internos.
- Ao trocar de usuário, as consultas privadas e o carrinho em cache são removidos, então nada da conta anterior aparece.

### Carrinho

- Visitantes têm um carrinho no servidor identificado por `X-Cart-Id`; ele sobrevive ao refresh e é unido ao carrinho da conta no login, respeitando o limite por pedido.
- Cada item guarda o preço que o usuário aceitou. Se o preço mudar (por evento ou na leitura seguinte), o item fica marcado e a finalização é bloqueada até **Aceitar novos preços**. Esgotado ou estoque insuficiente também bloqueiam.
- O total vem sempre da cotação do servidor (`/cart/quote`), recalculada a cada mudança de versão do carrinho e de rede.

### Cache e retries

- `staleTime` de 30 s para listagens, 60 s para destaques, 5 min para a sessão; `refetchOnWindowFocus` ligado.
- Retry automático (até 2 vezes, backoff exponencial até 4 s) apenas para falhas transitórias: rede, timeout e 5xx. Erros 4xx nunca são repetidos, e mutações não têm retry automático.
- Listagens usam `placeholderData` para manter a página anterior durante a troca de filtros, e cada busca carrega sua chave completa, o que evita que uma resposta atrasada sobrescreva a mais recente.
- Favoritos usam atualização otimista com rollback em caso de erro.

### Pagamento e idempotência

- A revisão do pedido congela a cotação e gera uma `Idempotency-Key` própria. Clique repetido não cria pedidos duplicados: o botão trava e o servidor devolve o mesmo pedido para a mesma chave.
- Antes do envio, a tentativa é salva no `localStorage`. Em timeout, o cliente repete com a mesma chave; se a página for recarregada no meio, a tela de pagamento retoma a tentativa e leva ao pedido existente.
- Se preço, disponibilidade ou taxa mudarem entre a revisão e a confirmação, o servidor responde `QUOTE_OUTDATED` ou `AVAILABILITY_CONFLICT` e a interface pede nova confirmação com os valores atualizados.
- O recibo acompanha o pedido pendente por evento `order.updated`, com polling de 5 s como rede de segurança.

### Reconciliação REST × Socket.IO

- Todo recurso tem `version`. Eventos com `eventId` já visto ou com versão menor ou igual à conhecida (no cache REST ou em eventos anteriores) são ignorados.
- Eventos aplicam um patch no cache do TanStack Query (detalhe, listagens e destaques). Se o NFT está no carrinho, o carrinho é revalidado pela API e um aviso explica a mudança.
- Ao reconectar depois de uma queda, a aplicação invalida catálogo, carrinho e dados privados: o que se perdeu durante a desconexão é recuperado pela API REST, que é a fonte de verdade. Durante a queda, um aviso discreto informa que as atualizações em tempo real estão indisponíveis.

## Testes

A suíte Playwright (`e2e/`) roda cada teste em contexto isolado (banco simulado zerado e cenário definido antes do carregamento) nos projetos `desktop` (1440 × 900) e `mobile` (390 × 844). São 126 casos cobrindo:

- catálogo: busca, filtros, ordenação, paginação, histórico, página fora do intervalo, respostas fora de ordem, skeletons, erro com retry, vazio e offline;
- detalhe e 404;
- cadastro, login, redirecionamento seguro, persistência, expiração (inclusive por relógio controlado), logout e troca de usuário;
- favoritos com falha e rollback;
- carrinho: quantidade, remoção, cupons, persistência após refresh e união no login, mudança de preço e esgotamento;
- pagamento completo até o recibo, validação, rascunho após refresh, clique repetido, carteira recusada, pagamento recusado, timeout com o mesmo pedido, preço alterado e edição esgotada;
- perfil, avatar, senha e carteiras com erros de validação e do servidor;
- tempo real: preço e disponibilidade no detalhe e no pagamento, eventos duplicados e antigos, queda e reconciliação, pedido pendente após refresh e confirmação durante a desconexão;
- teclado e foco: link de pular conteúdo, diálogos com foco preso e retorno de foco, filtros e seleção de edição pelo teclado;
- regressão visual de início, detalhe, carrinho e pagamento.

As imagens de referência ficam em `e2e/__screenshots__` e foram geradas no Chromium em Linux; em outro sistema operacional, rode `pnpm test:e2e:update` antes da primeira comparação. Os retries do Playwright gravam trace (`trace: on-first-retry`).

## Lighthouse

`pnpm lighthouse` roda o Lighthouse CI três vezes por página (início e detalhe), em celular e desktop, e guarda a mediana em [`lighthouse/RESUMO.md`](./lighthouse/RESUMO.md), com os relatórios HTML/JSON da execução representativa em `lighthouse/mobile` e `lighthouse/desktop`.

Resultado mais recente (medianas):

| Perfil | Página | Perf. | A11y | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Celular | Início | 78 | 100 | 100 | 100 | 4,0 s | 0,033 | 277 ms |
| Celular | Detalhe | 81 | 100 | 100 | 100 | 4,0 s | 0 | 159 ms |
| Desktop | Início | 99 | 100 | 100 | 100 | 0,9 s | 0,001 | 9 ms |
| Desktop | Detalhe | 99 | 100 | 100 | 100 | 0,9 s | 0 | 0 ms |

Acessibilidade, boas práticas e SEO atingem a meta em todos os perfis, assim como a performance no desktop. A performance no celular fica abaixo de 90: o LCP depende de dados que só existem depois que o MSW sobe no navegador. A análise e o que já foi feito estão em [ARCHITECTURE.md](./ARCHITECTURE.md#performance).

## Deploy

O projeto está pronto para a Vercel: `vercel.json` reescreve qualquer rota para `index.html` (exceto `assets/` e `mockServiceWorker.js`), o que permite abrir e recarregar rotas profundas como `/nft/emerald-ape-042` ou `/pedidos/ped_xxx`. Build: `pnpm build`; diretório de saída: `dist`.
