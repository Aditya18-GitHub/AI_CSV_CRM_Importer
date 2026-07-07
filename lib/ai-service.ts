import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, type CRMRecord } from '@/types/crm';

const API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';

function getClient() {
  if (!API_KEY) {
    throw new Error('No AI API key configured. Set GEMINI_API_KEY in environment variables.');
  }
  return new GoogleGenerativeAI(API_KEY);
}

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

function validateRecord(rec: unknown): rec is CRMRecord {
  if (typeof rec !== 'object' || rec === null) return false;
  const r = rec as Record<string, unknown>;
  return (
    typeof r.created_at === 'string' &&
    typeof r.name === 'string' &&
    typeof r.email === 'string' &&
    typeof r.country_code === 'string' &&
    typeof r.mobile_without_country_code === 'string' &&
    typeof r.company === 'string' &&
    typeof r.city === 'string' &&
    typeof r.state === 'string' &&
    typeof r.country === 'string' &&
    typeof r.lead_owner === 'string' &&
    typeof r.crm_status === 'string' &&
    typeof r.crm_note === 'string' &&
    typeof r.data_source === 'string' &&
    typeof r.possession_time === 'string' &&
    typeof r.description === 'string'
  );
}

function shouldSkip(rec: CRMRecord): boolean {
  const hasEmail = rec.email && rec.email.trim().length > 0;
  const hasMobile = rec.mobile_without_country_code && rec.mobile_without_country_code.trim().length > 0;
  return !hasEmail && !hasMobile;
}

export async function processBatch(
  batch: Record<string, string>[],
  batchIndex: number,
  totalBatches: number
): Promise<CRMRecord[]> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const userPrompt = `Map the following ${batch.length} CSV records into the CRM schema. Return ONLY a JSON array — no markdown, no explanation.

Batch ${batchIndex + 1} of ${totalBatches}.

CSV records (as JSON objects with original column names):
${JSON.stringify(batch, null, 0)}`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      const parsed = extractJson(text);

      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not a JSON array');
      }

      const valid: CRMRecord[] = [];
      for (const rec of parsed) {
        if (validateRecord(rec)) {
          if (!shouldSkip(rec)) {
            valid.push(rec);
          }
        }
      }
      return valid;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('429') || raw.toLowerCase().includes('quota')) {
        throw new Error(
          'Gemini API quota exceeded. Please wait a moment and try again, or check your API plan at https://ai.google.dev/gemini-api/docs/rate-limits.'
        );
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('AI processing failed');
}

export async function processAllBatches(
  rows: Record<string, string>[],
  batchSize: number,
  onProgress?: (current: number, total: number) => void
): Promise<CRMRecord[]> {
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  const totalBatches = batches.length;
  const allRecords: CRMRecord[] = [];

  for (let i = 0; i < batches.length; i++) {
    onProgress?.(i, totalBatches);
    const records = await processBatch(batches[i], i, totalBatches);
    allRecords.push(...records);
  }

  onProgress?.(totalBatches, totalBatches);
  return allRecords;
}
