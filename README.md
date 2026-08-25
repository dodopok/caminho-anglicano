# Caminho Anglicano

[![Tests & Type Check](https://github.com/dodopok/caminho-anglicano/actions/workflows/test.yml/badge.svg)](https://github.com/dodopok/caminho-anglicano/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![pnpm Version](https://img.shields.io/badge/pnpm-10.x-orange.svg)](https://pnpm.io)

Portal completo de recursos e serviços para a comunidade anglicana brasileira.

## Funcionalidades

### 1. 🗺️ Localizador de Igrejas Anglicanas (`/localizador`)

#### Mapa Interativo
- Mapa do Google Maps com marcadores customizados
- Marcadores coloridos por jurisdição
- InfoWindow com informações detalhadas
- Marcador especial para localização do usuário
- Zoom e centralização automáticos

#### Sistema de Busca Avançado
- **Busca por texto**: Nome da igreja, cidade ou endereço
- **Busca por localização**:
  - Botão "Perto de mim" com geolocalização GPS
  - Busca por CEP (integração ViaCEP)
  - Busca por endereço (integração Nominatim)
  - Cálculo e exibição de distância
  - Ordenação por proximidade

#### Filtros e Organização
- Filtro por jurisdição (9 jurisdições suportadas)
- Filtros múltiplos combinados
- Lista lateral com scroll independente
- Destaque visual da igreja selecionada

#### Informações Completas das Igrejas
- Nome, endereço completo e localização
- Jurisdição com badge colorido
- Horários de culto detalhados
- Pastores responsáveis
- Descrição e informações de contato
- Redes sociais (Website, Instagram, YouTube, Spotify)

#### Sistema de Contribuição
- **Adicionar igreja individual**: Formulário completo com validação
- **Adicionar múltiplas igrejas**: Upload em lote com formato estruturado
- **Feedback/Reportar problemas**: Botão flutuante amarelo para reportar erros ou sugerir atualizações
- Sistema de revisão administrativa antes da publicação

#### Jurisdições Suportadas
- IAB (Igreja Anglicana do Brasil)
- IEAB (Igreja Episcopal Anglicana do Brasil)
- REB (Rede Evangélica Brasileira)
- IARB (Igreja Anglicana Reformada do Brasil)
- ICEB (Igreja Cristã Episcopal do Brasil)
- IECB (Igreja Episcopal Carismática do Brasil)
- IEUB (Igreja Episcopal Unida do Brasil)
- TAC (The Anglican Church)
- Independente

### 2. 📊 Dashboard de Estatísticas (`/dashboard`)

#### Métricas Principais
- Total de igrejas cadastradas
- Número de jurisdições
- Estados cobertos
- Média de igrejas por estado

#### Visualização de Dados
- **Gráfico de Pizza**: Distribuição de igrejas por jurisdição
- **Gráfico de Barras**: Top 5 estados com mais igrejas
- **Ranking de Estados**:
  - Top 3 com medalhas (ouro, prata, bronze)
  - Tabela completa com todos os estados
  - Percentuais e barras de progresso visual

#### Recursos
- Filtro dinâmico por jurisdição
- Atualização em tempo real
- Cores customizadas por jurisdição
- Design responsivo com cards e gráficos interativos

### 3. 📖 Livro de Oração Comum (`/locs`)

#### Biblioteca Digital
Acesso a 5 edições históricas do Livro de Oração Comum:

1. **LOC 1783**: Um dos primeiros a chegar ao Brasil
2. **LOC 1987**: Versão IEAB (1984, revisão 1987)
3. **LOCB 2008**: Diocese do Recife (Comunhão Anglicana)
4. **LOC IARB 2009**: Igreja Anglicana Reformada do Brasil
5. **LOC IEAB 2015**: Versão atual da IEAB

#### Recursos
- Grid responsivo com capas dos livros
- Acesso direto aos PDFs
- Descrição de cada edição
- Design otimizado para leitura

### 4. 📚 Glossário Anglicano (`/glossario`)

#### Biblioteca de Termos
- **200+ termos** teológicos e litúrgicos da tradição anglicana
- Definições claras e contextualizadas
- Referências bíblicas e históricas quando aplicável
- Conteúdo curado e revisado

#### Sistema de Busca e Filtros
- **Busca em tempo real**: Digite para encontrar termos instantaneamente
- **Filtro alfabético**: Navegue por letras A-Z
- **Paginação inteligente**: 12 termos por página
- **Sincronização com URL**: Compartilhe buscas específicas via link
- **Contador de resultados**: Feedback visual de resultados encontrados

#### Interface e Navegação
- **Página principal** (`/glossario`):
  - Lista completa de termos
  - Barra de busca com destaque visual
  - Filtros alfabéticos interativos
  - Cards responsivos com preview das definições

- **Páginas individuais** (`/glossario/[slug]`):
  - Termo em destaque com definição completa
  - Navegação para termo anterior/próximo
  - Botão para voltar ao glossário
  - SEO otimizado para cada termo
  - Open Graph para compartilhamento em redes sociais

#### Recursos Técnicos
- **SSR (Server-Side Rendering)**: Páginas pré-renderizadas para SEO
- **State Management**: Sincronização entre busca, filtros e URL
- **Debounce**: Busca otimizada sem sobrecarga
- **Permalinks**: URLs amigáveis para cada termo (ex: `/glossario/eucaristia`)
- **Sitemap dinâmico**: Todos os termos indexados automaticamente

#### Banner do Livro
- Destaque para o livro "Caminho Anglicano" de Thomas McKenzie
- Links diretos para compra (versões digital e física)
- Design chamativo que não interfere na experiência de busca

### 5. 💰 Sistema de Doações (`/doacao`)

#### Integração com AbacatePay
- Sistema completo de doações via PIX
- Modal interativo com opções de valores pré-definidos
- Opção de valor customizado
- Suporte para doações únicas ou mensais (recorrentes)

#### Funcionalidades
- **Valores sugeridos**: R$ 5, R$ 10, R$ 25, R$ 50, R$ 100
- **Valor personalizado**: Digite qualquer valor
- **Métodos de pagamento**:
  - PIX (disponível)
  - Cartão de crédito (em breve)
- **Tipos de doação**:
  - Uma vez (doação única)
  - Mensal (apoio recorrente)

#### Interface
- Botão "☕ Apoie o Projeto" no footer de todas as páginas
- Botão flutuante na página inicial
- Modal responsivo com formulário completo
- Página de agradecimento personalizada (`/doacao/sucesso`)
- Validação de CPF, celular e e-mail
- Formatação automática de valores em reais

#### Webhook
- Endpoint `/api/donations/webhook` para receber notificações de status
- Configurável no painel do AbacatePay
- Suporte para eventos: PENDING, PAID, EXPIRED, CANCELLED

### 6. 🏠 Página Inicial (`/`)

#### Hub de Navegação
- Cards de acesso rápido a todas as seções
- Link para Teste de Espectro Anglicano (externo)
- Design moderno com gradientes e animações
- SEO otimizado com Open Graph e Twitter Cards

### 7. ✨ Recursos Gerais

#### Design e UX
- 📱 Mobile-first e totalmente responsivo
- ♿ Acessibilidade completa (ARIA, labels semânticos)
- 🎨 Sistema de cores por jurisdição
- ⚡ Animações e transições suaves
- 🔄 Loading states e feedback visual
- 💾 Cache inteligente de dados

#### Tecnologias e Performance
- Server-side rendering (SSR)
- Type safety end-to-end com TypeScript
- Code splitting por módulo (Nuxt Layers)
- Otimização de imagens
- Analytics com Vercel

## Tecnologias

### Core Stack
- **Framework**: Nuxt 3 (Vue 3 + TypeScript)
- **Arquitetura**: Nuxt Layers (modular)
- **Estilo**: Tailwind CSS
- **Type Safety**: TypeScript (modo strict)

### Integrações e Serviços
- **Banco de Dados**: Supabase (PostgreSQL)
- **Mapa**: Google Maps JavaScript API (Advanced Markers)
- **Geocoding**:
  - ViaCEP (CEP brasileiro)
  - Nominatim (OpenStreetMap)
- **Pagamentos**: AbacatePay (PIX e Cartão)
- **Gráficos**: Chart.js
- **Analytics**: Vercel Analytics

### Infraestrutura
- **Rendering**: SSR (Server-Side Rendering)
- **Deploy**: Vercel (recomendado)
- **Cache**: Server-side caching (1 hora)
- **API**: Nuxt Server API (REST)

## Configuração do Projeto

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
cp .env.example .env
```

Preencha as seguintes variáveis:

```env
NUXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NUXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-publica-do-google-maps
GOOGLE_MAPS_SERVER_API_KEY=sua-chave-privada-do-google-maps
ABACATEPAY_API_KEY=sua-chave-do-abacatepay
```

### 3. Configurar o Banco de Dados Supabase

1. Acesse seu projeto no [Supabase](https://supabase.com)
2. Vá para o SQL Editor
3. Execute o script SQL em `supabase-schema.sql`

Isso criará as seguintes tabelas:
- `churches` - Igrejas aprovadas e publicadas
- `church_submissions` - Submissões individuais pendentes de revisão
- `bulk_church_submissions` - Submissões em massa pendentes de revisão

**Opcional - Adicionar dados de teste:**

Para testar o sistema com 10 igrejas de exemplo, execute também:

```sql
-- No Supabase SQL Editor
-- Cole o conteúdo de seed-churches-updated.sql
```

**Nota**: Use `seed-churches-updated.sql` (não o antigo `seed-churches.sql`)

### 4. Configurar Google Maps API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative as seguintes APIs:
   - Maps JavaScript API
4. Crie credenciais (API Key)
5. Configure restrições para sua API key (recomendado para produção)

### 5. Configurar AbacatePay (Sistema de Doações)

1. Acesse [AbacatePay](https://abacatepay.com) e crie uma conta
2. Acesse o dashboard e copie sua API Key
3. Adicione a chave no arquivo `.env`:
   ```env
   ABACATEPAY_API_KEY=sua-chave-aqui
   ```
4. **(Opcional)** Configure o webhook para receber notificações de pagamento:
   - No painel do AbacatePay, vá em Configurações > Webhooks
   - Adicione a URL: `https://seu-dominio.com/api/donations/webhook`
   - Selecione os eventos: `billing.paid`, `billing.expired`, `billing.cancelled`

**Nota**: O sistema de doações funciona com PIX imediatamente. Cartão de crédito estará disponível assim que o AbacatePay liberar para sua conta.

### 6. Executar em Desenvolvimento

```bash
pnpm dev
```

O site estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
caminho-anglicano/
├── layers/
│   ├── base/                              # Layer base (componentes compartilhados)
│   │   └── components/
│   │       └── JurisdictionSelect.vue     # Dropdown de jurisdições reutilizável
│   │
│   ├── localizador/                       # Layer do localizador de igrejas
│   │   ├── components/
│   │   │   ├── GoogleMap.vue              # Mapa interativo do Google Maps
│   │   │   ├── AddChurchModal.vue         # Modal para adicionar igreja individual
│   │   │   ├── AddChurchTypeModal.vue     # Modal de escolha (individual/bulk)
│   │   │   ├── AddBulkChurchesModal.vue   # Modal para adicionar múltiplas igrejas
│   │   │   └── FeedbackModal.vue          # Modal de feedback/reportar problemas
│   │   ├── composables/
│   │   │   ├── useChurches.ts             # Buscar igrejas
│   │   │   ├── useJurisdictions.ts        # Gerenciar jurisdições
│   │   │   ├── useGeocoding.ts            # Geocoding (CEP/endereço)
│   │   │   ├── useSubmissions.ts          # Submissões de igrejas
│   │   │   └── useChurchFeedback.ts       # Feedback de usuários
│   │   ├── pages/
│   │   │   └── localizador.vue            # Página principal do localizador
│   │   ├── server/
│   │   │   └── api/
│   │   │       ├── churches.get.ts        # API: buscar igrejas
│   │   │       ├── jurisdictions.get.ts   # API: buscar jurisdições
│   │   │       └── submissions/
│   │   │           ├── church.post.ts     # API: submissão individual
│   │   │           └── bulk.post.ts       # API: submissão em lote/feedback
│   │   └── types/
│   │       └── church.ts                  # Types para igrejas e jurisdições
│   │
│   ├── locs/                              # Layer do Livro de Oração Comum
│   │   └── pages/
│   │       └── locs.vue                   # Biblioteca de LOCs
│   │
│   ├── dashboard/                         # Layer do dashboard de estatísticas
│   │   ├── components/
│   │   │   └── ChurchDistributionChart.vue # Gráficos (Pizza e Barras)
│   │   ├── composables/
│   │   │   └── useChurchStats.ts          # Cálculos de estatísticas
│   │   └── pages/
│   │       └── dashboard.vue              # Página do dashboard
│   │
│   └── doacoes/                           # Layer do sistema de doações
│       ├── components/
│       │   ├── DonationModal.vue          # Modal de doação com formulário
│       │   └── SupportButton.vue          # Botão "Apoie o Projeto"
│       ├── composables/
│       │   └── useDonations.ts            # Gerenciar doações
│       ├── pages/
│       │   └── doacao/
│       │       └── sucesso.vue            # Página de agradecimento
│       ├── server/
│       │   └── api/
│       │       └── donations/
│       │           ├── create.post.ts     # API: criar billing no AbacatePay
│       │           └── webhook.post.ts    # API: webhook de notificações
│       └── types/
│           └── donation.ts                # Types para doações
│
├── pages/
│   └── index.vue                          # Página inicial (hub)
│
├── public/
│   ├── locs/                              # PDFs dos Livros de Oração
│   └── og-image-*.png                     # Imagens Open Graph
│
├── supabase-schema.sql                    # Schema do banco de dados
└── nuxt.config.ts                         # Configuração Nuxt (layers)
```

## Fluxo de Adição de Igrejas

1. **Usuário submete uma igreja**: Através do formulário no site
2. **Dados salvos no Supabase**: Na tabela `church_submissions` ou `bulk_church_submissions`
3. **Revisão manual**: Admin revisa as submissões no Supabase
4. **Aprovação**: Admin copia os dados aprovados para a tabela `churches` manualmente

## Sistema de Feedback

O localizador possui um botão flutuante amarelo no canto inferior direito que permite aos usuários:

- Reportar erros em informações de igrejas existentes
- Sugerir atualizações de dados desatualizados
- Enviar feedback geral sobre o sistema

**Como funciona:**
1. Usuário clica no botão "Reportar problema/atualização"
2. Preenche formulário com nome, e-mail e mensagem
3. Dados são salvos na tabela `bulk_church_submissions` com prefixo "TIPO: FEEDBACK DE USUÁRIO"
4. Admin revisa no painel do Supabase junto com outras submissões

## Acessar Submissões Pendentes

Para revisar as submissões pendentes:

1. Acesse o painel do Supabase
2. Vá para a aba "Table Editor"
3. Selecione `church_submissions` ou `bulk_church_submissions`
4. Filtre por `status = 'pending'`

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview da build
pnpm preview

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Deploy

### Deploy Recomendado

- [Vercel](https://vercel.com/) (recomendado para Nuxt 3)
- [Netlify](https://www.netlify.com/)
- Qualquer plataforma que suporte Node.js

## Roadmap

### Implementado ✅
- [x] Localizador de igrejas com mapa interativo
- [x] Sistema de busca avançado (texto, GPS, CEP, endereço)
- [x] Filtros por jurisdição
- [x] Formulário de submissão de igrejas (individual e em lote)
- [x] Sistema de feedback para reportar problemas
- [x] Dashboard de estatísticas com gráficos
- [x] Biblioteca digital do Livro de Oração Comum
- [x] Design responsivo mobile/tablet/desktop
- [x] SEO completo com Open Graph
- [x] Analytics integrado
- [x] Painel administrativo para revisar submissões
- [x] Exportação de dados (CSV/Excel)
- [x] Autenticação para admins

### Próximas Funcionalidades 🚀

- [ ] Sistema de notificações por e-mail
- [ ] API pública REST
- [ ] Sistema de favoritos para usuários
- [ ] Comentários e avaliações de igrejas
- [ ] Calendário de eventos litúrgicos
- [ ] Recursos catequéticos e educacionais
- [ ] App mobile (PWA)

## Licença

© 2025 Caminho Anglicano. Todos os direitos reservados.
