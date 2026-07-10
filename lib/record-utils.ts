import type { CRMRecord } from '@/types/crm';

const EMPTY_VALUES = new Set(['', 'null', 'undefined', 'n/a', 'na', 'nil', 'none', '-', '--', '—']);

export function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/[\t\r\n]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (EMPTY_VALUES.has(str.toLowerCase())) return '';
  return str;
}

export function trimRow(row: Record<string, string>): Record<string, string> {
  const trimmed: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeCellValue(value);
    if (normalized) trimmed[key] = normalized;
  }
  return trimmed;
}

export function trimRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map(trimRow);
}

export interface InferencePayload {
  i: number;
  status?: string;
  owner?: string;
  source?: string;
  possession_time?: string;
  description?: string;
  note?: string;
  extra?: Record<string, string>;
}

export function buildInferencePayload(
  index: number,
  record: CRMRecord,
  row: Record<string, string>,
  mappedColumns: Set<string>
): InferencePayload | null {
  const extra: Record<string, string> = {};
  for (const [col, value] of Object.entries(row)) {
    if (mappedColumns.has(col)) continue;
    const normalized = normalizeCellValue(value);
    if (normalized) extra[col] = normalized;
  }

  const needsInference =
    !record.crm_status ||
    !record.data_source ||
    !record.lead_owner ||
    !record.possession_time ||
    !record.description ||
    Object.keys(extra).length > 0;

  if (!needsInference) return null;

  const payload: InferencePayload = { i: index };
  if (!record.crm_status) payload.status = row[findRawColumn(row, /status/i)] || '';
  if (!record.lead_owner) payload.owner = record.lead_owner || row[findRawColumn(row, /owner|assigned/i)] || '';
  if (!record.data_source) payload.source = row[findRawColumn(row, /source|campaign/i)] || '';
  if (!record.possession_time) payload.possession_time = record.possession_time || '';
  if (!record.description) payload.description = record.description || '';
  if (Object.keys(extra).length > 0) payload.extra = extra;

  const hasContent =
    payload.status ||
    payload.owner ||
    payload.source ||
    payload.possession_time ||
    payload.description ||
    payload.note ||
    (payload.extra && Object.keys(payload.extra).length > 0);

  return hasContent ? payload : null;
}

function findRawColumn(row: Record<string, string>, pattern: RegExp): string {
  for (const col of Object.keys(row)) {
    if (pattern.test(col)) return row[col];
  }
  return '';
}

export function mergeInferencePatch(record: CRMRecord, patch: Partial<CRMRecord> & { crm_note_append?: string }): CRMRecord {
  const merged = { ...record };

  if (patch.crm_status && !merged.crm_status) merged.crm_status = patch.crm_status;
  if (patch.data_source && !merged.data_source) merged.data_source = patch.data_source;
  if (patch.lead_owner && !merged.lead_owner) merged.lead_owner = patch.lead_owner;
  if (patch.possession_time && !merged.possession_time) merged.possession_time = patch.possession_time;
  if (patch.description && !merged.description) merged.description = patch.description;

  if (patch.crm_note_append) {
    merged.crm_note = merged.crm_note
      ? `${merged.crm_note} | ${patch.crm_note_append}`
      : patch.crm_note_append;
  } else if (patch.crm_note && !merged.crm_note) {
    merged.crm_note = patch.crm_note;
  }

  return merged;
}
