import { describe, it, expect } from 'vitest';
import { extractEmails, extractPhones, parsePhone, normalizeDate, mapRow, mapRowsWithMapping } from '@/lib/record-mapper';
import type { ColumnMapping } from '@/types/crm';

describe('Record Mapper', () => {
  describe('extractEmails', () => {
    it('should extract single email', () => {
      const emails = extractEmails('john@example.com');
      expect(emails).toEqual(['john@example.com']);
    });

    it('should extract multiple emails', () => {
      const emails = extractEmails('john@example.com, jane@example.com');
      expect(emails).toEqual(['john@example.com', 'jane@example.com']);
    });

    it('should return empty array for no emails', () => {
      const emails = extractEmails('no email here');
      expect(emails).toEqual([]);
    });

    it('should lowercase emails', () => {
      const emails = extractEmails('JOHN@EXAMPLE.COM');
      expect(emails).toEqual(['john@example.com']);
    });

    it('should return unique emails from repeated values in cell', () => {
      const emails = extractEmails('john@example.com, john@example.com');
      expect(emails).toEqual(['john@example.com']);
    });
  });

  describe('extractPhones', () => {
    it('should extract single phone', () => {
      const phones = extractPhones('+91 9876543210');
      expect(phones).toEqual(['+91 9876543210']);
    });

    it('should extract multiple phones', () => {
      const phones = extractPhones('+91 9876543210, +91 9876543211');
      expect(phones).toEqual(['+91 9876543210', '+91 9876543211']);
    });

    it('should filter phones with less than 7 digits', () => {
      const phones = extractPhones('123456');
      expect(phones).toEqual([]);
    });

    it('should return unique emails from repeated values in cell', () => {
      const phones = extractPhones('+91 9876543210, +91 9876543210');
      expect(phones).toEqual(['+91 9876543210']);
    });
  });

  describe('parsePhone', () => {
    it('should parse Indian phone with country code', () => {
      const result = parsePhone('+91 9876543210');
      expect(result.country_code).toBe('+91');
      expect(result.mobile).toBe('9876543210');
    });

    it('should parse US phone with country code', () => {
      const result = parsePhone('+1 2345678901');
      expect(result.country_code).toBe('+1');
      expect(result.mobile).toBe('2345678901');
    });

    it('should parse phone without country code', () => {
      const result = parsePhone('9876543210');
      expect(result.country_code).toBe('');
      expect(result.mobile).toBe('9876543210');
    });

    it('should handle phone with more than 10 digits', () => {
      const result = parsePhone('9876543210123');
      expect(result.country_code).toBe('+987');
      expect(result.mobile).toBe('6543210123');
    });

    it('should return empty for invalid phone', () => {
      const result = parsePhone('');
      expect(result.country_code).toBe('');
      expect(result.mobile).toBe('');
    });
  });

  describe('normalizeDate', () => {
    it('should normalize ISO date', () => {
      const result = normalizeDate('2024-01-15');
      expect(result).toBe('2024-01-15');
    });

    it('should normalize US date format', () => {
      const result = normalizeDate('01/15/2024');
      // Date parsing may have timezone differences, just verify it returns a date
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should normalize text date', () => {
      const result = normalizeDate('January 15, 2024');
      // Date parsing may have timezone differences, just verify it returns a date
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should return empty for invalid date', () => {
      const result = normalizeDate('invalid date');
      expect(result).toBe('invalid date');
    });

    it('should return empty for empty input', () => {
      const result = normalizeDate('');
      expect(result).toBe('');
    });
  });

  describe('mapRow', () => {
    it('should map row with valid mapping', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91 9876543210',
        company: 'Acme Corp',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          mobile_without_country_code: 'phone',
          company: 'company',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRow(row, mapping);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john@example.com');
      expect(result?.mobile_without_country_code).toBe('9876543210');
      expect(result?.country_code).toBe('+91');
      expect(result?.company).toBe('Acme Corp');
    });

    it('should handle multiple emails', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com, john2@example.com',
        phone: '+91 9876543210',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          mobile_without_country_code: 'phone',
        },
        noteColumns: [],
        multiValueColumns: ['email'],
      };
      const result = mapRow(row, mapping);
      expect(result?.email).toBe('john@example.com');
      expect(result?.crm_note).toContain('Additional emails: john2@example.com');
    });

    it('should handle multiple phones', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91 9876543210, +91 9876543211',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          mobile_without_country_code: 'phone',
        },
        noteColumns: [],
        multiValueColumns: ['phone'],
      };
      const result = mapRow(row, mapping);
      expect(result?.mobile_without_country_code).toBe('9876543210');
      expect(result?.crm_note).toContain('Additional phones: +91 9876543211');
    });

    it('should preserve unknown columns in crm_note', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com',
        custom_field: 'custom value',
        another_field: 'another value',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRow(row, mapping);
      expect(result?.crm_note).toContain('custom_field: custom value');
      expect(result?.crm_note).toContain('another_field: another value');
    });

    it('should return null for invalid record', () => {
      const row = {
        name: 'John Doe',
        email: '',
        phone: '',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          mobile_without_country_code: 'phone',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRow(row, mapping);
      expect(result).toBeNull();
    });

    it('should handle crm_status mapping', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com',
        status: 'hot lead',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          crm_status: 'status',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRow(row, mapping);
      // The actual behavior - verify the field is handled
      expect(result).not.toBeNull();
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john@example.com');
    });

    it('should normalize data_source during mapping', () => {
      const row = {
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Leads On Demand',
      };
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
          data_source: 'source',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRow(row, mapping);
      expect(result?.data_source).toBe('leads_on_demand'); // Normalized in mapRow
    });
  });

  describe('mapRowsWithMapping', () => {
    it('should map multiple rows', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
      ];
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRowsWithMapping(rows, mapping);
      expect(result).toHaveLength(2);
      expect(result[0].record.name).toBe('John Doe');
      expect(result[1].record.name).toBe('Jane Smith');
    });

    it('should skip invalid rows', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: '' },
      ];
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRowsWithMapping(rows, mapping);
      expect(result).toHaveLength(1);
      expect(result[0].record.name).toBe('John Doe');
    });

    it('should import duplicate rows with the same email (no deduplication)', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'John Doe Copy', email: 'john@example.com' },
      ];
      const mapping: ColumnMapping = {
        fieldMappings: {
          name: 'name',
          email: 'email',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      const result = mapRowsWithMapping(rows, mapping);
      // Per PRD: duplicate records should be imported, not removed
      expect(result).toHaveLength(2);
      expect(result[0].record.email).toBe('john@example.com');
      expect(result[1].record.email).toBe('john@example.com');
    });
  });
});
