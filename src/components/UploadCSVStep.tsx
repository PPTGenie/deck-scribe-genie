
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import { CSVFormattingInfo } from './CSVFormattingInfo';
import { CSVFileDisplay } from './CSVFileDisplay';
import type { CsvPreview } from '@/types/files';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
};

interface UploadCSVStepProps {
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  extractedVariables: string[] | null;
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

  const handleFileChange = (files: File[]) => {
    setError(null);
    setCsvPreview(null);
    setCsvFile(null);

    const file = files[0];
    if (!file) {
      // This case can be triggered from FileUpload component on rejection
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
      dynamicTyping: false, // Prevents automatic type conversion, treating all values as strings.
      complete: (results) => {
        if (results.errors.length) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          setCsvPreview(null);
          setCsvFile(null);
          return;
        }

        const headers = results.meta.fields;
        const data = results.data;

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
  };

  return (
    <div className="space-y-6">
      <CSVFormattingInfo extractedVariables={extractedVariables} />

      {csvFile && csvPreview ? (
        <CSVFileDisplay
            csvFile={csvFile}
            csvPreview={csvPreview}
            removeFile={removeFile}
            missingVariables={missingVariables}
            extractedVariables={extractedVariables}
        />
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
