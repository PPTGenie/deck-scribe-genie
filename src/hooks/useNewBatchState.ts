
import { useState, useEffect } from 'react';
import type { CsvPreview, TemplateVariables } from '@/types/files';

export function useNewBatchState() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariables | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [filenameTemplate, setFilenameTemplate] = useState<string>('');
  const [filenameError, setFilenameError] = useState<string | null>('Filename template must contain at least one variable.');

  // When template file is cleared, also clear extracted variables and csv data.
  useEffect(() => {
    if (!templateFile) {
      setExtractedVariables(null);
      setCsvFile(null);
      setCsvPreview(null);
      setMissingVariables([]);
    }
  }, [templateFile]);

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
  
  return {
    templateFile, setTemplateFile,
    csvFile, setCsvFile,
    error, setError,
    extractedVariables, setExtractedVariables,
    isExtracting, setIsExtracting,
    csvPreview, setCsvPreview,
    missingVariables,
    filenameTemplate, setFilenameTemplate,
    filenameError, setFilenameError,
  };
}
