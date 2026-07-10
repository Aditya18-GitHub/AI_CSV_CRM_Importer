import { NextRequest, NextResponse } from 'next/server';
import { parseCSVText } from '@/lib/csv-utils';
import { runImportJob } from '@/lib/ai-service';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import {
  createJob,
  completeJob,
  failJob,
  updateJobProgress,
  cleanupOldJobs,
} from '@/lib/job-store';
import {
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  type ImportJobResponse,
  type ParsedCSV,
} from '@/types/crm';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    cleanupOldJobs();
    const formData = await req.formData();
    const file = formData.get('file');
    const batchSizeRaw = formData.get('batchSize');

    if (!file || !(file instanceof File)) {
      return NextResponse.json<ImportJobResponse>(
        { success: false, jobId: '', error: 'No file provided. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    if (file.size > config.maxFileSizeBytes) {
      return NextResponse.json<ImportJobResponse>(
        { success: false, jobId: '', error: 'File size exceeds limit.' },
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
      return NextResponse.json<ImportJobResponse>(
        { success: false, jobId: '', error: 'Only CSV files are supported.' },
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

    const parseStart = Date.now();
    const text = await file.text();
    let parsed: ParsedCSV;
    try {
      parsed = await parseCSVText(text);
    } catch (err) {
      return NextResponse.json<ImportJobResponse>(
        {
          success: false,
          jobId: '',
          error: err instanceof Error ? err.message : 'Failed to parse CSV file.',
        },
        { status: 422 }
      );
    }

    logger.info('CSV parsed', {
      durationMs: Date.now() - parseStart,
      totalRows: parsed.totalRows,
      totalColumns: parsed.totalColumns,
      batchSize,
    });

    if (parsed.totalRows === 0) {
      return NextResponse.json<ImportJobResponse>(
        { success: false, jobId: '', error: 'CSV file is empty or contains no valid data rows.' },
        { status: 422 }
      );
    }

    const job = createJob(parsed.totalRows);
    updateJobProgress(job.id, {
      stage: 'parsing',
      message: `${parsed.totalRows} rows detected`,
      totalRows: parsed.totalRows,
      percent: 5,
    });

    setImmediate(async () => {
      try {
        const records = await runImportJob(job.id, parsed.columns, parsed.rows, batchSize);
        const skipped = parsed.totalRows - records.length;
        const processingTimeMs = Date.now() - startTime;

        completeJob(job.id, {
          success: true,
          summary: {
            totalRows: parsed.totalRows,
            imported: records.length,
            skipped,
            processingTimeMs,
          },
          records,
        });

        logger.info('Import job completed', {
          jobId: job.id,
          totalRows: parsed.totalRows,
          imported: records.length,
          skipped,
          processingTimeMs,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred during processing.';
        failJob(job.id, message);
        logger.error('Import job failed', { jobId: job.id, error: message });
      }
    });

    return NextResponse.json<ImportJobResponse>({
      success: true,
      jobId: job.id,
      message: `${parsed.totalRows} rows detected. Processing started.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';

    return NextResponse.json<ImportJobResponse>(
      { success: false, jobId: '', error: message },
      { status: 500 }
    );
  }
}
