# Manual Verification of Expected Output

## Disclaimer
The original `expected_output.csv` was generated based on my understanding of the business rules from reading the code, NOT by executing the actual transformation pipeline. This document traces through the actual code to verify correctness.

## Row 1 Analysis (John Smith)

### Input Row
```
Client Name: "John Smith"
Official Email: "john.smith@example.com"
Reach Me At: "+1-555-0101"
Firm: "Acme Corp"
Organization: "Acme Corporation"
Lead Source: "Facebook Lead Ads"
Decision Maker: "Decision Maker"
Primary Contact: "Yes"
Remarks: "Interested in premium package"
Internal Notes: "Follow up next week"
Status: "Hot Lead"
Assigned To: "John Agent"
Campaign: "Summer Sale 2024"
Lead Date: "2024-01-15"
Location: "New York"
Town: "New York"
Region: "NY"
Nation: "USA"
Follow Up: "Called yesterday"
Feedback: "Very responsive"
About: "Looking for enterprise solution"
```

### Step 1: Column Mapping (inferColumnMappingHeuristic in lib/column-heuristics.ts)

Based on FIELD_PATTERNS:
- **name**: "Client Name" matches /client.?name/i (score: 2)
- **email**: "Official Email" matches /official.?email/i - NOT IN PATTERNS! Would match /e-?mail/i (score: 2)
- **mobile_without_country_code**: "Reach Me At" - NOT IN PATTERNS! Would not match
- **company**: "Firm" matches /firm/i (score: 2), "Organization" matches /organization/i (score: 2) - Firm gets it first
- **city**: "Location" matches /location/i (score: 2)
- **state**: "Town" matches /town/i (score: 2)
- **country**: "Nation" matches /nation/i (score: 2)
- **lead_owner**: "Assigned To" matches /assigned.?to/i (score: 2)
- **crm_status**: "Status" matches /status/i (score: 2)
- **crm_note**: "Remarks" matches /remark/i (score: 2), "Internal Notes" matches /internal.?note/i (score: 2)
- **data_source**: "Lead Source" matches /lead.?source/i (score: 2)
- **created_at**: "Lead Date" matches /lead.?date/i (score: 2)
- **description**: "About" matches /about/i (score: 2)

**ISSUE IDENTIFIED**: "Reach Me At" does NOT match the phone patterns in FIELD_PATTERNS. The patterns are:
- /phone/i, /mobile/i, /cell/i, /whatsapp/i, /contact.?number/i, /tel/i

"Reach Me At" would NOT be mapped to phone/mobile by the heuristic!

### Step 2: Row Transformation (mapRow in lib/record-mapper.ts)

Given the mapping above, let me trace through mapRow:

```typescript
const rec: CRMRecord = { ...EMPTY_RECORD };
const noteParts: string[] = [];
const allEmails: string[] = [];
const allPhones: string[] = [];
```

**created_at**: "Lead Date" → "2024-01-15" → normalizeDate → "2024-01-15"
**name**: "Client Name" → "John Smith" → titleCase → "John Smith"
**email**: "Official Email" → "john.smith@example.com" → extractEmails → ["john.smith@example.com"]
**mobile_without_country_code**: NOT MAPPED (no phone column)
**company**: "Firm" → "Acme Corp" → normalizeText → "Acme Corp"
**city**: "Location" → "New York" → titleCase → "New York"
**state**: "Town" → "New York" → titleCase → "New York"
**country**: "Nation" → "USA" → titleCase → "Usa"
**lead_owner**: "Assigned To" → "John Agent" → normalizeText → "John Agent"
**crm_status**: "Status" → "Hot Lead" → normalizeCrmStatus → "" (not in allowed values)
**data_source**: "Lead Source" → "Facebook Lead Ads" → normalizeDataSource → "" (not in allowed values)
**description**: "About" → "Looking for enterprise solution" → normalizeText → "Looking for enterprise solution"

