
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CSVPreviewTable } from './CSVPreviewTable';
import { DismissibleAlert } from './DismissibleAlert';
import { FileInfoDisplay } from './FileInfoDisplay';
import type { TemplateVariables, CsvPreview } from '@/types/files';

interface CSVFileDisplayProps {
  csvFile: File;
  csvPreview: CsvPreview;
  removeFile: () => void;
  missingVariables: string[];
  extractedVariables: TemplateVariables | null;
}

export function CSVFileDisplay({
  csvFile,
  csvPreview,
  removeFile,
  missingVariables,
  extractedVariables,
}: CSVFileDisplayProps) {
  const hasMissingVariables = missingVariables.length > 0;
  const hasImageValidationErrors = csvPreview.imageValidation && !csvPreview.imageValidation.isValid;

  return (
    <div className="w-full animate-in fade-in duration-300 space-y-4">
      <FileInfoDisplay file={csvFile} onRemove={removeFile} />

      {!hasMissingVariables && !hasImageValidationErrors && (
        <DismissibleAlert
          storageKey="csv-ready-alert-dismissed"
          className="border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200 [&>svg]:text-green-500"
        >
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>CSV Ready</AlertTitle>
          <AlertDescription>
            Your CSV file is ready. All required columns are present and image filenames are valid.
          </AlertDescription>
        </DismissibleAlert>
      )}

      {hasMissingVariables && (
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

      <CSVPreviewTable 
        headers={csvPreview.headers} 
        data={csvPreview.data} 
        templateVariables={extractedVariables ? [...extractedVariables.text, ...extractedVariables.images] : []}
        imageColumns={extractedVariables?.images || []}
      />
    </div>
  );
}
