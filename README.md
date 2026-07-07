# AI-Powered Universal CSV CRM Importer

A modern full-stack web application that allows users to upload CSV files from any CRM, marketing platform, spreadsheet, or lead source and intelligently convert them into a standardized CRM format using AI (Google Gemini).

## Features

- **Universal CSV Import**: Works with any CSV format — no fixed column names required
- **AI-Powered Mapping**: Uses Google Gemini to intelligently map arbitrary CSV structures to a standardized CRM schema
- **Drag & Drop Upload**: Modern file upload with validation (CSV only, 10 MB max)
- **Data Preview**: Review parsed CSV data before processing with search, sort, and pagination
- **Batch Processing**: Configurable batch sizes (20-100 records, default 50) for handling 5000+ rows
- **Data Validation**: Automatically skips records without email or phone, normalizes dates/phones/emails
- **Results Export**: Download processed data as CSV or JSON, or copy JSON to clipboard
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile

## Supported CSV Sources

The importer works with CSV files exported from:
- Facebook Leads
- Google Ads
- Excel / Google Sheets
- HubSpot
- Zoho CRM
- Salesforce
- Real Estate CRMs
- Marketing Reports
- Custom spreadsheets
- Unknown CRM exports

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** with shadcn/ui
- **TanStack Table** for data tables
- **PapaParse** for CSV parsing
- **React Dropzone** for file upload
- **next-themes** for dark mode

### Backend
- **Next.js API Routes** (Node.js runtime)
- **Google Generative AI SDK** (Gemini)
- **PapaParse** for server-side CSV parsing
- **Zod** for validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Google Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crm-importer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI processing | Required |
| `OPENAI_API_KEY` | Alternative: OpenAI API key (fallback) | Optional |

## API Endpoints

### POST /api/upload

Uploads a CSV file and processes it through the AI engine.

**Request**: Multipart form data
- `file`: CSV file (max 10 MB)
- `batchSize`: Optional batch size (20-100, default 50)

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalRows": 500,
    "imported": 480,
    "skipped": 20,
    "processingTimeMs": 15420
  },
  "records": [...]
}
```

### GET /api/health

Health check endpoint.

**Response**: `{ "status": "OK", "timestamp": "..." }`

## CRM Schema

Each processed record contains:

| Field | Type | Description |
|-------|------|-------------|
| `created_at` | string | ISO date |
| `name` | string | Contact name |
| `email` | string | First email (normalized) |
| `country_code` | string | Phone country code (e.g. +91) |
| `mobile_without_country_code` | string | Phone number digits only |
| `company` | string | Company name |
| `city` | string | City |
| `state` | string | State |
| `country` | string | Country |
| `lead_owner` | string | Lead owner |
| `crm_status` | string | GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE, or empty |
| `crm_note` | string | Additional notes (extra emails, phones, etc.) |
| `data_source` | string | leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty |
| `possession_time` | string | Possession time |
| `description` | string | Description |

## AI Processing Rules

1. **Multiple emails**: First email used as `email`, rest appended to `crm_note`
2. **Multiple phones**: First phone used as `mobile_without_country_code`, rest appended to `crm_note`
3. **Skip records**: Records with no email AND no phone are skipped
4. **Normalization**: Dates to ISO format, phones to digits, emails to lowercase, whitespace trimmed
5. **No hallucination**: If a field cannot be inferred, returns empty string

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Add `GEMINI_API_KEY` environment variable
4. Deploy

### Alternative (Netlify)
The project includes `netlify.toml` configuration for Netlify deployment.

## License

MIT
