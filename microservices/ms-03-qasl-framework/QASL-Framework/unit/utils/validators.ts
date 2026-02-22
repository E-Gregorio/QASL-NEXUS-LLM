export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export function validateCUIT(cuit: string): boolean {
  if (!cuit || typeof cuit !== 'string') return false

  const cleanCuit = cuit.replace(/[-\s]/g, '')

  if (!/^\d{11}$/.test(cleanCuit)) return false

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCuit[i]) * multipliers[i]
  }

  const remainder = sum % 11
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder

  return checkDigit === parseInt(cleanCuit[10])
}

export function validateDateFormat(date: string): boolean {
  if (!date || typeof date !== 'string') return false

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = date.match(dateRegex)

  if (!match) return false

  const [, day, month, year] = match
  const d = parseInt(day)
  const m = parseInt(month)
  const y = parseInt(year)

  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  if (y < 1900 || y > 2100) return false

  const daysInMonth = new Date(y, m, 0).getDate()
  return d <= daysInMonth
}

export function isNotEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  return value.trim().length > 0
}

export function validateLength(
  value: string,
  min: number,
  max: number
): boolean {
  if (!value || typeof value !== 'string') return false
  const length = value.trim().length
  return length >= min && length <= max
}

export function isPositiveNumber(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(num) && num > 0
}

export function validatePhoneAR(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  const cleanPhone = phone.replace(/[\s\-()]/g, '')
  return /^(\+54|0)?\d{10,13}$/.test(cleanPhone)
}
