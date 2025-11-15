# Testes - Caminho Anglicano

## Visão Geral

Este projeto utiliza uma abordagem completa de testes, combinando:
- **Vitest** para testes unitários e de integração
- **Playwright** para testes E2E (End-to-End)
- **Axe** para testes de acessibilidade
- **GitHub Actions** para CI/CD

## 📊 Estatísticas Atuais

- **134 testes unitários** ✅
- **3 suítes E2E** (home, glossário, localizador)
- **12 testes de acessibilidade**
- **Cobertura**: Configurada com thresholds de 60% (lines, functions, statements) e 55% (branches)

## Estrutura de Testes

### 📁 Testes Unitários (Unit Tests)

#### **Utils** (64 testes)
- `layers/localizador/utils/slug.test.ts` (19 testes)
  - Funções de geração de slugs para URLs
  - Normalização de texto
  - Geração de slugs únicos para igrejas

- `layers/admin/server/utils/validation.test.ts` (24 testes)
  - Schemas Zod para validação de dados
  - Validação de submissões de igrejas
  - Validação de emails
  - Validação de dados em lote

- `layers/admin/server/utils/sanitization.test.ts` (21 testes)
  - Sanitização de HTML para prevenir XSS
  - Sanitização recursiva de objetos
  - Proteção de dados sensíveis em logs

#### **Composables** (45 testes)
- `layers/localizador/composables/useJurisdictions.test.ts` (9 testes)
  - Busca e cache de jurisdições
  - Funções de busca por ID e slug
  - Tratamento de erros

- `layers/localizador/composables/useChurches.test.ts` (10 testes)
  - Busca de igrejas com filtros
  - Busca por ID e slug
  - Filtros client-side
  - Tratamento de erros

- `layers/localizador/composables/useSubmissions.test.ts` (9 testes)
  - Submissão de igrejas individuais
  - Submissão em lote
  - Validação de dados
  - Redes sociais

- `layers/glossario/composables/useGlossary.test.ts` (17 testes)
  - Filtros de busca e paginação
  - Navegação por letras do alfabeto
  - Sincronização com URL
  - Ordenação alfabética

#### **API Routes** (11 testes)
- `layers/localizador/server/api/churches.get.test.ts` (5 testes)
  - Busca de igrejas
  - Filtros de busca
  - Mapeamento de dados
  - Tratamento de erros

- `layers/localizador/server/api/jurisdictions.get.test.ts` (6 testes)
  - Busca de jurisdições ativas
  - Ordenação por display_order
  - Mapeamento camelCase
  - Tratamento de erros

#### **Componentes Vue** (14 testes)
- `components/BaseNavigationCard.test.ts` (8 testes)
  - Renderização com props
  - Suporte a links internos (NuxtLink) e externos
  - Acessibilidade (aria-labels)
  - Renderização de ícones

- `layers/admin/components/StatusBadge.test.ts` (6 testes)
  - Renderização de diferentes status
  - Classes CSS condicionais
  - Transições de status

### 🌐 Testes E2E (End-to-End)

#### **Páginas Principais**
- `e2e/home.spec.ts`
  - Carregamento da página
  - Navegação entre seções
  - Responsividade
  - PWA manifest

- `e2e/glossario.spec.ts`
  - Exibição de termos
  - Filtros de busca
  - Filtros por letra
  - Paginação
  - SEO

- `e2e/localizador.spec.ts`
  - Filtros de jurisdições
  - Busca de igrejas
  - Navegação para detalhes
  - Mapas
  - Responsividade

#### **Acessibilidade**
- `e2e/accessibility.spec.ts` (12 testes)
  - WCAG 2.1 AA compliance
  - Navegação por teclado
  - Textos alternativos
  - Hierarquia de cabeçalhos
  - Contraste de cores
  - Labels em formulários
  - Indicadores de foco

## Executando os Testes

### Testes Unitários

```bash
# Modo watch (desenvolvimento)
pnpm test

# Execução única
pnpm test:run

# Com interface UI
pnpm test:ui

# Gerar relatório de cobertura
pnpm test:coverage
```

### Testes E2E

```bash
# Executar todos os testes E2E
pnpm test:e2e

# Com interface UI
pnpm test:e2e:ui

# Com navegador visível
pnpm test:e2e:headed

# Apenas Chromium
pnpm test:e2e:chromium
```

### Executar Tudo

```bash
# Executar testes unitários + E2E
pnpm test:all
```

## Configuração

### Vitest (`vitest.config.ts`)

