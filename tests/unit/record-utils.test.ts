import { describe, it, expect } from 'vitest';
import { normalizeCellValue, trimRow, trimRows, buildInferencePayload, mergeInferencePatch } from '@/lib/record-utils';
import type { CRMRecord } from '@/types/crm';

describe('Record Utils', () => {
  describe('normalizeCellValue', () => {
    it('should normalize null to empty string', () => {
      expect(normalizeCellValue(null)).toBe('');
    });

    it('should normalize undefined to empty string', () => {
      expect(normalizeCellValue(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normalizeCellValue('  John Doe  ')).toBe('John Doe');
    });

    it('should replace tabs and newlines with spaces', () => {
      expect(normalizeCellValue('John\tDoe\nJane')).toBe('John Doe Jane');
    });

    it('should normalize multiple spaces to single space', () => {
      expect(normalizeCellValue('John   Doe')).toBe('John Doe');
    });

    it('should normalize null-like values to empty string', () => {
      expect(normalizeCellValue('null')).toBe('');
      expect(normalizeCellValue('undefined')).toBe('');
      expect(normalizeCellValue('N/A')).toBe('');
      expect(normalizeCellValue('na')).toBe('');
      expect(normalizeCellValue('-')).toBe('');
    });
  });

  describe('trimRow', () => {
    it('should trim and normalize row values', () => {
      const row = { name: '  John  ', email: '  john@example.com  ', phone: '  ' };
      const trimmed = trimRow(row);
      expect(trimmed.name).toBe('John');
      expect(trimmed.email).toBe('john@example.com');
      expect(trimmed.phone).toBeUndefined();
    });

    it('should remove empty values', () => {
      const row = { name: 'John', email: '', phone: 'null' };
      const trimmed = trimRow(row);
      expect(trimmed.name).toBe('John');
      expect(trimmed.email).toBeUndefined();
      expect(trimmed.phone).toBeUndefined();
    });
  });

  describe('trimRows', () => {
    it('should trim multiple rows', () => {
      const rows = [
        { name: '  John  ', email: 'john@example.com' },
        { name: '  Jane  ', email: 'jane@example.com' },
      ];
      const trimmed = trimRows(rows);
      expect(trimmed[0].name).toBe('John');
      expect(trimmed[1].name).toBe('Jane');
    });
  });

  describe('buildInferencePayload', () => {
    it('should build payload for record needing inference', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '',
        mobile_without_country_code: '+91 9876543210',
        company: '',
        city: '',
        state: '',
        country: '',
        lead_owner: '',
        crm_status: '',
        crm_note: '',
        data_source: '',
        possession_time: '',
        description: '',
      };
      const row = { name: 'John Doe', status: 'hot lead' };
      const mappedColumns = new Set(['name', 'email']);
      
      const payload = buildInferencePayload(0, record, row, mappedColumns);
      expect(payload).not.toBeNull();
      expect(payload?.i).toBe(0);
      // The payload structure depends on the actual implementation
      // We're just verifying it returns a non-null payload
    });

    it('should return null if no inference needed', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '+91',
        mobile_without_country_code: '9876543210',
        company: 'Acme',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        lead_owner: 'Agent A',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: '',
        data_source: 'leads_on_demand',
        possession_time: '',
        description: 'Looking for property',
      };
      const row = { name: 'John Doe' };
      const mappedColumns = new Set(['name']);
      
      const payload = buildInferencePayload(0, record, row, mappedColumns);
      expect(payload).toBeNull();
    });
  });

  describe('mergeInferencePatch', () => {
    it('should merge crm_status if empty', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '',
        mobile_without_country_code: '',
        company: '',
        city: '',
        state: '',
        country: '',
        lead_owner: '',
        crm_status: '',
        crm_note: '',
        data_source: '',
        possession_time: '',
        description: '',
      };
      const patch = { crm_status: 'GOOD_LEAD_FOLLOW_UP' };
      const merged = mergeInferencePatch(record, patch);
      expect(merged.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
    });

    it('should not overwrite existing crm_status', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '',
        mobile_without_country_code: '',
        company: '',
        city: '',
        state: '',
        country: '',
        lead_owner: '',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: '',
        data_source: '',
        possession_time: '',
        description: '',
      };
      const patch = { crm_status: 'BAD_LEAD' };
      const merged = mergeInferencePatch(record, patch);
      expect(merged.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
    });

    it('should append to crm_note with crm_note_append', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '',
        mobile_without_country_code: '',
        company: '',
        city: '',
        state: '',
        country: '',
        lead_owner: '',
        crm_status: '',
        crm_note: 'Original note',
        data_source: '',
        possession_time: '',
        description: '',
      };
      const patch = { crm_note_append: 'Additional note' };
      const merged = mergeInferencePatch(record, patch);
      expect(merged.crm_note).toBe('Original note | Additional note');
    });

    it('should set crm_note if empty and crm_note_append provided', () => {
      const record: CRMRecord = {
        created_at: '',
        name: 'John Doe',
        email: 'john@example.com',
        country_code: '',
        mobile_without_country_code: '',
        company: '',
        city: '',
        state: '',
        country: '',
        lead_owner: '',
        crm_status: '',
        crm_note: '',
        data_source: '',
        possession_time: '',
        description: '',
      };
      const patch = { crm_note_append: 'New note' };
      const merged = mergeInferencePatch(record, patch);
      expect(merged.crm_note).toBe('New note');
    });
  });
});
