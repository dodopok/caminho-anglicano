# 🔄 Migração para Jurisdições Dinâmicas

## Mudanças Implementadas

O sistema foi atualizado para usar jurisdições dinâmicas em vez de valores hard-coded.

### ✅ O que mudou:

1. **Nova Tabela `jurisdictions`**
   - Armazena todas as jurisdições com suas configurações
   - Campos: id, slug, name, full_name, color, description, website, active, display_order

2. **Tabela `churches` atualizada**
   - Agora usa `jurisdiction_id` (UUID) em vez de `jurisdiction` (TEXT)
   - Relacionamento via Foreign Key com a tabela `jurisdictions`

3. **Tipos TypeScript atualizados**
   - `Jurisdiction` agora é uma interface completa (não mais union type)
   - `Church` tem `jurisdictionId` e opcionalmente `jurisdiction` (objeto completo)

4. **Novo Composable `useJurisdictions`**
   - `fetchJurisdictions()` - Busca todas as jurisdições ativas
   - `fetchJurisdictionById(id)` - Busca uma jurisdição específica

5. **Composable `useChurches` atualizado**
   - Faz JOIN automático com a tabela jurisdictions
   - Retorna igreja com dados completos da jurisdição

6. **Components atualizados**
   - `GoogleMap.vue` - Usa cor da jurisdição dinamicamente
   - `AddChurchModal.vue` - Carrega jurisdições do banco
   - `pages/localizador.vue` - Busca jurisdições dinamicamente

## 📋 Como Migrar

### 1. Backup do Banco (IMPORTANTE!)

```sql
-- Faça backup das suas igrejas existentes
SELECT * FROM churches;
```

### 2. Limpar Banco Atual

```sql
-- Remover tabelas antigas
DROP TABLE IF EXISTS bulk_church_submissions CASCADE;
DROP TABLE IF EXISTS church_submissions CASCADE;
DROP TABLE IF EXISTS churches CASCADE;
DROP TABLE IF EXISTS jurisdictions CASCADE;
```

### 3. Executar Novo Schema

No Supabase SQL Editor, execute o arquivo `supabase-schema.sql` atualizado.

Isso irá:
- Criar a tabela `jurisdictions`
- Criar a tabela `churches` com o novo formato
- Inserir as 5 jurisdições padrão (IAB, IEAB, IECB, IARB, REB)
- Configurar índices e policies

### 4. Adicionar Igrejas de Teste (Opcional)

Execute o arquivo `seed-churches-updated.sql` para adicionar 10 igrejas de exemplo.

## 🎨 Jurisdições Padrão

As seguintes jurisdições são criadas automaticamente:

| Slug | Nome | Nome Completo | Cor |
|------|------|---------------|-----|
| IAB | IAB | Igreja Anglicana do Brasil | #3B82F6 (Azul) |
| IEAB | IEAB | Igreja Episcopal Anglicana do Brasil | #10B981 (Verde) |
| IECB | IECB | Igreja Episcopal Carismática do Brasil | #F59E0B (Âmbar) |
| IARB | IARB | Igreja Anglicana Reformada do Brasil | #EF4444 (Vermelho) |
| REB | REB | Rede Evangélica Brasileira | #8B5CF6 (Roxo) |

## ➕ Como Adicionar Novas Jurisdições

### Via SQL:

```sql
INSERT INTO jurisdictions (slug, name, full_name, color, display_order)
VALUES ('NOVA', 'NOVA', 'Nova Jurisdição Anglicana', '#FF5733', 6);
```

### Via Painel Admin (futuro):

Quando implementarmos o painel admin, você poderá adicionar jurisdições pela interface.

## 🔍 Verificar Migração

Após executar a migração, verifique:

```sql
-- Ver todas as jurisdições
SELECT * FROM jurisdictions ORDER BY display_order;

-- Ver igrejas com suas jurisdições
SELECT
  c.name as igreja,
  j.name as jurisdicao,
  c.city,
  c.state
FROM churches c
JOIN jurisdictions j ON c.jurisdiction_id = j.id
ORDER BY j.display_order, c.name;
```

## ⚠️ Notas Importantes

1. **Não** use o arquivo `seed-churches.sql` antigo - ele usa o formato antigo
2. **Use** o arquivo `seed-churches-updated.sql` - ele usa o novo formato com jurisdiction_id
3. As submissões (`church_submissions`) ainda usam `jurisdiction` como TEXT para permitir valores customizados
4. O modal permite selecionar "Outra" jurisdição e especificar um nome customizado

## 🚀 Benefícios

✅ Facilita adicionar novas jurisdições sem código
✅ Permite configurar cores e descrições por jurisdição
✅ Mais flexível para futuras expansões
✅ Dados mais normalizados e organizados
✅ Facilita relatórios e estatísticas por jurisdição
