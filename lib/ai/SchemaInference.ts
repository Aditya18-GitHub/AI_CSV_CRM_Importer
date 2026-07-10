import type { ColumnMapping, FieldMappings } from '@/types/crm';
import { aiProviderManager } from './providers/AIProviderManager';
import { logger } from '@/lib/logger';
import { inferColumnMappingHeuristic, isMappingSufficient } from '@/lib/column-heuristics';
import { config } from '@/lib/config';
import { CRM_FIELDS } from '@/types/crm';

const schemaCache = new Map<string, ColumnMapping>();

function generateCacheKey(headers: string[], sampleRows: Record<string, string>[]): string {
  const headersStr = headers.join('|').toLowerCase();
  const sampleStr = JSON.stringify(sampleRows.slice(0, 3));
  return `${headersStr}:${sampleStr}`;
}

export async function inferColumnMapping(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnMapping> {
  const cacheKey = generateCacheKey(headers, sampleRows);
  
  // Check cache
  if (schemaCache.has(cacheKey)) {
    logger.info('Schema inference cache hit');
    return schemaCache.get(cacheKey)!;
  }

  const startTime = Date.now();

  // Step 1: Run heuristic mapping
  const heuristic = inferColumnMappingHeuristic(headers);
  const heuristicFieldMappings = heuristic.fieldMappings;
  
  // Step 2: Collect unmapped headers
  const mappedColumns = new Set(
    Object.values(heuristicFieldMappings).filter((col): col is string => col !== null && col !== undefined)
  );
  const unmappedHeaders = headers.filter((header) => !mappedColumns.has(header));
  
  logger.info('Heuristic mapping complete', {
    mappedCount: mappedColumns.size,
    unmappedCount: unmappedHeaders.length,
  });

  // Step 3: If heuristic is sufficient, return it
  if (isMappingSufficient(heuristic)) {
    logger.info('Using heuristic column mapping (sufficient)', {
      durationMs: Date.now() - startTime,
    });
    schemaCache.set(cacheKey, heuristic);
    return heuristic;
  }

  // Step 4: Use AI for unmapped headers only
  try {
    const aiResult = await aiProviderManager.inferSemanticMapping(
      unmappedHeaders,
      sampleRows,
      heuristicFieldMappings as Record<string, string | null | undefined>
    );
    
    // Step 5: Merge heuristic and AI mappings (heuristic wins)
    const mergedFieldMappings: FieldMappings = { ...heuristicFieldMappings };
    
    // Apply AI mappings with confidence >= 0.75
    for (const mapping of aiResult.semanticMappings || []) {
      if (mapping.confidence >= 0.75 && mapping.field) {
        // Only map if field is not already mapped by heuristic
        const isAlreadyMapped = Object.values(mergedFieldMappings).includes(mapping.header);
        if (!isAlreadyMapped) {
          mergedFieldMappings[mapping.field as keyof FieldMappings] = mapping.header;
          logger.info('AI mapping applied', {
            header: mapping.header,
            field: mapping.field,
            confidence: mapping.confidence,
            reason: mapping.reason,
          });
        }
      }
    }
    
    const finalMapping: ColumnMapping = {
      fieldMappings: mergedFieldMappings,
      noteColumns: heuristic.noteColumns,
      multiValueColumns: heuristic.multiValueColumns,
    };

    logger.info('Hybrid schema inference complete', {
      durationMs: Date.now() - startTime,
      heuristicMapped: mappedColumns.size,
      aiMapped: aiResult.semanticMappings?.filter((m: { confidence: number }) => m.confidence >= 0.75).length || 0,
    });

    // Cache the result
    schemaCache.set(cacheKey, finalMapping);
    
    return finalMapping;
  } catch (error) {
    logger.error('AI semantic mapping failed, using heuristic only', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to heuristic
    schemaCache.set(cacheKey, heuristic);
    return heuristic;
  }
}

export function clearSchemaCache(): void {
  schemaCache.clear();
}

export function getSchemaCacheSize(): number {
  return schemaCache.size;
}
