'use client';

import { motion } from 'framer-motion';
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
      label: 'Successfully Imported',
      value: summary.imported,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Skipped Records',
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-border/60 shadow-lg card-hover">
                <CardContent className="flex items-center gap-4 p-6">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                      card.bg
                    )}
                  >
                    <Icon className={cn('h-7 w-7', card.color)} />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-wrap items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
      >
        <span className="text-sm font-semibold text-foreground">Export Options:</span>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleDownloadCSV} 
            className="gap-2 rounded-xl shadow-md shadow-primary/20 btn-hover"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadJSON} 
            className="gap-2 rounded-xl"
          >
            <FileJson className="h-4 w-4" />
            Download JSON
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCopyJSON} 
            className="gap-2 rounded-xl"
          >
            <Copy className="h-4 w-4" />
            Copy JSON
          </Button>
        </div>
        <Button 
          variant="ghost" 
          onClick={onReset} 
          className="gap-2 ml-auto rounded-xl"
        >
          <RotateCcw className="h-4 w-4" />
          Import Another File
        </Button>
      </motion.div>
    </motion.div>
  );
}
