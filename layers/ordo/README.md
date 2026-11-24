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

A navegação separa **Leitura** (Visão geral, Pessoas & hábito, Prática & conteúdo, Negócio & API) de **Cuidado** (Operação e Áudio), com contadores em tudo que espera alguém. Cada número diz se é do período escolhido ou da base total (`ScopeTag.vue`), e o período aplica ao clicar (`PeriodPicker.vue`, `utils/period.ts`). Períodos longos (12 meses, desde sempre ou mais de 120 dias) são agrupados por mês.

- **Visão geral**: a faixa "Pede uma decisão" (rosários na fila e previsão de quando ela zera, tentativas de narração, tarefas de áudio travadas, chaves vencendo, regras de vida novas), pessoas na base, quem rezou, núcleo fiel (4 ou mais dias dos últimos 7), ofícios, presença por dia com cursor, horas do ofício nas cores do app, dias seguidos por faixa, lembretes que viram oração em até 2 h, aparelhos e livros em uso.
- **Pessoas & hábito**: contas novas, tempo até a primeira oração, funil, retorno por semana de chegada, por livro e por modo (só conta quem já teve tempo de voltar), mapa-múndi e escolhas do primeiro acesso.
- **Prática & conteúdo**: ofícios por dia, as 24 horas em ordem, livros em uso, quem mais rezou e escreveu, compartilhamentos, favoritos e orações semanais.
- **Negócio & API**: Ordo+ agora e entre quem reza, ciclo de assinaturas, requisições, endereços mais consultados, chaves perto do limite e desenvolvedores.
- **Operação**: a bancada de revisão de rosários, a fila de regras de vida (só leitura) e os sinais da plataforma.

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

- **Visão geral**: só o que pede decisão aparece no topo (tentativas a revisar, jobs mortos, falhas nas últimas 24 horas); os números ficam em três listas — catálogo, qualidade e fila — com os clips por livro no rodapé; e as operações recentes ao lado da fila do worker, cuja lista de jobs fica recolhida atrás das contagens por estado.
- **Gerar**: janela de datas e catálogo fixo. A operação enfileirada por último é acompanhada numa faixa no topo da seção que a pediu, sem voltar à visão geral.
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
│   ├── CountryMap.vue
│   ├── DataExplorerModal.vue
│   └── MetricCard / ChartCard / StatList / TopList / BarList / TrendChart / Sparkline / ScopeTag / LocBadge / Icon
├── composables/
│   ├── useFirebaseAuth.ts
│   ├── useOrdoApi.ts
│   ├── useOrdoDashboardPresentation.ts
│   └── useRosaryModeration.ts
├── middleware/ordo-auth.ts
├── pages/portal-do-ordo/
│   ├── login.vue
│   └── index.vue
├── types/dashboard.ts
├── types/explorer.ts
└── utils/                          period, series, liturgical, countryMap, slug
```

`pages/portal-do-ordo/index.vue` coordena autenticação, período, carregamento e navegação. Cada aba carrega suas seções em duas levas: a primeira desenha a tela, a segunda completa logo depois. As telas de domínio ficam nos componentes de painel; a Operação busca a própria fila.

## Desenvolvimento

```bash
npm run dev
npx eslint layers/ordo
npm run typecheck
```

O typecheck global atual ainda aponta incompatibilidades preexistentes entre os tipos DOM do Chart.js/Google Maps em outras layers (`layers/dashboard` e `layers/localizador`); os arquivos do Ordo passam no lint e não adicionam erros nessa lista.
