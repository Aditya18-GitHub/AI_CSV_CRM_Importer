'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CRM_FIELDS, CRM_FIELD_LABELS, type CRMRecord } from '@/types/crm';

interface ParsedTableProps {
  records: CRMRecord[];
}

const STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'bg-success/10 text-success border-success/20',
  DID_NOT_CONNECT: 'bg-warning/10 text-warning border-warning/20',
  BAD_LEAD: 'bg-destructive/10 text-destructive border-destructive/20',
  SALE_DONE: 'bg-primary/10 text-primary border-primary/20',
};

export function ParsedTable({ records }: ParsedTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<CRMRecord>[]>(
    () =>
      CRM_FIELDS.map((field) => ({
        id: field,
        accessorKey: field,
        header: CRM_FIELD_LABELS[field] || field,
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value || value.trim() === '') {
            return <span className="text-muted-foreground/40">—</span>;
          }
          if (field === 'crm_status' && value) {
            return (
              <Badge
                variant="outline"
                className={`whitespace-nowrap ${STATUS_COLORS[value] || ''}`}
              >
                {value.replace(/_/g, ' ')}
              </Badge>
            );
          }
          if (field === 'email') {
            return (
              <span className="font-mono text-xs text-primary" title={value}>
                {value}
              </span>
            );
          }
          const truncated = value.length > 50 ? value.slice(0, 50) + '...' : value;
          return (
            <span className="block max-w-[240px] truncate" title={value}>
              {truncated}
            </span>
          );
        },
        size: 160,
      })),
    []
  );

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Standardized CRM Records</h3>
          <p className="text-sm text-muted-foreground">
            {records.length} records mapped to the GrowEasy CRM schema
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="scrollbar-thin max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="min-w-[120px] whitespace-nowrap"
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            className="flex items-center gap-1.5 font-semibold hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                            )}
                          </button>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="min-w-[120px]"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {totalRows === 0 ? 0 : pageIndex * pageSize + 1}-
            {Math.min((pageIndex + 1) * pageSize, totalRows)}
          </span>{' '}
          of <span className="font-medium text-foreground">{totalRows}</span> records
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium">
            Page {pageIndex + 1} of {pageCount || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
