# Layer de LOCs - Livro de Oração Comum

Esta layer gerencia a exibição de diferentes versões do Livro de Oração Comum.

## Como adicionar um novo LOC

### 1. Adicione os arquivos

Coloque os arquivos no diretório `public/`:

```
public/
├── locs/
│   ├── thumbs/
│   │   └── seu-loc.jpg
│   └── pdfs/
│       └── seu-loc.pdf
```

### 2. Edite o arquivo de dados

Abra `layers/locs/data/locs.ts` e adicione um novo objeto ao array:

```typescript
{
  id: 'seu-loc',
  title: 'Título do LOC',
  description: 'Descrição breve do LOC',
  thumbnailUrl: '/locs/thumbs/seu-loc.jpg',
  pdfUrl: '/locs/pdfs/seu-loc.pdf'
}
```

### 3. Pronto!

A página será automaticamente atualizada com o novo LOC.

## Estrutura

- `data/locs.ts` - Arquivo de configuração dos LOCs
- `types/loc.ts` - Definição de tipos TypeScript
- `pages/locs.vue` - Página principal que exibe os LOCs
