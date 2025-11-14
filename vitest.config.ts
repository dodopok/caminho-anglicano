import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.nuxt/**',
        '*.config.ts',
        '*.config.js',
        'tests/**',
        'scripts/**',
        'public/**',
        'types/**',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
      // Critical files should have higher coverage
      perFile: true,
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
      '#app': resolve(__dirname, './.nuxt/app'),
      '#build': resolve(__dirname, './.nuxt/build'),
    },
  },
})
