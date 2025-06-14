import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info, AlertTriangle, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import { CSVPreviewTable } from './CSVPreviewTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
  setCsvPreview: (preview: { headers: string[]; data: Record<string, string>[] } | null) => void;
  missingVariables: string[];
}

export function UploadCSVStep({
  csvFile,
  setCsvFile,
  goToNextStep,
  goToPrevStep,
  error,
  setError,
  extractedVariables,
  csvPreview,
  setCsvPreview,
  missingVariables,
}: UploadCSVStepProps) {
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    if (!extractedVariables || extractedVariables.length === 0) return;

    const csvHeader = extractedVariables.join(',');
    const exampleRow = extractedVariables.map(v => `[Example for ${v}]`).join(',');
    const csvContent = `${csvHeader}\n${exampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a link to trigger the download.
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
        title: "✅ Template Downloaded",
        description: "template.csv has been downloaded with a sample row.",
    });
  };

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

  const PlaceholderInfo = () => {
    const hasVariables = extractedVariables && extractedVariables.length > 0;

    return (
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">
          How to Format Your CSV Data
        </AlertTitle>
        <AlertDescription className="space-y-3 text-blue-700 dark:text-blue-300/90">
          <p>
            Your CSV file provides the data to fill in the placeholders we found in your template. The easiest way to get started is to download our generated template.
          </p>
          <div className="rounded-md bg-background/50 p-4">
            <h4 className="font-semibold mb-2">Your template requires {extractedVariables?.length || '...'} column(s):</h4>
            {hasVariables ? (
                <div className="flex flex-wrap gap-2 mb-4">
                    {extractedVariables.map(v => <code key={v} className="text-xs font-semibold p-1 bg-blue-100 dark:bg-blue-900 rounded-sm">{v}</code>)}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic mb-4">Upload a template in Step 1 to see required columns.</p>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block"> {/* Wrapper for tooltip on disabled button */}
                    <Button
                      onClick={handleDownloadTemplate}
                      disabled={!hasVariables}
                    >
                      <Download />
                      Download CSV Template
                    </Button>
                  </div>
                </TooltipTrigger>
                {!hasVariables && (
                  <TooltipContent>
                    <p>First, upload a template in Step 1.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-2">
                This will download a <code>template.csv</code> file with the correct headers and a sample row.
            </p>
          </div>
          <p>
            Each row in your CSV file will be used to generate one unique presentation.
          </p>
        </AlertDescription>
      </Alert>
    );
  };

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
      ) : (
        <div>
          <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .csv file here, or click to select"
            fileTypeDescription="CSV only"
            successMessage="Great! CSV ready."
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
