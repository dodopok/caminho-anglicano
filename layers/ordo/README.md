# Portal do Ordo

Painel administrativo do Ofício Divino, alimentado pela API em `api.oficio.app`.
O dashboard consome o contrato novo de `GET /api/v1/dashboard`, preserva o envelope `period/sections/data` e carrega cada grupo de métricas sob demanda.

## Acesso e configuração

Configure no `.env`:

```env
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NUXT_PUBLIC_ORDO_API_BASE_URL=https://api.oficio.app
```

O login usa Google Sign-In do Firebase. Cada requisição administrativa envia:

```http
Authorization: Bearer <firebase-id-token>
Accept: application/json
```

Se a API retornar `401` (`AUTHENTICATION_REQUIRED` ou `AUTHENTICATION_FAILED`), o cliente encerra a sessão Firebase local, limpa o usuário e redireciona para `/portal-do-ordo/login`. Um `403` (`ADMIN_ACCESS_REQUIRED`) permanece como erro de autorização, sem fingir que a sessão expirou.

## Identidade

O portal usa a identidade do Ordo, a mesma do app, do site (oficio.app) e do Ordo Web: tinta marinho `#0D2744` no lugar do preto, um único azul de ação `#1754CF`, papel quente, ouro para o que espera alguém, Playfair Display nos títulos e números, Raleway na interface e EB Garamond no texto das orações. Tudo está em `assets/portal.css`, preso a `.ordo-shell` (e `.ordo-login`) para não vazar para o resto do site.

A cor litúrgica do dia (seção `liturgical_today`) vira o acento do portal, como a barra de tempo do app: o marcador da aba ativa, o selo do tempo no topo e o cartão "Hoje no calendário" no trilho. `utils/liturgical.ts` traduz a cor da API para a paleta.

Os ícones são de traço (`components/ordo/Icon.vue`), no lugar dos glifos Unicode que o painel usava. Os códigos dos livros (`loc_2015`) aparecem como badge ao lado do nome (`LocBadge.vue`).

## O que o painel cobre

A navegação separa **Leitura** (Visão geral, Pessoas & hábito, Prática & conteúdo, Negócio & API, Uso) de **Cuidado** (Operação e Áudio), com contadores em tudo que espera alguém. Cada número diz se é do período escolhido ou da base total (`ScopeTag.vue`), e o período aplica ao clicar (`PeriodPicker.vue`, `utils/period.ts`). Períodos longos (12 meses, desde sempre ou mais de 120 dias) são agrupados por mês.

- **Visão geral**: a faixa "Pede uma decisão" (rosários na fila e previsão de quando ela zera, tentativas de narração, tarefas de áudio travadas, chaves vencendo, regras de vida novas), pessoas na base, quem rezou, núcleo fiel (4 ou mais dias dos últimos 7), ofícios, presença por dia com cursor, horas do ofício nas cores do app, dias seguidos por faixa, lembretes que viram oração em até 2 h, aparelhos e livros em uso.
- **Pessoas & hábito**: contas novas, tempo até a primeira oração, funil, retorno por semana de chegada, por livro e por modo (só conta quem já teve tempo de voltar), mapa-múndi e escolhas do primeiro acesso.
- **Prática & conteúdo**: ofícios por dia, as 24 horas em ordem, livros em uso, quem mais rezou e escreveu, compartilhamentos, favoritos e orações semanais.
- **Negócio & API**: Ordo+ agora e entre quem reza, ciclo de assinaturas, requisições, endereços mais consultados (com o nome da documentação, `utils/endpoints.ts`), chaves perto do limite e quem usa a API: cada desenvolvedor abre um painel lateral (`DeveloperDetail.vue`, `GET /api/v1/dashboard/developers/:id`) com requisições por dia, cada chave (estado, uso, último acesso, limite), endereços, dias da semana e dias perto do limite.
- **Uso**: a telemetria própria do app e da web, lida de `GET /api/v1/admin/usage/*` (estevao-api, `docs/USAGE_TELEMETRY.md`), não do `/dashboard`. Pessoas ativas no dia, em 7 e em 30 dias (e quem usa app **e** web), do último dia que o resumo noturno fechou; recursos e eventos mais usados; a série diária de um recurso (`?serie=office`, em vezes ou pessoas); os funis ofício aberto → concluído, compartilhamento e Ordo+; recortes por cliente, plataforma, livro, idioma e versão do app; e os slugs públicos do CMS mais abertos (santos, documentos, artigos). A API aceita no máximo 366 dias, então "Desde sempre" e períodos maiores são cortados aos últimos 366, com aviso. Cada relatório carrega sozinho: um que falha vira um aviso no próprio cartão, e se todos respondem 404 (a API ainda sem os relatórios) a aba diz isso numa tela só.
- **Operação**: a bancada de revisão de rosários, a fila de regras de vida (só leitura) e os sinais da plataforma.

