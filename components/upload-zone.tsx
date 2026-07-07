'use client';

import { useCallback, useState } from 'react';
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
      <div className="animate-scale-in">
        <div
          className={cn(
            'relative flex items-center gap-4 rounded-xl border-2 border-solid p-5 transition-colors',
            parseError
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-primary/30 bg-primary/5'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
              parseError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isParsing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : parseError ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{selectedFile.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
              {isParsing && ' — Parsing...'}
              {parseError && ` — ${parseError}`}
            </span>
          </div>

          {!isParsing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFileRemoved}
              className="shrink-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div
        {...getRootProps()}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300',
          isDragActive && !isDragReject
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50',
          isDragReject && 'border-destructive bg-destructive/5',
          dragError && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragActive
              ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30'
              : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          )}
        >
          <UploadCloud
            className={cn(
              'h-8 w-8 transition-transform',
              isDragActive && 'scale-110'
            )}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-base font-semibold">
            {isDragActive
              ? 'Drop your CSV file here'
              : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or{' '}
            <span className="font-medium text-primary underline-offset-4 group-hover:underline">
              browse files
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1 font-medium">CSV only</span>
          <span className="rounded-md bg-muted px-2 py-1 font-medium">Max 10 MB</span>
        </div>

        {(dragError || parseError) && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dragError || parseError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
