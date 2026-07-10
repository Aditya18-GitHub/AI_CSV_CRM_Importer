import { parseCSVText } from '../lib/csv-utils';
import { inferColumnMappingHeuristic } from '../lib/column-heuristics';
import { mapRowsToRecords } from '../lib/record-mapper';
import { recordsToCSV } from '../lib/csv-utils';
import fs from 'fs';
import path from 'path';

async function verifyTransformation() {
  const inputPath = path.join(__dirname, 'messy_input.csv');
  const outputPath = path.join(__dirname, 'actual_output.csv');
  
  // Read input CSV
  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  
  // Parse CSV using actual implementation
  const parsed = await parseCSVText(csvContent);
  console.log('Parsed CSV:', {
    columns: parsed.columns,
    totalRows: parsed.totalRows,
    totalColumns: parsed.totalColumns
  });
  
  // Infer column mapping using actual heuristic implementation
  const mapping = inferColumnMappingHeuristic(parsed.columns);
  console.log('Column Mapping:', JSON.stringify(mapping, null, 2));
  
  // Map rows using actual implementation
  const records = mapRowsToRecords(parsed.rows, mapping);
  console.log('Mapped records:', records.length);
  
  // Convert to CSV
  const outputCsv = await recordsToCSV(records);
  fs.writeFileSync(outputPath, outputCsv);
  
  console.log('Output written to:', outputPath);
  
  // Show first few records for verification
  console.log('\nFirst 3 records:');
  records.slice(0, 3).forEach((record, i) => {
    console.log(`\nRecord ${i + 1}:`);
    console.log(JSON.stringify(record, null, 2));
  });
  
  return records;
}

verifyTransformation().catch(console.error);
