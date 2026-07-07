import { NextRequest, NextResponse } from 'next/server';
import { parseCSVText } from '@/lib/csv-utils';
import { processAllBatches } from '@/lib/ai-service';
import {
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  type ImportResponse,
} from '@/types/crm';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const batchSizeRaw = formData.get('batchSize');

    if (!file || !(file instanceof File)) {
      return NextResponse.json<ImportResponse>(
        {
          success: false,
          summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
          records: [],
          error: 'No file provided. Please upload a CSV file.',
        },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<ImportResponse>(
        {
          success: false,
          summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
          records: [],
          error: 'File size exceeds 10 MB limit.',
        },
        { status: 413 }
      );
    }

    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    if (
      !fileName.endsWith('.csv') &&
      fileType !== 'text/csv' &&
      fileType !== 'application/vnd.ms-excel'
    ) {
      return NextResponse.json<ImportResponse>(
        {
          success: false,
          summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
          records: [],
          error: 'Only CSV files are supported.',
        },
        { status: 415 }
      );
    }

    let batchSize = DEFAULT_BATCH_SIZE;
    if (typeof batchSizeRaw === 'string') {
      const parsed = parseInt(batchSizeRaw, 10);
      if (!isNaN(parsed) && parsed >= MIN_BATCH_SIZE && parsed <= MAX_BATCH_SIZE) {
        batchSize = parsed;
      }
    }

    const text = await file.text();
    let parsed;
    try {
      parsed = await parseCSVText(text);
    } catch (err) {
      return NextResponse.json<ImportResponse>(
        {
          success: false,
          summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
          records: [],
          error: err instanceof Error ? err.message : 'Failed to parse CSV file.',
        },
        { status: 422 }
      );
    }

    if (parsed.totalRows === 0) {
      return NextResponse.json<ImportResponse>(
        {
          success: false,
          summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
          records: [],
          error: 'CSV file is empty or contains no valid data rows.',
        },
        { status: 422 }
      );
    }

    const records = await processAllBatches(parsed.rows, batchSize);
    const skipped = parsed.totalRows - records.length;
    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json<ImportResponse>({
      success: true,
      summary: {
        totalRows: parsed.totalRows,
        imported: records.length,
        skipped,
        processingTimeMs,
      },
      records,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during processing.';

    return NextResponse.json<ImportResponse>(
      {
        success: false,
        summary: { totalRows: 0, imported: 0, skipped: 0, processingTimeMs: 0 },
        records: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
