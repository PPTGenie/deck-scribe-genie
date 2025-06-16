
import { useState, useEffect } from 'react';
import { validateImagesInStorage, extractImageFilenames, type StorageValidationResult } from '@/services/storageValidationService';
import { useAuth } from '@/context/AuthContext';
import type { CsvPreview, TemplateVariables } from '@/types/files';

interface UseStorageValidationProps {
  templateFile: File | null;
  csvPreview: CsvPreview | null;
  extractedVariables: TemplateVariables | null;
  shouldValidate: boolean;
}

export function useStorageValidation({
  templateFile,
  csvPreview,
  extractedVariables,
  shouldValidate
}: UseStorageValidationProps) {
  const { user } = useAuth();
  const [storageValidation, setStorageValidation] = useState<StorageValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!shouldValidate || !user || !templateFile || !csvPreview || !extractedVariables?.images.length) {
      setStorageValidation(null);
      return;
    }

    const validateStorage = async () => {
      setIsValidating(true);
      try {
        // Create a mock template ID for validation (in real implementation, this would be from upload)
        const mockTemplateId = templateFile.name.replace(/\.[^/.]+$/, '');
        
        const imageFilenames = extractImageFilenames(csvPreview.data, extractedVariables.images);
        const result = await validateImagesInStorage(user.id, mockTemplateId, imageFilenames);
        
        setStorageValidation(result);
      } catch (error) {
        console.error('Storage validation failed:', error);
        setStorageValidation({
          isValid: false,
          missingImages: [],
          errors: ['Failed to validate images in storage']
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateStorage();
  }, [shouldValidate, user, templateFile, csvPreview, extractedVariables]);

  return {
    storageValidation,
    isValidating
  };
}
