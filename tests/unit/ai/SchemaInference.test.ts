import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferColumnMapping, clearSchemaCache, getSchemaCacheSize } from '@/lib/ai/SchemaInference';
import { inferColumnMappingHeuristic } from '@/lib/column-heuristics';

// Mock the AI provider manager
vi.mock('@/lib/ai/providers/AIProviderManager', () => ({
  aiProviderManager: {
    inferSchema: vi.fn(),
  },
}));

describe('Schema Inference', () => {
  beforeEach(() => {
    clearSchemaCache();
    vi.clearAllMocks();
  });

  describe('inferColumnMapping', () => {
    it('should use heuristic mapping when enabled and sufficient', async () => {
      const headers = ['name', 'email', 'phone', 'company'];
      const sampleRows = [
        { name: 'John', email: 'john@example.com', phone: '+91 9876543210', company: 'Acme' },
      ];

      const mapping = await inferColumnMapping(headers, sampleRows);
      expect(mapping).toBeDefined();
      expect(mapping.fieldMappings.name).toBe('name');
      expect(mapping.fieldMappings.email).toBe('email');
    });

    it('should cache schema inference results', async () => {
      const headers = ['name', 'email', 'phone'];
      const sampleRows = [{ name: 'John', email: 'john@example.com', phone: '+91 9876543210' }];

      const mapping1 = await inferColumnMapping(headers, sampleRows);
      const mapping2 = await inferColumnMapping(headers, sampleRows);

      expect(mapping1).toEqual(mapping2);
      expect(getSchemaCacheSize()).toBe(1);
    });

    it('should return different cache keys for different headers', async () => {
      const headers1 = ['name', 'email'];
      const headers2 = ['name', 'phone'];
      const sampleRows = [{ name: 'John', email: 'john@example.com', phone: '+91 9876543210' }];

      await inferColumnMapping(headers1, sampleRows);
      await inferColumnMapping(headers2, sampleRows);

      expect(getSchemaCacheSize()).toBe(2);
    });

    it('should clear cache', () => {
      expect(getSchemaCacheSize()).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should track cache size', async () => {
      const headers = ['name', 'email'];
      const sampleRows = [{ name: 'John', email: 'john@example.com' }];

      await inferColumnMapping(headers, sampleRows);
      expect(getSchemaCacheSize()).toBeGreaterThan(0);
    });

    it('should clear all cache entries', async () => {
      const headers = ['name', 'email'];
      const sampleRows = [{ name: 'John', email: 'john@example.com' }];

      await inferColumnMapping(headers, sampleRows);
      clearSchemaCache();
      expect(getSchemaCacheSize()).toBe(0);
    });
  });
});
