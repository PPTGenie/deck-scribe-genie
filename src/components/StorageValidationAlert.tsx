
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import type { StorageValidationResult } from '@/services/storageValidationService';

interface StorageValidationAlertProps {
  validation: StorageValidationResult | null;
  isValidating: boolean;
}

export function StorageValidationAlert({ validation, isValidating }: StorageValidationAlertProps) {
  if (isValidating) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Validating Images</AlertTitle>
        <AlertDescription>
          Checking if all referenced images exist in storage...
        </AlertDescription>
      </Alert>
    );
  }

  if (!validation || validation.isValid) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Missing Images in Storage</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          {validation.missingImages.length > 0 && (
            <div>
              <p>The following images are referenced in your CSV but not found in storage:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {validation.missingImages.map(img => (
                  <code key={img} className="text-xs bg-destructive/20 px-2 py-1 rounded">
                    {img}
                  </code>
                ))}
              </div>
              <p className="text-sm mt-2">
                Please upload these images in the Image Upload step before proceeding.
              </p>
            </div>
          )}
          {validation.errors.length > 0 && (
            <div>
              <p>Storage validation errors:</p>
              <ul className="list-disc list-inside text-sm mt-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
