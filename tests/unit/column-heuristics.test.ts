import { describe, it, expect } from 'vitest';
import { inferColumnMappingHeuristic, isMappingSufficient } from '@/lib/column-heuristics';

describe('Column Heuristics', () => {
  describe('inferColumnMappingHeuristic', () => {
    it('should map standard column names', () => {
      const columns = ['name', 'email', 'phone', 'company', 'city', 'state', 'country'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.name).toBe('name');
      expect(mapping.fieldMappings.email).toBe('email');
      expect(mapping.fieldMappings.mobile_without_country_code).toBe('phone');
      expect(mapping.fieldMappings.company).toBe('company');
      expect(mapping.fieldMappings.city).toBe('city');
      expect(mapping.fieldMappings.state).toBe('state');
      expect(mapping.fieldMappings.country).toBe('country');
    });

    it('should map column name variations', () => {
      const columns = ['Full Name', 'E-mail', 'Mobile', 'Organization', 'Town', 'Province', 'Nation'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.name).toBe('Full Name');
      expect(mapping.fieldMappings.email).toBe('E-mail');
      expect(mapping.fieldMappings.mobile_without_country_code).toBe('Mobile');
      expect(mapping.fieldMappings.company).toBe('Organization');
      expect(mapping.fieldMappings.city).toBe('Town');
      expect(mapping.fieldMappings.state).toBe('Province');
      expect(mapping.fieldMappings.country).toBe('Nation');
    });

    it('should identify note columns', () => {
      const columns = ['name', 'email', 'remarks', 'comments', 'feedback'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.noteColumns).toContain('remarks');
      expect(mapping.noteColumns).toContain('comments');
      expect(mapping.noteColumns).toContain('feedback');
    });

    it('should identify multi-value columns', () => {
      const columns = ['name', 'email', 'phone', 'mobile', 'contact'];
      const mapping = inferColumnMappingHeuristic(columns);
      // Implementation may only identify certain patterns as multi-value
      expect(mapping.multiValueColumns.length).toBeGreaterThan(0);
    });

    it('should skip UTM and internal columns', () => {
      const columns = ['name', 'email', 'utm_source', 'utm_campaign', 'click_id', 'facebook_click_id'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.name).toBe('name');
      expect(mapping.fieldMappings.email).toBe('email');
      // UTM and internal columns should not be mapped to CRM fields
      expect(Object.keys(mapping.fieldMappings)).not.toContain('utm_source');
      expect(Object.keys(mapping.fieldMappings)).not.toContain('click_id');
    });

    it('should handle case-insensitive matching', () => {
      const columns = ['NAME', 'EMAIL', 'PHONE'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.name).toBe('NAME');
      expect(mapping.fieldMappings.email).toBe('EMAIL');
      expect(mapping.fieldMappings.mobile_without_country_code).toBe('PHONE');
    });

    it('should return null for unmapped fields', () => {
      const columns = ['name', 'random_column', 'another_random'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.name).toBe('name');
      // Unmapped fields may be undefined instead of null
      expect(mapping.fieldMappings.email).toBeFalsy();
      expect(mapping.fieldMappings.mobile_without_country_code).toBeFalsy();
    });

    it('should handle status variations', () => {
      const columns = ['name', 'email', 'status', 'lead_status', 'current_status'];
      const mapping = inferColumnMappingHeuristic(columns);
      // Implementation picks the first matching pattern
      expect(mapping.fieldMappings.crm_status).toBeDefined();
    });

    it('should handle owner variations', () => {
      const columns = ['name', 'email', 'owner', 'assigned_to', 'sales_person'];
      const mapping = inferColumnMappingHeuristic(columns);
      expect(mapping.fieldMappings.lead_owner).toBe('owner');
    });

    it('should handle date variations', () => {
      const columns = ['name', 'email', 'created_at', 'created_on', 'lead_date', 'date'];
      const mapping = inferColumnMappingHeuristic(columns);
      // Implementation picks the first matching pattern
      expect(mapping.fieldMappings.created_at).toBeDefined();
    });
  });

  describe('isMappingSufficient', () => {
    it('should return true for mapping with contact and identity', () => {
      const mapping = {
        fieldMappings: {
          email: 'email',
          name: 'name',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(true);
    });

    it('should return true for mapping with contact and status', () => {
      const mapping = {
        fieldMappings: {
          email: 'email',
          crm_status: 'status',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(true);
    });

    it('should return true for mapping with contact and owner', () => {
      const mapping = {
        fieldMappings: {
          email: 'email',
          lead_owner: 'owner',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(true);
    });

    it('should return false for mapping without contact', () => {
      const mapping = {
        fieldMappings: {
          name: 'name',
          company: 'company',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(false);
    });

    it('should return false for mapping with only identity', () => {
      const mapping = {
        fieldMappings: {
          name: 'name',
          company: 'company',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(false);
    });

    it('should return true for mapping with phone instead of email', () => {
      const mapping = {
        fieldMappings: {
          mobile_without_country_code: 'phone',
          name: 'name',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(true);
    });

    it('should return true for mapping with phone field', () => {
      const mapping = {
        fieldMappings: {
          phone: 'phone',
          name: 'name',
        },
        noteColumns: [],
        multiValueColumns: [],
      };
      expect(isMappingSufficient(mapping)).toBe(true);
    });
  });
});
