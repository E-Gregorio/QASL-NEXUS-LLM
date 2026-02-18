/**
 * Unit Tests - Validators
 * Tests para funciones de validación
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validateCUIT,
  validateDateFormat,
  isNotEmpty,
  validateLength,
  isPositiveNumber,
  validatePhoneAR
} from '../../utils/validators'

describe('Validators', () => {
  
  // ============================================
  // validateEmail
  // ============================================
  describe('validateEmail', () => {
    
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
    })
    
    it('should return true for email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true)
    })
    
    it('should return true for email with plus sign', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })
    
    it('should return false for email without @', () => {
      expect(validateEmail('invalid-email.com')).toBe(false)
    })
    
    it('should return false for email without domain', () => {
      expect(validateEmail('user@')).toBe(false)
    })
    
    it('should return false for empty string', () => {
      expect(validateEmail('')).toBe(false)
    })
    
    it('should return false for null', () => {
      expect(validateEmail(null as any)).toBe(false)
    })
    
    it('should return false for undefined', () => {
      expect(validateEmail(undefined as any)).toBe(false)
    })
    
    it('should trim whitespace and validate', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true)
    })
  })

  // ============================================
  // validateCUIT
  // ============================================
  describe('validateCUIT', () => {
    
    it('should return true for valid CUIT with dashes', () => {
      expect(validateCUIT('20-12345678-9')).toBe(true)
    })
    
    it('should return true for valid CUIT without dashes', () => {
      expect(validateCUIT('20123456789')).toBe(true)
    })
    
    it('should return false for CUIT with invalid check digit', () => {
      expect(validateCUIT('20-12345678-0')).toBe(false)
    })
    
    it('should return false for CUIT with wrong length', () => {
      expect(validateCUIT('20-1234567-9')).toBe(false)
    })
    
    it('should return false for CUIT with letters', () => {
      expect(validateCUIT('20-1234567A-9')).toBe(false)
    })
    
    it('should return false for empty string', () => {
      expect(validateCUIT('')).toBe(false)
    })
    
    it('should return false for null', () => {
      expect(validateCUIT(null as any)).toBe(false)
    })
  })

  // ============================================
  // validateDateFormat
  // ============================================
  describe('validateDateFormat', () => {
    
    it('should return true for valid date DD/MM/YYYY', () => {
      expect(validateDateFormat('15/06/2024')).toBe(true)
    })
    
    it('should return true for first day of month', () => {
      expect(validateDateFormat('01/01/2024')).toBe(true)
    })
    
    it('should return true for last day of month', () => {
      expect(validateDateFormat('31/12/2024')).toBe(true)
    })
    
    it('should return false for invalid day', () => {
      expect(validateDateFormat('32/01/2024')).toBe(false)
    })
    
    it('should return false for invalid month', () => {
      expect(validateDateFormat('15/13/2024')).toBe(false)
    })
    
    it('should return false for February 30', () => {
      expect(validateDateFormat('30/02/2024')).toBe(false)
    })
    
    it('should return true for February 29 in leap year', () => {
      expect(validateDateFormat('29/02/2024')).toBe(true)
    })
    
    it('should return false for February 29 in non-leap year', () => {
      expect(validateDateFormat('29/02/2023')).toBe(false)
    })
    
    it('should return false for wrong format YYYY-MM-DD', () => {
      expect(validateDateFormat('2024-01-15')).toBe(false)
    })
    
    it('should return false for empty string', () => {
      expect(validateDateFormat('')).toBe(false)
    })
  })

  // ============================================
  // isNotEmpty
  // ============================================
  describe('isNotEmpty', () => {
    
    it('should return true for non-empty string', () => {
      expect(isNotEmpty('hello')).toBe(true)
    })
    
    it('should return false for empty string', () => {
      expect(isNotEmpty('')).toBe(false)
    })
    
    it('should return false for whitespace only', () => {
      expect(isNotEmpty('   ')).toBe(false)
    })
    
    it('should return false for null', () => {
      expect(isNotEmpty(null)).toBe(false)
    })
    
    it('should return false for undefined', () => {
      expect(isNotEmpty(undefined)).toBe(false)
    })
  })

  // ============================================
  // validateLength
  // ============================================
  describe('validateLength', () => {
    
    it('should return true when length is within range', () => {
      expect(validateLength('hello', 1, 10)).toBe(true)
    })
    
    it('should return true when length equals min', () => {
      expect(validateLength('ab', 2, 10)).toBe(true)
    })
    
    it('should return true when length equals max', () => {
      expect(validateLength('abcdefghij', 1, 10)).toBe(true)
    })
    
    it('should return false when length is below min', () => {
      expect(validateLength('a', 2, 10)).toBe(false)
    })
    
    it('should return false when length exceeds max', () => {
      expect(validateLength('abcdefghijk', 1, 10)).toBe(false)
    })
    
    it('should trim whitespace before validating', () => {
      expect(validateLength('  ab  ', 2, 4)).toBe(true)
    })
  })

  // ============================================
  // isPositiveNumber
  // ============================================
  describe('isPositiveNumber', () => {
    
    it('should return true for positive number', () => {
      expect(isPositiveNumber(5)).toBe(true)
    })
    
    it('should return true for positive decimal', () => {
      expect(isPositiveNumber(3.14)).toBe(true)
    })
    
    it('should return false for zero', () => {
      expect(isPositiveNumber(0)).toBe(false)
    })
    
    it('should return false for negative number', () => {
      expect(isPositiveNumber(-5)).toBe(false)
    })
    
    it('should return true for positive string number', () => {
      expect(isPositiveNumber('10')).toBe(true)
    })
    
    it('should return false for non-numeric string', () => {
      expect(isPositiveNumber('abc')).toBe(false)
    })
  })

  // ============================================
  // validatePhoneAR
  // ============================================
  describe('validatePhoneAR', () => {
    
    it('should return true for phone with country code', () => {
      expect(validatePhoneAR('+54 11 1234-5678')).toBe(true)
    })
    
    it('should return true for phone with 0 prefix', () => {
      expect(validatePhoneAR('011 1234-5678')).toBe(true)
    })
    
    it('should return true for phone without prefix', () => {
      expect(validatePhoneAR('1112345678')).toBe(true)
    })
    
    it('should return false for short phone', () => {
      expect(validatePhoneAR('12345')).toBe(false)
    })
    
    it('should return false for empty string', () => {
      expect(validatePhoneAR('')).toBe(false)
    })
  })
})
