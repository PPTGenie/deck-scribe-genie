
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import { CSVFormattingInfo } from './CSVFormattingInfo';
import { CSVFileDisplay } from './CSVFileDisplay';
import { ImageValidationErrors } from './ImageValidationErrors';
import { ScientificNotationAlert } from './ScientificNotationAlert';
import { validateAllImageFilenames } from '@/lib/imageValidation';
import { processCsvData } from '@/lib/csvDataProcessing';
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
  const [scientificNotationConversions, setScientificNotationConversions] = React.useState<any[]>([]);

  const handleFileChange = (files: File[]) => {
    setError(null);
    setCsvPreview(null);
    setCsvFile(null);
    setImageValidationIssues([]);
    setScientificNotationConversions([]);

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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep everything as strings to prevent automatic scientific notation conversion
      complete: (results) => {
        if (results.errors.length) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          setCsvPreview(null);
          setCsvFile(null);
          return;
        }

        const headers = results.meta.fields;
        let data = results.data;

        if (!headers || headers.length === 0) {
            setError("Your CSV file appears to be empty. Please upload a file with a header row and at least one data row.");
            setCsvPreview(null);
            setCsvFile(null);
            return;
        }

        if (data.length === 0) {
            setError("Your CSV file only contains a header. Please add at least one data row below the header.");
            setCsvPreview(null);
            setCsvFile(null);
            return;
        }

        // Process scientific notation in CSV data
        const { processedData, conversionsFound } = processCsvData(data as Record<string, string>[]);
        data = processedData;
        setScientificNotationConversions(conversionsFound);

        // Validate image filenames if we have image columns
        const imageColumns = extractedVariables?.images || [];
        let validationIssues: any[] = [];
        
        if (imageColumns.length > 0) {
          validationIssues = validateAllImageFilenames(data as Record<string, string>[], imageColumns);
          setImageValidationIssues(validationIssues);
        }

        setCsvFile(file);
        setCsvPreview({ headers, data: data as Record<string, string>[] });
      },
      error: (err: any) => {
        setError(`An unexpected error occurred while parsing: ${err.message}`);
        setCsvPreview(null);
        setCsvFile(null);
      }
    });
  };

  const removeFile = () => {
    setCsvFile(null);
    setError(null);
    setCsvPreview(null);
    setImageValidationIssues([]);
    setScientificNotationConversions([]);
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
          
          {/* Scientific notation conversion alert */}
          <ScientificNotationAlert conversions={scientificNotationConversions} />
          
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
