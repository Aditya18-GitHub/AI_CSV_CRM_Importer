export const CRM_STATUS_VALUES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
  '',
] as const;

export const DATA_SOURCE_VALUES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  '',
] as const;

export const CRM_FIELDS = [
  'created_at',
  'name',
  'email',
  'country_code',
  'mobile_without_country_code',
  'company',
  'city',
  'state',
  'country',
  'lead_owner',
  'crm_status',
  'crm_note',
  'data_source',
  'possession_time',
  'description',
] as const;

export const CRM_FIELD_LABELS: Record<string, string> = {
  created_at: 'Created At',
  name: 'Name',
  email: 'Email',
  country_code: 'Country Code',
  mobile_without_country_code: 'Mobile',
  company: 'Company',
  city: 'City',
  state: 'State',
  country: 'Country',
  lead_owner: 'Lead Owner',
  crm_status: 'CRM Status',
  crm_note: 'CRM Note',
  data_source: 'Data Source',
  possession_time: 'Possession Time',
  description: 'Description',
};

export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  skipped: number;
  processingTimeMs: number;
}

export interface ImportResponse {
  success: boolean;
  summary: ImportSummary;
  records: CRMRecord[];
  error?: string;
}

export interface ParsedCSV {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  totalColumns: number;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ['.csv', 'text/csv', 'application/vnd.ms-excel'];
export const DEFAULT_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '100', 10);
export const MIN_BATCH_SIZE = parseInt(process.env.MIN_BATCH_SIZE || '20', 10);
export const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '100', 10);
export const SAMPLE_ROWS_FOR_MAPPING = parseInt(process.env.SAMPLE_ROWS_FOR_MAPPING || '8', 10);
export const PARALLEL_BATCH_CONCURRENCY = parseInt(process.env.AI_CONCURRENCY || '5', 10);
export const LARGE_FILE_ROW_THRESHOLD = parseInt(process.env.LARGE_FILE_ROW_THRESHOLD || '0', 10);

export interface FieldMappings {
  created_at?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_without_country_code?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  lead_owner?: string | null;
  crm_status?: string | null;
  crm_note?: string | null;
  data_source?: string | null;
  possession_time?: string | null;
  description?: string | null;
}

export interface ColumnMapping {
  fieldMappings: FieldMappings;
  noteColumns: string[];
  multiValueColumns: string[];
}

export const MAPPING_PROMPT = `Map CSV columns to CRM fields. Return JSON only:
{"fieldMappings":{"created_at":null,"name":null,"email":null,"mobile_without_country_code":null,"company":null,"city":null,"state":null,"country":null,"lead_owner":null,"crm_status":null,"data_source":null,"possession_time":null,"description":null},"noteColumns":[],"multiValueColumns":[]}
Use exact CSV column names. null if no match. Synonyms: Name/Client Name, Email/E-mail, Phone/Mobile/Cell, Company/Organization, Status/Lead Status, Owner/Assigned To, Remarks/Notes/Comments. Ignore UTM/click IDs/internal IDs.`;

export const SEMANTIC_MAPPING_PROMPT = `You are mapping arbitrary CSV headers into the following CRM schema.

Allowed output fields:
created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description

Return ONLY JSON.
For every input header choose:
1. one CRM field
2. null if no confident mapping exists

Use semantic understanding from both header name and sample values.
Do not rely on exact wording.

Response format:
{
  "header_name": {
    "field": "crm_field_name",
    "confidence": 0.95,
    "reason": "explanation based on header and sample values"
  }
}

Only accept mappings with confidence >= 0.75. Otherwise return null.`;

export const INFERENCE_PROMPT = `Infer only ambiguous CRM fields from pre-extracted data. Return JSON array with objects: {"i":number,"crm_status":"","lead_owner":"","data_source":"","possession_time":"","description":"","crm_note_append":""}
crm_status: GOOD_LEAD_FOLLOW_UP|DID_NOT_CONNECT|BAD_LEAD|SALE_DONE|"". data_source: leads_on_demand|meridian_tower|eden_park|varah_swamy|sarjapur_plots|"". Never invent data. Empty string if unsure. JSON only.`;

export const FALLBACK_BATCH_PROMPT = `Map messy CSV rows to CRM JSON array. Fields: created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description.
Rules: infer column meaning from values; first email/phone only, rest in crm_note; skip if no email AND no phone; normalize dates ISO, phones digits, emails lowercase; empty string not guess; JSON array only no markdown.
crm_status: GOOD_LEAD_FOLLOW_UP|DID_NOT_CONNECT|BAD_LEAD|SALE_DONE|"". data_source: leads_on_demand|meridian_tower|eden_park|varah_swamy|sarjapur_plots|"".`;

/** @deprecated Use FALLBACK_BATCH_PROMPT */
export const SYSTEM_PROMPT = FALLBACK_BATCH_PROMPT;

export interface ImportRequest {
  columns: string[];
  rows: Record<string, string>[];
  batchSize?: number;
}
