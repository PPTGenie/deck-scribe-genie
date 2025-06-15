import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import { CSVFormattingInfo } from './CSVFormattingInfo';
import { CSVFileDisplay } from './CSVFileDisplay';
import { ImageValidationErrors } from './ImageValidationErrors';
import { validateAllImageFilenames } from '@/lib/imageValidation';
import type { CsvPreview, TemplateVariables } from '@/types/files';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
};

interface UploadCSVStepProps {
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  extractedVariables: TemplateVariables | null;
  csvPreview: CsvPreview | null;
  setCsvPreview: (preview: CsvPreview | null) => void;
  missingVariables: string[];
}

export function UploadCSVStep({
  csvFile,
  setCsvFile,
  error,
  setError,
  extractedVariables,
  csvPreview,
  setCsvPreview,
  missingVariables,
}: UploadCSVStepProps) {
  const [imageValidationIssues, setImageValidationIssues] = React.useState<any[]>([]);

  const handleFileChange = (files: File[]) => {
    setError(null);
    setCsvPreview(null);
    setCsvFile(null);
    setImageValidationIssues([]);

    const file = files[0];
    if (!file) {
      setError("Invalid file. We only accept .csv files under 5MB.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 5MB. Please select a smaller file.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
       setError('Invalid file type. We only accept .csv files.');
       return;
    }

    // Use a more robust CSV parsing approach that preserves all values as strings
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        setError("Failed to read the CSV file.");
        return;
      }

      try {
        // Manual CSV parsing to ensure all values remain as strings
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
          setError("Your CSV file appears to be empty. Please upload a file with a header row and at least one data row.");
          setCsvPreview(null);
          setCsvFile(null);
          return;
        }

        // Parse header row - remove quotes and trim whitespace
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(header => {
          return header.trim().replace(/^["']|["']$/g, '');
        });

        if (headers.length === 0) {
          setError("Your CSV file appears to be empty. Please upload a file with a header row and at least one data row.");
          setCsvPreview(null);
          setCsvFile(null);
          return;
        }

        // Parse data rows - ensure all values are preserved as strings
        const dataRows = lines.slice(1);
        const data: Record<string, string>[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const line = dataRows[i].trim();
          if (!line) continue; // Skip empty lines

          // Simple CSV parsing that preserves all values as strings
          const values = line.split(',').map(value => {
            // Remove surrounding quotes if present, but keep the value as a string
            return value.trim().replace(/^["']|["']$/g, '');
          });

          if (values.length !== headers.length) {
            console.warn(`Warning: Row ${i + 2} has ${values.length} columns, but header has ${headers.length}. Data may be inconsistent.`);
          }

          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            // Ensure all values are explicitly treated as strings - no number conversion
            rowData[header] = String(values[index] || '');
          });
          data.push(rowData);
        }

        if (data.length === 0) {
          setError("Your CSV file only contains a header. Please add at least one data row below the header.");
          setCsvPreview(null);
          setCsvFile(null);
          return;
        }

        // Validate image filenames if we have image columns
        const imageColumns = extractedVariables?.images || [];
        let validationIssues: any[] = [];
        
        if (imageColumns.length > 0) {
          validationIssues = validateAllImageFilenames(data, imageColumns);
          setImageValidationIssues(validationIssues);
        }

        setCsvFile(file);
        setCsvPreview({ headers, data });

      } catch (err: any) {
        setError(`An unexpected error occurred while parsing: ${err.message}`);
        setCsvPreview(null);
        setCsvFile(null);
      }
    };

    reader.onerror = () => {
      setError("Failed to read the CSV file. Please try again.");
      setCsvPreview(null);
      setCsvFile(null);
    };

    reader.readAsText(file);
  };

  const removeFile = () => {
    setCsvFile(null);
    setError(null);
    setCsvPreview(null);
    setImageValidationIssues([]);
  };

  const handleRetryUpload = () => {
    removeFile();
  };

  const handleFixedCSVDownload = (csvContent: string) => {
    // When user downloads corrected CSV, we could optionally auto-process it
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corrected_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasBlockingErrors = missingVariables.length > 0 || imageValidationIssues.length > 0;

  return (
    <div className="space-y-6">
      <CSVFormattingInfo extractedVariables={extractedVariables} />

      {csvFile && csvPreview ? (
        <div className="space-y-4">
          <CSVFileDisplay
            csvFile={csvFile}
            csvPreview={csvPreview}
            removeFile={removeFile}
            missingVariables={missingVariables}
            extractedVariables={extractedVariables}
          />
          
          {/* Image validation results */}
          {extractedVariables?.images && extractedVariables.images.length > 0 && (
            <ImageValidationErrors
              issues={imageValidationIssues}
              csvData={csvPreview.data}
              imageColumns={extractedVariables.images}
              onFixedCSVDownload={handleFixedCSVDownload}
              onRetryUpload={handleRetryUpload}
            />
          )}

          {hasBlockingErrors && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Please resolve the issues above before proceeding to the next step.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .csv file here, or click to select"
            fileTypeDescription="CSV only"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
