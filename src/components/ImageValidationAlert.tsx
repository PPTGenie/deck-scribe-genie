
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface InvalidImageFile {
  column: string;
  value: string;
  suggested?: string;
}

interface ImageValidationAlertProps {
  invalidFiles: InvalidImageFile[];
  errors: string[];
}

export function ImageValidationAlert({ invalidFiles, errors }: ImageValidationAlertProps) {
  if (invalidFiles.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Invalid Image Files Found</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>The following image filenames have invalid extensions or formatting:</p>
          <div className="space-y-1">
            {invalidFiles.map((file, index) => (
              <div key={index} className="text-sm">
                <span className="font-mono bg-destructive/20 px-1 rounded text-xs">
                  {file.column}: {file.value}
                </span>
                {file.suggested && (
                  <span className="text-muted-foreground ml-2">
                    → Did you mean <span className="font-mono">{file.suggested}</span>?
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-sm mt-2">
            Allowed extensions: <span className="font-mono">.png, .jpg, .jpeg, .svg</span> (case-insensitive)
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
