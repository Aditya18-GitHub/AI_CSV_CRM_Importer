'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FileSpreadsheet,
  Brain,
  CheckCircle2,
  Download,
  AlertCircle,
  ArrowRight,
  Zap,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { Header } from '@/components/header';
import { UploadZone } from '@/components/upload-zone';
import { PreviewTable } from '@/components/preview-table';
import { ProcessingLoader, type ProcessingStage } from '@/components/processing-loader';
import { ParsedTable } from '@/components/parsed-table';
import { ImportSummary } from '@/components/import-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseCSV } from '@/lib/csv-utils';
import type { ParsedCSV, ImportResponse, CRMRecord, ImportJobResponse, ImportJobStatusResponse } from '@/types/crm';

type AppState = 'idle' | 'preview' | 'processing' | 'results' | 'error';

const DEFAULT_BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 1000;

function mapJobStageToUiStage(stage: string): ProcessingStage {
  switch (stage) {
    case 'parsing':
      return 'parsing';
    case 'mapping':
      return 'mapping';
    case 'transforming':
      return 'transforming';
    case 'ai_inference':
      return 'processing';
    case 'completed':
      return 'done';
    default:
      return 'processing';
  }
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('uploading');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState<string>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [estimatedRemainingMs, setEstimatedRemainingMs] = useState<number>();
  const [batchInfo, setBatchInfo] = useState<{ current: number; total: number } | undefined>();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setIsParsing(true);
    setAppState('idle');

    try {
      const parsed = await parseCSV(file);
      setParsedData(parsed);
      setAppState('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileRemoved = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setAppState('idle');
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setAppState('processing');
    setProcessingStage('uploading');
    setProcessingProgress(5);
    setProcessingMessage('Uploading file...');
    setElapsedMs(0);
    setEstimatedRemainingMs(undefined);
    setError(null);

    try {
      const batchSize = DEFAULT_BATCH_SIZE;
      const totalBatches = parsedData
        ? Math.ceil(parsedData.totalRows / batchSize)
        : 1;
      setBatchInfo({ current: 0, total: totalBatches });

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('batchSize', String(batchSize));

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData: ImportJobResponse = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success || !uploadData.jobId) {
        throw new Error(uploadData.error || 'Failed to start import job.');
      }

      setProcessingStage('parsing');
      setProcessingMessage(uploadData.message || 'Parsing CSV...');

      const jobId = uploadData.jobId;
      let completed = false;

      while (!completed) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const statusResponse = await fetch(`/api/import/${jobId}`);
        const statusData: ImportJobStatusResponse = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to fetch import status.');
        }

        const { progress } = statusData;
        setProcessingProgress(progress.percent);
        setProcessingMessage(progress.message);
        setElapsedMs(progress.elapsedMs);
        setEstimatedRemainingMs(progress.estimatedRemainingMs);
        setProcessingStage(mapJobStageToUiStage(progress.stage));

        if (progress.totalBatches > 0) {
          setBatchInfo({
            current: progress.currentBatch,
            total: progress.totalBatches,
          });
        }

        if (statusData.status === 'completed' && statusData.result) {
          setProcessingProgress(100);
          setProcessingStage('done');
          setProcessingMessage('Import completed');
          setImportResult(statusData.result);
          setAppState('results');
          completed = true;
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Import failed.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setAppState('error');
    } finally {
      setIsImporting(false);
      setBatchInfo(undefined);
    }
  }, [selectedFile, parsedData, isImporting]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setImportResult(null);
    setError(null);
    setProcessingProgress(0);
    setProcessingStage('uploading');
    setIsImporting(false);
    setAppState('idle');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {appState === 'idle' && !isParsing && (
          <IdleView
            selectedFile={selectedFile}
            isParsing={isParsing}
            parseError={parseError}
            onFileSelected={handleFileSelected}
            onFileRemoved={handleFileRemoved}
          />
        )}

        {isParsing && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <p className="text-lg font-medium">Parsing CSV file...</p>
          </div>
        )}

        {appState === 'preview' && parsedData && (
          <PreviewView
            parsedData={parsedData}
            fileName={selectedFile?.name || ''}
            onConfirm={handleConfirmImport}
            onReset={handleReset}
            isImporting={isImporting}
          />
        )}

        {appState === 'processing' && (
          <div className="mx-auto max-w-2xl">
            <ProcessingLoader
              stage={processingStage}
              progress={processingProgress}
              message={processingMessage}
              batchInfo={batchInfo}
              elapsedMs={elapsedMs}
              estimatedRemainingMs={estimatedRemainingMs}
            />
          </div>
        )}

        {appState === 'results' && importResult && (
          <ResultsView
            summary={importResult.summary}
            records={importResult.records as CRMRecord[]}
            onReset={handleReset}
          />
        )}

        {appState === 'error' && (
          <ErrorView error={error} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

function IdleView({
  selectedFile,
  isParsing,
  parseError,
  onFileSelected,
  onFileRemoved,
}: {
  selectedFile: File | null;
  isParsing: boolean;
  parseError: string | null;
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
}) {
  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-2 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered CRM Import
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Import any CSV into your{' '}
            <span className="gradient-text">
              CRM format
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Upload CSV files from any CRM, marketing platform, or spreadsheet.
            Our AI engine intelligently maps, cleans, and normalizes your data into
            a standardized CRM schema — no matter the column names or layout.
          </p>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mx-auto max-w-3xl"
      >
        <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 card-hover">
          <CardContent className="p-8 sm:p-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
                <FileSpreadsheet className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Upload your CSV file</h2>
                <p className="text-muted-foreground">
                  Drag and drop or browse to select a CSV file
                </p>
              </div>
            </div>

            <UploadZone
              onFileSelected={onFileSelected}
              onFileRemoved={onFileRemoved}
              selectedFile={selectedFile}
              isParsing={isParsing}
              parseError={parseError}
            />
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mx-auto max-w-6xl"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Brain,
              title: 'AI-Powered Mapping',
              description:
                'Intelligently identifies and maps columns from any CRM or spreadsheet format.',
            },
            {
              icon: ShieldCheck,
              title: 'Data Validation',
              description:
                'Cleans, normalizes, and validates records. Skips entries without email or phone.',
            },
            {
              icon: Zap,
              title: 'Batch Processing',
              description:
                'Handles 5000+ rows efficiently with configurable batch sizes (20-100).',
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              >
                <Card className="h-full border-border/60 card-hover">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold">Supported CSV Sources</h2>
          <p className="mt-2 text-muted-foreground">
            Works with exports from any platform — no fixed column names required
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            'Facebook Leads',
            'Google Ads',
            'Excel',
            'Google Sheets',
            'HubSpot',
            'Zoho CRM',
            'Salesforce',
            'Real Estate CRMs',
            'Marketing Reports',
            'Custom Spreadsheets',
            'Unknown CRM Exports',
          ].map((source) => (
            <Badge
              key={source}
              variant="outline"
              className="gap-2 px-4 py-2 text-sm border-border/60"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {source}
            </Badge>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function PreviewView({
  parsedData,
  fileName,
  onConfirm,
  onReset,
  isImporting,
}: {
  parsedData: ParsedCSV;
  fileName: string;
  onConfirm: () => void;
  onReset: () => void;
  isImporting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="font-medium">CSV parsed successfully</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-2 text-3xl font-bold tracking-tight"
          >
            Preview your data
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-muted-foreground"
          >
            Review the detected columns and data before confirming the import.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Button 
            variant="ghost" 
            onClick={onReset} 
            disabled={isImporting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            size="lg" 
            className="gap-2 rounded-xl shadow-lg shadow-primary/25 btn-hover" 
            disabled={isImporting}
          >
            <Sparkles className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Confirm Import'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-border/60 shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">{fileName}</span>
            </div>
            <PreviewTable data={parsedData} />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 px-6 py-4 text-sm"
      >
        <Brain className="h-5 w-5 text-primary" />
        <span className="text-foreground">
          Clicking <strong>Confirm Import</strong> will send your data to the AI
          engine for intelligent mapping to the CRM schema.
        </span>
      </motion.div>
    </motion.div>
  );
}

function ResultsView({
  summary,
  records,
  onReset,
}: {
  summary: ImportResponse['summary'];
  records: CRMRecord[];
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="font-medium">Import complete</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-2 text-3xl font-bold tracking-tight"
          >
            Import Results
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-muted-foreground"
          >
            Your data has been processed and mapped to the CRM schema.
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ImportSummary
          summary={summary}
          records={records}
          onReset={onReset}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-border/60 shadow-xl">
          <CardContent className="p-6">
            <ParsedTable records={records} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function ErrorView({ error, onReset }: { error: string | null; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-lg"
    >
      <Card className="border-destructive/30 shadow-xl shadow-destructive/10">
        <CardContent className="flex flex-col items-center gap-8 p-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10"
          >
            <AlertCircle className="h-10 w-10 text-destructive" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-bold">Import failed</h2>
            <p className="text-muted-foreground">
              {error || 'An unexpected error occurred during processing.'}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Button 
              variant="outline" 
              onClick={onReset}
              className="rounded-xl"
            >
              Try Again
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
