# 📁 Estrutura de Types do Projeto

## Organização

### `/types/` - Types do Cliente
Tipos usados no front-end (componentes, pages, composables):

- **`church.ts`** - Tipos de igrejas, filtros, jurisdições (formato front-end)
- **`database.ts`** - Tipos gerados do schema do Supabase

**Localização**: `d:\projects\caminho-anglicano\types\`

**Uso**:
```typescript
import type { Church, ChurchFilters } from '~/types/church'
```

---

### `/server/types/` - Types do Servidor
Tipos usados nos endpoints da API server-side:

- **`supabase.ts`** - Tipos para respostas do Supabase com relações (joins)

**Localização**: `d:\projects\caminho-anglicano\server\types\`

**Uso**:
```typescript
import type { ChurchWithJurisdiction } from '~/server/types/supabase'
```

---

## Types Principais

### Client-Side (`~/types/church.ts`)

```typescript
interface Church {
  id: string
  name: string
  jurisdiction: string  // Formato simplificado (ex: "IAB")
  address: string
  city: string
  // ... campos em camelCase
}
```

### Server-Side (`~/server/types/supabase.ts`)

```typescript
interface ChurchWithJurisdiction {
  id: string
  name: string
  jurisdiction_id: string  // Formato do banco (snake_case)
  jurisdiction: {          // Relação com jurisdictions
    id: string
    slug: string
    name: string
    // ...
  } | null
  // ... campos em snake_case
}
```

---

## Quando usar cada tipo?

### Use `~/types/church` quando:
- ✅ Criando componentes Vue
- ✅ Escrevendo composables do cliente
- ✅ Manipulando dados no front-end
- ✅ Props de componentes

### Use `~/server/types/supabase` quando:
- ✅ Criando endpoints da API (`/server/api/`)
- ✅ Processando dados do Supabase no servidor
- ✅ Fazendo type assertions de respostas do DB
- ✅ Transformando dados antes de enviar ao cliente

---

## Transformação de Dados

Os endpoints da API fazem a transformação de `snake_case` (banco) para `camelCase` (cliente):

```typescript
// No servidor (snake_case)
const church: ChurchWithJurisdiction = {
  jurisdiction_id: "123",
  postal_code: "12345-678",
  created_at: "2025-01-01"
}

// Transformado para o cliente (camelCase)
return {
  jurisdictionId: church.jurisdiction_id,
  postalCode: church.postal_code,
  createdAt: church.created_at
}
```

---

## Adicionando Novos Types

### Para o Cliente:
1. Adicione em `types/church.ts` ou crie novo arquivo em `types/`
2. Export com `export interface`
3. Use `~/types/seu-arquivo`

### Para o Servidor:
1. Adicione em `server/types/supabase.ts` ou crie novo arquivo
2. Export com `export interface`
3. Use `~/server/types/seu-arquivo`

---

## Benefícios desta Organização

✅ **Separação clara** - Client vs Server types  
✅ **Reutilização** - Sem duplicação de interfaces  
✅ **Manutenção** - Um lugar para cada tipo  
✅ **TypeScript feliz** - Sem erros de tipo  
✅ **Auto-complete** - IntelliSense funciona perfeitamente
