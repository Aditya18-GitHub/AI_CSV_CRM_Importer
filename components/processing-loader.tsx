'use client';

import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ProcessingStage =
  | 'uploading'
  | 'parsing'
  | 'processing'
  | 'finalizing'
  | 'done';

interface ProcessingLoaderProps {
  stage: ProcessingStage;
  progress: number;
  batchInfo?: { current: number; total: number };
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: 'Uploading file...',
  parsing: 'Parsing CSV...',
  processing: 'Processing with AI...',
  finalizing: 'Finalizing results...',
  done: 'Complete!',
};

export function ProcessingLoader({
  stage,
  progress,
  batchInfo,
}: ProcessingLoaderProps) {
  const stages: ProcessingStage[] = [
    'uploading',
    'parsing',
    'processing',
    'finalizing',
  ];
  const currentStageIndex = stages.indexOf(stage);

  return (
    <div className="animate-scale-in flex flex-col items-center gap-8 py-12">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-xl shadow-primary/30">
          {stage === 'done' ? (
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{STAGE_LABELS[stage]}</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        {batchInfo && stage === 'processing' && (
          <p className="text-center text-sm text-muted-foreground">
            Processing AI Batch {batchInfo.current} of {batchInfo.total}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {stages.map((s, i) => {
          const isComplete = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          return (
            <div
              key={s}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                isComplete && 'bg-success/10 text-success',
                isCurrent && 'bg-primary/10 text-primary',
                !isComplete && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />
              )}
              <span className="capitalize">{s}</span>
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    'ml-1 h-px w-6',
                    isComplete ? 'bg-success/30' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>AI is intelligently mapping your data to CRM schema...</span>
      </div>
    </div>
  );
}
