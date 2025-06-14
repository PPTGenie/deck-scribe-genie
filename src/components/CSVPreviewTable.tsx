
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CSVPreviewTableProps {
  headers: string[];
  data: Record<string, string>[];
}

const PREVIEW_ROW_COUNT = 5;

export function CSVPreviewTable({ headers, data }: CSVPreviewTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (!headers || headers.length === 0 || !data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data to display.</p>;
  }

  const visibleData = showAll ? data : data.slice(0, PREVIEW_ROW_COUNT);

  return (
    <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">CSV Data Preview</p>
      <div className="relative w-full overflow-auto rounded-md border" style={{ maxHeight: '400px' }}>
        <Table>
          <TableHeader className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((header) => (
                  <TableCell key={`${rowIndex}-${header}`} className="max-w-[200px] truncate whitespace-nowrap" title={row[header]}>
                    {row[header]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length > PREVIEW_ROW_COUNT && (
        <Button variant="link" onClick={() => setShowAll(!showAll)} className="h-auto p-0 text-sm">
          {showAll ? (
            <>
              Show less <ChevronUp className="ml-1" />
            </>
          ) : (
            <>
              Show all {data.length} rows <ChevronDown className="ml-1" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
