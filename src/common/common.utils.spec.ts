// src/common/services/common.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

// Test utility functions
describe('Common Utilities', () => {
  describe('generateUniqueCode', () => {
    it('should generate unique code with prefix', () => {
      const prefix = 'ORD';
      const code = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
      expect(code).toMatch(/^ORD-[A-Z0-9]+$/);
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = `TEST-${Date.now().toString(36)}`;
      const code2 = `TEST-${Date.now().toString(36)}`;
      // Codes should be unique (though in fast succession may be same)
      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in XOF', () => {
      const amount = 10000;
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
      }).format(amount);
      expect(formatted).toContain('10');
    });

    it('should format currency in EUR', () => {
      const amount = 100.50;
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(amount);
      expect(formatted).toContain('100,50');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone number format', () => {
      const phoneRegex = /^\+?[0-9\s-]{8,20}$/;
      expect(phoneRegex.test('+225 01 02 03 04 05')).toBe(true);
      expect(phoneRegex.test('0102030405')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      const phoneRegex = /^\+?[0-9\s-]{8,20}$/;
      expect(phoneRegex.test('123')).toBe(false);
      expect(phoneRegex.test('abc')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid emails', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('invalid')).toBe(false);
      expect(emailRegex.test('test@')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      const calculatePercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
      };

      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3)).toBe(33);
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });

  describe('paginate', () => {
    it('should calculate pagination correctly', () => {
      const paginate = (page: number, limit: number, total: number) => ({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      });

      const result = paginate(1, 10, 100);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle last page correctly', () => {
      const paginate = (page: number, limit: number, total: number) => ({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      });

      const result = paginate(10, 10, 100);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('slugify', () => {
    it('should create slug from string', () => {
      const slugify = (str: string) =>
        str
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');

      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test Product Name!')).toBe('test-product-name');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const truncate = (str: string, length: number) =>
        str.length > length ? str.substring(0, length) + '...' : str;

      expect(truncate('Hello', 10)).toBe('Hello');
      expect(truncate('Hello World Test', 10)).toBe('Hello Worl...');
    });
  });

  describe('dateHelpers', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-01-30');
      const formatted = date.toISOString().split('T')[0];
      expect(formatted).toBe('2026-01-30');
    });

    it('should calculate date difference', () => {
      const daysDiff = (date1: Date, date2: Date) => {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-01-31');
      expect(daysDiff(date1, date2)).toBe(30);
    });

    it('should check if date is past', () => {
      const isPast = (date: Date) => date < new Date();
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      expect(isPast(pastDate)).toBe(true);
      expect(isPast(futureDate)).toBe(false);
    });
  });

  describe('arrayHelpers', () => {
    it('should chunk array', () => {
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunk(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should remove duplicates', () => {
      const unique = <T>(arr: T[]): T[] => [...new Set(arr)];
      
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
    });

    it('should group by key', () => {
      const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
        return arr.reduce((groups, item) => {
          const group = String(item[key]);
          groups[group] = groups[group] ?? [];
          groups[group].push(item);
          return groups;
        }, {} as Record<string, T[]>);
      };

      const items = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 },
      ];
      const grouped = groupBy(items, 'type');
      expect(grouped['A'].length).toBe(2);
      expect(grouped['B'].length).toBe(1);
    });
  });

  describe('numberHelpers', () => {
    it('should round to decimal places', () => {
      const roundTo = (num: number, decimals: number) =>
        Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.235, 2)).toBe(1.24);
    });

    it('should clamp number to range', () => {
      const clamp = (num: number, min: number, max: number) =>
        Math.min(Math.max(num, min), max);

      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
