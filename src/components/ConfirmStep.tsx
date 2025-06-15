
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileUp, CheckCircle2 } from 'lucide-react';
import { AlertDescription, AlertTitle } from './ui/alert';
import { FilenameTemplateForm } from './FilenameTemplateForm';
import type { CsvPreview } from '@/types/files';
import { DismissibleAlert } from './DismissibleAlert';

interface ConfirmStepProps {
  templateFile: File;
  csvFile: File;
  csvPreview: CsvPreview;
  filenameTemplate: string;
  setFilenameTemplate: React.Dispatch<React.SetStateAction<string>>;
  setFilenameError: (error: string | null) => void;
}

export function ConfirmStep({
  templateFile,
  csvFile,
  csvPreview,
  filenameTemplate,
  setFilenameTemplate,
  setFilenameError,
}: ConfirmStepProps) {
  const getFileSize = (size: number) => {
    if (size / 1024 / 1024 < 0.01) {
      return `${Math.ceil(size / 1024)} KB`;
    }
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <DismissibleAlert storageKey="confirm-step-alert-dismissed">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Ready to Go!</AlertTitle>
        <AlertDescription>
          Please review the files and configure the output filenames below. Once you click "Start Job", the generation process will be queued.
        </AlertDescription>
      </DismissibleAlert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileUp className="h-5 w-5 text-primary" />
              Template File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm truncate" title={templateFile.name}>{templateFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {getFileSize(templateFile.size)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              CSV Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm truncate" title={csvFile.name}>{csvFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {csvPreview.data.length} rows
            </p>
          </CardContent>
        </Card>
      </div>

      <FilenameTemplateForm
        csvPreview={csvPreview}
        filenameTemplate={filenameTemplate}
        setFilenameTemplate={setFilenameTemplate}
        setFilenameError={setFilenameError}
      />
    </div>
  );
}
