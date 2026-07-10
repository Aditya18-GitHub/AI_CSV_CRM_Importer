import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/job-store';
import type { ImportJobStatusResponse } from '@/types/crm';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);

  if (!job) {
    return NextResponse.json<ImportJobStatusResponse>(
      {
        success: false,
        jobId: params.jobId,
        status: 'failed',
        progress: {
          stage: 'failed',
          message: 'Job not found',
          currentBatch: 0,
          totalBatches: 0,
          processedRows: 0,
          totalRows: 0,
          percent: 0,
          elapsedMs: 0,
        },
        error: 'Import job not found. It may have expired.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json<ImportJobStatusResponse>({
    success: job.status !== 'failed',
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
  });
}
