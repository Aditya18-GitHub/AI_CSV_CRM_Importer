import type { CRMRecord, ImportResponse } from '@/types/crm';

export type JobStage =
  | 'queued'
  | 'parsing'
  | 'mapping'
  | 'transforming'
  | 'ai_inference'
  | 'completed'
  | 'failed';

export interface JobProgress {
  stage: JobStage;
  message: string;
  currentBatch: number;
  totalBatches: number;
  processedRows: number;
  totalRows: number;
  percent: number;
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: JobProgress;
  result?: ImportResponse;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __importJobs: Map<string, ImportJob> | undefined;
}

const jobs: Map<string, ImportJob> = global.__importJobs ?? new Map();
if (process.env.NODE_ENV !== 'production') {
  global.__importJobs = jobs;
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createJob(totalRows: number): ImportJob {
  const job: ImportJob = {
    id: generateJobId(),
    status: 'pending',
    progress: {
      stage: 'queued',
      message: 'Import queued',
      currentBatch: 0,
      totalBatches: 0,
      processedRows: 0,
      totalRows,
      percent: 0,
      elapsedMs: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): ImportJob | undefined {
  return jobs.get(jobId);
}

export function updateJobProgress(jobId: string, progress: Partial<JobProgress>): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = { ...job.progress, ...progress, elapsedMs: Date.now() - job.createdAt };
  job.updatedAt = Date.now();
  if (job.status === 'pending') job.status = 'processing';
}

export function completeJob(jobId: string, result: ImportResponse): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'completed';
  job.result = result;
  job.progress = {
    ...job.progress,
    stage: 'completed',
    message: 'Import completed',
    percent: 100,
    elapsedMs: Date.now() - job.createdAt,
    estimatedRemainingMs: 0,
  };
  job.updatedAt = Date.now();
}

export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'failed';
  job.error = error;
  job.progress = {
    ...job.progress,
    stage: 'failed',
    message: error,
    elapsedMs: Date.now() - job.createdAt,
  };
  job.updatedAt = Date.now();
}

export function cleanupOldJobs(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [id, job] of Array.from(jobs.entries())) {
    if (now - job.updatedAt > maxAgeMs) {
      jobs.delete(id);
    }
  }
}

export type { CRMRecord };