```typescript
{
  environment: 'happy-dom',
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 55,
      statements: 60,
    }
  }
}
```

### Playwright (`playwright.config.ts`)

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: http://localhost:3000
- **Retries**: 2 (em CI)
- **Screenshots**: Apenas em falhas
- **Trace**: Na primeira retry

## CI/CD (GitHub Actions)

Configurado em `.github/workflows/test.yml`:

### Jobs

1. **test**: Executa testes unitários com cobertura
2. **typecheck**: Verifica tipos TypeScript
3. **lint**: Executa ESLint
4. **build**: Verifica se o projeto compila

### Triggers

- Push para `main`, `develop`, `claude/**`
- Pull requests para `main`, `develop`

## Melhores Práticas

### 1. Estrutura de Testes

```typescript
describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules() // Para composables com estado compartilhado
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

### 4. Testando API Routes

```typescript
it('should return data', async () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }

  vi.mocked(createClient).mockReturnValue(mockSupabase as any)

  const handler = (await import('./route')).default
  const result = await handler({} as any)

  expect(result).toEqual([])
})
```

### 5. Testes E2E

```typescript
test('should navigate correctly', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Link Text')
  await expect(page).toHaveURL(/\/expected-path/)
})
```

### 6. Testes de Acessibilidade

```typescript
test('should not have violations', async ({ page }) => {
  await page.goto('/')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
```

## Cobertura de Código

### Thresholds Configurados

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 55%
- **Statements**: 60%

### Visualizar Cobertura

```bash
pnpm test:coverage
open coverage/index.html
```

### Relatórios

- **Text**: Console
- **HTML**: `coverage/index.html`
- **JSON**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info` (para Codecov)

## Dependências de Teste

```json
{
  "@axe-core/playwright": "^4.11.0",
  "@nuxt/test-utils": "^3.20.1",
  "@playwright/test": "^1.56.1",
  "@testing-library/vue": "^8.1.0",
  "@testing-library/user-event": "^14.6.1",
  "@vitejs/plugin-vue": "^6.0.1",
  "@vitest/coverage-v8": "^4.0.9",
  "@vitest/ui": "^4.0.9",
  "@vue/test-utils": "^2.4.6",
  "happy-dom": "^20.0.10",
  "unplugin-auto-import": "^20.2.0",
  "vitest": "^4.0.9",
  "vitest-axe": "^0.1.0"
}
```

## Troubleshooting

### Problema: "computed is not defined"
**Solução**: Certifique-se de que o unplugin-auto-import está configurado no vitest.config.ts

### Problema: Testes de composables falhando
**Solução**: Use `vi.resetModules()` no beforeEach para limpar estado compartilhado

### Problema: Componentes Vue não renderizam
**Solução**: Verifique se os stubs necessários (NuxtLink, etc) estão configurados

### Problema: Testes E2E não encontram elementos
**Solução**: Adicione `await page.waitForLoadState('networkidle')` ou `await page.waitForTimeout()`

### Problema: Falhas de acessibilidade
**Solução**: Verifique os relatórios do Axe e corrija os problemas específicos

## Contribuindo

Ao adicionar novos recursos:

1. **Sempre adicione testes** para novas funcionalidades
2. **Mantenha cobertura alta** (>60% para código crítico)
3. **Use mocks apropriados** para dependências externas
4. **Documente casos de borda** nos comentários dos testes
5. **Execute testes antes de fazer commit**: `pnpm test:run`
6. **Verifique acessibilidade**: `pnpm test:e2e e2e/accessibility.spec.ts`

## Integração Contínua

Os testes são executados automaticamente em:
- ✅ PRs para branches principais
- ✅ Push para branches de desenvolvimento
- ✅ Antes do deploy em produção

### Badges

[![Tests](https://github.com/dodopok/caminho-anglicano/actions/workflows/test.yml/badge.svg)](https://github.com/dodopok/caminho-anglicano/actions/workflows/test.yml)

---

## 📈 Métricas

| Categoria | Testes | Cobertura Estimada |
|-----------|--------|-------------------|
| **Utils** | 64 | ~85% |
| **Composables** | 45 | ~75% |
| **Components** | 14 | ~70% |
| **API Routes** | 11 | ~65% |
| **E2E** | 3 suítes | N/A |
| **Acessibilidade** | 12 | N/A |
| **TOTAL** | **134 unit + E2E** | **~65%** |

---

**Última Atualização**: 2025-11-15
**Total de Testes**: 134 testes unitários + 3 suítes E2E + 12 testes de acessibilidade ✅
