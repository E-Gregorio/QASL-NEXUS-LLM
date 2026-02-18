/**
 * Vitest Setup File
 * Se ejecuta antes de cada archivo de test
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Variables de entorno para tests
process.env.NODE_ENV = 'test'
process.env.BASE_URL = 'http://localhost:3000'

// Setup global antes de todos los tests
beforeAll(() => {
  console.log('\n🧪 Iniciando Unit Tests con Vitest...\n')
})

// Cleanup después de todos los tests
afterAll(() => {
  console.log('\n✅ Unit Tests completados\n')
})

// Opcional: Reset de mocks antes de cada test
beforeEach(() => {
  // vi.clearAllMocks()
})

// Opcional: Cleanup después de cada test
afterEach(() => {
  // Cleanup específico si es necesario
})
