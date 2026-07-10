import type {
  AIProvider,
  SchemaInferenceResult,
  SemanticInferenceRequest,
  SemanticInferenceResult,
  ProviderHealthStatus,
  SemanticMappingResult,
} from './AIProvider';
import { SEMANTIC_MAPPING_PROMPT } from '@/types/crm';
import { providerHealth } from '../ProviderHealth';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  readonly priority = 2;

  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && providerHealth.isAvailable(this.name);
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

  private async makeRequest(prompt: string): Promise<any> {
    const model = process.env.GROQ_MODEL || 'llama3-70b-8192';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a data mapping expert. Return valid JSON only, no markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Extract JSON from content
    let cleaned = content.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    return JSON.parse(cleaned);
  }

  async inferSchema(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<SchemaInferenceResult> {
    providerHealth.incrementRequest(this.name);
    const startTime = Date.now();

    try {
      const headersJson = JSON.stringify(headers);
      const samplesJson = JSON.stringify(sampleRows.slice(0, 5));

      const prompt = `Map these CSV headers to CRM fields.

Headers: ${headersJson}

Sample rows: ${samplesJson}

Return JSON:
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
  "noteColumns": ["header names for remarks/notes/comments"],
  "multiValueColumns": ["header names for multiple emails/phones"],
  "confidence": 0.0-1.0
}

Use exact header names. null if no match. Recognize synonyms. Ignore UTM/click IDs/internal IDs.`;

      const parsed = await this.makeRequest(prompt);

      const resultData: SchemaInferenceResult = {
        fieldMappings: parsed.fieldMappings || {},
        noteColumns: parsed.noteColumns || [],
        multiValueColumns: parsed.multiValueColumns || [],
        confidence: parsed.confidence || 0.8,
      };

      this.markSuccess();
      logger.info('Groq schema inference complete', {
        durationMs: Date.now() - startTime,
        headers: headers.length,
        sampleRows: sampleRows.length,
      });

      return resultData;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Groq schema inference failed', {
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
      const results: SemanticInferenceResult[] = [];

      for (const request of requests) {
        const valuesJson = JSON.stringify(request.values);
        
        let fieldInstructions = '';
        switch (request.field) {
          case 'crm_status':
            fieldInstructions = `Map to: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE, or empty string.`;
            break;
          case 'data_source':
            fieldInstructions = `Map to: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string.`;
            break;
          default:
            fieldInstructions = `Normalize and clean values. Empty string if unclear.`;
        }

        const prompt = `Field: ${request.field}
Values: ${valuesJson}

${fieldInstructions}

Return JSON:
{
  "mappings": {
    "original_value": "normalized_value"
  },
  "confidence": 0.0-1.0
}

Preserve original values as keys. Empty string if unclear.`;

        const parsed = await this.makeRequest(prompt);

        results.push({
          field: request.field,
          mappings: parsed.mappings || {},
          confidence: parsed.confidence || 0.7,
        });
      }

      this.markSuccess();
      logger.info('Groq semantic inference complete', {
        durationMs: Date.now() - startTime,
        fields: requests.length,
      });

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Groq semantic inference failed', {
        durationMs: Date.now() - startTime,
        error: message,
      });
      throw error;
    }
  }

  async inferSemanticMapping(
    unmappedHeaders: string[],
    sampleRows: Record<string, string>[],
    existingMappings: Record<string, string | null | undefined>
  ): Promise<{ semanticMappings: SemanticMappingResult[]; confidence: number }> {
    providerHealth.incrementRequest(this.name);
    const startTime = Date.now();

    try {
      const prompt = this.buildSemanticMappingPrompt(unmappedHeaders, sampleRows, existingMappings);
      const parsed = await this.makeRequest(prompt);

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
      logger.info('Groq semantic mapping complete', {
        durationMs: Date.now() - startTime,
        headers: unmappedHeaders.length,
        mapped: semanticMappings.length,
        confidence: avgConfidence,
      });

      return { semanticMappings, confidence: avgConfidence };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      logger.error('Groq semantic mapping failed', {
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
}
