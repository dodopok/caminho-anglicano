# Instruções de Configuração - Caminho Anglicano

## ✅ Projeto Criado com Sucesso!

O localizador de igrejas anglicanas foi implementado com todas as funcionalidades solicitadas.

## 📋 Próximos Passos para Colocar no Ar

### 1. Configurar as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Preencha com suas credenciais:

```env
NUXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-google-maps-aqui
```

### 2. Configurar o Supabase

1. Acesse https://supabase.com e entre no seu projeto
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo do arquivo `supabase-schema.sql`
4. Isso criará as 3 tabelas necessárias:
   - `churches` - Igrejas aprovadas
   - `church_submissions` - Submissões individuais
   - `bulk_church_submissions` - Submissões em massa

### 3. Obter Credenciais do Supabase

No painel do Supabase:
1. Vá em **Settings** > **API**
2. Copie o **Project URL** (NUXT_PUBLIC_SUPABASE_URL)
3. Copie a **anon/public key** (NUXT_PUBLIC_SUPABASE_ANON_KEY)

### 4. Configurar Google Maps API

1. Acesse https://console.cloud.google.com/
2. Crie um projeto ou selecione um existente
3. Vá em **APIs & Services** > **Library**
4. Ative a **Maps JavaScript API**
5. Vá em **Credentials** > **Create Credentials** > **API Key**
6. Copie a chave (NUXT_PUBLIC_GOOGLE_MAPS_API_KEY)

⚠️ **IMPORTANTE**: Configure restrições na API Key para segurança:
- Em **Application restrictions**: HTTP referrers
- Adicione: `caminhoanglicano.com.br/*`

### 5. Testar Localmente

```bash
pnpm dev
```

Acesse:
- Home: http://localhost:3000
- Localizador: http://localhost:3000/localizador

## 🎯 Funcionalidades Implementadas

✅ **Página Inicial (Home)**
- Design minimalista e clean
- Link para o localizador
- Responsivo

✅ **Localizador de Igrejas**
- Mapa do Google Maps com marcadores por jurisdição
- Filtros por jurisdição (IAB, IEAB, IECB, IARB)
- Busca por nome ou cidade
- Busca por CEP ou endereço (usando ViaCEP + Nominatim)
- Lista de igrejas encontradas
- Seleção de igreja no mapa
- Totalmente responsivo

✅ **Adicionar Igreja (Modal)**
- Formulário completo para adicionar uma igreja
- Campos obrigatórios: jurisdição, nome, endereço, e-mail
- Campos opcionais: horários, descrição, pastores, redes sociais
- Validação de campos

✅ **Adicionar Múltiplas Igrejas (Modal)**
- Campo de texto para colar dados de múltiplas igrejas
- Formato livre com exemplo
- Salva tudo em um único registro para revisão

✅ **Sistema de Submissão**
- Salva no Supabase para revisão manual
- Status: pending, approved, rejected
- Feedback visual para o usuário

## 🔐 Como Revisar Submissões

### No Supabase (Temporário)

1. Acesse seu projeto no Supabase
2. Vá em **Table Editor**
3. Selecione `church_submissions` ou `bulk_church_submissions`
4. Filtre por `status = 'pending'`
5. Revise os dados
6. Se aprovado: copie os dados para a tabela `churches`
7. Atualize o status para 'approved' ou 'rejected'

### Campos da Tabela `churches`

Ao copiar dados aprovados, você precisará:
- Usar um geocoding service para obter latitude/longitude
- Converter os campos para o formato correto:
  - `schedules`: JSON array `[{"day": "Domingo", "time": "10h"}]`
  - `pastors`: Array de strings `["Rev. João Silva"]`
  - `social_media`: JSON object `{"website": "...", "instagram": "..."}`

## 🚀 Deploy

### Opção 1: Vercel (Recomendado)

```bash
# Instale o Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

Ou conecte seu repositório GitHub no painel da Vercel.

**Configure as variáveis de ambiente no painel da Vercel:**
- NUXT_PUBLIC_SUPABASE_URL
- NUXT_PUBLIC_SUPABASE_ANON_KEY
- NUXT_PUBLIC_GOOGLE_MAPS_API_KEY

### Opção 2: Netlify

1. Conecte seu repositório no painel da Netlify
2. Build command: `pnpm build`
3. Publish directory: `.output/public`
4. Configure as variáveis de ambiente

### Domínio

Configure o domínio `caminhoanglicano.com.br` nas configurações do seu provedor de deploy.

## 📊 Estrutura de Dados

### Church (Igreja Aprovada)
```typescript
{
  id: string
  name: string
  jurisdiction: 'IAB' | 'IEAB' | 'IECB' | 'IARB'
  address: string
  city: string
  state: string
  postalCode: string
  latitude: number
  longitude: number
  schedules: Array<{day: string, time: string}>
  description?: string
  pastors: string[]
  responsibleEmail: string
  socialMedia: {
    website?: string
    instagram?: string
    youtube?: string
    spotify?: string
  }
}
```

### ChurchSubmission (Submissão Individual)
```typescript
{
  id: string
  jurisdiction: string
  name: string
  address: string
  schedules?: string
  description?: string
  pastors?: string
  responsibleEmail: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
  status: 'pending' | 'approved' | 'rejected'
}
```

## 🎨 Cores das Jurisdições

- **IAB**: Azul (#3B82F6)
- **IEAB**: Verde (#10B981)
- **IECB**: Âmbar (#F59E0B)
- **IARB**: Vermelho (#EF4444)
- **REB**: Roxo (#8B5CF6)

## 🔮 Próximas Melhorias Sugeridas

1. **Painel Administrativo**
   - Interface para revisar submissões
   - Aprovar/rejeitar com um clique
   - Edição de igrejas existentes

2. **Autenticação**
   - Login para administradores
   - Proteção de rotas administrativas

3. **Notificações**
   - E-mail quando uma submissão é feita
   - E-mail quando uma submissão é aprovada

4. **Melhorias no Mapa**
   - Clustering de marcadores
   - Busca por proximidade (raio em km)
   - Direções até a igreja

5. **SEO**
   - Meta tags dinâmicas
   - Sitemap
   - Schema.org markup

## 📞 Suporte

Se tiver dúvidas durante a configuração:
1. Verifique se todas as variáveis de ambiente estão corretas
2. Confira se o schema SQL foi executado no Supabase
3. Verifique se a API do Google Maps está ativada
4. Rode `pnpm typecheck` para verificar erros de tipo

---

**Desenvolvido com Vue 3 + Nuxt 3 + TypeScript + Tailwind CSS**