**Unmapped columns processing**:
- "Reach Me At": "+1-555-0101" → collectContactFromValue → phones: ["+1-555-0101"]
- "Organization": "Acme Corporation" → no email/phone → noteParts.push("Organization: Acme Corporation")
- "Decision Maker": "Decision Maker" → no email/phone → noteParts.push("Decision Maker: Decision Maker")
- "Primary Contact": "Yes" → no email/phone → noteParts.push("Primary Contact: Yes")
- "Follow Up": "Called yesterday" → no email/phone → noteParts.push("Follow Up: Called yesterday")
- "Feedback": "Very responsive" → no email/phone → noteParts.push("Feedback: Very responsive")
- "Campaign": "Summer Sale 2024" → no email/phone → noteParts.push("Campaign: Summer Sale 2024")
- All utm_* columns → skipped by SKIP_PATTERNS

**Email processing**: allEmails = ["john.smith@example.com"]
- rec.email = "john.smith@example.com"

**Phone processing**: allPhones = ["+1-555-0101"] (from unmapped "Reach Me At")
- parsePhone("+1-555-0101") → { country_code: "+1", mobile: "5550101" }
- rec.country_code = "+1"
- rec.mobile_without_country_code = "5550101"

**Note processing**: noteParts joined with " | "
- crm_note = "Remarks: Interested in premium package | Internal Notes: Follow up next week | Organization: Acme Corporation | Decision Maker: Decision Maker | Primary Contact: Yes | Follow Up: Called yesterday | Feedback: Very responsive | Campaign: Summer Sale 2024"

**Skip check**: hasEmail = true, hasMobile = true → NOT skipped

### ACTUAL EXPECTED OUTPUT FOR ROW 1:
```
created_at: "2024-01-15"
name: "John Smith"
email: "john.smith@example.com"
country_code: "+1"
mobile_without_country_code: "5550101"
company: "Acme Corp"
city: "New York"
state: "New York"
country: "Usa"
lead_owner: "John Agent"
crm_status: "" (NOT "GOOD_LEAD_FOLLOW_UP" - "Hot Lead" is not in allowed values)
crm_note: "Remarks: Interested in premium package | Internal Notes: Follow up next week | Organization: Acme Corporation | Decision Maker: Decision Maker | Primary Contact: Yes | Follow Up: Called yesterday | Feedback: Very responsive | Campaign: Summer Sale 2024"
data_source: "" (NOT "facebook" - "Facebook Lead Ads" is not in allowed values)
posession_time: ""
description: "Looking for enterprise solution"
```

## MAJOR DISCREPANCIES IDENTIFIED

### 1. Phone Column Mapping
**My assumption**: "Reach Me At" would be mapped to mobile_without_country_code
**Actual implementation**: "Reach Me At" does NOT match phone patterns, so it's treated as an unmapped column
**Result**: Phone is still extracted (from unmapped column), but this is fragile

### 2. CRM Status Normalization
**My assumption**: "Hot Lead" → "GOOD_LEAD_FOLLOW_UP" via normalizeCrmStatus
**Actual implementation**: normalizeCrmStatus only normalizes exact matches or fuzzy matches:
```typescript
if (upper.includes('GOOD') || upper.includes('FOLLOW')) return 'GOOD_LEAD_FOLLOW_UP';
```
"Hot Lead" does NOT contain "GOOD" or "FOLLOW", so it returns ""
**Result**: crm_status would be empty, not "GOOD_LEAD_FOLLOW_UP"

### 3. Data Source Normalization
**My assumption**: "Facebook Lead Ads" would be normalized to "facebook"
**Actual implementation**: normalizeDataSource only returns values that exactly match DATA_SOURCE_VALUES:
```typescript
const DATA_SOURCE_VALUES = new Set([
  'leads_on_demand',
  'meridian_tower', 
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  '',
]);
```
"Facebook Lead Ads" does NOT match any of these
**Result**: data_source would be empty

### 4. Country Normalization
**My assumption**: "USA" → "USA"
**Actual implementation**: titleCase converts "USA" → "Usa"
**Result**: country would be "Usa", not "USA"

## CONCLUSION

The original `expected_output.csv` was **INCORRECT**. It was based on assumptions about:
1. Column mapping patterns that don't exist
2. CRM status normalization that doesn't work for "Hot Lead"
3. Data source normalization that doesn't work for campaign names
4. Country case preservation that doesn't exist (titleCase is applied)

The actual implementation would produce significantly different output, particularly:
- Many crm_status fields would be empty (non-standard values)
- Many data_source fields would be empty (non-standard values)
- Country names would be title-cased ("Usa" instead of "USA")
- Phone extraction would be fragile (depends on unmapped column processing)
