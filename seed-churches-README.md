# 🌱 Seed de Igrejas para Teste

Este arquivo contém 10 igrejas de exemplo para testar o localizador.

## 📍 Igrejas Incluídas

1. **Catedral Anglicana de São Paulo** (IAB) - São Paulo, SP
2. **Igreja Episcopal Cristo Redentor** (IEAB) - Rio de Janeiro, RJ
3. **Igreja Episcopal Carismática de Brasília** (IECB) - Brasília, DF
4. **Igreja Anglicana Reformada Graça e Paz** (IARB) - Belo Horizonte, MG
5. **Comunidade Anglicana Curitiba** (REB) - Curitiba, PR
6. **Igreja Anglicana São Pedro** (IAB) - Porto Alegre, RS
7. **Igreja Episcopal da Santíssima Trindade** (IEAB) - Recife, PE
8. **Igreja Episcopal Carismática Fonte da Vida** (IECB) - Fortaleza, CE
9. **Paróquia Anglicana Santa Cruz** (IAB) - Campinas, SP
10. **Comunidade Anglicana Nova Aliança** (REB) - Salvador, BA

## 🚀 Como Usar

### 1. Execute o schema primeiro

Certifique-se de que você já executou o `supabase-schema.sql` antes de executar o seed.

### 2. Execute o seed

No Supabase SQL Editor:

1. Abra o arquivo `seed-churches.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN**

### 3. Verifique os dados

Execute esta query para ver as igrejas inseridas:

```sql
SELECT name, jurisdiction, city, state
FROM churches
ORDER BY city;
```

## 📊 Distribuição

- **IAB**: 3 igrejas (São Paulo, Porto Alegre, Campinas)
- **IEAB**: 2 igrejas (Rio de Janeiro, Recife)
- **IECB**: 2 igrejas (Brasília, Fortaleza)
- **IARB**: 1 igreja (Belo Horizonte)
- **REB**: 2 igrejas (Curitiba, Salvador)

## 🗺️ Coordenadas

Todas as coordenadas são reais e correspondem às cidades indicadas. Os endereços são fictícios mas plausíveis.

## 🧹 Limpar os Dados de Teste

Se você quiser remover todas as igrejas de teste:

```sql
DELETE FROM churches;
```

**⚠️ AVISO**: Isso apagará TODAS as igrejas do banco. Use com cuidado!
