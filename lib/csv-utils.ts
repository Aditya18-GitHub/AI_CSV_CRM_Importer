import type { ParsedCSV } from '@/types/crm';

export async function parseCSV(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedCSV> {
  const Papa = (await import('papaparse')).default;

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const fatal = results.errors.find(
            (e) => e.type === 'Delimiter' || e.type === 'Quotes'
          );
          if (fatal) {
            reject(new Error(`CSV parsing error: ${fatal.message}`));
            return;
          }
        }

        const columns = results.meta.fields || [];
        if (columns.length === 0) {
          reject(new Error('No columns detected in CSV file.'));
          return;
        }

        const rows = results.data.filter(
          (row) =>
            row &&
            Object.values(row).some(
              (v) => v !== null && v !== undefined && String(v).trim() !== ''
            )
        );

        if (rows.length === 0) {
          reject(new Error('CSV file contains no data rows.'));
          return;
        }

        resolve({
          columns,
          rows,
          totalRows: rows.length,
          totalColumns: columns.length,
        });
      },
      error: (err: Error) => {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}

export async function parseCSVText(text: string): Promise<ParsedCSV> {
  const Papa = (await import('papaparse')).default;

  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim(),
  });

  if (results.errors.length > 0) {
    const fatal = results.errors.find(
      (e) => e.type === 'Delimiter' || e.type === 'Quotes'
    );
    if (fatal) {
      throw new Error(`CSV parsing error: ${fatal.message}`);
    }
  }

  const columns = results.meta.fields || [];
  if (columns.length === 0) {
    throw new Error('No columns detected in CSV file.');
  }

  const rows = (results.data || []).filter(
    (row) =>
      row &&
      Object.values(row).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== ''
      )
  );

  if (rows.length === 0) {
    throw new Error('CSV file contains no data rows.');
  }

  return {
    columns,
    rows,
    totalRows: rows.length,
    totalColumns: columns.length,
  };
}

export async function recordsToCSV(
  records: Record<string, unknown>[] | object[]
): Promise<string> {
  if (records.length === 0) return '';
  const Papa = (await import('papaparse')).default;
  return Papa.unparse(records);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
