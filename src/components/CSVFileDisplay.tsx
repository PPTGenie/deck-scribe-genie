
import React from 'react';
import { File, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CSVPreviewTable } from './CSVPreviewTable';

interface CSVFileDisplayProps {
  csvFile: File;
  csvPreview: { headers: string[]; data: Record<string, string>[] };
  removeFile: () => void;
  missingVariables: string[];
  extractedVariables: string[] | null;
}

export function CSVFileDisplay({
  csvFile,
  csvPreview,
  removeFile,
  missingVariables,
  extractedVariables,
}: CSVFileDisplayProps) {
  return (
    <div className="w-full animate-in fade-in duration-300 space-y-4">
      <Alert>
        <File className="h-4 w-4" />
        <AlertTitle>File Selected</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {csvFile.name} (
            {(csvFile.size / 1024 / 1024) < 0.01
              ? `${Math.ceil(csvFile.size / 1024)} KB`
              : `${(csvFile.size / 1024 / 1024).toFixed(2)} MB`}
            )
          </span>
          <Button variant="ghost" size="icon" onClick={removeFile}>
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
      {missingVariables.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing CSV Columns</AlertTitle>
          <AlertDescription>
            Your PPTX template requires the following columns which were not found in your CSV file:
            <div className="flex flex-wrap gap-1 mt-2">
              {missingVariables.map(v => <code key={v} className="text-xs font-semibold p-1 bg-red-200/50 rounded-sm">{v}</code>)}
            </div>
          </AlertDescription>
        </Alert>
      )}
      <CSVPreviewTable headers={csvPreview.headers} data={csvPreview.data} templateVariables={extractedVariables} />
    </div>
  );
}
