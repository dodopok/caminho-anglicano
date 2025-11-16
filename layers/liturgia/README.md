# Sistema de Gestão Litúrgica

Sistema completo para gerenciamento de liturgias, escalas de ministérios e geração automática de ordens de culto.

## Funcionalidades Implementadas

### ✅ Fase 1 - MVP (Concluído)

- [x] **Banco de Dados**
  - Schema completo com 10 tabelas
  - Migrations SQL prontas
  - Relacionamentos e índices otimizados

- [x] **Calendário Litúrgico**
  - Cálculo automático do tempo litúrgico (Advento, Quaresma, Páscoa, etc.)
  - Identificação de cores litúrgicas
  - Ano litúrgico (A, B, C) baseado no Lecionário Comum Revisado

- [x] **Cadastro de Pessoas**
  - Gerenciamento de ministros
  - Distinção entre ordenados e leigos
  - Controle de pessoas ativas/inativas
  - Dados de contato (email, telefone, WhatsApp)

- [x] **Ministérios**
  - 18 ministérios pré-configurados
  - Restrições para ministérios que requerem ordenação
  - Ordem de exibição customizável

- [x] **Calendário Mensal**
  - Visualização de todos os cultos do mês
  - Indicadores de cor litúrgica
  - Status de publicação (rascunho/publicado)
  - Navegação entre meses

- [x] **Criação de Cultos**
  - Formulário completo de escala
  - Auto-preenchimento de informações litúrgicas
  - Gestão de leituras (AT, Salmo, Epístola, Evangelho)
  - Músicas e avisos
  - Coleta do dia

- [x] **Escala de Ministérios**
  - Atribuição de pessoas a ministérios
  - Validação automática (só ordenados em certos ministérios)
  - Múltiplos ministérios por pessoa permitidos

- [x] **Visualização de Culto**
  - Detalhes completos do culto
  - Status de confirmação de cada pessoa
  - Indicadores de notificação enviada

- [x] **Geração de Documentos**
  - Geração de HTML formatado
  - Exportação para Word (.doc)
  - Estrutura preparada para PDF

## 📋 Instalação

### 1. Aplicar Migrations no Supabase

As migrations estão em `/supabase/migrations/20241116_liturgy_system.sql`.

**Opção A: Via Supabase Studio**
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo de migration
4. Execute

**Opção B: Via linha de comando (se tiver Supabase CLI)**
```bash
supabase db push
```

### 2. Verificar Variáveis de Ambiente

Certifique-se de que o `.env` contém:

```env
NUXT_PUBLIC_SUPABASE_URL=seu_url_supabase
NUXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service
```

### 3. Instalar Dependências (se necessário)

Caso queira gerar PDFs verdadeiros com Puppeteer:

```bash
pnpm add puppeteer
```

## 🎯 Como Usar

### Acessar o Sistema

```
http://localhost:3000/liturgia
```

### Fluxo Básico

1. **Cadastrar Pessoas** (`/liturgia/pessoas`)
   - Adicione os ministros da sua igreja
   - Marque quem é ordenado
   - Adicione WhatsApp para notificações

2. **Criar Culto** (`/liturgia/novo`)
   - Selecione a data (informações litúrgicas serão preenchidas automaticamente)
   - Escolha o tipo de culto
   - Escale pessoas para cada ministério
   - Adicione músicas e avisos
   - Salve como rascunho ou publique

3. **Visualizar Calendário** (`/liturgia`)
   - Veja todos os cultos do mês
   - Clique em um culto para ver detalhes
   - Use os botões para navegar entre meses

4. **Gerar Documento** (Dentro de um culto)
   - Clique em "Gerar Documento"
   - O arquivo Word será baixado automaticamente
   - Pronto para imprimir ou compartilhar no WhatsApp

## 📁 Estrutura do Layer

```
layers/liturgia/
├── pages/                    # Páginas Nuxt
│   ├── liturgia/
│   │   ├── index.vue        # Calendário mensal
│   │   ├── novo.vue         # Criar/editar culto
│   │   ├── pessoas.vue      # Gerenciar pessoas
│   │   └── [id].vue         # Visualizar culto
├── components/              # Componentes Vue
│   ├── LiturgyCalendar.vue
│   └── LiturgyPersonModal.vue
├── composables/             # Composition API
│   ├── useLiturgyPeople.ts
│   └── useLiturgyServices.ts
├── server/api/              # API Routes
│   └── liturgy/
│       ├── people/
│       ├── services/
│       ├── ministries.get.ts
│       └── service-types.get.ts
├── types/                   # TypeScript types
│   └── index.ts
├── utils/                   # Utilidades
│   ├── liturgical-calendar.ts
│   └── generate-liturgy-document.ts
└── nuxt.config.ts          # Configuração do layer
```

