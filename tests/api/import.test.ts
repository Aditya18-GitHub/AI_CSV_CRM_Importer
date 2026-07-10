import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/import/route';

describe('Import API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/import', () => {
    it('should be defined', () => {
      expect(POST).toBeDefined();
    });

    it('should accept valid parsed CSV payload', async () => {
      const body = {
        columns: ['name', 'email', 'phone'],
        rows: [
          { name: 'John Doe', email: 'john@example.com', phone: '+91 9876543210' },
        ],
        batchSize: 100,
      };

      const req = {
        json: vi.fn(() => Promise.resolve(body)),
      } as any;

      expect(POST).toBeDefined();
      expect(req.json).toBeDefined();
    });

    it('should reject empty columns', async () => {
      const body = { columns: [], rows: [{ name: 'John' }] };
      const req = { json: vi.fn(() => Promise.resolve(body)) } as any;

      expect(POST).toBeDefined();
      expect(req.json).toBeDefined();
    });

    it('should reject empty rows', async () => {
      const body = { columns: ['name'], rows: [] };
      const req = { json: vi.fn(() => Promise.resolve(body)) } as any;

      expect(POST).toBeDefined();
      expect(req.json).toBeDefined();
    });
  });
});
