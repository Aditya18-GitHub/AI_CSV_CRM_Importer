import '@testing-library/jest-dom';

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'gemini-pro';
process.env.GROQ_API_KEY = 'test-key';
process.env.GROQ_MODEL = 'llama3-70b-8192';
process.env.CEREBRAS_API_KEY = 'test-key';
process.env.CEREBRAS_MODEL = 'llama3.1-70b';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.OPENROUTER_MODEL = 'meta-llama/llama-3.1-70b-instruct:free';
process.env.MAX_BATCH_SIZE = '100';
process.env.AI_CONCURRENCY = '5';
process.env.MAX_RETRIES = '3';
process.env.REQUEST_TIMEOUT = '30000';
process.env.LARGE_FILE_ROW_THRESHOLD = '1000';
process.env.INFER_AMBIGUOUS_FIELDS = 'true';
process.env.ENABLE_HEURISTIC_MAPPING = 'true';

// Mock File API for browser environment
global.File = class File {
  constructor(bits: any[], name: string, options?: { type?: string }) {
    this.name = name;
    this.type = options?.type || '';
    this.size = bits.reduce((acc: number, b: any) => acc + (b.size || b.length || 0), 0);
  }
  name: string;
  type: string;
  size: number;
  text() {
    return Promise.resolve('');
  }
} as any;

global.Blob = class Blob {
  constructor(bits: any[], options?: { type?: string }) {
    this.type = options?.type || '';
    this.size = bits.reduce((acc: number, b: any) => acc + (b.size || b.length || 0), 0);
  }
  type: string;
  size: number;
} as any;
