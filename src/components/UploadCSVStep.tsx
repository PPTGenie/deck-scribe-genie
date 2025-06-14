
import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import { CSVPreviewTable } from './CSVPreviewTable';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
};

interface UploadCSVStepProps {
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export function UploadCSVStep({ csvFile, setCsvFile, goToNextStep, goToPrevStep, error, setError }: UploadCSVStepProps) {
  const { toast } = useToast();
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);


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
        if (!headers || headers.length === 0 || results.data.length === 0) {
            setError("CSV file appears to be empty or is missing a header row.");
            setCsvPreview(null);
            setCsvFile(null);
            return;
        }
        
        setCsvFile(file);
        setCsvPreview({ headers, data: results.data as Record<string, string>[] });
        toast({
          title: "✅ CSV Uploaded",
          description: `Your file "${file.name}" is ready for preview.`,
        });
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

  const PlaceholderInfo = () => (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>How your CSV file should be formatted</AlertTitle>
      <AlertDescription>
        The first row of your CSV must be a header row. The column names in the header must exactly match the placeholders in your template file.
        <br/>
        For example, if you have <code>{'{{company_name}}'}</code> in your template, you need a column named <code>company_name</code> in your CSV.
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-6">
      <PlaceholderInfo />

      {csvFile && csvPreview ? (
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
            <CSVPreviewTable headers={csvPreview.headers} data={csvPreview.data} />
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={goToPrevStep}>Back</Button>
        <Button onClick={goToNextStep} disabled={!csvFile || !!error || !csvPreview}>
          Next
        </Button>
      </div>
    </div>
  );
}
