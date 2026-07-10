function parseIntEnv(key: string, fallback: number, min?: number, max?: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return fallback;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

function parseBoolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

export const config = {
  maxBatchSize: parseIntEnv('MAX_BATCH_SIZE', 100, 20, 100),
  minBatchSize: parseIntEnv('MIN_BATCH_SIZE', 20, 10, 100),
  aiConcurrency: parseIntEnv('AI_CONCURRENCY', 5, 1, 10),
  maxRetries: parseIntEnv('MAX_RETRIES', 3, 1, 10),
  requestTimeoutMs: parseIntEnv('REQUEST_TIMEOUT', 60000, 5000, 300000),
  sampleRowsForMapping: parseIntEnv('SAMPLE_ROWS_FOR_MAPPING', 8, 3, 20),
  largeFileRowThreshold: parseIntEnv('LARGE_FILE_ROW_THRESHOLD', 0, 0, 10000),
  inferAmbiguousFields: parseBoolEnv('INFER_AMBIGUOUS_FIELDS', true),
  enableHeuristicMapping: parseBoolEnv('ENABLE_HEURISTIC_MAPPING', true),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama3-70b-8192',
  cerebrasModel: process.env.CEREBRAS_MODEL || 'llama3.1-70b',
  openrouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct:free',
  jobPollIntervalMs: parseIntEnv('JOB_POLL_INTERVAL_MS', 1000, 500, 5000),
  maxFileSizeBytes: parseIntEnv('MAX_FILE_SIZE_MB', 10, 1, 50) * 1024 * 1024,
} as const;
