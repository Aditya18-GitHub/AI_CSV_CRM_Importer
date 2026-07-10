import pLimit from 'p-limit';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { trimRows } from '@/lib/record-utils';
import type { CRMRecord } from '@/types/crm';
import { updateJobProgress } from '@/lib/job-store';
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


export async function runImportJob(
  jobId: string,
  columns: string[],
  rows: Record<string, string>[],
  batchSize: number
): Promise<CRMRecord[]> {
  const startTime = Date.now();

  const onProgress: ProgressCallback = (stage, current, total, message) => {
    const stageMap: Record<string, Parameters<typeof updateJobProgress>[1]['stage']> = {
      parsing: 'parsing',
      mapping: 'mapping',
      transform: 'transforming',
      semantic_inference: 'ai_inference',
      completed: 'completed',
    };

    let percent = 0;
    if (stage === 'mapping') percent = 10 + (current / Math.max(total, 1)) * 15;
    else if (stage === 'transform') percent = 25 + (current / Math.max(total, 1)) * 40;
    else if (stage === 'semantic_inference') percent = 65 + (current / Math.max(total, 1)) * 30;
    else if (stage === 'completed') percent = 100;

    const elapsedMs = Date.now() - startTime;
    const estimatedRemainingMs =
      percent > 0 && percent < 100
        ? Math.round((elapsedMs / percent) * (100 - percent))
        : 0;

    updateJobProgress(jobId, {
      stage: stageMap[stage] || 'ai_inference',
      message: message || stage,
      currentBatch: current,
      totalBatches: total,
      processedRows: Math.round((rows.length * percent) / 100),
      totalRows: rows.length,
      percent: Math.round(percent),
      elapsedMs,
      estimatedRemainingMs,
    });
  };

  return processCSVRows(columns, rows, batchSize, onProgress);
}
