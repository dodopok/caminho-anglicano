# 🚀 Guia Rápido de Início

## 1️⃣ Configure as Variáveis de Ambiente

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Edite o `.env` e adicione suas credenciais:

```env
NUXT_PUBLIC_SUPABASE_URL=sua-url-aqui
NUXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-aqui
```

## 2️⃣ Execute o Schema SQL no Supabase

1. Abra o Supabase: https://supabase.com
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase-schema.sql`
4. Clique em **RUN**

**Opcional - Adicionar igrejas de teste:**

5. Cole o conteúdo de `seed-churches.sql`
6. Clique em **RUN**
7. Agora você tem 10 igrejas de exemplo para testar!

## 3️⃣ Inicie o Servidor

```bash
pnpm dev
```

## 4️⃣ Acesse o Site

- Home: http://localhost:3000
- Localizador: http://localhost:3000/localizador

## ✅ O que Você Pode Testar

1. **Navegação**: Clique em "Localizador de Igrejas" na home
2. **Filtros**: Teste os filtros por jurisdição
3. **Busca**: Busque por nome ou cidade
4. **Busca por CEP**: Digite um CEP brasileiro (ex: 01310-100)
5. **Adicionar Igreja**: Clique em "Adicionar Uma Igreja" e preencha o formulário
6. **Adicionar Múltiplas**: Teste o modal de adicionar múltiplas igrejas

## 📱 Teste Responsivo

- Abra o DevTools (F12)
- Clique no ícone de dispositivo móvel
- Teste em diferentes tamanhos de tela

## 🐛 Problemas Comuns

### Mapa não carrega
- ✅ Verifique se a API Key do Google Maps está correta
- ✅ Verifique se a Maps JavaScript API está ativada no Google Cloud

### Erro ao buscar igrejas
- ✅ Verifique se o Supabase URL e Key estão corretos
- ✅ Verifique se o schema SQL foi executado
- ✅ Verifique se as políticas RLS estão configuradas (schema faz isso automaticamente)

### Erro ao submeter igreja
- ✅ Verifique se preencheu os campos obrigatórios
- ✅ Verifique as políticas RLS no Supabase

## 📊 Ver Submissões no Supabase

1. Acesse seu projeto no Supabase
2. Vá em **Table Editor**
3. Selecione `church_submissions`
4. Você verá as submissões com `status = 'pending'`

## 🎯 Pronto!

Agora você tem um localizador de igrejas funcionando!

Para colocar em produção, veja o arquivo `SETUP-INSTRUCTIONS.md`.
