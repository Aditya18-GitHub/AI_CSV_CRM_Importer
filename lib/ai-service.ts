import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { trimRows } from '@/lib/record-utils';
import type { CRMRecord } from '@/types/crm';
import { inferColumnMapping } from '@/lib/ai/SchemaInference';
import { TransformationEngine } from '@/lib/ai/TransformationEngine';
import { inferSemanticValues } from '@/lib/ai/SemanticInference';

export type ProgressCallback = (
  stage: 'parsing' | 'mapping' | 'transform' | 'semantic_inference' | 'completed',
  current: number,
  total: number,
  message?: string
) => void;


export async function processCSVRows(
  columns: string[],
  rows: Record<string, string>[],
  batchSize: number = config.maxBatchSize,
  onProgress?: ProgressCallback
): Promise<CRMRecord[]> {
  const totalStart = Date.now();
  const trimmedRows = trimRows(rows);

  logger.info('Starting CSV processing with new architecture', {
    totalRows: trimmedRows.length,
    totalColumns: columns.length,
  });

  // Step 1: Schema Inference (1 AI call)
  onProgress?.('mapping', 0, 1, 'Inferring column schema...');
  const mappingStart = Date.now();
  const mapping = await inferColumnMapping(columns, trimmedRows.slice(0, 10));
  logger.info('Schema inference complete', { durationMs: Date.now() - mappingStart });
  onProgress?.('mapping', 1, 1, 'Schema inferred');

  // Step 2: JavaScript Transformation (deterministic, no AI)
  onProgress?.('transform', 0, 1, 'Transforming rows with JavaScript...');
  const transformStart = Date.now();
  const transformResult = TransformationEngine.transformRows(trimmedRows, mapping);
  let records = transformResult.records;
  logger.info('JavaScript transformation complete', {
    durationMs: Date.now() - transformStart,
    extracted: records.length,
    totalRows: trimmedRows.length,
  });
  onProgress?.('transform', 1, 1, `Transformed ${records.length} records`);

  // Step 3: Semantic Inference (only if needed, unique values only)
  if (config.inferAmbiguousFields && transformResult.ambiguousFields.size > 0) {
    onProgress?.('semantic_inference', 0, 1, 'Inferring semantic values...');
    const semanticStart = Date.now();
    
    const semanticMappings = await inferSemanticValues(
      transformResult.ambiguousFields,
      transformResult.uniqueValues
    );
    
    records = TransformationEngine.applySemanticMappings(records, semanticMappings);
    
    logger.info('Semantic inference complete', {
      durationMs: Date.now() - semanticStart,
      fieldsProcessed: semanticMappings.size,
    });
    onProgress?.('semantic_inference', 1, 1, 'Semantic inference complete');
  }

  logger.info('New architecture processing complete', {
    totalDurationMs: Date.now() - totalStart,
    imported: records.length,
    skipped: trimmedRows.length - records.length,
  });

  onProgress?.('completed', 1, 1, 'Import completed');
  return records;
}
