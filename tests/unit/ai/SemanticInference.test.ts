import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferSemanticValues, clearSemanticCache, getSemanticCacheSize } from '@/lib/ai/SemanticInference';

// Mock the AI provider manager
vi.mock('@/lib/ai/providers/AIProviderManager', () => ({
  aiProviderManager: {
    inferSemanticValues: vi.fn(),
  },
}));

describe('Semantic Inference', () => {
  beforeEach(() => {
    clearSemanticCache();
    vi.clearAllMocks();
  });

  describe('inferSemanticValues', () => {
    it('should handle empty ambiguous fields', async () => {
      const ambiguousFields = new Set<string>();
      const uniqueValues = new Map<string, Set<string>>();

      const mappings = await inferSemanticValues(ambiguousFields, uniqueValues);
      expect(mappings).toBeDefined();
      expect(mappings.size).toBe(0);
    });

    it('should cache semantic inference results', async () => {
      const ambiguousFields = new Set(['crm_status']);
      const uniqueValues = new Map<string, Set<string>>();
      uniqueValues.set('crm_status', new Set(['hot lead', 'warm lead']));

      // Mock the AI provider to return a result
      const { aiProviderManager } = await import('@/lib/ai/providers/AIProviderManager');
      vi.mocked(aiProviderManager.inferSemanticValues).mockResolvedValue([
        {
          field: 'crm_status',
          mappings: { 'hot lead': 'GOOD_LEAD_FOLLOW_UP', 'warm lead': 'GOOD_LEAD_FOLLOW_UP' },
          confidence: 0.9,
        },
      ]);

      const mappings1 = await inferSemanticValues(ambiguousFields, uniqueValues);
      const mappings2 = await inferSemanticValues(ambiguousFields, uniqueValues);

      expect(mappings1).toEqual(mappings2);
      expect(getSemanticCacheSize()).toBe(1);
    });

    it('should handle multiple ambiguous fields', async () => {
      const ambiguousFields = new Set(['crm_status', 'data_source']);
      const uniqueValues = new Map<string, Set<string>>();
      uniqueValues.set('crm_status', new Set(['hot lead']));
      uniqueValues.set('data_source', new Set(['campaign a']));

      const mappings = await inferSemanticValues(ambiguousFields, uniqueValues);
      expect(mappings).toBeDefined();
    });

    it('should return empty mappings on AI failure', async () => {
      const ambiguousFields = new Set(['crm_status']);
      const uniqueValues = new Map<string, Set<string>>();
      uniqueValues.set('crm_status', new Set(['hot lead']));

      // Mock the AI provider to throw an error
      const { aiProviderManager } = await import('@/lib/ai/providers/AIProviderManager');
      vi.mocked(aiProviderManager.inferSemanticValues).mockRejectedValue(new Error('AI failed'));

      const mappings = await inferSemanticValues(ambiguousFields, uniqueValues);
      expect(mappings.size).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should track cache size', async () => {
      const ambiguousFields = new Set(['crm_status']);
      const uniqueValues = new Map<string, Set<string>>();
      uniqueValues.set('crm_status', new Set(['hot lead']));

      // Mock the AI provider
      const { aiProviderManager } = await import('@/lib/ai/providers/AIProviderManager');
      vi.mocked(aiProviderManager.inferSemanticValues).mockResolvedValue([
        {
          field: 'crm_status',
          mappings: { 'hot lead': 'GOOD_LEAD_FOLLOW_UP' },
          confidence: 0.9,
        },
      ]);

      await inferSemanticValues(ambiguousFields, uniqueValues);
      expect(getSemanticCacheSize()).toBeGreaterThan(0);
    });

    it('should clear all cache entries', async () => {
      const ambiguousFields = new Set(['crm_status']);
      const uniqueValues = new Map<string, Set<string>>();
      uniqueValues.set('crm_status', new Set(['hot lead']));

      // Mock the AI provider
      const { aiProviderManager } = await import('@/lib/ai/providers/AIProviderManager');
      vi.mocked(aiProviderManager.inferSemanticValues).mockResolvedValue([
        {
          field: 'crm_status',
          mappings: { 'hot lead': 'GOOD_LEAD_FOLLOW_UP' },
          confidence: 0.9,
        },
      ]);

      await inferSemanticValues(ambiguousFields, uniqueValues);
      clearSemanticCache();
      expect(getSemanticCacheSize()).toBe(0);
    });
  });
});
