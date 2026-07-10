export const VALID_CSV = `name,email,phone,company,city,state,country
John Doe,john@example.com,+91 9876543210,Acme Corp,Bangalore,Karnataka,India
Jane Smith,jane@example.com,+1 2345678901,Global Inc,New York,NY,USA
Bob Johnson,bob@example.com,+44 7890123456,StartUp Ltd,London,England,UK`;

export const CSV_WITH_QUOTED_COMMAS = `name,email,company
"Smith, John",john@example.com,Acme Corp
"Doe, Jane",jane@example.com,Global Inc`;

export const CSV_WITH_MULTILINE = `name,email,notes
John Doe,john@example.com,"This is a note
with multiple lines"
Jane Smith,jane@example.com,Single line note`;

export const CSV_WITH_DIFFERENT_DELIMITER = `name;email;phone
John Doe;john@example.com;+91 9876543210
Jane Smith;jane@example.com;+1 2345678901`;

export const CSV_WITH_EMPTY_ROWS = `name,email,phone
John Doe,john@example.com,+91 9876543210

Jane Smith,jane@example.com,+1 2345678901

`;

export const CSV_WITH_DUPLICATE_HEADERS = `name,email,name,phone
John Doe,john@example.com,John,+91 9876543210
Jane Smith,jane@example.com,Jane,+1 2345678901`;

export const CSV_WITH_UNKNOWN_HEADERS = `Decision Maker,Reach Me At,Cellular,Current Stage
John Doe,john@example.com,+91 9876543210,Hot Lead
Jane Smith,jane@example.com,+1 2345678901,Warm Lead`;

export const CSV_WITH_MULTIPLE_EMAILS = `name,email,phone
John Doe,john@example.com,john2@example.com,+91 9876543210
Jane Smith,jane@example.com,+1 2345678901`;

export const CSV_WITH_MULTIPLE_PHONES = `name,email,phone
John Doe,john@example.com,+91 9876543210,+91 9876543211
Jane Smith,jane@example.com,+1 2345678901`;

export const CSV_WITH_UNICODE = `name,email,city
José García,josé@example.com,São Paulo
François Müller,francois@example.com,Zürich
李明,ming@example.com,北京`;

export const CSV_WITH_EMOJI = `name,email,notes
John Doe,john@example.com,Great lead! 🎉
Jane Smith,jane@example.com,Follow up 😊`;

export const CSV_WITH_WHITESPACE = `name,  email  ,  phone  
  John Doe  ,  john@example.com  ,  +91 9876543210  
  Jane Smith  ,  jane@example.com  ,  +1 2345678901  `;

export const CSV_WITH_FORMULAS = `name,email,value
John Doe,john@example.com,=SUM(A1:A10)
Jane Smith,jane@example.com,=HYPERLINK("http://example.com")`;

export const CSV_WITH_SQL_INJECTION = `name,email,notes
John Doe,john@example.com,"'; DROP TABLE users; --"
Jane Smith,jane@example.com,<script>alert('xss')</script>`;

export const CSV_WITH_XSS = `name,email,notes
John Doe,john@example.com,<script>alert('xss')</script>
Jane Smith,jane@example.com,<img src=x onerror=alert('xss')>`;

export const CSV_WITH_LARGE_TEXT = `name,description
John Doe,${'A'.repeat(10000)}
Jane Smith,${'B'.repeat(10000)}`;

export const FACEBOOK_LEAD_ADS_CSV = `full_name,email,phone_number,created_time
John Doe,john@example.com,+91 9876543210,2024-01-15T10:30:00
Jane Smith,jane@example.com,+1 2345678901,2024-01-16T11:45:00`;

export const HUBSPOT_CSV = `firstname,lastname,email,phone,company,lead_status
John,Doe,john@example.com,+91 9876543210,Acme Corp,customer
Jane,Smith,jane@example.com,+1 2345678901,Global Inc,prospect`;

export const SALESFORCE_CSV = `FirstName,LastName,Email,Phone,Company,LeadSource
John,Doe,john@example.com,+91 9876543210,Acme Corp,Web
Jane,Smith,jane@example.com,+1 2345678901,Global Inc,Referral`;

export const EMPTY_CSV = ``;

export const HEADER_ONLY_CSV = `name,email,phone`;

export const SINGLE_COLUMN_CSV = `name
John Doe
Jane Smith`;

export const INVALID_RECORDS_CSV = `name,email,phone
John Doe,,
Jane Smith,jane@example.com,
,,+91 9876543210`;

export const LARGE_CSV = (() => {
  let csv = 'name,email,phone,company\n';
  for (let i = 1; i <= 100; i++) {
    csv += `User ${i},user${i}@example.com,+91 9876543${i.toString().padStart(4, '0')},Company ${i}\n`;
  }
  return csv;
})();