## 🔮 Próximas Funcionalidades

### Fase 2 - Notificações e Confirmações
- [ ] Integração com WhatsApp API (Evolution API ou similar)
- [ ] Envio automático de notificações toda segunda-feira
- [ ] Sistema de confirmação de presença via WhatsApp
- [ ] Confirmação de presença pelo site
- [ ] Gestão de substituições

### Fase 3 - Textos Litúrgicos
- [ ] Página de gerenciamento de textos litúrgicos
- [ ] Múltiplas opções de confissão, absolvição, etc.
- [ ] Textos específicos por tempo litúrgico
- [ ] Prefácios próprios
- [ ] 4 orações eucarísticas do LOC

### Fase 4 - Avisos e Recorrência
- [ ] Sistema de avisos padrão/recorrentes
- [ ] Avisos específicos por data
- [ ] Templates de avisos

### Fase 5 - Visualizações Avançadas
- [ ] Visão por pessoa (ver todas as escalas de alguém)
- [ ] Relatório de sobrecarga (quem está escalado demais)
- [ ] Histórico completo de escalas
- [ ] Estatísticas de participação

### Fase 6 - Outros Cultos
- [ ] Template para Ofício Matutino
- [ ] Template para Vésperas
- [ ] Liturgias especiais (Batismo, Casamento, Ordenação)
- [ ] Liturgias de festas maiores (Páscoa, Natal)

### Fase 7 - Melhorias
- [ ] Geração de PDF real (com Puppeteer)
- [ ] Personalização de templates de documento
- [ ] Logo da igreja no documento
- [ ] Exportação para Google Calendar
- [ ] Sistema de permissões granular
- [ ] Auditoria (quem criou/editou cada culto)
- [ ] Duplicar cultos facilmente
- [ ] Copiar escala de um domingo para outro

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **liturgy_people**: Pessoas que podem ser escaladas
- **liturgy_ministries**: Tipos de ministérios
- **liturgy_service_types**: Tipos de cultos
- **liturgy_services**: Cultos agendados
- **liturgy_schedules**: Escalas (pessoa + ministério + culto)
- **liturgy_texts**: Textos litúrgicos reutilizáveis
- **liturgy_notices**: Avisos
- **liturgy_readings**: Lecionário Comum Revisado
- **liturgy_collects**: Coletas do LOC
- **liturgy_permissions**: Permissões de usuários

## 🎨 Calendário Litúrgico

O sistema calcula automaticamente:

- **Tempo Litúrgico**: Advento, Natal, Epifania, Quaresma, Semana Santa, Páscoa, Pentecostes, Tempo Comum
- **Cor Litúrgica**: Roxo, Branco, Verde, Vermelho, Preto
- **Ano Litúrgico**: A, B ou C (ciclo trienal do RCL)
- **Semana Litúrgica**: Ex: "22° Domingo após Pentecostes"

Baseado no algoritmo de Gauss para calcular a Páscoa e regras litúrgicas anglicanas.

## 📝 Exemplo de Documento Gerado

O documento gerado inclui:

- Título com domingo litúrgico
- Data e horário
- Escala completa com nomes
- Coleta do dia
- Leituras (AT, Salmo, Epístola, Evangelho)
- Textos litúrgicos completos (Confissão, Absolvição, Oração Eucarística, Credo, etc.)
- Músicas
- Avisos
- Formatação pronta para impressão

## 🐛 Troubleshooting

### Erro ao criar culto

Verifique se:
1. As migrations foram aplicadas corretamente
2. Há pelo menos uma pessoa cadastrada
3. A data está no formato correto

### Documento não é gerado

1. Verifique se o culto tem informações básicas (data, tipo)
2. Tente usar a opção de "imprimir" do navegador como alternativa

### Pessoas não aparecem na lista

1. Verifique se estão marcadas como "Ativas"
2. Para ministérios que requerem ordenação, verifique se a pessoa está marcada como "Ordenado"

## 📞 Suporte

Para dúvidas ou problemas, contate o desenvolvedor do sistema.

## 📄 Licença

Uso interno da comunidade anglicana.
