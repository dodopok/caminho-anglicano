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
- Fila de `GET /api/v1/admin/custom_rosary_prayers`, detalhe expandido e ações de aprovar/rejeitar.
- Premium, chaves de API, limites diários e desenvolvedores.
- O filtro `Desde sempre` consulta o histórico desde `1970-01-01`; séries temporais são agrupadas por mês para manter a leitura responsiva.

O painel trata `null` como estado válido, exibe o escopo efetivo de cada seção e não usa e-mail nos rankings. Séries esparsas são preenchidas com zero quando precisam formar uma linha contínua. O retorno da API pode ter até 10 minutos de cache.

A fila de regras de vida é somente leitura no contrato atual: existe apenas o endpoint `GET /api/v1/admin/life_rules`, sem ação administrativa de aprovação. Rosários compartilhados possuem revisão detalhada e as ações `approve`/`reject` no modal editorial.

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
│   ├── RosaryReviewModal.vue
│   └── MetricCard / ChartCard / TopList / charts
├── composables/
│   ├── useFirebaseAuth.ts
│   ├── useOrdoApi.ts
│   └── useOrdoDashboardPresentation.ts
├── middleware/ordo-auth.ts
├── pages/portal-do-ordo/
│   ├── login.vue
│   └── index.vue
└── types/dashboard.ts
```

`pages/portal-do-ordo/index.vue` coordena autenticação, filtros, carregamento e navegação. As telas de domínio ficam nos componentes de painel, mantendo o admin responsivo sem concentrar todo o contrato da API em uma única página.

## Desenvolvimento

```bash
npm run dev
npx eslint layers/ordo
npm run typecheck
```

O typecheck global atual ainda aponta incompatibilidades preexistentes entre os tipos DOM do Chart.js/Google Maps em outras layers (`layers/dashboard` e `layers/localizador`); os arquivos do Ordo passam no lint e não adicionam erros nessa lista.
