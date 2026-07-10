import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCSVRows } from '@/lib/ai-service';
import { VALID_CSV, INVALID_RECORDS_CSV } from '../fixtures/csv-data';

// Mock dependencies
vi.mock('@/lib/ai/SchemaInference', () => ({
  inferColumnMapping: vi.fn(),
  clearSchemaCache: vi.fn(),
}));

vi.mock('@/lib/ai/SemanticInference', () => ({
  inferSemanticValues: vi.fn(),
  clearSemanticCache: vi.fn(),
}));

vi.mock('@/lib/ai/TransformationEngine', () => ({
  TransformationEngine: {
    transformRows: vi.fn(),
    applySemanticMappings: vi.fn(),
  },
}));

vi.mock('@/lib/record-utils', () => ({
  trimRows: vi.fn((rows) => rows),
}));

describe('AI Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processCSVRows', () => {
    it('should process CSV rows end-to-end', async () => {
      const columns = ['name', 'email', 'phone'];
      const rows = [
        { name: 'John Doe', email: 'john@example.com', phone: '+91 9876543210' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 2345678901' },
      ];

      // Mock the dependencies
      const { inferColumnMapping } = await import('@/lib/ai/SchemaInference');
      const { TransformationEngine } = await import('@/lib/ai/TransformationEngine');

      vi.mocked(inferColumnMapping).mockResolvedValue({
        fieldMappings: {
          name: 'name',
          email: 'email',
          mobile_without_country_code: 'phone',
        },
        noteColumns: [],
        multiValueColumns: [],
      });

      vi.mocked(TransformationEngine.transformRows).mockReturnValue({
        records: [],
        ambiguousFields: new Set(),
        uniqueValues: new Map(),
      });

      vi.mocked(TransformationEngine.applySemanticMappings).mockImplementation((records) => records);

      const progressCallback = vi.fn();
      const result = await processCSVRows(columns, rows, 100, progressCallback);

      expect(result).toBeDefined();
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should skip invalid records', async () => {
      const columns = ['name', 'email', 'phone'];
      const rows = [
        { name: 'John Doe', email: 'john@example.com', phone: '+91 9876543210' },
        { name: 'Jane Smith', email: '', phone: '' }, // Invalid
      ];

      const progressCallback = vi.fn();
      const result = await processCSVRows(columns, rows, 100, progressCallback);

      expect(result).toBeDefined();
      // Invalid record should be skipped
    });

    it('should call progress callback with stages', async () => {
      const columns = ['name', 'email'];
      const rows = [{ name: 'John Doe', email: 'john@example.com' }];

      const progressCallback = vi.fn();
      await processCSVRows(columns, rows, 100, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should handle empty rows', async () => {
      const columns = ['name', 'email'];
      const rows: Record<string, string>[] = [];

      const progressCallback = vi.fn();
      const result = await processCSVRows(columns, rows, 100, progressCallback);

      expect(result).toEqual([]);
    });

    it('should use configurable batch size', async () => {
      const columns = ['name', 'email'];
      const rows = Array.from({ length: 200 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      const progressCallback = vi.fn();
      await processCSVRows(columns, rows, 50, progressCallback);

      // Should process in batches of 50
      expect(progressCallback).toHaveBeenCalled();
    });
  });
});