**Endereço.** Onde a pessoa está fica na URL, em português, e um F5 ou um link reabre o mesmo lugar: `?aba=operacao&vista=regras`, `?aba=operacao&situacao=aprovados&ordem=novos&rosario=42`, `?aba=audio&secao=gerar`, `?aba=negocio&dev=12`, `?periodo=7d` ou `?de=2026-01-01&ate=2026-03-31`. O padrão (Visão geral, 30 dias) nunca é escrito. Trocar de aba cria uma entrada no histórico; filtros só a substituem. Cada item da faixa "Pede uma decisão" abre o lugar exato que o resolve, e o login devolve ao endereço pedido (`?voltar=`, só dentro do portal). A loja é `composables/usePortalQuery.ts` (agrupa as mudanças de um mesmo instante numa navegação só), e o mapa de chaves é `utils/portalRoute.ts`.

**Comparação.** Os cartões do período dizem se o número subiu ou desceu contra a janela de mesmo tamanho logo antes ("+20% vs. 30 dias anteriores (1.077)"): contas novas, quem rezou, ofícios, tempo até a primeira oração (que é bom quando cai), diários, compartilhamentos, orações semanais, lembretes que viram oração, Ordo+ entre quem reza, renovação e requisições da API. Contagens mudam em %, taxas em pontos percentuais, e mudanças pequenas aparecem como "estável" (`utils/compare.ts`). A janela anterior é lida depois que a aba aparece e não existe em "Desde sempre".

**Carregamento.** Cada cartão mostra o próprio esqueleto enquanto a seção dele não chegou, em vez de um zero (`composables/useDashboardContext.ts`).

A linguagem é a de quem lê, não a da API: "rezaram hoje, em 7 e em 30 dias" no lugar de DAU/WAU/MAU, "aparelhos com lembretes" no lugar de tokens FCM, "tarefas travadas" no lugar de jobs mortos.

O painel trata `null` como estado válido e não usa e-mail nos rankings. Séries esparsas são preenchidas com zero. O retorno da API pode ter até 10 minutos de cache. Um número que a API ainda não publica aparece como "—" com a explicação, sem quebrar o cartão.

## Revisão de rosários

A revisão é uma bancada com três colunas, não um modal (`ReviewWorkbench.vue`, com a lógica em `composables/useRosaryModeration.ts`):

- **Fila**: busca, situação (em revisão, aprovados, rejeitados), ordem (mais antigos, mais novos, A–Z, enviada à API como `sort`/`direction`), páginas de 20, selo "parecido" e "reenvio" em cada item, e o atalho "Série de Salmos" quando a página tem vários.
- **Rosário**: título, descrição, quem enviou com o histórico de envios (`author.submissions_count` etc.), a checagem automática (contas, contas vazias, títulos parecidos vindos de `similar_titles`, reenvio após rejeição, categoria sugerida) e as contas agrupadas: contas seguidas com o mesmo texto viram uma linha com "× 7".
- **Decisão**: categoria (sugerida pelo título, `suggestCategory`), endereço no CMS gerado do título (um endereço escrito à mão nunca é sobrescrito), aprovar e ir ao próximo, rejeitar com motivo num passo à parte, deixar para depois.

↑/↓ (ou J/K) navegam, A aprova e R abre a rejeição. Decidir abre o próximo da mesma lista; o detalhe do próximo já vem carregado em segundo plano, e a página se completa sozinha quando um item sai dela.

