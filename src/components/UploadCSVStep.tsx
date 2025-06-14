
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { CSVFormattingInfo } from './CSVFormattingInfo';
import { CSVFileDisplay } from './CSVFileDisplay';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
};

interface UploadCSVStepProps {
  csvFile: File | null;
  error: string | null;
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
  missingVariables: string[];
  onFileChange: (files: File[]) => void;
}

export function UploadCSVStep({
  csvFile,
  error,
  extractedVariables,
  csvPreview,
  missingVariables,
  onFileChange,
}: UploadCSVStepProps) {

  const handleFileDrop = (files: File[]) => {
    const file = files[0];
    if (!file) {
      onFileChange([]); // Signal error case
      return;
    }
    if (file.size > MAX_FILE_SIZE || !file.name.toLowerCase().endsWith('.csv')) {
      onFileChange([]); // Signal error case
      return;
    }
    onFileChange(files);
  };

  const removeFile = () => {
    onFileChange([]);
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
            onFileSelect={handleFileDrop}
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
