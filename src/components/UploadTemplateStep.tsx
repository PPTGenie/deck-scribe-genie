
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

interface UploadTemplateStepProps {
  templateFile: File | null;
  setTemplateFile: (file: File | null) => void;
  goToNextStep: () => void;
}

export function UploadTemplateStep({ templateFile, setTemplateFile, goToNextStep }: UploadTemplateStepProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = (files: File[]) => {
    setError(null);
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 50MB.');
      return;
    }
    if (!ACCEPTED_FILE_TYPES[file.type]) {
      setError('Invalid file type. Please upload a .pptx file.');
      return;
    }

    setTemplateFile(file);
  };

  const removeFile = () => {
    setTemplateFile(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
                Select your .pptx template with {"{{placeholders}}"}.
            </p>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs p-2">
                            Your PowerPoint template should contain placeholders like `{"{{name}}"` or `{"{{title}}"}`. These will be replaced with data from your CSV file. The CSV file must have headers that match the placeholder names.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

      {templateFile ? (
        <div className="w-full">
            <Alert>
                <File className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>{templateFile.name} ({(templateFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                        <X className="h-4 w-4" />
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
      ) : (
        <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .pptx file here, or click to select"
        />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={goToNextStep} disabled={!templateFile || !!error}>
          Next
        </Button>
      </div>
    </div>
  );
}
