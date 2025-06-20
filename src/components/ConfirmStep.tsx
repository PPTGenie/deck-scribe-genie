
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileInfoDisplay } from './FileInfoDisplay';
import { FilenameTemplateForm } from './FilenameTemplateForm';
import { MissingImageOptions } from './MissingImageOptions';
import type { CsvPreview } from '@/types/files';

interface ConfirmStepProps {
  templateFile: File;
  csvFile: File;
  csvPreview: CsvPreview;
  filenameTemplate: string;
  setFilenameTemplate: (template: string) => void;
  setFilenameError: (error: string | null) => void;
  hasImageVariables?: boolean;
  missingImageBehavior?: string;
  setMissingImageBehavior?: (behavior: string) => void;
}

export function ConfirmStep({
  templateFile,
  csvFile,
  csvPreview,
  filenameTemplate,
  setFilenameTemplate,
  setFilenameError,
  hasImageVariables = false,
  missingImageBehavior = 'placeholder',
  setMissingImageBehavior
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileInfoDisplay
              title="Template File"
              file={templateFile}
              icon="📄"
            />
            <FileInfoDisplay
              title="CSV File"
              file={csvFile}
              icon="📊"
              extraInfo={`${csvPreview.data.length} rows`}
            />
          </div>
        </CardContent>
      </Card>

      <FilenameTemplateForm
        filenameTemplate={filenameTemplate}
        setFilenameTemplate={setFilenameTemplate}
        setFilenameError={setFilenameError}
        csvPreview={csvPreview}
      />

      {hasImageVariables && setMissingImageBehavior && (
        <MissingImageOptions
          missingImageBehavior={missingImageBehavior}
          setMissingImageBehavior={setMissingImageBehavior}
        />
      )}
    </div>
  );
}
