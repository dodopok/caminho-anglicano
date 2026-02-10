# Portal do Ordo - Admin Dashboard

Portal administrativo elegante para monitorar métricas do Ofício Divino através da API externa em `api.oficio.app`.

## 🎨 Design

O portal foi desenvolvido com uma estética **Contemplative Refinement** (Refinamento Contemplativo), inspirado em missais iluminados e livros de oração, com uma abordagem editorial moderna.

### Paleta de Cores
- **Burgundy litúrgico**: `#8B4513` (cor principal)
- **Dourado suave**: `#B8860B` (acentos)
- **Creme**: `#F5F0E6` (backgrounds)
- **Preto sofisticado**: `#2c1810` (textos)

### Tipografia
- **Headings**: Crimson Text (serif elegante)
- **Body/Data**: Manrope (sans-serif refinada)

## 🚀 Configuração

### 1. Firebase Setup

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative **Authentication**:
   - Vá em **Authentication** > **Sign-in method**
   - Habilite **Google** (toggle)
4. Configure o Web App:
   - Vá em **Project Settings** > **General**
   - Em "Your apps", clique no ícone web `</>`
   - Registre o app e copie as configurações

### 2. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Firebase Configuration
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Ordo API
NUXT_PUBLIC_ORDO_API_BASE_URL=https://api.oficio.app
```

### 3. Acesso ao Portal

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `/portal-do-ordo/login`

3. Faça login com sua conta Google

4. O portal verificará seu token Firebase com a API em `api.oficio.app`

## 📊 Funcionalidades

### Métricas Disponíveis

#### 1. Visão Geral (Overview)
- Total de usuários (premium vs free)
- Taxa de conversão para premium
- Total de ofícios completados
- Diários criados

#### 2. Engajamento
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)
- Stickiness (DAU/WAU ratio)
- Tendência temporal de usuários ativos

#### 3. Usuários
- Novos usuários no período
- Usuários ativos (7 e 30 dias)
- Streaks médios
- Top streakers (maiores sequências)

#### 4. Completions (Ofícios)
- Total completado no período
- Duração média
- Distribuição por tipo de ofício (manhã, tarde, meio-dia, completas)
- Distribuição por hora do dia
- Tendência temporal diária
- Top completers (usuários mais ativos)

#### 5. Livros de Oração
- Uso por livro de oração (LOC 2015, 1662, etc.)
- Livro mais utilizado

#### 6. Diários
- Total de diários criados
- Usuários que mantêm diários
- Top escritores

#### 7. Áudio
- Cobertura de áudio (% de textos com áudio)
- Sessões de geração completas/falhadas
- Taxa de sucesso

#### 8. Notificações
- Total enviadas
- Taxa de sucesso de entrega
- Notificações falhadas

#### 9. Regras de Vida
- Total de regras criadas
- Regras públicas e aprovadas
- Total de adoções

#### 10. Ofícios Compartilhados
- Total compartilhado
- Usuários que compartilham

### Filtros

- **Data de início**: Define o início do período de análise
- **Data de fim**: Define o fim do período de análise
- **Padrão**: Últimos 30 dias

## 🎯 Componentes

### Componentes de UI
- `MetricCard.vue`: Card para métricas numéricas
- `ChartCard.vue`: Container para gráficos
- `TopList.vue`: Lista ranqueada com barras de progresso

### Componentes de Visualização
- `LineChart.vue`: Gráfico de linha para tendências temporais
- `BarChart.vue`: Gráfico de barras (vertical/horizontal)
- `DoughnutChart.vue`: Gráfico de rosca para proporções

Todos os gráficos usam **Chart.js** com tema customizado para combinar com a estética do portal.

## 🔒 Segurança

- Autenticação via **Firebase Google Sign-In**
- Token JWT enviado para API externa
- Middleware de proteção de rotas (`ordo-auth.ts`)
- Rotas do portal excluídas do sitemap

## 📁 Estrutura

```
layers/ordo/
├── components/ordo/         # Componentes do dashboard
│   ├── MetricCard.vue
│   ├── ChartCard.vue
│   ├── LineChart.vue
│   ├── BarChart.vue
│   ├── DoughnutChart.vue
│   └── TopList.vue
├── composables/             # Lógica reutilizável
│   ├── useFirebaseAuth.ts   # Autenticação Firebase
│   └── useOrdoApi.ts        # Cliente da API
├── middleware/              # Proteção de rotas
│   └── ordo-auth.ts
├── pages/portal-do-ordo/    # Páginas do portal
│   ├── login.vue            # Tela de login
│   └── index.vue            # Dashboard principal
├── plugins/                 # Plugins Nuxt
│   └── firebase.client.ts   # Inicialização Firebase
├── types/                   # TypeScript types
│   └── dashboard.ts         # Tipos da API
└── nuxt.config.ts          # Config do layer
```

## 🎨 Customização

### Cores

As cores podem ser ajustadas nos componentes através de CSS variables ou diretamente nos estilos. A paleta atual:

```css
--color-primary: #8B4513;      /* Burgundy */
--color-accent: #B8860B;       /* Gold */
--color-bg: #F5F0E6;          /* Cream */
--color-text: #2c1810;        /* Dark brown */
```

### Fontes

As fontes são carregadas via Google Fonts:
- Crimson Text: headings e valores numéricos
- Manrope: corpo de texto, labels, descrições

Para alterar, modifique a URL do Google Fonts nos componentes.

## 🐛 Troubleshooting

### Erro de autenticação
- Verifique se o Google Sign-In está habilitado no Firebase Console
- Confirme que as variáveis de ambiente estão corretas
- Limpe o cache do browser e tente novamente

### Erro ao buscar dashboard
- Verifique se a API `api.oficio.app` está acessível
- Confirme que seu token Firebase é válido
- Verifique o email configurado em `DASHBOARD_ADMIN_EMAIL` na API

### Gráficos não aparecem
- Confirme que os dados estão sendo retornados pela API
- Verifique o console do browser para erros
- Teste com dados mock para isolar o problema

## 📝 Notas

- O portal é responsivo e funciona em desktop e mobile
- Animações suaves para melhor UX
- Todos os gráficos são interativos (hover para detalhes)
- Design consistente com temas litúrgicos
