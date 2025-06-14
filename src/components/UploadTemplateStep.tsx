
import React from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { File, X, Info, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { extractTemplateVariables } from '@/lib/pptx';
import { TemplateVariablesDisplay } from './TemplateVariablesDisplay';

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
  const [extractedVariables, setExtractedVariables] = React.useState<string[] | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);

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

  const handleFileChange = async (files: File[]) => {
    setError(null);
    setTemplateFile(null);
    setExtractedVariables(null);

    const file = files[0];
    if (!file) {
      setError("Invalid file. We only accept .pptx files under 50MB.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 50MB. Please select a smaller file.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setError('Invalid file type. We only accept .pptx files.');
      return;
    }

    setTemplateFile(file);
    setIsExtracting(true);

    try {
      const variables = await extractTemplateVariables(file);
      setExtractedVariables(variables);
      toast({
        title: "✅ Template Processed",
        description: `We found ${variables.length} variable(s) in "${file.name}".`,
      });
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during variable extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setTemplateFile(null);
    setError(null);
    setExtractedVariables(null);
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
        <div className="w-full animate-in fade-in duration-300 space-y-4">
            <Alert>
                <File className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>
                        {templateFile.name} (
                        {(templateFile.size / 1024 / 1024) < 0.01
                            ? `${Math.ceil(templateFile.size / 1024)} KB`
                            : `${(templateFile.size / 1024 / 1024).toFixed(2)} MB`}
                        )
                    </span>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                        <X className="h-4 w-4" />
                    </Button>
                </AlertDescription>
            </Alert>
            {isExtracting && (
                <div className="flex items-center gap-2 text-muted-foreground p-2 animate-in fade-in">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting variables from your template...</span>
                </div>
            )}
            {extractedVariables && !isExtracting && (
                <TemplateVariablesDisplay variables={extractedVariables} />
            )}
             {error && (
                <p role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
                  {error}
                </p>
            )}
        </div>
      ) : (
        <div>
          <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .pptx file here, or click to select"
            fileTypeDescription="PPTX only"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={goToNextStep} disabled={!templateFile || !!error || isExtracting}>
          Next
        </Button>
      </div>
    </div>
  );
}