A fila de regras de vida é somente leitura: existe apenas o endpoint `GET /api/v1/admin/life_rules`, sem ação administrativa de aprovação.

## Operação de áudio

O áudio tem aba própria, fora de Operação, e não depende do período de leitura (a barra de período fica oculta nela). O painel é dividido por tarefa:

- **Visão geral**: só o que pede decisão aparece no topo (tentativas a revisar, jobs mortos, falhas nas últimas 24 horas, com o que falhou e um "Limpar aviso" que marca as falhas como vistas na API); a narração pronta para as próximas 4 semanas só é calculada ao pedir (a conta monta 28 dias de ofícios), e o último resultado de cada livro fica guardado no aparelho com a hora; os números ficam em três listas — catálogo, qualidade e fila — com os clips por livro no rodapé; e as operações recentes ao lado da fila do worker, cuja lista de jobs fica recolhida atrás das contagens por estado.
- **Gerar**: janela de datas e catálogo fixo. O livro é escolhido numa lista com busca (`BookPicker.vue`: nome, código, idioma e ano), e as Bíblias e saltérios do catálogo são cartões separados por tipo, com "Só os textos do livro" como escolha à parte (`CorpusPicker.vue`). A operação enfileirada por último é acompanhada numa faixa no topo da seção que a pediu, sem voltar à visão geral.
- **Clips**: cada clip é uma linha compacta (texto em até duas linhas, player e uso resumido). Tentativas pendentes continuam visíveis na linha, porque pedem decisão; perfil, fingerprints, todos os usos, a observação específica e a regeneração ficam em **Detalhes**. Provedor, voz e textos curtos ficam em **Mais filtros**, e os selects aplicam o filtro ao mudar.
- **Manutenção**: limpeza de perfis antigos e reindexação, com o LOC escolhido no próprio cartão.

O pipeline de narração tem duas metades, que são operações distintas na API:

- **Catálogo fixo** (`POST /api/v1/admin/audio/catalog/generations`): todo texto, coleta, saltério e corpus bíblico que o livro pode ler, sem data. `dry_run` percorre as mesmas fontes e relata o que uma execução real teria que comprar. O catálogo é longo demais para uma requisição, então a simulação também roda no worker e o relatório volta em `operation.result`.
- **Janela de datas** (`POST /api/v1/admin/audio/generations`): monta os ofícios reais de cada dia. `POST .../generations/estimate` continua síncrono. Nenhuma das duas aceita teto de caracteres: a operação gera o que falta.

`GET /api/v1/admin/audio/worker_queue` classifica cada job do Solid Queue pelo que o sustenta — `running`, `ready`, `scheduled`, `blocked`, `failed` ou `orphaned`. Um job órfão não tem execução registrada e nunca será executado; `POST .../worker_queue/purge` apaga os mortos (`scope=dead`, padrão) ou tudo que ainda não começou (`scope=all`), cancelando as operações que esperavam por eles. O polling de 4 segundos só continua enquanto houver job vivo, e não mais enquanto houver job morto na lista.

## Componentes

```text
layers/ordo/
├── assets/portal.css               sistema visual (tokens, casca, componentes)
├── components/ordo/
│   ├── Rail.vue                    trilho de navegação e barra do celular
│   ├── PeriodPicker.vue            período que aplica ao clicar
│   ├── OverviewPanel.vue
│   ├── GrowthPanel.vue
│   ├── PracticePanel.vue
│   ├── PlatformPanel.vue
│   ├── OperationsPanel.vue         fila de cuidado e sinais da plataforma
│   ├── ReviewWorkbench.vue         bancada de revisão de rosários
│   ├── AudioOperationsPanel.vue
│   ├── AudioReadiness.vue          narração pronta nas próximas 4 semanas
│   ├── BookPicker.vue              escolha de livro com busca
│   ├── CorpusPicker.vue            Bíblias e saltérios do catálogo
│   ├── DeveloperDetail.vue         uso das chaves de um desenvolvedor
│   ├── UsagePanel.vue              aba Uso (telemetria própria)
│   ├── UsageFunnel.vue             um funil da aba Uso
│   ├── DeltaChip.vue               variação contra o período anterior
│   ├── CountryMap.vue
│   ├── DataExplorerModal.vue
│   └── MetricCard / ChartCard / StatList / TopList / BarList / TrendChart / Sparkline / ScopeTag / LocBadge / Icon
├── composables/
│   ├── useFirebaseAuth.ts
│   ├── useOrdoApi.ts
│   ├── useOrdoDashboardPresentation.ts
│   ├── usePortalQuery.ts           o lugar do portal na URL
│   ├── useDashboardContext.ts      seções carregando e janela anterior
│   └── useRosaryModeration.ts
├── middleware/ordo-auth.ts
├── pages/portal-do-ordo/
│   ├── login.vue
│   └── index.vue
├── types/dashboard.ts
├── types/explorer.ts
├── types/usage.ts                  contrato de /api/v1/admin/usage/*
└── utils/                          period, series, liturgical, countryMap, slug, portalRoute, compare, endpoints, usage
```

