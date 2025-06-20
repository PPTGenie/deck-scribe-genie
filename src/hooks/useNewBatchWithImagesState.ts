
import { useState, useEffect } from 'react';
import type { TemplateVariables, CsvPreview } from '@/types/files';

interface UploadedImage {
  file: File;
  normalized: string;
  preview: string; // Add preview property to match ImageFile interface
}

export function useNewBatchWithImagesState() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariables | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [filenameTemplate, setFilenameTemplate] = useState('{{name}}');
  const [filenameError, setFilenameError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [missingImageBehavior, setMissingImageBehavior] = useState('fail');

  // Calculate missing variables
  const missingVariables = extractedVariables && csvPreview
    ? extractedVariables.text.filter(variable => 
        !csvPreview.headers.includes(variable)
      )
    : [];

  // Extract CSV image values
  const csvImageValues = csvPreview && extractedVariables
    ? [...new Set(
        csvPreview.data.flatMap(row => 
          extractedVariables.images.map(imgVar => row[imgVar]).filter(Boolean)
        )
      )]
    : [];

  return {
    templateFile,
    setTemplateFile,
    csvFile,
    setCsvFile,
    uploadedImages,
    setUploadedImages,
    error,
    setError,
    extractedVariables,
    setExtractedVariables,
    csvPreview,
    setCsvPreview,
    filenameTemplate,
    setFilenameTemplate,
    filenameError,
    setFilenameError,
    isExtracting,
    setIsExtracting,
    missingImageBehavior,
    setMissingImageBehavior,
    missingVariables,
    csvImageValues,
  };
}
