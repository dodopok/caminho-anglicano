# Páginas Estáticas de Igrejas para SEO

## 📋 Visão Geral

Este documento descreve a implementação de páginas estáticas individuais para cada igreja, otimizadas para SEO e com URLs amigáveis.

## 🎯 Objetivos

- ✅ Criar páginas individuais para cada igreja com URLs amigáveis
- ✅ Otimizar para SEO com meta tags, schema.org e Open Graph
- ✅ Exibir informações completas da igreja (endereço, horários, pastores, etc.)
- ✅ Integrar feed do Instagram quando disponível
- ✅ Gerar páginas estáticas (SSG) para melhor performance

## 🏗️ Estrutura Implementada

### 1. Sistema de Slugs

**Arquivos:**
- `layers/localizador/utils/slug.ts` - Utilitários para geração de slugs
- `scripts/generate-church-slugs.ts` - Script para gerar slugs para igrejas existentes

**Formato dos Slugs:**
```
{nome-igreja}-{cidade}-{estado}
```

**Exemplo:**
```
igreja-anglicana-da-trindade-sao-paulo-sp
```

### 2. Banco de Dados

**Migração SQL:**
```sql
-- Arquivo: supabase/migrations/add_slug_to_churches.sql
ALTER TABLE churches ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX churches_slug_unique ON churches(slug);
```

**Execução da Migração:**

1. **Via Supabase Dashboard:**
   - Acesse o projeto no Supabase
   - Vá em SQL Editor
   - Execute o conteúdo de `supabase/migrations/add_slug_to_churches.sql`

2. **Via Supabase CLI:**
   ```bash
   supabase db push
   ```

### 3. Gerar Slugs para Igrejas Existentes

Após executar a migração, execute o script para gerar slugs:

```bash
npx tsx scripts/generate-church-slugs.ts
```

**Variáveis de Ambiente Necessárias:**
```env
NUXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NUXT_SUPABASE_SERVICE_KEY=sua_service_key
```

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

1. **Utilities:**
   - `layers/localizador/utils/slug.ts`

2. **Páginas:**
   - `layers/localizador/pages/igrejas/index.vue` - Lista todas as igrejas
   - `layers/localizador/pages/igrejas/[slug].vue` - Página individual da igreja

3. **Componentes:**
   - `layers/localizador/components/ChurchDetails.vue` - Exibe detalhes completos da igreja
   - `layers/localizador/components/InstagramFeed.vue` - Widget do Instagram

4. **API:**
   - `layers/localizador/server/api/churches/slug/[slug].get.ts` - Endpoint para buscar igreja por slug

5. **Scripts:**
   - `scripts/generate-church-slugs.ts`

6. **Migrations:**
   - `supabase/migrations/add_slug_to_churches.sql`

### Arquivos Modificados

1. **Types:**
   - `layers/localizador/types/church.ts` - Adicionado campo `slug`
   - `types/database.ts` - Adicionado campo `slug` ao schema
   - `server/types/supabase.ts` - Atualizado `ChurchWithJurisdiction`

2. **Composables:**
   - `layers/localizador/composables/useChurches.ts` - Adicionado `fetchChurchBySlug()`

3. **API:**
   - `layers/localizador/server/api/churches.get.ts` - Incluído `slug` no mapeamento

4. **Config:**
   - `layers/localizador/nuxt.config.ts` - Adicionadas regras de cache e prerendering

## 🌐 URLs e Rotas

### Páginas Públicas

- **Lista de igrejas:** `/igrejas`
- **Jurisdição individual:** `/igrejas/{slug-jurisdicao}`
- **Igreja individual:** `/igrejas/{slug-jurisdicao}/{slug-igreja}`

**Estrutura hierárquica para SEO:**

A estrutura de URLs é hierárquica, facilitando navegação e SEO:

```
/igrejas
  ├── /igrejas/iacb (página da jurisdição IACB)
  │   ├── /igrejas/iacb/igreja-anglicana-da-trindade-sao-paulo-sp
  │   └── /igrejas/iacb/catedral-anglicana-rio-de-janeiro-rj
  └── /igrejas/ieab (página da jurisdição IEAB)
      ├── /igrejas/ieab/igreja-sao-pedro-brasilia-df
      └── /igrejas/ieab/paroquia-cristo-redentor-curitiba-pr
```

**Exemplos:**
```
/igrejas                                                    # Todas as igrejas
/igrejas/iacb                                              # Jurisdição IACB
/igrejas/iacb/igreja-anglicana-da-trindade-sao-paulo-sp   # Igreja individual
```

### API Endpoints

- **Buscar todas:** `GET /api/churches`
- **Buscar por ID:** `GET /api/churches/{id}`
- **Buscar por slug:** `GET /api/churches/slug/{slug}` ✨ **NOVO**

## 🎨 Features das Páginas

### Página Individual (`/igrejas/[slug]`)

#### SEO Otimizado

1. **Meta Tags:**
   - Title dinâmico com nome da igreja, cidade e estado
   - Description personalizada (ou gerada automaticamente)
   - Open Graph tags (og:title, og:description, og:image)
   - Twitter Cards

2. **Schema.org (JSON-LD):**
   ```json
   {
     "@context": "https://schema.org",
     "@type": "Church",
     "name": "Nome da Igreja",
     "address": { ... },
     "geo": { ... },
     "description": "...",
     "sameAs": ["instagram", "youtube", "website"]
   }
   ```

3. **Breadcrumbs:**
   - Início > Localizador > Igreja

#### Conteúdo Exibido

