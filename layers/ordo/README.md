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

## O que o painel cobre

- Visão geral, DAU/WAU/MAU, sequências e atividade diária.
- Aquisição, funil de onboarding, retenção D1/D7/D30 e geografia.
- Completions, atribuição real por prayer book, diários, favoritos, compartilhamentos e weekly prayers.
- Áudio, notificações, saúde operacional, regras de vida e moderação.
- Fila paginada de `GET /api/v1/admin/life_rules`.
- Fila paginada no front-end de `GET /api/v1/admin/custom_rosary_prayers`, detalhe expandido e ações de aprovar/rejeitar.
- Premium, chaves de API, limites diários e desenvolvedores.
- Modais de exploração para os arrays e mapas completos do dashboard, com busca, filtros e ordenação local.
- O filtro `Desde sempre` consulta o histórico desde `1970-01-01`; séries temporais são agrupadas por mês para manter a leitura responsiva.

O painel trata `null` como estado válido, exibe o escopo efetivo de cada seção e não usa e-mail nos rankings. Séries esparsas são preenchidas com zero quando precisam formar uma linha contínua. O retorno da API pode ter até 10 minutos de cache.

A fila de regras de vida é somente leitura no contrato atual: existe apenas o endpoint `GET /api/v1/admin/life_rules`, sem ação administrativa de aprovação. Rosários compartilhados possuem revisão detalhada e as ações `approve`/`reject` no modal editorial.

## Operação e moderação

A aba **Operação** começa pelas filas que pedem decisão — rosários compartilhados (acionáveis) e regras de vida (somente leitura) — e resume a pendência numa linha só na introdução, em vez de repetir as contagens em cartões. Abaixo vêm a qualidade da moderação no período e os sinais da plataforma (notificações, saúde operacional, regras de vida e exames) em listas compactas, com o detalhamento completo nos modais de exploração. O volume de rosários do período (criados, públicos, médias de blocos e passos, pessoas perto do limite) fica no modal **Abrir métricas**, não no cartão da fila.

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

## Revisão de rosários

O modal de revisão é o mesmo para a fila resumida e para a fila completa, mas guarda de qual das duas foi aberto:

- a fila completa continua montada atrás do modal, então fechar a revisão devolve o moderador à lista com filtro, ordenação e página intactos;
- o cabeçalho traz a posição na fila e navegação `←`/`→`, que vira de página sozinha ao chegar no fim da atual;
- aprovar ou rejeitar abre o próximo item automaticamente. Quando a decisão tira a oração do filtro ativo, a página é recarregada e o item que ocupou o mesmo índice é o próximo;
- o slug do Strapi é sugerido a partir do título (`utils/slug.ts`) quando a revisão abre sem um, e um slug escrito à mão nunca é sobrescrito.

## Componentes

```text
layers/ordo/
├── components/ordo/
│   ├── OverviewPanel.vue
│   ├── GrowthPanel.vue
│   ├── PracticePanel.vue
│   ├── OperationsPanel.vue
│   ├── PlatformPanel.vue
│   ├── LifeRulesQueue.vue
│   ├── CustomRosaryQueue.vue
│   ├── DataExplorerModal.vue
│   ├── RosaryReviewModal.vue
│   ├── AudioOperationsPanel.vue
│   └── MetricCard / StatList / ChartCard / TopList / charts
├── composables/
│   ├── useFirebaseAuth.ts
│   ├── useOrdoApi.ts
│   └── useOrdoDashboardPresentation.ts
├── middleware/ordo-auth.ts
├── pages/portal-do-ordo/
│   ├── login.vue
│   └── index.vue
├── types/dashboard.ts
└── types/explorer.ts
```

`pages/portal-do-ordo/index.vue` coordena autenticação, filtros, carregamento e navegação. As telas de domínio ficam nos componentes de painel, mantendo o admin responsivo sem concentrar todo o contrato da API em uma única página.

## Desenvolvimento

```bash
npm run dev
npx eslint layers/ordo
npm run typecheck
```

O typecheck global atual ainda aponta incompatibilidades preexistentes entre os tipos DOM do Chart.js/Google Maps em outras layers (`layers/dashboard` e `layers/localizador`); os arquivos do Ordo passam no lint e não adicionam erros nessa lista.
