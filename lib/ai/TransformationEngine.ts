import type { CRMRecord, ColumnMapping } from '@/types/crm';
import { mapRowsWithMapping } from '@/lib/record-mapper';
import { logger } from '@/lib/logger';

export interface TransformationResult {
  records: CRMRecord[];
  ambiguousFields: Set<string>;
  uniqueValues: Map<string, Set<string>>;
}

export class TransformationEngine {
  private static AMBIGUOUS_FIELDS = new Set([
    'crm_status',
    'crm_note',
    'description',
    'data_source',
    'lead_owner',
    'possession_time',
  ]);

  static transformRows(
    rows: Record<string, string>[],
    mapping: ColumnMapping
  ): TransformationResult {
    const startTime = Date.now();
    
    // Use existing mapper for deterministic transformations
    const mapped = mapRowsWithMapping(rows, mapping);
    const records = mapped.map((m) => m.record);

    // Identify ambiguous fields that need semantic inference
    const ambiguousFields = new Set<string>();
    const uniqueValues = new Map<string, Set<string>>();

    // Collect unique values for ambiguous fields
    for (const record of records) {
      this.AMBIGUOUS_FIELDS.forEach((field) => {
        const value = (record as any)[field];
        if (value && value.trim()) {
          if (!ambiguousFields.has(field)) {
            ambiguousFields.add(field);
            uniqueValues.set(field, new Set());
          }
          uniqueValues.get(field)!.add(value.trim());
        }
      });
    }

    const uniqueValuesCount: Record<string, number> = {};
    uniqueValues.forEach((valueSet, key) => {
      uniqueValuesCount[key] = valueSet.size;
    });

    const ambiguousFieldsArray: string[] = [];
    ambiguousFields.forEach((field) => {
      ambiguousFieldsArray.push(field);
    });

    logger.info('JavaScript transformation complete', {
      durationMs: Date.now() - startTime,
      totalRows: rows.length,
      extractedRecords: records.length,
      ambiguousFields: ambiguousFieldsArray,
      uniqueValuesCount,
    });

    return {
      records,
      ambiguousFields,
      uniqueValues,
    };
  }

  static applySemanticMappings(
    records: CRMRecord[],
    semanticMappings: Map<string, Record<string, string>>
  ): CRMRecord[] {
    const startTime = Date.now();
    let modifiedCount = 0;

    const updated = records.map((record) => {
      let modified = false;
      const updatedRecord = { ...record };

      semanticMappings.forEach((mappings, field) => {
        const currentValue = (updatedRecord as any)[field];
        if (currentValue && mappings[currentValue]) {
          (updatedRecord as any)[field] = mappings[currentValue];
          modified = true;
        }
      });

      if (modified) modifiedCount++;
      return updatedRecord;
    });

    let fieldsMapped = 0;
    semanticMappings.forEach(() => {
      fieldsMapped++;
    });

    logger.info('Semantic mappings applied', {
      durationMs: Date.now() - startTime,
      totalRecords: records.length,
      modifiedRecords: modifiedCount,
      fieldsMapped,
    });

    return updated;
  }
}