- ✅ Nome da igreja
- ✅ Badge da jurisdição (com cor)
- ✅ Descrição completa
- ✅ Endereço completo com botão "Como chegar" (Google Maps)
- ✅ Horários dos cultos
- ✅ Lista de pastores/liderança
- ✅ Redes sociais (Website, Instagram, YouTube, Spotify)
- ✅ Feed do Instagram (quando disponível)
- ✅ Email de contato

### Página de Jurisdição (`/igrejas/[jurisdictionSlug]`) ✨ **NOVO**

Cada jurisdição tem sua própria página com:

#### Features

- ✅ Header com informações da jurisdição:
  - Nome completo e sigla
  - Descrição
  - Link para website oficial
  - Estatísticas (número de igrejas, estados)
- ✅ Busca de igrejas dentro da jurisdição
- ✅ Lista de igrejas agrupadas por estado
- ✅ Cards clicáveis para cada igreja
- ✅ SEO otimizado com:
  - Meta tags personalizadas
  - Schema.org para Organization
  - Breadcrumbs (Início > Igrejas > Jurisdição)
- ✅ Design responsivo com cores da jurisdição

### Página de Lista (`/igrejas`)

#### Features

- ✅ Seção destacada de jurisdições com cards clicáveis ✨ **NOVO**
- ✅ Listagem de todas as igrejas em grid
- ✅ Filtros por:
  - Estado
  - Jurisdição
  - Busca por nome/cidade/endereço
- ✅ Cards clicáveis que levam para página individual
- ✅ Contador de resultados
- ✅ Estado vazio quando não há resultados
- ✅ SEO otimizado

## 📊 Performance e Cache

### Route Rules (Nuxt)

```typescript
routeRules: {
  '/api/churches': { swr: 60 },           // 1 minuto
  '/api/churches/slug/**': { swr: 3600 }, // 1 hora
  '/igrejas/**': { swr: 3600 }            // 1 hora
}
```

### Prerendering

As páginas são configuradas para prerendering automático:

```typescript
nitro: {
  prerender: {
    crawlLinks: true,
    routes: ['/igrejas']
  }
}
```

## 🚀 Deploy

### Passos para Deploy

1. **Executar migração no banco:**
   ```sql
   -- Execute em Supabase SQL Editor
   ALTER TABLE churches ADD COLUMN slug TEXT;
   CREATE UNIQUE INDEX churches_slug_unique ON churches(slug);
   ```

2. **Gerar slugs para igrejas existentes:**
   ```bash
   npx tsx scripts/generate-church-slugs.ts
   ```

3. **Build do projeto:**
   ```bash
   npm run build
   ```

4. **Deploy (Vercel):**
   ```bash
   vercel --prod
   ```

### Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_SUPABASE_SERVICE_KEY=eyJhbGc...
```

## 🔍 SEO Checklist

- ✅ URLs amigáveis (slugs)
- ✅ Meta tags (title, description)
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ Schema.org structured data
- ✅ Breadcrumbs
- ✅ Sitemap automático (via Nuxt)
- ✅ Cache e performance
- ✅ Mobile-friendly
- ✅ Semantic HTML

## 📱 Integração com Instagram

O componente `InstagramFeed` utiliza o embed oficial do Instagram:

- Carrega automaticamente o script do Instagram
- Exibe link para o perfil
- Widget responsivo
- Fallback quando não carrega

## 🛠️ Manutenção

### Adicionar Nova Igreja

Quando uma nova igreja é aprovada pelo admin, o slug é gerado automaticamente se:
1. O campo `slug` estiver vazio no banco
2. O script de migração for executado novamente

### Atualizar Slug Existente

**Cuidado:** Mudar um slug quebra URLs existentes!

Se necessário:
1. Atualizar no banco via SQL ou admin panel
2. Considerar criar redirect do slug antigo para o novo

### Regenerar Todos os Slugs

```bash
# Remove todos os slugs (cuidado!)
UPDATE churches SET slug = NULL;

# Regenera
npx tsx scripts/generate-church-slugs.ts
```

## 📈 Métricas e Monitoramento

Recomendações para monitorar o SEO:

1. **Google Search Console:**
   - Submeter sitemap
   - Monitorar indexação
   - Verificar erros de rastreamento

2. **Analytics:**
   - Tráfego orgânico para `/igrejas/*`
   - Taxa de rejeição
   - Tempo na página

3. **Performance:**
   - Core Web Vitals
   - Lighthouse scores
   - Cache hit rates

## 🎯 Próximos Passos (Opcional)

- [ ] Adicionar imagens das igrejas
- [ ] Galeria de fotos
- [ ] Mapa interativo na página individual
- [ ] Reviews/comentários
- [ ] Compartilhamento social
- [ ] Print-friendly version
- [ ] PWA para salvar igrejas favoritas

## 📝 Notas Técnicas

### Por que Slugs?

Slugs são importantes para SEO porque:
- URLs descritivas são mais amigáveis
- Melhor ranking nos motores de busca
- Mais fácil de compartilhar
- Usuários entendem o conteúdo pela URL

### Por que Schema.org?

Schema.org ajuda motores de busca a entender melhor o conteúdo, resultando em:
- Rich snippets nos resultados de busca
- Melhor posicionamento
- Cards mais atrativos no Google

### Cache Strategy

Usamos SWR (Stale-While-Revalidate):
- Serve conteúdo em cache imediatamente
- Revalida em background
- Melhor performance sem sacrificar frescor dos dados

---

**Desenvolvido para Caminho Anglicano** 🙏
