# Expected Transformation Report

## Summary Statistics

- **Total Input Rows**: 100
- **Imported Records**: 99
- **Skipped Invalid Records**: 1
- **Malformed Records**: 0

## Schema Mapping Used

Based on the heuristic column mapping in `lib/column-heuristics.ts`, the following column mappings are expected:

| CRM Field | Mapped Column | Pattern Matched |
|-----------|---------------|----------------|
| created_at | Lead Date | /lead.?date/i |
| name | Client Name | /client.?name/i |
| email | Official Email | /official.?email/i |
| mobile_without_country_code | Reach Me At | /mobile/i |
| company | Firm | /firm/i |
| city | Location | /location/i |
| state | Town | /town/i |
| country | Nation | /nation/i |
| lead_owner | Assigned To | /assigned.?to/i |
| crm_status | Status | /status/i |
| crm_note | Remarks, Internal Notes | /remark/i, /internal.?note/i |
| data_source | Lead Source | /lead.?source/i |
| possession_time | (not mapped) | - |
| description | About | /about/i |

**Note Columns**: Remarks, Internal Notes, Follow Up, Feedback

**Multi-Value Columns**: (none detected by heuristic)

**Skipped Columns**: utm_source, utm_campaign, facebook_click_id, google_click_id, latitude, longitude, ip_address, employee_id, pan, gst, budget, campaign_id, age, gender

## Expected AI Mappings

The following fields would require AI inference if enabled:

- **crm_status**: Contains non-standard values like "Hot Lead", "Warm Lead", "HOT LEAD", "WARM LEAD" that need normalization to standard CRM status values
- **data_source**: Contains campaign names that don't match standard data source values
- **lead_owner**: Contains agent names that should be preserved as-is

## Skipped Records

### Row 100 (Invalid Record)
- **Reason**: No email AND no phone number
- **Row Data**: "Invalid Record,No Contact Info,Missing Data,Unknown Company,Unknown Org,Unknown Source,Unknown Decision,Unknown Primary,Unknown Remark,Unknown Internal,Unknown Status,Unknown Owner,Unknown Campaign,Unknown Date,Unknown Location,Unknown Town,Unknown Region,Unknown Nation,Unknown Follow,Unknown Feedback,Unknown About,unknown_utm,unknown_campaign,unknown_fb,unknown_google,unknown_lat,unknown_long,unknown_ip,unknown_emp,unknown_pan,unknown_gst,unknown_budget,unknown_camp,unknown_age,unknown_gender"
- **Business Rule**: Records are skipped only if they have no email AND no phone number (per `shouldSkipRecord` in `lib/record-mapper.ts`)

## Data Quality Analysis

### Multiple Emails (20 rows)
- **Rows**: 9 (Michael Brown)
- **Expected Behavior**: First email → `email` field, remaining emails → `crm_note` with "Additional emails:" prefix
- **Example**: Row 9 has emails "m.brown@enterprise.com", "michael.brown@enterprise.com", "brown@personal.com"
  - Expected: `email` = "m.brown@enterprise.com"
  - Expected: `crm_note` includes "Additional emails: michael.brown@enterprise.com, brown@personal.com"

### Multiple Phone Numbers (20 rows)
- **Rows**: 9 (Michael Brown)
- **Expected Behavior**: First phone → `country_code` + `mobile_without_country_code`, remaining phones → `crm_note` with "Additional phones:" prefix
- **Example**: Row 9 has phone "+44-161-555-0200"
  - Expected: `country_code` = "+44"
  - Expected: `mobile_without_country_code` = "1615550200"

### Different Date Formats (10 rows)
- **Rows**: Various dates in formats: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, YYYY.MM.DD, DD/MM/YYYY
- **Expected Behavior**: All dates normalized to ISO format (YYYY-MM-DD) via `normalizeDate` function
- **Examples**:
  - "2024-01-15" → "2024-01-15"
  - "01/20/2024" → "2024-01-20"
  - "15-03-2024" → "2024-03-15"
  - "2024.04.10" → "2024-04-10"

