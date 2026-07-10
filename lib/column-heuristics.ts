import type { ColumnMapping, FieldMappings } from '@/types/crm';

const FIELD_PATTERNS: Record<keyof FieldMappings, RegExp[]> = {
  created_at: [/created.?at/i, /created.?on/i, /created.?date/i, /lead.?date/i, /^date$/i, /timestamp/i, /signup.?date/i],
  name: [/^name$/i, /full.?name/i, /customer.?name/i, /client.?name/i, /lead.?name/i, /contact.?name/i, /first.?name/i],
  email: [/^email$/i, /e-?mail/i, /mail.?id/i, /contact.?email/i, /primary.?email/i],
  phone: [/phone/i, /mobile/i, /cell/i, /whatsapp/i, /contact.?number/i, /tel/i],
  mobile_without_country_code: [/phone/i, /mobile/i, /cell/i, /whatsapp/i, /contact.?number/i],
  company: [/company/i, /organization/i, /organisation/i, /business/i, /firm/i, /employer/i],
  city: [/^city$/i, /town/i, /location/i],
  state: [/^state$/i, /province/i, /region/i],
  country: [/^country$/i, /nation/i],
  lead_owner: [/owner/i, /assigned.?to/i, /sales.?person/i, /agent/i, /lead.?owner/i, /rep/i],
  crm_status: [/status/i, /lead.?status/i, /crm.?status/i, /current.?status/i, /stage/i],
  crm_note: [/remark/i, /comment/i, /note/i, /feedback/i, /follow.?up/i, /internal.?note/i],
  data_source: [/source/i, /campaign/i, /utm.?source/i, /lead.?source/i, /channel/i],
  possession_time: [/possession/i, /possession.?time/i],
  description: [/description/i, /details/i, /summary/i, /about/i],
};

const NOTE_PATTERNS = [/remark/i, /comment/i, /note/i, /feedback/i, /follow.?up/i, /internal/i];
const SKIP_PATTERNS = [/utm/i, /click.?id/i, /facebook/i, /google.?click/i, /latitude/i, /longitude/i, /ip.?address/i, /employee.?id/i, /pan/i, /gst/i, /budget/i, /campaign.?id/i, /age/i, /gender/i];

function scoreColumn(header: string, patterns: RegExp[]): number {
  let score = 0;
  for (const pattern of patterns) {
    if (pattern.test(header)) {
      score += pattern.source.startsWith('^') ? 3 : 2;
    }
  }
  return score;
}

function bestColumn(columns: string[], patterns: RegExp[]): string | null {
  let best: { col: string; score: number } | null = null;
  for (const col of columns) {
    const score = scoreColumn(col, patterns);
    if (score > 0 && (!best || score > best.score)) {
      best = { col, score };
    }
  }
  return best?.col ?? null;
}

export function inferColumnMappingHeuristic(columns: string[]): ColumnMapping {
  const fieldMappings: FieldMappings = {};
  const used = new Set<string>();

  const assign = (field: keyof FieldMappings, patterns: RegExp[]) => {
    const col = bestColumn(
      columns.filter((c) => !used.has(c)),
      patterns
    );
    if (col) {
      fieldMappings[field] = col;
      used.add(col);
    }
  };

  assign('created_at', FIELD_PATTERNS.created_at);
  assign('name', FIELD_PATTERNS.name);
  assign('email', FIELD_PATTERNS.email);
  assign('mobile_without_country_code', FIELD_PATTERNS.mobile_without_country_code);
  assign('company', FIELD_PATTERNS.company);
  assign('city', FIELD_PATTERNS.city);
  assign('state', FIELD_PATTERNS.state);
  assign('country', FIELD_PATTERNS.country);
  assign('lead_owner', FIELD_PATTERNS.lead_owner);
  assign('crm_status', FIELD_PATTERNS.crm_status);
  assign('data_source', FIELD_PATTERNS.data_source);
  assign('possession_time', FIELD_PATTERNS.possession_time);
  assign('description', FIELD_PATTERNS.description);

  const noteColumns: string[] = [];
  const multiValueColumns: string[] = [];

  for (const col of columns) {
    if (used.has(col)) continue;
    if (SKIP_PATTERNS.some((p) => p.test(col))) continue;

    if (NOTE_PATTERNS.some((p) => p.test(col))) {
      noteColumns.push(col);
      continue;
    }

    if (/email|phone|mobile|contact/i.test(col)) {
      multiValueColumns.push(col);
    }
  }

  return { fieldMappings, noteColumns, multiValueColumns };
}

export function isMappingSufficient(mapping: ColumnMapping): boolean {
  const fm = mapping.fieldMappings;
  const hasContact =
    !!fm.email ||
    !!fm.mobile_without_country_code ||
    !!fm.phone;
  const hasIdentity = !!fm.name || !!fm.company;
  return hasContact && (hasIdentity || !!fm.crm_status || !!fm.lead_owner);
}
