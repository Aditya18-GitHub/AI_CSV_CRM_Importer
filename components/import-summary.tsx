'use client';

import {
  CheckCircle2,
  XCircle,
  Database,
  Clock,
  Download,
  Copy,
  FileJson,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ImportSummary as ImportSummaryType, CRMRecord } from '@/types/crm';
import { recordsToCSV, downloadFile } from '@/lib/csv-utils';

interface ImportSummaryProps {
  summary: ImportSummaryType;
  records: CRMRecord[];
  onReset: () => void;
}

export function ImportSummary({ summary, records, onReset }: ImportSummaryProps) {
  const cards = [
    {
      label: 'Total Rows',
      value: summary.totalRows,
      icon: Database,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Imported',
      value: summary.imported,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Skipped',
      value: summary.skipped,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Processing Time',
      value: `${(summary.processingTimeMs / 1000).toFixed(1)}s`,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const handleDownloadCSV = async () => {
    const csv = await recordsToCSV(records);
    downloadFile(csv, 'crm-import-results.csv', 'text/csv');
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(records, null, 2);
    downloadFile(json, 'crm-import-results.json', 'application/json');
  };

  const handleCopyJSON = async () => {
    const json = JSON.stringify(records, null, 2);
    await navigator.clipboard.writeText(json);
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                    card.bg
                  )}
                >
                  <Icon className={cn('h-6 w-6', card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Export:</span>
        <Button variant="default" onClick={handleDownloadCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Download CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadJSON} className="gap-2">
          <FileJson className="h-4 w-4" />
          Download JSON
        </Button>
        <Button variant="outline" onClick={handleCopyJSON} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy JSON
        </Button>
        <Button variant="ghost" onClick={onReset} className="gap-2 ml-auto">
          <RotateCcw className="h-4 w-4" />
          Import Another File
        </Button>
      </div>
    </div>
  );
}
