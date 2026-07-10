import { NextRequest, NextResponse } from 'next/server';
import { processCSVRows } from '@/lib/ai-service';
import { logger } from '@/lib/logger';
import {
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  type ImportRequest,
  type ImportResponse,
} from '@/types/crm';

export const runtime = 'nodejs';
export const maxDuration = 300;

function errorResponse(message: string, status: number): NextResponse<ImportResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      summary: {
        totalRows: 0,
        imported: 0,
        skipped: 0,
        processingTimeMs: 0,
      },
      records: [],
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await req.json()) as ImportRequest;
    const { columns, rows, batchSize: batchSizeRaw } = body;

    if (!Array.isArray(columns) || columns.length === 0) {
      return errorResponse('No columns provided. Please upload a valid CSV file.', 400);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return errorResponse('CSV file is empty or contains no valid data rows.', 422);
    }

    let batchSize = DEFAULT_BATCH_SIZE;
    if (typeof batchSizeRaw === 'number' && !isNaN(batchSizeRaw)) {
      if (batchSizeRaw >= MIN_BATCH_SIZE && batchSizeRaw <= MAX_BATCH_SIZE) {
        batchSize = batchSizeRaw;
      }
    }

    logger.info('Import started', {
      totalRows: rows.length,
      totalColumns: columns.length,
      batchSize,
    });

    const records = await processCSVRows(columns, rows, batchSize);
    const skipped = rows.length - records.length;
    const processingTimeMs = Date.now() - startTime;

    logger.info('Import completed', {
      totalRows: rows.length,
      imported: records.length,
      skipped,
      processingTimeMs,
    });

    return NextResponse.json<ImportResponse>({
      success: true,
      summary: {
        totalRows: rows.length,
        imported: records.length,
        skipped,
        processingTimeMs,
      },
      records,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during processing.';

    logger.error('Import failed', { error: message });

    return errorResponse(message, 500);
  }
}
