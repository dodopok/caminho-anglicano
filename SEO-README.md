# SEO - Guia de Configuração

## Imagens Open Graph

Para completar a configuração de SEO, você precisa adicionar as seguintes imagens na pasta `public/`:

### 1. `og-image.png` (Home)
- **Dimensões**: 1200x630 pixels
- **Formato**: PNG ou JPG
- **Conteúdo sugerido**: Logo do Caminho Anglicano + texto "Portal da Comunidade Anglicana Brasileira"

### 2. `og-image-localizador.png` (Localizador)
- **Dimensões**: 1200x630 pixels
- **Formato**: PNG ou JPG
- **Conteúdo sugerido**: Screenshot do mapa + texto "Encontre Igrejas Anglicanas no Brasil"

## Ferramentas para criar imagens OG

- [Canva](https://www.canva.com/) - Templates prontos para Open Graph
- [Figma](https://www.figma.com/) - Design profissional
- [Bannerbear](https://www.bannerbear.com/) - Gerador automático

## URL de Produção

Atualize a variável `siteUrl` nos seguintes arquivos quando fizer deploy:

1. `pages/index.vue` (linha 2)
2. `pages/localizador.vue` (linha 4)

```typescript
const siteUrl = 'https://seu-dominio.com.br'
```

## O que foi implementado

### Meta Tags Básicas
- ✅ Title otimizado para cada página
- ✅ Description única e descritiva
- ✅ Canonical URL
- ✅ Language (pt-BR)
- ✅ Viewport e charset

### Open Graph (Facebook, LinkedIn, WhatsApp)
- ✅ og:title
- ✅ og:description
- ✅ og:image
- ✅ og:url
- ✅ og:type

### Twitter Cards
- ✅ twitter:card (summary_large_image)
- ✅ twitter:title
- ✅ twitter:description
- ✅ twitter:image

### Schema.org (JSON-LD)
- ✅ WebSite schema na home
- ✅ WebApplication schema no localizador
- ✅ SearchAction para Google Search Box

## Como testar

### 1. Meta Tags
```bash
# Inspecione o HTML gerado
curl https://seu-site.com.br | grep -A 5 "meta"
```

### 2. Open Graph
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### 3. Twitter Cards
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 4. Schema.org
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)

## Melhorias Futuras

### Sitemap XML
Adicione um plugin para gerar sitemap automaticamente:

```bash
pnpm add -D @nuxtjs/sitemap
```

```typescript
// nuxt.config.ts
modules: ['@nuxtjs/sitemap'],
sitemap: {
  hostname: 'https://seu-dominio.com.br',
  gzip: true
}
```

### robots.txt
Crie o arquivo `public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://seu-dominio.com.br/sitemap.xml
```

### Google Analytics / Search Console
- Configure o Google Analytics via Vercel Analytics (já instalado)
- Registre o site no [Google Search Console](https://search.google.com/search-console)
- Envie o sitemap XML

## Performance

As seguintes otimizações já estão implementadas:
- ✅ Preconnect para Google Fonts
- ✅ Favicon em múltiplos formatos
- ✅ CSS crítico inline (app.vue)
- ✅ Cache de API (60s churches, 1h jurisdictions)
