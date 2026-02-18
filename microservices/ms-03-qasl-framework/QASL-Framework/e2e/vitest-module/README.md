# Módulo de Pruebas Unitarias - Vitest

## Descripción

Módulo de **Unit Tests** usando **Vitest** para integrarse al template de QA Automation.

Este módulo testea el código de automatización (helpers, utils, formatters) - **NO** el código fuente de la aplicación.

## Estructura

```
qa-hu-template/
├── unit/                          ← NUEVO MÓDULO
│   ├── setup.ts                   # Configuración global
│   ├── index.ts                   # Exports
│   ├── utils/
│   │   ├── validators.ts          # Funciones de validación
│   │   └── formatters.ts          # Funciones de formateo
│   ├── helpers/
│   │   └── test-data-generator.ts # Generadores de datos
│   ├── mocks/                     # Mocks reutilizables
│   └── __tests__/
│       ├── utils/
│       │   ├── validators.spec.ts
│       │   └── formatters.spec.ts
│       └── helpers/
│           └── test-data-generator.spec.ts
├── e2e/                           ← Ya existente (Playwright)
├── vitest.config.ts               ← NUEVO
└── package.json                   ← ACTUALIZADO
```

## Instalación

### 1. Copiar archivos

```bash
# Copiar carpeta unit/ a tu proyecto
cp -r vitest-module/unit/ qa-hu-template/

# Copiar configuración
cp vitest-module/vitest.config.ts qa-hu-template/
```

### 2. Instalar dependencias

```bash
cd qa-hu-template
npm install vitest @vitest/coverage-v8 @vitest/ui --save-dev
```

### 3. Agregar scripts a package.json

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:unit:coverage": "vitest run --coverage"
  }
}
```

## Uso

### Ejecutar todos los unit tests

```bash
npm run test:unit
```

### Modo watch (desarrollo)

```bash
npm run test:unit:watch
```

### Con interfaz visual

```bash
npm run test:unit:ui
```

### Con cobertura de código

```bash
npm run test:unit:coverage
```

## Ejemplo de Test

```typescript
// unit/__tests__/utils/validators.spec.ts
import { describe, it, expect } from 'vitest'
import { validateEmail } from '../../utils/validators'

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })
  
  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

## Agregar nuevos tests

### 1. Crear el util/helper

```typescript
// unit/utils/mi-util.ts
export function myFunction(input: string): string {
  return input.toUpperCase()
}
```

### 2. Crear el test

```typescript
// unit/__tests__/utils/mi-util.spec.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../utils/mi-util'

describe('myFunction', () => {
  it('should convert to uppercase', () => {
    expect(myFunction('hello')).toBe('HELLO')
  })
})
```

### 3. Exportar en index.ts

```typescript
// unit/index.ts
export * from './utils/mi-util'
```

## Integración con E2E (Playwright)

Podés usar los utils en tus tests E2E:

```typescript
// e2e/specs/login.spec.ts
import { test, expect } from '@playwright/test'
import { generateTestEmail, validateEmail } from '../unit'

test('login with generated email', async ({ page }) => {
  const email = generateTestEmail('login')
  
  await page.goto('/login')
  await page.fill('[name="email"]', email)
  // ...
})
```

## Reportes

Los reportes se generan en:

```
reports/
├── unit/
│   ├── results.json       # Resultados JSON
│   └── junit.xml          # Para CI/CD
└── unit-coverage/
    ├── index.html         # Reporte visual
    └── lcov.info          # Para SonarQube
```

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./reports/unit-coverage/lcov.info
```

## Stack Completo

```
┌─────────────────────────────────────────────────────────┐
│                 QA AUTOMATION TEMPLATE                  │
├─────────────────────────────────────────────────────────┤
│  Unit Tests      │ Vitest          │ npm run test:unit │
│  E2E Tests       │ Playwright      │ npm run test:e2e  │
│  API Tests       │ Newman          │ npm run test:api  │
│  Performance     │ K6              │ npm run test:perf │
│  Security        │ OWASP ZAP       │ npm run test:security │
│  Static Analysis │ SIGMA (Python)  │ python run_analysis.py │
└─────────────────────────────────────────────────────────┘
```

## Autor

**Elyer Maldonado** - QA Tech Lead  
EPIDATA Consulting

---

*Generado para QA Automation Template v2.0*
