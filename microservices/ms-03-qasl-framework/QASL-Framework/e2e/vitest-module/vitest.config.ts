import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Configuración global
    globals: true,
    environment: 'node',
    
    // Archivos a incluir/excluir
    include: ['unit/**/*.spec.ts', 'unit/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'e2e/**',           // Excluir tests E2E de Playwright
      'reports/**',
      'allure-report/**'
    ],
    
    // Cobertura de código
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './reports/unit-coverage',
      include: ['unit/utils/**', 'unit/helpers/**', 'e2e/utils/**'],
      exclude: [
        'node_modules/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/mocks/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Reportes
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: './reports/unit/results.json',
      junit: './reports/unit/junit.xml'
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Setup files
    setupFiles: ['./unit/setup.ts']
  },
  
  // Alias para imports
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, './unit/utils'),
      '@helpers': path.resolve(__dirname, './unit/helpers'),
      '@mocks': path.resolve(__dirname, './unit/mocks'),
      '@e2e': path.resolve(__dirname, './e2e')
    }
  }
})
