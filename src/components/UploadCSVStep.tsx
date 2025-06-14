
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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

  const handleFileChange = (files: File[]) => {
    setError(null);
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

    setCsvFile(file);
    toast({
      title: "✅ CSV Uploaded",
      description: `Your file "${file.name}" is ready.`,
    });
  };

  const removeFile = () => {
    setCsvFile(null);
    setError(null);
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

      {csvFile ? (
        <div className="w-full animate-in fade-in duration-300">
            <Alert>
                <File className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>{csvFile.name} ({(csvFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                        <X className="h-4 w-4" />
                    </Button>
                </AlertDescription>
            </Alert>
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
        <Button onClick={goToNextStep} disabled={!csvFile || !!error}>
          Next
        </Button>
      </div>
    </div>
  );
}
