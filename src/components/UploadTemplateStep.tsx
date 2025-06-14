import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info, ChevronsUpDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

interface UploadTemplateStepProps {
  templateFile: File | null;
  setTemplateFile: (file: File | null) => void;
  goToNextStep: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export function UploadTemplateStep({ templateFile, setTemplateFile, goToNextStep, error, setError }: UploadTemplateStepProps) {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isHelperOpen, setIsHelperOpen] = React.useState(true);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleResize = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
      if (event.matches) {
        setIsHelperOpen(false);
      } else {
        setIsHelperOpen(true);
      }
    };
    handleResize(mediaQuery);
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const handleFileChange = (files: File[]) => {
    setError(null);
    const file = files[0];
    if (!file) {
      // This case can be triggered from FileUpload component on rejection
      setError("Invalid file. We only accept .pptx files under 50MB.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 50MB. Please select a smaller file.');
      return;
    }
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      setError('Invalid file type. We only accept .pptx files.');
      return;
    }

    setTemplateFile(file);
    toast({
      title: "✅ Template Uploaded",
      description: `Your file "${file.name}" is ready.`,
    });
  };

  const removeFile = () => {
    setTemplateFile(null);
    setError(null);
  };

  const PlaceholderInfo = () => (
    <Alert className={cn(isMobile && "mt-2 border-0 shadow-none")}>
      <Info className="h-4 w-4" />
      <AlertTitle>How placeholders work</AlertTitle>
      <AlertDescription>
        Your template must use placeholders like <code>{'{{name}}'}</code>. We'll replace these with data from your CSV.
        <br/>
        For example: <code>{'{{company_name}}'}</code> → "Acme Inc."
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-6">
      {isMobile ? (
        <Collapsible open={isHelperOpen} onOpenChange={setIsHelperOpen} className="w-full space-y-2">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex w-full items-center justify-between p-2">
                    <div className="flex items-center gap-2 font-semibold">
                        <Info className="h-4 w-4" />
                        How placeholders work
                    </div>
                    <ChevronsUpDown className="h-4 w-4" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <PlaceholderInfo />
            </CollapsibleContent>
        </Collapsible>
      ) : (
        <PlaceholderInfo />
      )}

      {templateFile ? (
        <div className="w-full animate-in fade-in duration-300">
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
        <div>
          <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .pptx file here, or click to select"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={goToNextStep} disabled={!templateFile || !!error}>
          Next
        </Button>
      </div>
    </div>
  );
}
