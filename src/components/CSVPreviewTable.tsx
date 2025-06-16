
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
import { cn } from '@/lib/utils';
import { validateImageFilename } from '@/utils/imageValidation';

interface CSVPreviewTableProps {
  headers: string[];
  data: Record<string, string>[];
  templateVariables: string[] | null;
  imageColumns?: string[];
}

const PREVIEW_ROW_COUNT = 5;

export function CSVPreviewTable({ headers, data, templateVariables, imageColumns = [] }: CSVPreviewTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (!headers || headers.length === 0 || !data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data to display.</p>;
  }

  const visibleData = showAll ? data : data.slice(0, PREVIEW_ROW_COUNT);

  const isImageColumn = (header: string) => imageColumns.includes(header);
  
  const getCellClassName = (header: string, value: string) => {
    if (isImageColumn(header) && value && value.trim()) {
      const validation = validateImageFilename(value);
      if (!validation.isValid) {
        return "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200";
      }
    }
    return "";
  };
  
  const Legend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
      <span className="font-semibold">Header Legend:</span>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700"></div>
        <span>Matches a placeholder</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700"></div>
        <span>Extra column (ignored)</span>
      </div>
      {imageColumns.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-200"></div>
          <span>Invalid image filename</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">CSV Data Preview</p>
        {templateVariables && templateVariables.length > 0 && <Legend />}
      <div className="relative w-full overflow-auto rounded-md border" style={{ maxHeight: '400px' }}>
        <Table>
          <TableHeader className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow>
              {headers.map((header) => (
                <TableHead
                  key={header}
                  className={cn(
                    "whitespace-nowrap transition-colors",
                    templateVariables &&
                      (templateVariables.includes(header)
                        ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                        : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200")
                  )}
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((header) => (
                  <TableCell 
                    key={`${rowIndex}-${header}`} 
                    className={cn(
                      "max-w-[200px] truncate whitespace-nowrap",
                      getCellClassName(header, row[header])
                    )} 
                    title={row[header]}
                  >
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
