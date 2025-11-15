# Testes - Caminho Anglicano

## Visão Geral

Este projeto utiliza **Vitest** como framework de testes, juntamente com **Vue Test Utils** e **Testing Library** para testar componentes Vue 3, composables e utilitários.

## Estrutura de Testes

A suíte de testes está organizada da seguinte forma:

### 📁 Testes de Utilitários (Utils)

- **`layers/localizador/utils/slug.test.ts`** (19 testes)
  - Funções de geração de slugs para URLs
  - Normalização de texto
  - Geração de slugs únicos para igrejas

- **`layers/admin/server/utils/validation.test.ts`** (24 testes)
  - Schemas Zod para validação de dados
  - Validação de submissões de igrejas
  - Validação de emails
  - Validação de dados em lote

- **`layers/admin/server/utils/sanitization.test.ts`** (21 testes)
  - Sanitização de HTML para prevenir XSS
  - Sanitização recursiva de objetos
  - Proteção de dados sensíveis em logs

### 🎯 Testes de Composables

- **`layers/localizador/composables/useJurisdictions.test.ts`** (9 testes)
  - Busca e cache de jurisdições
  - Funções de busca por ID e slug
  - Tratamento de erros

- **`layers/glossario/composables/useGlossary.test.ts`** (17 testes)
  - Filtros de busca e paginação
  - Navegação por letras do alfabeto
  - Sincronização com URL
  - Ordenação alfabética

### 🎨 Testes de Componentes Vue

- **`components/BaseNavigationCard.test.ts`** (8 testes)
  - Renderização com props
  - Suporte a links internos (NuxtLink) e externos
  - Acessibilidade (aria-labels)
  - Renderização de ícones

- **`layers/admin/components/StatusBadge.test.ts`** (6 testes)
  - Renderização de diferentes status (pending, approved, rejected)
  - Classes CSS condicionais
  - Transições de status

## Executando os Testes

### Executar todos os testes
```bash
pnpm test:run
```

### Executar testes em modo watch (desenvolvimento)
```bash
pnpm test
```

### Executar com interface UI
```bash
pnpm test:ui
```

### Gerar relatório de cobertura
```bash
pnpm test:coverage
```

## Configuração

A configuração do Vitest está em `vitest.config.ts`:

- **Ambiente**: `happy-dom` (simulação de DOM)
- **Globals**: Habilitado (funções como `describe`, `it`, `expect` disponíveis globalmente)
- **Auto-imports**: Vue e Vitest (via unplugin-auto-import)
- **Cobertura**: v8 provider com relatórios em text, JSON e HTML

## Melhores Práticas

### 1. Estrutura de Testes
```typescript
describe('NomeDoModulo', () => {
  beforeEach(() => {
    // Setup antes de cada teste
    vi.clearAllMocks()
  })

  it('should do something specific', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = functionToTest(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### 2. Testando Composables
```typescript
it('should fetch data', async () => {
  global.$fetch = vi.fn().mockResolvedValue(mockData)

  const { composable } = await import('./composable')
  const { fetchData } = composable()

  await fetchData()

  expect(global.$fetch).toHaveBeenCalled()
})
```

### 3. Testando Componentes Vue
```typescript
it('should render correctly', () => {
  const wrapper = mount(Component, {
    props: { title: 'Test' },
    global: {
      stubs: { NuxtLink: NuxtLinkStub }
    }
  })

  expect(wrapper.text()).toContain('Test')
})
```

## Cobertura de Código

Atualmente, a suíte de testes cobre:

- ✅ **Utilitários principais**: slug, validation, sanitization
- ✅ **Composables críticos**: useJurisdictions, useGlossary
- ✅ **Componentes base**: BaseNavigationCard, StatusBadge

### Áreas para expansão futura:

- Server API routes
- Transformadores de dados
- Componentes de modal e formulários
- Integração com Supabase (usando mocks)

## Dependências de Teste

```json
{
  "@nuxt/test-utils": "^3.20.1",
  "@testing-library/vue": "^8.1.0",
  "@testing-library/user-event": "^14.6.1",
  "@vitejs/plugin-vue": "^6.0.1",
  "@vitest/coverage-v8": "^4.0.9",
  "@vitest/ui": "^4.0.9",
  "@vue/test-utils": "^2.4.6",
  "happy-dom": "^20.0.10",
  "unplugin-auto-import": "^20.2.0",
  "vitest": "^4.0.9"
}
```

## Troubleshooting

### Problema: "computed is not defined"
**Solução**: Certifique-se de que o unplugin-auto-import está configurado no vitest.config.ts

### Problema: Testes de composables falhando
**Solução**: Use `vi.resetModules()` no beforeEach para limpar estado compartilhado

### Problema: Componentes Vue não renderizam
**Solução**: Verifique se os stubs necessários (NuxtLink, etc) estão configurados corretamente

## Contribuindo

Ao adicionar novos recursos:

1. **Sempre adicione testes** para novas funcionalidades
2. **Mantenha cobertura alta** (>80% para código crítico)
3. **Use mocks apropriados** para dependências externas
4. **Documente casos de borda** nos comentários dos testes
5. **Execute testes antes de fazer commit**: `pnpm test:run`

## Integração Contínua

Os testes são executados automaticamente em:
- PRs para branches principais
- Push para branches de desenvolvimento
- Antes do deploy em produção

---

**Total de Testes**: 104 ✅

**Última Atualização**: 2025-11-15
