import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vitest'],
      dts: true,
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/e2e/**', // Exclude E2E tests from Vitest
      '**/playwright.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        'dist/',
        '**/*.config.*',
        '**/*.spec.*',
        '**/*.test.*',
        '**/types/**',
        '**/*.d.ts',
        'e2e/**',
        'playwright.config.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '#app': fileURLToPath(new URL('./.nuxt/', import.meta.url)),
      '#imports': fileURLToPath(new URL('./.nuxt/imports.d.ts', import.meta.url)),
    },
  },
})
