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
  'posession_time',
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
  posession_time: 'Possession Time',
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
  posession_time: string;
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
export const DEFAULT_BATCH_SIZE = 50;
export const MIN_BATCH_SIZE = 20;
export const MAX_BATCH_SIZE = 100;

export const SYSTEM_PROMPT = `You are an expert CRM Data Extraction Engine.

Your task is to intelligently map arbitrary CSV records into the GrowEasy CRM schema.

Never assume column names.
Infer values whenever possible.
Return only valid JSON.
Skip invalid records.
Never hallucinate missing values.
If confidence is low, return empty string.
Normalize dates.
Normalize phone numbers.
Extract first email.
Extract first phone.
Append remaining values into crm_note.
Never return markdown.
Never return explanations.

CRM Schema — each record must contain exactly these fields:
{
  "created_at": "string (ISO date or empty)",
  "name": "string",
  "email": "string (first email found, normalized lowercase)",
  "country_code": "string (e.g. +91, +1)",
  "mobile_without_country_code": "string (digits only, no country code)",
  "company": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "lead_owner": "string",
  "crm_status": "GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE | empty string",
  "crm_note": "string (append any extra emails, phones, or notable fields here)",
  "data_source": "leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots | empty string",
  "possession_time": "string",
  "description": "string"
}

Rules:
1. If multiple emails exist, use the first as "email" and append the rest into "crm_note".
2. If multiple phone numbers exist, use the first as "mobile_without_country_code" (strip country code into "country_code") and append the rest into "crm_note".
3. Skip a record entirely if it has NO email AND NO mobile number.
4. Normalize: dates to ISO format, phone numbers to digits, emails to lowercase, trim whitespace, title-case names/cities.
5. If a field cannot be inferred, return an empty string — never guess.
6. Return a JSON array of objects. No markdown, no code fences, no explanations.`;
