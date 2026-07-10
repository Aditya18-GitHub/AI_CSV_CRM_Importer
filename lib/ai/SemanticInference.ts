import type { SemanticInferenceRequest, SemanticInferenceResult } from './providers/AIProvider';
import { aiProviderManager } from './providers/AIProviderManager';
import { logger } from '@/lib/logger';

const semanticCache = new Map<string, Record<string, string>>();

function generateCacheKey(field: string, values: string[]): string {
  const sortedValues = [...values].sort().join('|');
  return `${field}:${sortedValues}`;
}

export async function inferSemanticValues(
  ambiguousFields: Set<string>,
  uniqueValues: Map<string, Set<string>>
): Promise<Map<string, Record<string, string>>> {
  const startTime = Date.now();
  const mappings = new Map<string, Record<string, string>>();
  const requests: SemanticInferenceRequest[] = [];

  // Build requests for each ambiguous field
  const ambiguousFieldsArray: string[] = [];
  ambiguousFields.forEach((field) => {
    ambiguousFieldsArray.push(field);
  });

  for (const field of ambiguousFieldsArray) {
    const values = uniqueValues.get(field);
    if (values && values.size > 0) {
      const valuesArray: string[] = [];
      values.forEach((v) => valuesArray.push(v));
      
      const cacheKey = generateCacheKey(field, valuesArray);
      
      // Check cache
      if (semanticCache.has(cacheKey)) {
        mappings.set(field, semanticCache.get(cacheKey)!);
        logger.info(`Semantic inference cache hit for field: ${field}`);
        continue;
      }

      requests.push({
        field,
        values: valuesArray,
      });
    }
  }

  if (requests.length === 0) {
    logger.info('No semantic inference needed (all cached)');
    return mappings;
  }

  try {
    // Batch all requests to AI
    const results = await aiProviderManager.inferSemanticValues(requests);

    // Process results and cache them
    results.forEach((result) => {
      mappings.set(result.field, result.mappings);
      
      const values = uniqueValues.get(result.field);
      if (values) {
        const valuesArray: string[] = [];
        values.forEach((v) => valuesArray.push(v));
        const cacheKey = generateCacheKey(result.field, valuesArray);
        semanticCache.set(cacheKey, result.mappings);
      }
    });

    logger.info('Semantic inference complete', {
      durationMs: Date.now() - startTime,
      fieldsProcessed: results.length,
      totalUniqueValues: requests.reduce((sum, r) => sum + r.values.length, 0),
    });

    return mappings;
  } catch (error) {
    logger.error('Semantic inference failed, returning empty mappings', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty mappings on failure - records will use original values
    return mappings;
  }
}

export function clearSemanticCache(): void {
  semanticCache.clear();
}

export function getSemanticCacheSize(): number {
  return semanticCache.size;
}
