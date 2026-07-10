'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ProcessingStage =
  | 'uploading'
  | 'parsing'
  | 'mapping'
  | 'transforming'
  | 'processing'
  | 'finalizing'
  | 'done';

interface ProcessingLoaderProps {
  stage: ProcessingStage;
  progress: number;
  message?: string;
  batchInfo?: { current: number; total: number };
  elapsedMs?: number;
  estimatedRemainingMs?: number;
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: 'Uploading file...',
  parsing: 'Parsing CSV...',
  mapping: 'Detecting column mapping...',
  transforming: 'Extracting fields locally...',
  processing: 'Processing with AI...',
  finalizing: 'Finalizing results...',
  done: 'Complete!',
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function ProcessingLoader({
  stage,
  progress,
  message,
  batchInfo,
  elapsedMs = 0,
  estimatedRemainingMs,
}: ProcessingLoaderProps) {
  const stages: ProcessingStage[] = [
    'uploading',
    'parsing',
    'mapping',
    'transforming',
    'processing',
    'finalizing',
  ];
  const currentStageIndex = stages.indexOf(stage);
  const displayLabel = message || STAGE_LABELS[stage];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-10 py-16"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative flex h-24 w-24 items-center justify-center"
      >
        <motion.div
          animate={{
            scale: stage === 'done' ? [1, 1.2, 1] : 1,
            rotate: stage === 'processing' ? 360 : 0,
          }}
          transition={{
            duration: stage === 'done' ? 0.6 : 2,
            repeat: stage === 'processing' ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/40">
          {stage === 'done' ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-lg space-y-4"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-lg">{displayLabel}</span>
          <span className="text-muted-foreground font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
        {batchInfo && (stage === 'processing' || stage === 'transforming') && batchInfo.total > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground"
          >
            Processing batch {batchInfo.current} of {batchInfo.total}
          </motion.p>
        )}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Elapsed: {formatDuration(elapsedMs)}
          </span>
          {estimatedRemainingMs !== undefined && estimatedRemainingMs > 0 && stage !== 'done' && (
            <span>Est. remaining: ~{formatDuration(estimatedRemainingMs)}</span>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {stages.map((s, i) => {
          const isComplete = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                isComplete && 'bg-success/10 text-success border border-success/20',
                isCurrent && 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/20',
                !isComplete && !isCurrent && 'bg-muted/50 text-muted-foreground border border-border/50'
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-current" />
              )}
              <span className="capitalize">{s.replace('_', ' ')}</span>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex items-center gap-3 text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 rounded-2xl border border-primary/20"
      >
        <Sparkles className="h-5 w-5 text-primary" />
        <span>AI is intelligently mapping your data to CRM schema...</span>
      </motion.div>
    </motion.div>
  );
}
