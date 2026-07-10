import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AIProvider,
  SchemaInferenceResult,
  SemanticInferenceRequest,
  SemanticInferenceResult,
  ProviderHealthStatus,
  SemanticMappingResult,
} from './AIProvider';
import { providerHealth } from '../ProviderHealth';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { SEMANTIC_MAPPING_PROMPT } from '@/types/crm';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly priority = 1;

  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.client = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client && providerHealth.isAvailable(this.name);
  }

  getHealth(): ProviderHealthStatus {
    return providerHealth.getHealth(this.name);
  }

  markError(error: string): void {
    providerHealth.markError(this.name, error);
  }

  markSuccess(): void {
    providerHealth.markSuccess(this.name);
  }

  private getModel() {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }
    return this.client.getGenerativeModel({ model: config.geminiModel });
  }

  private extractJson(text: string): unknown {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const start = cleaned.indexOf('{');
    const arrayStart = cleaned.indexOf('[');
    const useObject = start !== -1 && (arrayStart === -1 || start < arrayStart);
    if (useObject) {
      const end = cleaned.lastIndexOf('}');
      if (end > start) cleaned = cleaned.slice(start, end + 1);
    } else if (arrayStart !== -1) {
      const end = cleaned.lastIndexOf(']');
      if (end > arrayStart) cleaned = cleaned.slice(arrayStart, end + 1);
    }
    return JSON.parse(cleaned);
  }

  async inferSchema(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<SchemaInferenceResult> {
    providerHealth.incrementRequest(this.name);
    const startTime = Date.now();

    try {
      const model = this.getModel();
      
      const prompt = this.buildSchemaPrompt(headers, sampleRows);
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = this.extractJson(text) as any;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid schema inference response');
      }

      const fieldMappings = parsed.fieldMappings || {};
      const noteColumns = parsed.noteColumns || [];
      const multiValueColumns = parsed.multiValueColumns || [];

      const resultData: SchemaInferenceResult = {
        fieldMappings,
        noteColumns,
        multiValueColumns,
        confidence: parsed.confidence || 0.8,
      };

      this.markSuccess();
      logger.info('Gemini schema inference complete', {
        durationMs: Date.now() - startTime,
        headers: headers.length,
        sampleRows: sampleRows.length,
      });

      return resultData;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Gemini schema inference failed', {
        durationMs: Date.now() - startTime,
        error: message,
      });
      throw error;
    }
  }

  async inferSemanticValues(
    requests: SemanticInferenceRequest[]
  ): Promise<SemanticInferenceResult[]> {
    providerHealth.incrementRequest(this.name);
    const startTime = Date.now();

    try {
      const model = this.getModel();
      
      const results: SemanticInferenceResult[] = [];

      for (const request of requests) {
        const prompt = this.buildSemanticPrompt(request);
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = this.extractJson(text) as any;

        if (!parsed || typeof parsed !== 'object') {
          throw new Error(`Invalid semantic inference response for field: ${request.field}`);
        }

        results.push({
          field: request.field,
          mappings: parsed.mappings || {},
          confidence: parsed.confidence || 0.7,
        });
      }

      this.markSuccess();
      logger.info('Gemini semantic inference complete', {
        durationMs: Date.now() - startTime,
        fields: requests.length,
      });

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Gemini semantic inference failed', {
        durationMs: Date.now() - startTime,
        error: message,
      });
      throw error;
    }
  }

  private buildSchemaPrompt(headers: string[], sampleRows: Record<string, string>[]): string {
    const headersJson = JSON.stringify(headers);
    const samplesJson = JSON.stringify(sampleRows.slice(0, 5));

    return `You are a CSV column mapping expert. Map these CSV headers to CRM fields.

Headers: ${headersJson}

Sample rows: ${samplesJson}

Return JSON only:
{
  "fieldMappings": {
    "created_at": "exact header name or null",
    "name": "exact header name or null",
    "email": "exact header name or null",
    "mobile_without_country_code": "exact header name or null",
    "company": "exact header name or null",
    "city": "exact header name or null",
    "state": "exact header name or null",
    "country": "exact header name or null",
    "lead_owner": "exact header name or null",
    "crm_status": "exact header name or null",
    "crm_note": "exact header name or null",
    "data_source": "exact header name or null",
    "posession_time": "exact header name or null",
    "description": "exact header name or null"
  },
  "noteColumns": ["header names that contain remarks/notes/comments"],
  "multiValueColumns": ["header names that may contain multiple emails/phones"],
  "confidence": 0.0-1.0
}

Rules:
- Use exact header names from the input
- null if no match exists
- Recognize synonyms: Name/Client Name/Full Name, Email/E-mail/Mail ID, Phone/Mobile/Cell/WhatsApp, Company/Organization/Business, Status/Lead Status/CRM Status, Owner/Assigned To/Sales Person, Remarks/Notes/Comments/Feedback
- Ignore UTM parameters, click IDs, internal IDs, latitude, longitude, IP addresses
- JSON only, no markdown`;
  }

  async inferSemanticMapping(
    unmappedHeaders: string[],
    sampleRows: Record<string, string>[],
    existingMappings: Record<string, string | null | undefined>
  ): Promise<{ semanticMappings: SemanticMappingResult[]; confidence: number }> {
    providerHealth.incrementRequest(this.name);
    const startTime = Date.now();

    try {
      const model = this.getModel();
      
      const prompt = this.buildSemanticMappingPrompt(unmappedHeaders, sampleRows, existingMappings);
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = this.extractJson(text) as Record<string, any>;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid semantic mapping response');
      }

      const semanticMappings: SemanticMappingResult[] = [];
      let totalConfidence = 0;
      let count = 0;

      for (const [header, mapping] of Object.entries(parsed)) {
        if (mapping && typeof mapping === 'object' && 'field' in mapping) {
          const typedMapping = mapping as { field?: string; confidence?: number; reason?: string };
          if (typedMapping.field) {
            const confidence = typedMapping.confidence || 0.5;
            semanticMappings.push({
              header,
              field: typedMapping.field,
              confidence,
              reason: typedMapping.reason || '',
            });
            totalConfidence += confidence;
            count++;
          }
        }
      }

      const avgConfidence = count > 0 ? totalConfidence / count : 0;

      this.markSuccess();
      logger.info('Gemini semantic mapping complete', {
        durationMs: Date.now() - startTime,
        headers: unmappedHeaders.length,
        mapped: semanticMappings.length,
        confidence: avgConfidence,
      });

      return { semanticMappings, confidence: avgConfidence };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Gemini semantic mapping failed', {
        durationMs: Date.now() - startTime,
        error: message,
      });
      throw error;
    }
  }

  private buildSemanticMappingPrompt(
    unmappedHeaders: string[],
    sampleRows: Record<string, string>[],
    existingMappings: Record<string, string | null | undefined>
  ): string {
    // Build sample values for each header
    const headerSamples: Record<string, string[]> = {};
    for (const header of unmappedHeaders) {
      const samples: string[] = [];
      for (const row of sampleRows.slice(0, 8)) {
        const value = row[header];
        if (value && value.trim()) {
          samples.push(value.trim());
        }
        if (samples.length >= 5) break;
      }
      headerSamples[header] = samples;
    }

    const headersJson = JSON.stringify(unmappedHeaders);
    const samplesJson = JSON.stringify(headerSamples);
    const existingJson = JSON.stringify(existingMappings);

    return `${SEMANTIC_MAPPING_PROMPT}

Unmapped Headers: ${headersJson}

Sample Values for Each Header: ${samplesJson}

Already Mapped Fields (do not remap these): ${existingJson}`;
  }

  private buildSemanticPrompt(request: SemanticInferenceRequest): string {
    const valuesJson = JSON.stringify(request.values);
    
    let fieldInstructions = '';
    switch (request.field) {
      case 'crm_status':
        fieldInstructions = `Map these status values to: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE, or empty string.`;
        break;
      case 'data_source':
        fieldInstructions = `Map these source values to: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string.`;
        break;
      default:
        fieldInstructions = `Normalize and clean these values. Return empty string if value is unclear or irrelevant.`;
    }

    return `You are a data normalization expert. ${fieldInstructions}

Field: ${request.field}
Values: ${valuesJson}

Return JSON only:
{
  "mappings": {
    "original_value_1": "normalized_value_1",
    "original_value_2": "normalized_value_2"
  },
  "confidence": 0.0-1.0
}

Rules:
- Preserve original values as keys
- Map to normalized CRM values
- Empty string if value is unclear or doesn't match known patterns
- JSON only, no markdown`;
  }
}
