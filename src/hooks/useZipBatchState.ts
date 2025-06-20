
import { useState, useEffect } from 'react';
import type { CsvPreview, TemplateVariables } from '@/types/files';

interface ExtractedFiles {
  template?: { file: File; name: string };
  csv?: { file: File; name: string; data: any[] };
  images: Record<string, File>;
}

export function useZipBatchState() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariables | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [filenameTemplate, setFilenameTemplate] = useState<string>('');
  const [filenameError, setFilenameError] = useState<string | null>('Filename template must contain at least one variable.');

  // When ZIP file is cleared, also clear all extracted data
  useEffect(() => {
    if (!zipFile) {
      setExtractedFiles(null);
      setExtractedVariables(null);
      setCsvPreview(null);
      setMissingVariables([]);
      setFilenameTemplate('');
      setFilenameError('Filename template must contain at least one variable.');
    }
  }, [zipFile]);

  // Parse CSV when extracted files change
  useEffect(() => {
    if (extractedFiles?.csv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvContent = e.target?.result as string;
          if (!csvContent) return;

          const lines = csvContent.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            setError('CSV file must contain a header row and at least one data row.');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const dataRows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

          setCsvPreview({ headers, data: dataRows });
        } catch (err) {
          setError('Failed to parse CSV file. Please ensure it\'s properly formatted.');
        }
      };
      reader.readAsText(extractedFiles.csv.file);
    }
  }, [extractedFiles]);

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

  // FIXED: Set default filename template when CSV preview is available
  useEffect(() => {
    if (csvPreview?.headers.length && !filenameTemplate) {
      const firstHeader = csvPreview.headers[0];
      const defaultTemplate = `{{${firstHeader}}}`;
      setFilenameTemplate(defaultTemplate);
      setFilenameError(null); // Clear error when setting valid default
      console.log('🏷️ Set default filename template:', defaultTemplate);
    }
  }, [csvPreview, filenameTemplate]);
  
  return {
    zipFile, setZipFile,
    extractedFiles, setExtractedFiles,
    error, setError,
    extractedVariables, setExtractedVariables,
    isExtracting, setIsExtracting,
    csvPreview, setCsvPreview,
    missingVariables,
    filenameTemplate, setFilenameTemplate,
    filenameError, setFilenameError,
  };
}
