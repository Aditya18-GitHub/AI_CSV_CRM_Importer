'use client';

import { useCallback, useState } from 'react';
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
import type { ParsedCSV, ImportResponse, CRMRecord } from '@/types/crm';

type AppState = 'idle' | 'preview' | 'processing' | 'results' | 'error';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('uploading');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [batchInfo, setBatchInfo] = useState<{ current: number; total: number } | undefined>();
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
    if (!selectedFile) return;

    setAppState('processing');
    setProcessingStage('uploading');
    setProcessingProgress(5);
    setError(null);

    try {
      setProcessingStage('uploading');
      setProcessingProgress(15);

      await new Promise((r) => setTimeout(r, 300));

      setProcessingStage('parsing');
      setProcessingProgress(25);

      const batchSize = 50;
      const totalBatches = parsedData
        ? Math.ceil(parsedData.totalRows / batchSize)
        : 1;
      setBatchInfo({ current: 0, total: totalBatches });

      setProcessingStage('processing');
      setProcessingProgress(35);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('batchSize', String(batchSize));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data: ImportResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Processing failed. Please try again.');
      }

      setProcessingProgress(90);
      setProcessingStage('finalizing');

      await new Promise((r) => setTimeout(r, 400));

      setProcessingProgress(100);
      setProcessingStage('done');

      await new Promise((r) => setTimeout(r, 500));

      setImportResult(data);
      setAppState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setAppState('error');
    } finally {
      setBatchInfo(undefined);
    }
  }, [selectedFile, parsedData]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setImportResult(null);
    setError(null);
    setProcessingProgress(0);
    setProcessingStage('uploading');
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
          />
        )}

        {appState === 'processing' && (
          <div className="mx-auto max-w-2xl">
            <ProcessingLoader
              stage={processingStage}
              progress={processingProgress}
              batchInfo={batchInfo}
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
    <div className="space-y-12">
      <section className="mx-auto max-w-3xl text-center animate-fade-in">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Sparkles className="h-3 w-3" />
          AI-Powered CRM Import
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Import any CSV into your{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            CRM format
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Upload CSV files from any CRM, marketing platform, or spreadsheet.
          Our AI engine intelligently maps, cleans, and normalizes your data into
          a standardized CRM schema — no matter the column names or layout.
        </p>
      </section>

      <section className="mx-auto max-w-3xl animate-slide-up">
        <Card className="border-2 border-border/60 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Upload your CSV file</h2>
                <p className="text-sm text-muted-foreground">
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
      </section>

      <section className="mx-auto max-w-5xl animate-slide-up">
        <div className="grid gap-4 sm:grid-cols-3">
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
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/60">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Supported CSV Sources</h2>
          <p className="text-sm text-muted-foreground">
            Works with exports from any platform — no fixed column names required
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
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
              className="gap-1.5 py-1.5 text-sm"
            >
              <Globe className="h-3 w-3 text-muted-foreground" />
              {source}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

function PreviewView({
  parsedData,
  fileName,
  onConfirm,
  onReset,
}: {
  parsedData: ParsedCSV;
  fileName: string;
  onConfirm: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>CSV parsed successfully</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Preview your data
          </h2>
          <p className="text-sm text-muted-foreground">
            Review the detected columns and data before confirming the import.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onReset}>
            Cancel
          </Button>
          <Button onClick={onConfirm} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Confirm Import
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
          </div>
          <PreviewTable data={parsedData} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 rounded-lg bg-accent/50 px-4 py-3 text-sm text-accent-foreground">
        <Brain className="h-4 w-4 text-primary" />
        <span>
          Clicking <strong>Confirm Import</strong> will send your data to the AI
          engine for intelligent mapping to the CRM schema.
        </span>
      </div>
    </div>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Import complete</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Import Results
          </h2>
          <p className="text-sm text-muted-foreground">
            Your data has been processed and mapped to the CRM schema.
          </p>
        </div>
      </div>

      <ImportSummary
        summary={summary}
        records={records}
        onReset={onReset}
      />

      <Card className="border-border/60">
        <CardContent className="p-6">
          <ParsedTable records={records} />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorView({ error, onReset }: { error: string | null; onReset: () => void }) {
  return (
    <div className="mx-auto max-w-lg animate-scale-in">
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Import failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || 'An unexpected error occurred during processing.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onReset}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
