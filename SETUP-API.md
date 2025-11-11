# 🔧 Guia Rápido: Configuração da API Server-Side

## 1️⃣ Adicionar Service Key no .env

No seu arquivo `.env`, adicione:

```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Onde encontrar:**
- Dashboard do Supabase → **Settings** → **API** → **service_role key**

## 2️⃣ Executar as Políticas RLS (Opcional)

Como agora usamos a service key no servidor, as políticas RLS antigas não são mais necessárias para o funcionamento básico. Mas você pode manter para segurança adicional:

```sql
-- Execute no Supabase SQL Editor
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_church_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "church_submissions_insert_policy"
ON church_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "bulk_church_submissions_insert_policy"
ON bulk_church_submissions
FOR INSERT
WITH CHECK (true);
```

## 3️⃣ Testar

```bash
npm run dev
```

Teste:
- ✅ Listagem de igrejas no localizador
- ✅ Filtros e busca
- ✅ Submissão de nova igreja
- ✅ Submissão em lote

## 🎉 Pronto!

Agora sua aplicação:
- ✅ É mais segura (credenciais no servidor)
- ✅ Tem cache automático (mais rápida)
- ✅ Não depende de RLS policies complexas
- ✅ Valida dados antes de inserir no banco

## 🐛 Troubleshooting

**Erro: "Missing supabaseServiceKey"**
→ Certifique-se de adicionar a variável no `.env`

**Erro 500 ao submeter igreja**
→ Verifique se a service key está correta

**Cache muito agressivo**
→ Ajuste em `nuxt.config.ts` na seção `routeRules`
