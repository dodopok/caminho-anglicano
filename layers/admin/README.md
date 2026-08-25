# Painel Administrativo - Caminho Anglicano

Painel de administração para gerenciar submissões de igrejas e o cadastro geral.

## 🚀 Funcionalidades

### ✅ Implementadas

1. **Autenticação**
   - Login com email e senha via Supabase Auth
   - Proteção de rotas com middleware
   - Controle de acesso baseado em email

2. **Dashboard**
   - Estatísticas em tempo real
   - Submissões pendentes
   - Aprovações/rejeições da semana
   - Total de igrejas cadastradas
   - Lista de submissões recentes

3. **Gerenciamento de Submissões**
   - Listar todas as submissões
   - Filtrar por status (pendente/aprovado/rejeitado)
   - Buscar por nome
   - Ver detalhes completos
   - Editar informações antes de aprovar
   - Aprovar submissão (com geocodificação automática)
   - Rejeitar submissão (com notas)

4. **Gerenciamento de Igrejas**
   - Listar todas as igrejas
   - Filtrar por jurisdição e estado
   - Buscar por nome
   - Editar igrejas (em breve)
   - Exportar para CSV

## 📋 Configuração

### 1. Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
ADMIN_EMAIL=seu-email@exemplo.com
```

Este email será o único com acesso ao painel administrativo.

### 2. Criar Usuário Admin no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Navegue até **Authentication** > **Users**
3. Clique em **Add user**
4. Crie um usuário com o email configurado em `ADMIN_EMAIL`
5. Defina uma senha segura

### 3. Acessar o Painel

Após configurar, acesse:

```
http://localhost:3000/admin/login
```

Faça login com o email e senha criados no Supabase.

## 🔒 Segurança

### Autenticação

- Todas as rotas `/admin/*` são protegidas (exceto `/admin/login`)
- Middleware global verifica autenticação no cliente
- Middleware de servidor valida token JWT em todas as requisições da API

### Autorização

- Apenas o email configurado em `ADMIN_EMAIL` tem acesso
- Validação acontece tanto no cliente quanto no servidor
- Tokens JWT são verificados em cada requisição

## 🛠️ Fluxo de Aprovação de Submissões

1. Usuário submete igreja via formulário público
2. Submissão vai para tabela `church_submissions` com status `pending`
3. Admin acessa `/admin/submissions`
4. Admin clica em "Ver Detalhes" na submissão
5. Admin pode editar os campos se necessário
6. Admin clica em "Aprovar":
   - Sistema geocodifica o endereço via Google Maps API
   - Converte dados para formato da tabela `churches`
   - Encontra `jurisdiction_id` baseado no nome
   - Insere nova igreja na tabela `churches`
   - Marca submissão como `approved`
7. Ou admin clica em "Rejeitar":
   - Sistema pede motivo da rejeição
   - Marca submissão como `rejected`
   - Salva notas de revisão

## 📊 Estrutura de Arquivos

```
layers/admin/
├── nuxt.config.ts                    # Configuração do layer
├── middleware/
│   └── admin-auth.global.ts          # Proteção de rotas cliente
├── composables/
│   └── useAdminAuth.ts               # Gerenciamento de autenticação
├── pages/
│   └── admin/
│       ├── login.vue                 # Página de login
│       ├── index.vue                 # Dashboard
│       ├── submissions/
│       │   └── index.vue             # Lista de submissões
│       └── churches/
│           └── index.vue             # Lista de igrejas
├── components/
│   ├── AdminLayout.vue               # Layout do painel
│   ├── StatusBadge.vue               # Badge de status
│   └── SubmissionDetailModal.vue     # Modal de detalhes/edição
└── server/
    ├── api/
    │   └── admin/
    │       ├── stats.get.ts          # Estatísticas
    │       ├── submissions/
    │       │   ├── index.get.ts      # Listar
    │       │   └── [id]/
    │       │       ├── index.get.ts  # Ver detalhes
    │       │       ├── index.patch.ts # Editar
    │       │       ├── approve.post.ts # Aprovar
    │       │       └── reject.post.ts  # Rejeitar
    │       └── churches/
    │           ├── index.get.ts      # Listar
    │           ├── [id].patch.ts     # Editar
    │           └── export.get.ts     # Exportar CSV
    ├── middleware/
    │   └── admin-auth.ts              # Proteção da API
    └── utils/
        ├── adminAuth.ts               # Helpers de autenticação
        ├── geocoding.ts               # Geocodificação Google Maps
        └── submissionTransformer.ts   # Transformação de dados
```

## 🔧 Geocodificação

O sistema usa a **Geoapify Geocoding API** para converter endereços em coordenadas.

### Processo:

1. Quando uma submissão é aprovada
2. Sistema envia endereço completo para Google Maps API
3. API retorna:
   - Latitude e longitude
   - Cidade (parsed)
   - Estado (sigla)
   - CEP
   - Endereço formatado
4. Dados são salvos na tabela `churches`

### Custos:

- Cota gratuita: 40.000 requisições/mês
- Custo adicional: $5 por 1000 requisições

## 📝 Exportação CSV

A funcionalidade de exportação gera um arquivo CSV com:

- Nome da igreja
- Jurisdição
- Endereço completo
- Cidade, Estado, CEP
- Coordenadas (latitude, longitude)
- Email
- Redes sociais (Website, Instagram, YouTube, Spotify)

O arquivo é compatível com Excel (UTF-8 com BOM).

## 🚧 Próximas Funcionalidades

- [ ] Modal de edição de igrejas existentes
- [ ] Notificações por email (aprovação/rejeição)
- [ ] Logs de auditoria
- [ ] Suporte a múltiplos admins
- [ ] Aprovação em massa
- [ ] Dashboard com gráficos

## 🐛 Troubleshooting

### "Não autenticado" ao acessar API

- Verifique se o usuário está logado
- Verifique se o token JWT está sendo enviado no header `Authorization`
- Verifique se o email do usuário corresponde ao `ADMIN_EMAIL`

### Erro de geocodificação

- Verifique se `GEOAPIFY_API_KEY` está configurado no servidor
- Verifique se a chave tem acesso à Geoapify Geocoding API
- Verifique se você não excedeu a cota
- Verifique se o endereço está completo e válido

### Jurisdição não encontrada

- Certifique-se que o nome da jurisdição na submissão corresponde ao nome ou abreviação na tabela `jurisdictions`
- O sistema tenta match exato primeiro, depois fuzzy match