`pages/portal-do-ordo/index.vue` coordena autenticação, período, carregamento e navegação. Cada aba carrega suas seções em duas levas: a primeira desenha a tela, a segunda completa logo depois, junto com a janela anterior usada nas comparações. As telas de domínio ficam nos componentes de painel; a Operação busca a própria fila.

## Desenvolvimento

Para mexer no portal não é preciso subir nem compilar o site inteiro: o playground (`layers/ordo/.playground`) é um app Nuxt mínimo que estende só esta layer, com a API e o login simulados.

```bash
pnpm portal:dev                 # playground + mocks em http://localhost:3100 (HMR)
pnpm portal:shots               # capturas de shots.config.mjs a 1440 e 390 px
pnpm portal:shots audio uso     # só as entradas cujo nome contém "audio" ou "uso"
pnpm portal:test                # só os testes Vitest de layers/ordo
pnpm portal:build               # compila só o playground (o portal:shots faz isso sozinho)
```

**Modo mock.** O playground troca o plugin do Firebase por uma sessão falsa (`.playground/plugins/mock-auth.client.ts`) e manda as chamadas da API para o próprio servidor, onde `server/routes/api/v1` responde com as fixtures de `.playground/mocks/` (visão geral, pessoas, prática, negócio, operação, áudio e uso), no formato dos contratos (`types/dashboard.ts`, `types/audio.ts`, `types/usage.ts`). As fixtures são de 2026-11-26 e o relógio do navegador é fixado nesse instante (`?agora=real` desliga, `?agora=2026-11-20T09:00:00-03:00` escolhe outro). Cada aba tem cenários, trocados com `GET /__mock/scenario?audio=provedor-fora` (a lista sai em `GET /__mock/scenario`). `?mock=sem-sessao` abre a tela de login. Uma rota sem fixture responde 404 com o caminho, para saber o que falta.

O modo mock só existe no playground: o site estende `./layers/ordo` e nunca `.playground`, a configuração do playground se recusa a rodar na Vercel, a sessão falsa só entra em `localhost`, e `playground.test.ts` falha se algo fora do playground passar a citar os mocks.

**Capturas.** `pnpm portal:shots` usa o `portal:dev` se ele estiver de pé; senão sobe o build do playground em cache (`.playground/.output`), recompilando antes se algo em `layers/ordo` mudou desde o último. As imagens vão para `.playground/.shots/<nome>-<largura>.png` (fora do git); a lista de rotas, cenários e cliques fica em `.playground/shots.config.mjs`. Opções: `--out <pasta>`, `--widths 1440,390`, `--url <servidor>`, `--routes <lista.mjs>`, `--build`. O Chromium é o do Playwright do repositório (`pnpm exec playwright install chromium` se faltar).

Para o site inteiro, como antes:

```bash
pnpm dev
pnpm exec eslint layers/ordo
pnpm typecheck
```

O typecheck global atual ainda aponta incompatibilidades preexistentes entre os tipos DOM do Chart.js/Google Maps em outras layers (`layers/dashboard` e `layers/localizador`); os arquivos do Ordo passam no lint e não adicionam erros nessa lista.
