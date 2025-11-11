# Script de Importação de Igrejas via GPX

Este script processa um arquivo GPX contendo waypoints de igrejas e gera SQLs de INSERT prontos para o banco de dados.

## Funcionalidades

✅ Lê arquivo GPX com waypoints (latitude, longitude, nome)
✅ Extrai jurisdição do nome (ex: "Igreja - IAB")
✅ Consulta Google Places API para cada igreja
✅ Obtém endereço completo, website, horários
✅ Extrai Instagram de descrições
✅ Gera SQL formatado pronto para inserir no Supabase

## Pré-requisitos

```bash
npm install xml2js
```

Certifique-se de ter `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` no arquivo `.env`.

## Como usar

### 1. Prepare o arquivo GPX

Formato esperado:
```xml
<wpt lat="-8.038852" lon="-34.8997792">
  <name>Igreja Anglicana da Santíssima Trindade - IAB</name>
  <extensions>
    <ogr:description>https://www.instagram.com/igreja</ogr:description>
  </extensions>
</wpt>
```

### 2. Execute o script

```bash
node scripts/generate-churches-from-gpx.js caminho/para/arquivo.gpx
```

Exemplo:
```bash
node scripts/generate-churches-from-gpx.js "D:\Downloads\mygeodata\Igrejas AnglicanasEpiscopais pelo Brasil.gpx"
```

### 3. Aguarde o processamento

O script irá:
- Processar cada waypoint
- Consultar Google Places API (com delay de 500ms entre requisições)
- Exibir progresso no console
- Gerar arquivo `output/churches-import.sql`

### 4. Revise o arquivo SQL

Abra `output/churches-import.sql` e:
- ✅ Verifique endereços obtidos pela API
- ⚠️ Preencha `jurisdiction_id = NULL` manualmente
- ⚠️ Substitua emails genéricos `contato@exemplo.com`
- ✅ Ajuste horários de culto se necessário

### 5. Execute no Supabase

Copie o conteúdo de `output/churches-import.sql` e execute no SQL Editor do Supabase.

## Formato de saída

```sql
-- Igreja Anglicana Porto - REB
INSERT INTO churches (
  name, jurisdiction_id, address, city, state, postal_code,
  latitude, longitude, schedules, description, pastors,
  responsible_email, social_media
) VALUES (
  'Igreja Anglicana Porto',
  (SELECT id FROM jurisdictions WHERE slug = 'REB'),
  'Rua Exemplo, 123',
  'São Paulo', 'SP', '01234-567',
  -23.5507, -46.6334,
  '[{"day": "Domingo", "time": "10:00"}]'::jsonb,
  'Descrição da igreja',
  ARRAY[]::TEXT[],
  'contato@exemplo.com',
  '{"instagram": "@igrejaporto", "website": "https://site.com"}'::jsonb
);
```

## Jurisdições suportadas

O script reconhece automaticamente:
- `IAB` - Igreja Anglicana do Brasil
- `IEAB` - Igreja Episcopal Anglicana do Brasil
- `IECB` - Igreja Episcopal Carismática do Brasil
- `IARB` - Igreja Anglicana Reformada do Brasil
- `REB` - Rede Evangélica Brasileira
- `TAC` / `ICEB` / `IEUB` / `Independente`

Igrejas sem jurisdição no nome terão `jurisdiction_id = NULL` para preenchimento manual.

## Limitações e observações

### Google Places API
- ⚠️ Nem todas as igrejas estão cadastradas no Google
- ⚠️ Endereços podem estar imprecisos
- ⚠️ Horários de culto são estimativas (revisar manualmente)
- ℹ️ Script usa delay de 500ms entre requisições (evita rate limit)

### Dados extraídos
- ✅ **Latitude/Longitude**: Do GPX (100% confiável)
- ✅ **Nome**: Do GPX, limpo da jurisdição
- ✅ **Jurisdição**: Extraída do nome
- ⚙️ **Endereço**: Da API do Google (revisar)
- ⚙️ **Website**: Da API do Google (quando disponível)
- ⚙️ **Instagram**: De descrições GPX ou API
- ❌ **Email**: Genérico (preencher manualmente)
- ❌ **Pastores**: Vazio (preencher manualmente)
- ⚙️ **Horários**: Estimados da API (revisar)

## Troubleshooting

### Erro: "GOOGLE_MAPS_API_KEY não encontrada"
Adicione a chave no `.env`:
```
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-aqui
```

### Erro: "xml2js não encontrado"
Instale a dependência:
```bash
npm install xml2js
```

### Muitas igrejas "sem detalhes"
Isso é normal. Nem todas as igrejas pequenas estão no Google Places. O script gerará SQLs básicos com lat/lng e você pode preencher manualmente.

### Rate limit da API do Google
O script já inclui delay de 500ms. Se ainda assim houver problemas, aumente o `DELAY_MS` no código.

## Próximos passos após importação

1. Execute o SQL no Supabase
2. Verifique igrejas importadas no localizador
3. Preencha dados faltantes via interface de admin
4. Teste busca por proximidade
5. Valide informações de contato

## Exemplo de uso completo

```bash
# 1. Instalar dependência
npm install xml2js

# 2. Executar script
node scripts/generate-churches-from-gpx.js "arquivo.gpx"

# 3. Revisar output/churches-import.sql

# 4. Executar SQL no Supabase

# 5. Verificar no localizador
npm run dev
# Acesse http://localhost:3000/localizador
```

## Estatísticas esperadas

Para um arquivo com ~300 igrejas:
- ⏱️ Tempo de processamento: ~3-5 minutos
- ✅ Com detalhes completos: ~60-70%
- ⚠️ Sem detalhes (apenas básico): ~30-40%
- 📊 Taxa de sucesso: Depende da qualidade dos dados no Google

## Suporte

Se encontrar problemas:
1. Verifique os logs no console
2. Revise o arquivo GPX
3. Teste com um subconjunto menor primeiro
4. Ajuste o `DELAY_MS` se houver rate limiting
