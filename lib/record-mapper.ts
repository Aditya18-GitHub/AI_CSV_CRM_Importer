import type { CRMRecord, ColumnMapping } from '@/types/crm';
import { normalizeCellValue } from '@/lib/record-utils';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{6,}\d)/g;

const CRM_STATUS_VALUES = new Set([
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
  '',
]);

const DATA_SOURCE_VALUES = new Set([
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  '',
]);

const EMPTY_RECORD: CRMRecord = {
  created_at: '',
  name: '',
  email: '',
  country_code: '',
  mobile_without_country_code: '',
  company: '',
  city: '',
  state: '',
  country: '',
  lead_owner: '',
  crm_status: '',
  crm_note: '',
  data_source: '',
  possession_time: '',
  description: '',
};

export function extractEmails(value: string): string[] {
  if (!value) return [];
  const matches = value.match(EMAIL_REGEX) || [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
}

export function extractPhones(value: string): string[] {
  if (!value) return [];
  const matches = value.match(PHONE_REGEX) || [];
  return Array.from(
    new Set(matches.map((p) => p.trim()).filter((p) => p.replace(/\D/g, '').length >= 7))
  );
}

export function parsePhone(raw: string): { country_code: string; mobile: string } {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { country_code: '', mobile: '' };

  if (raw.trim().startsWith('+') || digits.length > 10) {
    if (digits.startsWith('91') && digits.length >= 12) {
      return { country_code: '+91', mobile: digits.slice(-10) };
    }
    if (digits.startsWith('1') && digits.length === 11) {
      return { country_code: '+1', mobile: digits.slice(1) };
    }
    if (digits.length > 10) {
      const mobile = digits.slice(-10);
      const codeDigits = digits.slice(0, -10);
      return { country_code: codeDigits ? `+${codeDigits}` : '', mobile };
    }
  }

  return { country_code: '', mobile: digits.slice(-10) };
}

export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return trimmed;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

function normalizeCrmStatus(value: string): string {
  const upper = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (CRM_STATUS_VALUES.has(upper)) return upper;
  if (upper.includes('GOOD') || upper.includes('FOLLOW')) return 'GOOD_LEAD_FOLLOW_UP';
  if (upper.includes('NOT') && upper.includes('CONNECT')) return 'DID_NOT_CONNECT';
  if (upper.includes('BAD')) return 'BAD_LEAD';
  if (upper.includes('SALE') || upper.includes('DONE')) return 'SALE_DONE';
  return '';
}

function normalizeDataSource(value: string): string {
  const lower = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (DATA_SOURCE_VALUES.has(lower)) return lower;
  return '';
}

function getCell(row: Record<string, string>, column: string | null | undefined): string {
  if (!column) return '';
  return normalizeCellValue(row[column]);
}

function collectContactFromValue(
  value: string,
  isMultiValue: boolean
): { emails: string[]; phones: string[] } {
  if (!value) return { emails: [], phones: [] };
  if (isMultiValue) {
    return { emails: extractEmails(value), phones: extractPhones(value) };
  }
  const emails = extractEmails(value);
  const phones = extractPhones(value);
  if (emails.length === 0 && phones.length === 0 && value.includes('@')) {
    return { emails: extractEmails(value), phones: [] };
  }
  if (emails.length === 0 && phones.length === 0) {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 7) {
      return { emails: [], phones: [value] };
    }
  }
  return { emails, phones };
}

function shouldSkipRecord(rec: CRMRecord): boolean {
  const hasEmail = rec.email.trim().length > 0;
  const hasMobile = rec.mobile_without_country_code.trim().length > 0;
  return !hasEmail && !hasMobile;
}

export interface MappedRecord {
  record: CRMRecord;
  sourceRow: Record<string, string>;
}

export function mapRow(row: Record<string, string>, mapping: ColumnMapping): CRMRecord | null {
  const rec: CRMRecord = { ...EMPTY_RECORD };
  const noteParts: string[] = [];
  const allEmails: string[] = [];
  const allPhones: string[] = [];

  const fm = mapping.fieldMappings;
  const multiValue = new Set(mapping.multiValueColumns || []);

  const assignText = (field: keyof CRMRecord, column: string | null | undefined, title = false) => {
    const value = getCell(row, column);
    if (value) {
      rec[field] = title ? titleCase(normalizeText(value)) : normalizeText(value);
    }
  };

  assignText('created_at', fm.created_at);
  if (rec.created_at) rec.created_at = normalizeDate(rec.created_at);

  assignText('name', fm.name, true);
  assignText('company', fm.company);
  assignText('city', fm.city, true);
  assignText('state', fm.state, true);
  assignText('country', fm.country, true);
  assignText('lead_owner', fm.lead_owner);
  assignText('description', fm.description);
  assignText('possession_time', fm.possession_time);

  const statusVal = getCell(row, fm.crm_status);
  if (statusVal) rec.crm_status = normalizeCrmStatus(statusVal);

  const sourceVal = getCell(row, fm.data_source);
  if (sourceVal) rec.data_source = normalizeDataSource(sourceVal);

  const emailCol = fm.email;
  const phoneCol = fm.mobile_without_country_code || fm.phone;

  if (emailCol) {
    const { emails } = collectContactFromValue(getCell(row, emailCol), multiValue.has(emailCol));
    allEmails.push(...emails);
  }

  if (phoneCol) {
    const { phones } = collectContactFromValue(getCell(row, phoneCol), multiValue.has(phoneCol));
    allPhones.push(...phones);
  }

  const mappedColumns = new Set(
    Object.values(fm).filter((v): v is string => !!v)
  );
  for (const col of mapping.noteColumns || []) {
    mappedColumns.add(col);
  }

  for (const [col, raw] of Object.entries(row)) {
    if (mappedColumns.has(col)) continue;
    const value = String(raw ?? '').trim();
    if (!value) continue;

    const { emails, phones } = collectContactFromValue(value, true);
    if (emails.length === 0 && phones.length === 0) {
      noteParts.push(`${col}: ${value}`);
    } else {
      allEmails.push(...emails);
      allPhones.push(...phones);
    }
  }

  for (const col of mapping.noteColumns || []) {
    const value = getCell(row, col);
    if (value) noteParts.push(value);
  }

  if (allEmails.length > 0) {
    rec.email = allEmails[0];
    if (allEmails.length > 1) {
      noteParts.push(`Additional emails: ${allEmails.slice(1).join(', ')}`);
    }
  }

  if (allPhones.length > 0) {
    const parsed = parsePhone(allPhones[0]);
    rec.country_code = parsed.country_code;
    rec.mobile_without_country_code = parsed.mobile;
    if (allPhones.length > 1) {
      noteParts.push(`Additional phones: ${allPhones.slice(1).join(', ')}`);
    }
  }

  rec.crm_note = noteParts.filter(Boolean).join(' | ');

  if (shouldSkipRecord(rec)) return null;
  return rec;
}

export function mapRowsWithMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): MappedRecord[] {
  const records: MappedRecord[] = [];
  for (const row of rows) {
    const rec = mapRow(row, mapping);
    if (rec) records.push({ record: rec, sourceRow: row });
  }
  return records;
}

export function mapRowsToRecords(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): CRMRecord[] {
  return mapRowsWithMapping(rows, mapping).map((m) => m.record);
}
