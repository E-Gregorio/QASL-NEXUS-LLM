import { describe, it, expect } from 'vitest'
import {
  generateTestEmail,
  generateValidCUIT,
  generateRandomName,
  generatePhoneAR,
  generateRandomDate,
  generateUniqueId,
  generateTestUser,
  generateRandomAmount,
  generateLoremIpsum
} from '../../helpers/test-data-generator'
import { validateEmail, validateCUIT, validatePhoneAR } from '../../utils/validators'

describe('Test Data Generators', () => {
  
  // ============================================
  // generateTestEmail
  // ============================================
  describe('generateTestEmail', () => {
    
    it('should generate valid email format', () => {
      const email = generateTestEmail()
      expect(validateEmail(email)).toBe(true)
    })
    
    it('should include prefix in email', () => {
      const email = generateTestEmail('myprefix')
      expect(email).toContain('myprefix')
    })
    
    it('should generate unique emails', () => {
      const email1 = generateTestEmail()
      const email2 = generateTestEmail()
      expect(email1).not.toBe(email2)
    })
    
    it('should end with @test.com', () => {
      const email = generateTestEmail()
      expect(email).toMatch(/@test\.com$/)
    })
  })

  // ============================================
  // generateValidCUIT
  // ============================================
  describe('generateValidCUIT', () => {
    
    it('should generate valid CUIT format', () => {
      const cuit = generateValidCUIT()
      expect(cuit).toMatch(/^\d{2}-\d{8}-\d$/)
    })
    
    it('should generate CUIT that passes validation', () => {
      const cuit = generateValidCUIT()
      expect(validateCUIT(cuit)).toBe(true)
    })
    
    it('should generate unique CUITs', () => {
      const cuit1 = generateValidCUIT()
      const cuit2 = generateValidCUIT()
      // High probability of being different
      expect(cuit1).not.toBe(cuit2)
    })
    
    it('should generate CUIT with valid prefix', () => {
      const cuit = generateValidCUIT()
      const prefix = cuit.split('-')[0]
      const validPrefixes = ['20', '23', '24', '27', '30', '33', '34']
      expect(validPrefixes).toContain(prefix)
    })
    
    it('should consistently generate valid CUITs (10 iterations)', () => {
      for (let i = 0; i < 10; i++) {
        const cuit = generateValidCUIT()
        expect(validateCUIT(cuit)).toBe(true)
      }
    })
  })

  // ============================================
  // generateRandomName
  // ============================================
  describe('generateRandomName', () => {
    
    it('should generate name with first and last name', () => {
      const name = generateRandomName()
      const parts = name.split(' ')
      expect(parts.length).toBe(2)
    })
    
    it('should generate non-empty name', () => {
      const name = generateRandomName()
      expect(name.length).toBeGreaterThan(0)
    })
    
    it('should generate different names (probabilistic)', () => {
      const names = new Set()
      for (let i = 0; i < 20; i++) {
        names.add(generateRandomName())
      }
      // Should have multiple unique names
      expect(names.size).toBeGreaterThan(1)
    })
  })

  // ============================================
  // generatePhoneAR
  // ============================================
  describe('generatePhoneAR', () => {
    
    it('should generate phone starting with +54', () => {
      const phone = generatePhoneAR()
      expect(phone).toMatch(/^\+54/)
    })
    
    it('should generate phone with valid format', () => {
      const phone = generatePhoneAR()
      const cleanPhone = phone.replace(/[\s\-()]/g, '')
      expect(cleanPhone.length).toBeGreaterThanOrEqual(12)
    })
    
    it('should generate valid Argentine phone', () => {
      const phone = generatePhoneAR()
      expect(validatePhoneAR(phone)).toBe(true)
    })
  })

  // ============================================
  // generateRandomDate
  // ============================================
  describe('generateRandomDate', () => {
    
    it('should generate a Date object', () => {
      const date = generateRandomDate()
      expect(date).toBeInstanceOf(Date)
    })
    
    it('should generate date within default range', () => {
      const date = generateRandomDate()
      const minDate = new Date(2020, 0, 1)
      const maxDate = new Date()
      
      expect(date.getTime()).toBeGreaterThanOrEqual(minDate.getTime())
      expect(date.getTime()).toBeLessThanOrEqual(maxDate.getTime())
    })
    
    it('should generate date within custom range', () => {
      const start = new Date(2023, 0, 1)
      const end = new Date(2023, 11, 31)
      const date = generateRandomDate(start, end)
      
      expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime())
      expect(date.getTime()).toBeLessThanOrEqual(end.getTime())
    })
  })

  // ============================================
  // generateUniqueId
  // ============================================
  describe('generateUniqueId', () => {
    
    it('should generate uppercase ID', () => {
      const id = generateUniqueId()
      expect(id).toBe(id.toUpperCase())
    })
    
    it('should include prefix', () => {
      const id = generateUniqueId('TEST')
      expect(id).toMatch(/^TEST-/)
    })
    
    it('should generate unique IDs', () => {
      const id1 = generateUniqueId()
      const id2 = generateUniqueId()
      expect(id1).not.toBe(id2)
    })
    
    it('should use default prefix ID', () => {
      const id = generateUniqueId()
      expect(id).toMatch(/^ID-/)
    })
  })

  // ============================================
  // generateTestUser
  // ============================================
  describe('generateTestUser', () => {
    
    it('should generate user with all required fields', () => {
      const user = generateTestUser()
      
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('name')
      expect(user).toHaveProperty('cuit')
      expect(user).toHaveProperty('phone')
      expect(user).toHaveProperty('createdAt')
    })
    
    it('should generate valid email', () => {
      const user = generateTestUser()
      expect(validateEmail(user.email)).toBe(true)
    })
    
    it('should generate valid CUIT', () => {
      const user = generateTestUser()
      expect(validateCUIT(user.cuit)).toBe(true)
    })
    
    it('should allow overrides', () => {
      const customEmail = 'custom@test.com'
      const user = generateTestUser({ email: customEmail })
      expect(user.email).toBe(customEmail)
    })
    
    it('should preserve non-overridden fields', () => {
      const user = generateTestUser({ email: 'custom@test.com' })
      expect(user.name).toBeDefined()
      expect(user.cuit).toBeDefined()
    })
  })

  // ============================================
  // generateRandomAmount
  // ============================================
  describe('generateRandomAmount', () => {
    
    it('should generate amount within default range', () => {
      const amount = generateRandomAmount()
      expect(amount).toBeGreaterThanOrEqual(100)
      expect(amount).toBeLessThanOrEqual(10000)
    })
    
    it('should generate amount within custom range', () => {
      const amount = generateRandomAmount(500, 1000)
      expect(amount).toBeGreaterThanOrEqual(500)
      expect(amount).toBeLessThanOrEqual(1000)
    })
    
    it('should generate amount with 2 decimal places', () => {
      const amount = generateRandomAmount()
      const decimals = amount.toString().split('.')[1]
      if (decimals) {
        expect(decimals.length).toBeLessThanOrEqual(2)
      }
    })
  })

  // ============================================
  // generateLoremIpsum
  // ============================================
  describe('generateLoremIpsum', () => {
    
    it('should generate text with default 10 words', () => {
      const text = generateLoremIpsum()
      const words = text.split(' ')
      expect(words.length).toBe(10)
    })
    
    it('should generate text with custom word count', () => {
      const text = generateLoremIpsum(5)
      const words = text.split(' ')
      expect(words.length).toBe(5)
    })
    
    it('should capitalize first word', () => {
      const text = generateLoremIpsum()
      const firstChar = text.charAt(0)
      expect(firstChar).toBe(firstChar.toUpperCase())
    })
    
    it('should generate non-empty text', () => {
      const text = generateLoremIpsum(1)
      expect(text.length).toBeGreaterThan(0)
    })
  })
})