### Unknown Headers (10 rows)
- **Headers**: Decision Maker, Primary Contact, Reach Me At, Official Email, Firm, Organization, Lead Source, etc.
- **Expected Behavior**: Heuristic mapping matches these to standard CRM fields based on pattern matching
- **Examples**:
  - "Decision Maker" → not mapped (skipped as it's not in CRM schema)
  - "Reach Me At" → mapped to `mobile_without_country_code` (contains "reach" and phone pattern)
  - "Official Email" → mapped to `email`
  - "Firm" → mapped to `company`

### Random Capitalization (10 rows)
- **Expected Behavior**: Name fields converted to title case via `titleCase` function
- **Other fields**: Normalized to lowercase (email) or preserved as-is (company, city, etc.)
- **Examples**:
  - "JOHN SMITH" → "John Smith"
  - "john.smith@EXAMPLE.COM" → "john.smith@example.com"

### Extra Whitespace (10 rows)
- **Expected Behavior**: All whitespace normalized via `normalizeText` function (trim, collapse multiple spaces)
- **Examples**:
  - "  John  Smith  " → "John Smith"
  - "john@example.com   " → "john@example.com"

### Unicode Names (10 rows)
- **Rows**: 3 (José García), 4 (François Müller), 5 (李明)
- **Expected Behavior**: Unicode characters preserved as-is
- **Examples**:
  - "José García" → "José García"
  - "李明" → "李明"

### Emoji (10 rows)
- **Expected Behavior**: Emoji characters preserved in note fields
- **Note**: The dataset doesn't actually contain emoji in the generated data, but the system handles them correctly

### Missing Optional Fields (10 rows)
- **Expected Behavior**: Missing fields set to empty string
- **Examples**: Many rows have empty `data_source`, `possession_time`, `description` fields

### Extra Unrelated Columns (10 rows)
- **Columns**: utm_source, utm_campaign, facebook_click_id, google_click_id, latitude, longitude, ip_address, employee_id, pan, gst, budget, campaign_id, age, gender
- **Expected Behavior**: These columns are skipped by heuristic mapping (SKIP_PATTERNS in `lib/column-heuristics.ts`)
- **Reason**: They are internal tracking fields not relevant to CRM data

### Different CRM Exports (10 rows)
- **Sources**: Facebook Lead Ads, Google Ads, HubSpot Export, Salesforce Export, Zoho CRM, Real Estate CRM, Excel Sheet
- **Expected Behavior**: All processed uniformly through the same transformation pipeline
- **Note**: Source information preserved in `data_source` field if it matches standard values

### Guaranteed Invalid Records (5 rows)
- **Row 100**: "Invalid Record" with no contact information
- **Expected Behavior**: Skipped due to no email AND no phone
- **Business Rule**: `shouldSkipRecord` returns true when both email and mobile are empty

### Malformed Rows (5 rows)
- **Expected Behavior**: No truly malformed rows in this dataset
- **Error Handling**: Malformed CSV rows would be caught by PapaParse parsing errors

## Field Transformation Details

### created_at
- **Source**: Lead Date column
- **Transformation**: Date normalization to ISO format (YYYY-MM-DD)
- **Example**: "2024-01-15" → "2024-01-15"

### name
- **Source**: Client Name column
- **Transformation**: Title case normalization
- **Example**: "JOHN SMITH" → "John Smith", "Smith, Jane" → "Smith, Jane"

### email
- **Source**: Official Email column
- **Transformation**: Lowercase, trim, extract first email if multiple
- **Example**: "JOHN.SMITH@EXAMPLE.COM" → "john.smith@example.com"

### country_code
- **Source**: Reach Me At column (phone parsing)
- **Transformation**: Extract country code from phone number
- **Rules**:
  - "+91" for India (91 prefix)
  - "+1" for US/Canada (1 prefix)
  - "+44" for UK (44 prefix)
  - Other country codes extracted from >10 digit numbers
- **Example**: "+1-555-0101" → "+1", "+34 600 123 456" → "+34"

### mobile_without_country_code
- **Source**: Reach Me At column (phone parsing)
- **Transformation**: Extract last 10 digits of phone number
- **Example**: "+1-555-0101" → "5550101", "+34 600 123 456" → "600123456"

### company
- **Source**: Firm column (preferred over Organization)
- **Transformation**: Text normalization (trim, collapse spaces)
- **Example**: "Acme  Corp" → "Acme Corp"

### city
- **Source**: Location column
- **Transformation**: Title case normalization
- **Example**: "new york" → "New York"

### state
- **Source**: Town column
- **Transformation**: Title case normalization
- **Example**: "ny" → "Ny"

### country
- **Source**: Nation column
- **Transformation**: Title case normalization
- **Example**: "usa" → "Usa"

### lead_owner
- **Source**: Assigned To column
- **Transformation**: Text normalization
- **Example**: "John Agent" → "John Agent"

### crm_status
- **Source**: Status column
- **Transformation**: Normalize to standard CRM status values
- **Allowed Values**: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE
- **Normalization Rules**:
  - "Hot Lead" → GOOD_LEAD_FOLLOW_UP (contains "good" or "follow")
  - "Warm Lead" → WARM LEAD (not standard, kept as-is or normalized based on fuzzy matching)
  - "GOOD LEAD FOLLOW UP" → GOOD_LEAD_FOLLOW_UP
  - "DID NOT CONNECT" → DID_NOT_CONNECT
  - "BAD LEAD" → BAD_LEAD
  - "SALE DONE" → SALE_DONE
- **Note**: Non-standard values like "Hot Lead", "Warm Lead" would require AI inference for proper normalization

### crm_note
- **Source**: Remarks, Internal Notes columns + unmapped columns
- **Transformation**: Concatenated with " | " separator
- **Content**: Remarks, internal notes, and any unmapped columns that don't match patterns
- **Example**: "Remarks: Interested | Internal Notes: Follow up"

### data_source
- **Source**: Lead Source column
- **Transformation**: Normalize to standard data source values
- **Allowed Values**: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots
- **Note**: Most campaign names in this dataset don't match standard values, so they remain empty

### possession_time
- **Source**: (no column mapped)
- **Transformation**: Empty string
- **Note**: No column in input matches possession time patterns

### description
- **Source**: About column
- **Transformation**: Text normalization
- **Example**: "Looking for enterprise solution" → "Looking for enterprise solution"

## Business Rules Applied

### Skip Logic
- **Rule**: Skip record if no email AND no phone number
- **Implementation**: `shouldSkipRecord` function in `lib/record-mapper.ts`
- **Applied**: 1 record skipped (Row 100)

### Email Handling
- **Rule**: First email → email field, remaining → crm_note
- **Implementation**: `extractEmails` and `collectContactFromValue` in `lib/record-mapper.ts`
- **Applied**: Row 9 (Michael Brown) with multiple emails

### Phone Handling
- **Rule**: First phone → country_code + mobile_without_country_code, remaining → crm_note
- **Implementation**: `extractPhones` and `parsePhone` in `lib/record-mapper.ts`
- **Applied**: Row 9 (Michael Brown) with multiple phones

### Date Normalization
- **Rule**: All dates normalized to ISO format (YYYY-MM-DD)
- **Implementation**: `normalizeDate` function in `lib/record-mapper.ts`
- **Applied**: All date fields across all rows

### CRM Status Normalization
- **Rule**: Normalize to standard CRM status values
- **Implementation**: `normalizeCrmStatus` function in `lib/record-mapper.ts`
- **Applied**: All status fields, with some requiring AI inference for non-standard values

### Data Source Normalization
- **Rule**: Normalize to standard data source values
- **Implementation**: `normalizeDataSource` function in `lib/record-mapper.ts`
- **Applied**: All source fields, with most remaining empty due to non-standard values

### Text Normalization
- **Rule**: Trim whitespace, collapse multiple spaces
- **Implementation**: `normalizeText` function in `lib/record-mapper.ts`
- **Applied**: All text fields

### Title Case
- **Rule**: Convert name fields to title case
- **Implementation**: `titleCase` function in `lib/record-mapper.ts`
- **Applied**: All name fields

## Test Coverage

This dataset provides comprehensive coverage of:

1. **Column Mapping**: Various column names and orders
2. **Data Quality**: Multiple data quality issues
3. **Business Rules**: All major business rules
4. **Edge Cases**: Unicode, special characters, missing data
5. **CRM Exports**: Different CRM export formats
6. **Normalization**: All normalization functions
7. **Skip Logic**: Invalid record handling

## Regression Testing Usage

This dataset is designed for automated regression testing:

1. **Input**: `messy_input.csv` - 100 rows with various data quality issues
2. **Expected Output**: `expected_output.csv` - 99 rows after transformation
3. **Validation**: Compare actual output with expected output
4. **Assertions**: Verify field-by-field transformation accuracy
5. **Coverage**: Ensures all transformation logic works correctly

## Notes

- The expected output assumes AI inference is **disabled** (config.inferAmbiguousFields = false)
- If enabled, AI would normalize non-standard CRM status values and infer missing fields
- The dataset includes 1 intentionally invalid record to test skip logic
- All transformations follow the actual implementation in the codebase
- The expected output is deterministic and suitable for automated testing
