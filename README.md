# Caminho Anglicano

Portal de recursos e serviços para a comunidade anglicana brasileira.

## Funcionalidades

### Localizador de Igrejas Anglicanas

- 🗺️ Visualização de igrejas em mapa interativo do Google Maps
- 🔍 Busca por nome, cidade ou endereço/CEP
- 🏛️ Filtros por jurisdição (IAB, IEAB, IECB, IARB)
- ➕ Formulário para adicionar novas igrejas (sujeito a revisão)
- 📝 Opção para adicionar múltiplas igrejas de uma vez
- 📱 Design responsivo para mobile, tablet e desktop

## Tecnologias

- **Frontend**: Nuxt 3 + Vue 3 + TypeScript
- **Estilo**: Tailwind CSS
- **Mapa**: Google Maps JavaScript API
- **Banco de Dados**: Supabase
- **Geocoding**: ViaCEP (CEP brasileiro) + Nominatim (OpenStreetMap)

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
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-do-google-maps
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
-- Cole o conteúdo de seed-churches.sql
```

### 4. Configurar Google Maps API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative as seguintes APIs:
   - Maps JavaScript API
4. Crie credenciais (API Key)
5. Configure restrições para sua API key (recomendado para produção)

### 5. Executar em Desenvolvimento

```bash
pnpm dev
```

O site estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
caminho-anglicano/
├── components/
│   ├── GoogleMap.vue              # Componente do mapa
│   ├── AddChurchModal.vue         # Modal para adicionar igreja individual
│   └── AddBulkChurchesModal.vue   # Modal para adicionar múltiplas igrejas
├── composables/
│   ├── useChurches.ts             # Lógica para buscar igrejas
│   ├── useGeocoding.ts            # Lógica para geocoding (CEP/endereço)
│   └── useSubmissions.ts          # Lógica para submissões
├── pages/
│   ├── index.vue                  # Página inicial
│   └── localizador.vue            # Página do localizador
├── plugins/
│   └── supabase.client.ts         # Plugin do Supabase
├── types/
│   ├── church.ts                  # Tipos TypeScript para igrejas
│   └── database.ts                # Tipos TypeScript para o banco
└── supabase-schema.sql            # Schema SQL para o Supabase
```

## Fluxo de Adição de Igrejas

1. **Usuário submete uma igreja**: Através do formulário no site
2. **Dados salvos no Supabase**: Na tabela `church_submissions` ou `bulk_church_submissions`
3. **Revisão manual**: Admin revisa as submissões no Supabase
4. **Aprovação**: Admin copia os dados aprovados para a tabela `churches` manualmente

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

- [ ] Painel administrativo para revisar submissões
- [ ] Autenticação para admins
- [ ] Sistema de notificações por e-mail
- [ ] Exportação de dados
- [ ] API pública
- [ ] Mais recursos...

## Licença

© 2025 Caminho Anglicano. Todos os direitos reservados.
