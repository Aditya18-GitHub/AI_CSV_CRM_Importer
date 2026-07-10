'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone, type FileRejection } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MAX_FILE_SIZE } from '@/types/crm';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  selectedFile: File | null;
  isParsing: boolean;
  parseError: string | null;
}

export function UploadZone({
  onFileSelected,
  onFileRemoved,
  selectedFile,
  isParsing,
  parseError,
}: UploadZoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      setDragError(null);
      if (rejections.length > 0) {
        const rejection = rejections[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setDragError('File exceeds 10 MB limit.');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setDragError('Only CSV files are supported.');
        } else {
          setDragError(rejection.errors[0]?.message || 'Invalid file.');
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: isParsing || !!selectedFile,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={cn(
            'relative flex items-center gap-4 rounded-2xl border-2 border-solid p-6 transition-all duration-300',
            parseError
              ? 'border-destructive/50 bg-destructive/5 shadow-lg shadow-destructive/10'
              : 'border-primary/30 bg-primary/5 shadow-lg shadow-primary/10'
          )}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
              parseError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg'
            )}
          >
            {isParsing ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : parseError ? (
              <AlertCircle className="h-7 w-7" />
            ) : (
              <CheckCircle2 className="h-7 w-7" />
            )}
          </motion.div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold">{selectedFile.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
              {isParsing && ' — Parsing...'}
              {parseError && ` — ${parseError}`}
            </span>
          </div>

          {!isParsing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={onFileRemoved}
                className="shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        {...getRootProps()}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300',
          isDragActive && !isDragReject
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/20'
            : 'border-border/60 hover:border-primary/40 hover:bg-accent/30',
          isDragReject && 'border-destructive bg-destructive/5 shadow-lg shadow-destructive/10',
          dragError && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={{
            scale: isDragActive ? 1.1 : 1,
            rotate: isDragActive ? 5 : 0,
          }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300',
            isDragActive
              ? 'bg-gradient-to-br from-primary to-primary/70 text-white shadow-2xl shadow-primary/40'
              : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          )}
        >
          <UploadCloud
            className={cn(
              'h-10 w-10 transition-transform',
              isDragActive && 'scale-110'
            )}
          />
        </motion.div>

        <div className="space-y-2">
          <motion.p
            animate={{ scale: isDragActive ? 1.05 : 1 }}
            className="text-lg font-semibold"
          >
            {isDragActive
              ? 'Drop your CSV file here'
              : 'Drag & drop your CSV file here'}
          </motion.p>
          <p className="text-sm text-muted-foreground">
            or{' '}
            <span className="font-medium text-primary underline-offset-4 group-hover:underline transition-all">
              browse files
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted/80 px-3 py-1.5 font-medium border border-border/50">CSV only</span>
          <span className="rounded-full bg-muted/80 px-3 py-1.5 font-medium border border-border/50">Max 10 MB</span>
        </div>

        {(dragError || parseError) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dragError || parseError}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
