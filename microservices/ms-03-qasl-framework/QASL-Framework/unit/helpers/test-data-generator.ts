export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}@test.com`
}

export function generateValidCUIT(): string {
  const prefixes = ['20', '23', '24', '27', '30', '33', '34']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  const middle = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0')

  const base = prefix + middle
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 10; i++) {
    sum += parseInt(base[i]) * multipliers[i]
  }

  const remainder = sum % 11
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder

  return `${prefix}-${middle}-${checkDigit}`
}

export function generateRandomName(): string {
  const firstNames = [
    'Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura',
    'Diego', 'Sofía', 'Martín', 'Valentina', 'Lucas', 'Camila'
  ]
  const lastNames = [
    'García', 'Rodríguez', 'Martínez', 'López', 'González',
    'Fernández', 'Pérez', 'Sánchez', 'Romero', 'Torres'
  ]

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return `${firstName} ${lastName}`
}

export function generatePhoneAR(): string {
  const areaCodes = ['11', '351', '341', '261', '381', '223']
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)]
  const number = Math.floor(Math.random() * 90000000 + 10000000)

  return `+54 ${areaCode} ${number.toString().slice(0, 4)}-${number.toString().slice(4)}`
}

export function generateRandomDate(
  startDate: Date = new Date(2020, 0, 1),
  endDate: Date = new Date()
): Date {
  const start = startDate.getTime()
  const end = endDate.getTime()
  const randomTime = start + Math.random() * (end - start)

  return new Date(randomTime)
}

export function generateUniqueId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}

export interface TestUser {
  email: string
  name: string
  cuit: string
  phone: string
  createdAt: Date
}

export function generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    email: generateTestEmail(),
    name: generateRandomName(),
    cuit: generateValidCUIT(),
    phone: generatePhoneAR(),
    createdAt: new Date(),
    ...overrides
  }
}

export function generateRandomAmount(min: number = 100, max: number = 10000): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

export function generateLoremIpsum(words: number = 10): string {
  const loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur',
    'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor',
    'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'
  ]

  const result: string[] = []
  for (let i = 0; i < words; i++) {
    result.push(loremWords[Math.floor(Math.random() * loremWords.length)])
  }

  result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1)

  return result.join(' ')
}
