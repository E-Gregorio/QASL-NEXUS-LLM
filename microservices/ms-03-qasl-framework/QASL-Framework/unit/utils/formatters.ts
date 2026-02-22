export function formatCurrency(amount: number, currency: string = 'ARS'): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount: must be a number')
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatDateTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }

  const dateStr = formatDate(date)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${dateStr} ${hours}:${minutes}`
}

export function formatCUIT(cuit: string): string {
  const clean = cuit.replace(/\D/g, '')

  if (clean.length !== 11) {
    throw new Error('CUIT must have 11 digits')
  }

  return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`
}

export function formatPhoneAR(phone: string): string {
  const clean = phone.replace(/\D/g, '')

  if (clean.length < 10) {
    throw new Error('Phone number too short')
  }

  if (clean.length === 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 7)}-${clean.slice(7)}`
  }

  return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`
}

export function capitalizeWords(text: string): string {
  if (!text || typeof text !== 'string') return ''

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return ''
  if (text.length <= maxLength) return text

  return text.slice(0, maxLength - 3) + '...'
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  if (typeof bytes !== 'number' || bytes < 0) {
    throw new Error('Invalid bytes value')
  }

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error('Invalid number')
  }

  return new Intl.NumberFormat('es-AR').format(num)
}
