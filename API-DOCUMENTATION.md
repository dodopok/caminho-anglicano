# API Server-Side - Documentação

## 📋 Visão Geral

A aplicação agora usa uma camada de API server-side para comunicação com o Supabase, ao invés de acesso direto do cliente. Isso traz diversos benefícios:

### ✅ Benefícios

1. **Segurança**: As credenciais do Supabase (service key) ficam no servidor, não expostas no cliente
2. **Cache**: Respostas são cacheadas automaticamente, melhorando performance
3. **Controle**: Validação de dados no servidor antes de enviar ao banco
4. **Flexibilidade**: Fácil adicionar lógica de negócio, rate limiting, etc.

## 🔧 Configuração

### Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```bash
# Service Key do Supabase (encontre em Settings > API)
SUPABASE_SERVICE_KEY=eyJhbGc...
```

### Onde encontrar a Service Key

1. Acesse o dashboard do Supabase
2. Vá em **Settings** → **API**
3. Copie a **service_role key** (⚠️ NUNCA compartilhe esta chave!)

## 🛣️ Endpoints da API

### GET `/api/churches`

Busca todas as igrejas com filtros opcionais.

**Query Params:**
- `jurisdiction` (opcional): ID da jurisdição para filtrar
- `search` (opcional): Termo de busca (nome, cidade ou endereço)

**Exemplo:**
```javascript
const churches = await $fetch('/api/churches', {
  params: {
    jurisdiction: 'uuid-aqui',
    search: 'São Paulo'
  }
})
```

**Cache:** 60 segundos (SWR)

---

### GET `/api/churches/[id]`

Busca uma igreja específica por ID.

**Exemplo:**
```javascript
const church = await $fetch('/api/churches/abc-123')
```

---

### GET `/api/jurisdictions`

Lista todas as jurisdições ativas.

**Cache:** 1 hora (SWR)

**Exemplo:**
```javascript
const jurisdictions = await $fetch('/api/jurisdictions')
```

---

### POST `/api/submissions/church`

Submete uma nova igreja para aprovação.

**Body:**
```json
{
  "jurisdiction": "IAB",
  "name": "Nome da Igreja",
  "address": "Endereço completo",
  "responsibleEmail": "email@example.com",
  "schedules": "Domingos 10h",
  "description": "Descrição",
  "pastors": "Nome do Pastor",
  "website": "https://...",
  "instagram": "@igreja",
  "youtube": "canal",
  "spotify": "playlist"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    ...
  }
}
```

---

### POST `/api/submissions/bulk`

Submete múltiplas igrejas de uma vez.

**Body:**
```json
{
  "bulkData": "texto com múltiplas igrejas formatado"
}
```

## 🔄 Migração do Código

### Antes (acesso direto ao Supabase):
```typescript
const { $supabase } = useNuxtApp()
const { data } = await $supabase.from('churches').select('*')
```

### Depois (usando API):
```typescript
const churches = await $fetch('/api/churches')
```

## 📦 Composables Atualizados

### `useChurches()`
- ✅ Agora usa `/api/churches`
- ✅ Não precisa mais do plugin Supabase
- ✅ Cache automático

### `useSubmissions()`
- ✅ Agora usa `/api/submissions/*`
- ✅ Validação server-side
- ✅ Não precisa mais de políticas RLS complexas

## 🚀 Deploy

No ambiente de produção (Vercel, Netlify, etc.), configure a variável de ambiente:

```bash
SUPABASE_SERVICE_KEY=sua-service-key-aqui
```

**⚠️ IMPORTANTE:** 
- Nunca commite o arquivo `.env` com a service key
- Use o painel de configuração da plataforma de deploy
- A service key tem acesso total ao banco, mantenha segura

## 🎯 Próximos Passos

Possíveis melhorias futuras:

- [ ] Rate limiting nas submissões
- [ ] Validação de email na API
- [ ] Notificações quando novas igrejas são submetidas
- [ ] API de administração para aprovar submissões
- [ ] Logs de auditoria
