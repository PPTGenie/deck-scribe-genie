import { useState, useEffect } from 'react';
import type { CsvPreview, TemplateVariables } from '@/types/files';
import type { MissingImageBehavior } from '@/components/MissingImageOptions';

interface ImageFile {
  file: File;
  preview: string;
  normalized: string;
}

export function useNewBatchWithImagesState() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariables | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [filenameTemplate, setFilenameTemplate] = useState<string>('');
  const [filenameError, setFilenameError] = useState<string | null>('Filename template must contain at least one variable.');
  const [missingImageBehavior, setMissingImageBehavior] = useState<MissingImageBehavior>('placeholder');

  // When template file is cleared, also clear everything else
  useEffect(() => {
    if (!templateFile) {
      setExtractedVariables(null);
      setCsvFile(null);
      setCsvPreview(null);
      setMissingVariables([]);
      setUploadedImages([]);
    }
  }, [templateFile]);

  // Clean up image previews when component unmounts or images change
  useEffect(() => {
    return () => {
      uploadedImages.forEach(image => {
        URL.revokeObjectURL(image.preview);
      });
    };
  }, [uploadedImages]);

  // Recalculate missing variables when template variables or CSV headers change
  useEffect(() => {
    if (extractedVariables && csvPreview?.headers) {
      const allVariables = [...extractedVariables.text, ...extractedVariables.images];
      const missing = allVariables.filter(v => !csvPreview.headers.includes(v));
      setMissingVariables(missing);
    } else {
      setMissingVariables([]);
    }
  }, [extractedVariables, csvPreview]);

  // Set default filename template when CSV preview is available
  useEffect(() => {
    if (csvPreview?.headers.length && !filenameTemplate) {
      const firstHeader = csvPreview.headers[0];
      setFilenameTemplate(`{{${firstHeader}}}`);
    }
  }, [csvPreview, filenameTemplate]);

  // Get CSV values for image columns
  const csvImageValues = csvPreview?.data.reduce((acc, row) => {
    extractedVariables?.images.forEach(imgVar => {
      const value = row[imgVar];
      if (value && !acc.includes(value)) {
        acc.push(value);
      }
    });
    return acc;
  }, [] as string[]) || [];
  
  return {
    templateFile, setTemplateFile,
    csvFile, setCsvFile,
    uploadedImages, setUploadedImages,
    error, setError,
    extractedVariables, setExtractedVariables,
    isExtracting, setIsExtracting,
    csvPreview, setCsvPreview,
    missingVariables,
    filenameTemplate, setFilenameTemplate,
    filenameError, setFilenameError,
    missingImageBehavior, setMissingImageBehavior,
    csvImageValues,
  };
}
