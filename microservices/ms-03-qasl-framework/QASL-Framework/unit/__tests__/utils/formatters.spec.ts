import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatCUIT,
  formatPhoneAR,
  capitalizeWords,
  truncateText,
  formatBytes,
  formatNumber
} from '../../utils/formatters'

describe('Formatters', () => {
  
  // ============================================
  // formatCurrency
  // ============================================
  describe('formatCurrency', () => {

    it('should format number to ARS currency', () => {
      const result = formatCurrency(1000)
      expect(result).toContain('1.000')
      // Intl.NumberFormat usa simbolo $ para ARS, no el codigo
      expect(result).toContain('$')
    })

    it('should format decimal amounts correctly', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('1.234,56')
    })

    it('should format zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })

    it('should format negative numbers', () => {
      const result = formatCurrency(-500)
      expect(result).toContain('500')
    })

    it('should accept different currency', () => {
      const result = formatCurrency(100, 'USD')
      // Intl.NumberFormat usa US$ para USD en locale es-AR
      expect(result).toContain('US$')
    })
    
    it('should throw error for invalid input', () => {
      expect(() => formatCurrency('abc' as any)).toThrow('Invalid amount')
    })
    
    it('should throw error for NaN', () => {
      expect(() => formatCurrency(NaN)).toThrow('Invalid amount')
    })
  })

  // ============================================
  // formatDate
  // ============================================
  describe('formatDate', () => {
    
    it('should format date to DD/MM/YYYY', () => {
      const date = new Date(2024, 5, 15) // June 15, 2024
      expect(formatDate(date)).toBe('15/06/2024')
    })
    
    it('should pad single digit day with zero', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      expect(formatDate(date)).toBe('05/01/2024')
    })
    
    it('should pad single digit month with zero', () => {
      const date = new Date(2024, 2, 10) // March 10, 2024
      expect(formatDate(date)).toBe('10/03/2024')
    })
    
    it('should throw error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date')
    })
    
    it('should throw error for non-Date object', () => {
      expect(() => formatDate('2024-01-15' as any)).toThrow('Invalid date')
    })
  })

  // ============================================
  // formatDateTime
  // ============================================
  describe('formatDateTime', () => {
    
    it('should format date and time correctly', () => {
      const date = new Date(2024, 5, 15, 14, 30) // June 15, 2024 14:30
      expect(formatDateTime(date)).toBe('15/06/2024 14:30')
    })
    
    it('should pad hours and minutes with zeros', () => {
      const date = new Date(2024, 0, 1, 9, 5) // January 1, 2024 09:05
      expect(formatDateTime(date)).toBe('01/01/2024 09:05')
    })
    
    it('should handle midnight', () => {
      const date = new Date(2024, 5, 15, 0, 0)
      expect(formatDateTime(date)).toBe('15/06/2024 00:00')
    })
  })

  // ============================================
  // formatCUIT
  // ============================================
  describe('formatCUIT', () => {
    
    it('should format CUIT with dashes', () => {
      expect(formatCUIT('20123456789')).toBe('20-12345678-9')
    })
    
    it('should handle CUIT already with dashes', () => {
      expect(formatCUIT('20-12345678-9')).toBe('20-12345678-9')
    })
    
    it('should throw error for CUIT with wrong length', () => {
      expect(() => formatCUIT('123456')).toThrow('CUIT must have 11 digits')
    })
    
    it('should throw error for CUIT with too many digits', () => {
      expect(() => formatCUIT('123456789012')).toThrow('CUIT must have 11 digits')
    })
  })

  // ============================================
  // formatPhoneAR
  // ============================================
  describe('formatPhoneAR', () => {
    
    it('should format 10-digit phone number', () => {
      const result = formatPhoneAR('1112345678')
      expect(result).toBe('(111) 2345-678')
    })
    
    it('should format phone with country code', () => {
      const result = formatPhoneAR('541112345678')
      expect(result).toContain('+')
    })
    
    it('should strip non-numeric characters before formatting', () => {
      const result = formatPhoneAR('(11) 1234-5678')
      expect(result).toBeDefined()
    })
    
    it('should throw error for short phone number', () => {
      expect(() => formatPhoneAR('12345')).toThrow('Phone number too short')
    })
  })

  // ============================================
  // capitalizeWords
  // ============================================
  describe('capitalizeWords', () => {
    
    it('should capitalize first letter of each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World')
    })
    
    it('should handle uppercase input', () => {
      expect(capitalizeWords('HELLO WORLD')).toBe('Hello World')
    })
    
    it('should handle mixed case input', () => {
      expect(capitalizeWords('hElLo WoRlD')).toBe('Hello World')
    })
    
    it('should handle single word', () => {
      expect(capitalizeWords('hello')).toBe('Hello')
    })
    
    it('should return empty string for empty input', () => {
      expect(capitalizeWords('')).toBe('')
    })
    
    it('should return empty string for null', () => {
      expect(capitalizeWords(null as any)).toBe('')
    })
  })

  // ============================================
  // truncateText
  // ============================================
  describe('truncateText', () => {
    
    it('should truncate text longer than maxLength', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...')
    })
    
    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('Hello', 10)).toBe('Hello')
    })
    
    it('should not truncate text equal to maxLength', () => {
      expect(truncateText('Hello', 5)).toBe('Hello')
    })
    
    it('should return empty string for empty input', () => {
      expect(truncateText('', 10)).toBe('')
    })
    
    it('should return empty string for null', () => {
      expect(truncateText(null as any, 10)).toBe('')
    })
  })

  // ============================================
  // formatBytes
  // ============================================
  describe('formatBytes', () => {
    
    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes')
    })
    
    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB')
    })
    
    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB')
    })
    
    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB')
    })
    
    it('should handle zero', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
    })
    
    it('should format with decimal precision', () => {
      expect(formatBytes(1536)).toBe('1.5 KB')
    })
    
    it('should throw error for negative value', () => {
      expect(() => formatBytes(-100)).toThrow('Invalid bytes value')
    })
  })

  // ============================================
  // formatNumber
  // ============================================
  describe('formatNumber', () => {
    
    it('should format number with thousand separators', () => {
      const result = formatNumber(1000000)
      expect(result).toContain('1')
      expect(result).toContain('000')
    })
    
    it('should format small numbers without separator', () => {
      expect(formatNumber(100)).toBe('100')
    })
    
    it('should format decimal numbers', () => {
      const result = formatNumber(1234.56)
      expect(result).toContain('1.234')
    })
    
    it('should throw error for NaN', () => {
      expect(() => formatNumber(NaN)).toThrow('Invalid number')
    })
    
    it('should throw error for non-number', () => {
      expect(() => formatNumber('abc' as any)).toThrow('Invalid number')
    })
  })
})
