
import React, { useCallback } from 'react';
import JSZip from 'jszip';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, X, Loader2, AlertTriangle } from 'lucide-react';
import { extractTemplateVariables } from '@/lib/pptx';
import Papa from 'papaparse';
import type { TemplateVariables } from '@/types/files';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = {
  'application/zip': ['.zip'],
};

interface ExtractedFiles {
  template?: { file: File; name: string };
  csv?: { file: File; name: string; data: any[] };
  images: Record<string, File>;
}

interface ZipUploadStepProps {
  zipFile: File | null;
  setZipFile: (file: File | null) => void;
  extractedFiles: ExtractedFiles | null;
  setExtractedFiles: (files: ExtractedFiles | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  extractedVariables: TemplateVariables | null;
  setExtractedVariables: (variables: TemplateVariables | null) => void;
  isExtracting: boolean;
  setIsExtracting: (isExtracting: boolean) => void;
}

export function ZipUploadStep({
  zipFile,
  setZipFile,
  extractedFiles,
  setExtractedFiles,
  error,
  setError,
  extractedVariables,
  setExtractedVariables,
  isExtracting,
  setIsExtracting,
}: ZipUploadStepProps) {

  const extractZipContents = useCallback(async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setExtractedFiles(null);
    setExtractedVariables(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const files: ExtractedFiles = { images: {} };
      const entries = Object.entries(contents.files);

      // Process each file in the ZIP
      for (const [path, zipEntry] of entries) {
        if (zipEntry.dir) continue; // Skip directories

        const fileName = path.split('/').pop() || '';
        const fileExtension = fileName.toLowerCase().split('.').pop();

        if (fileExtension === 'pptx') {
          const arrayBuffer = await zipEntry.async('arraybuffer');
          const templateFile = new File([arrayBuffer], fileName, {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          });
          files.template = { file: templateFile, name: fileName };
          
          // Extract variables from template
          const variables = await extractTemplateVariables(templateFile);
          setExtractedVariables(variables);
        } 
        else if (fileExtension === 'csv') {
          const text = await zipEntry.async('text');
          const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
          
          if (parseResult.errors.length > 0) {
            throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
          }

          const csvFile = new File([text], fileName, { type: 'text/csv' });
          files.csv = { 
            file: csvFile, 
            name: fileName, 
            data: parseResult.data as any[]
          };
        }
        else if (['png', 'jpg', 'jpeg', 'svg'].includes(fileExtension || '')) {
          const arrayBuffer = await zipEntry.async('arraybuffer');
          const mimeType = fileExtension === 'svg' ? 'image/svg+xml' : `image/${fileExtension}`;
          const imageFile = new File([arrayBuffer], fileName, { type: mimeType });
          files.images[fileName] = imageFile;
        }
      }

      // Validate required files
      if (!files.template) {
        throw new Error('No .pptx template found in ZIP file');
      }
      if (!files.csv) {
        throw new Error('No .csv data file found in ZIP file');
      }

      setExtractedFiles(files);
    } catch (err: any) {
      setError(err.message || 'Failed to extract ZIP contents');
    } finally {
      setIsExtracting(false);
    }
  }, [setError, setExtractedFiles, setExtractedVariables, setIsExtracting]);

  const handleFileChange = async (files: File[]) => {
    setError(null);
    setZipFile(null);

    const file = files[0];
    if (!file) {
      setError("Invalid file. We only accept .zip files under 50MB.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 50MB. Please select a smaller file.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Invalid file type. We only accept .zip files.');
      return;
    }

    setZipFile(file);
    await extractZipContents(file);
  };

  const removeFile = () => {
    setZipFile(null);
    setError(null);
    setExtractedFiles(null);
    setExtractedVariables(null);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>ZIP File Structure</AlertTitle>
        <AlertDescription>
          Your ZIP file should contain:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>One .pptx template file with placeholders like {'{{name}}'} and {'{{logo_img}}'}</li>
            <li>One .csv data file with headers matching your template variables</li>
            <li>Image files (.png, .jpg, .jpeg, .svg) referenced in your CSV</li>
          </ul>
        </AlertDescription>
      </Alert>

      {zipFile && extractedFiles ? (
        <div className="w-full animate-in fade-in duration-300 space-y-4">
          <Alert className="border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200 [&>svg]:text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>ZIP File Extracted Successfully</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                {zipFile.name} (
                {(zipFile.size / 1024 / 1024) < 0.01
                  ? `${Math.ceil(zipFile.size / 1024)} KB`
                  : `${(zipFile.size / 1024 / 1024).toFixed(2)} MB`}
                )
              </span>
              <Button variant="ghost" size="icon" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">✓ Template</h4>
              <p className="text-sm">{extractedFiles.template?.name}</p>
              {extractedVariables && (
                <p className="text-xs text-muted-foreground mt-1">
                  {extractedVariables.text.length + extractedVariables.images.length} variables found
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">✓ Data</h4>
              <p className="text-sm">{extractedFiles.csv?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {extractedFiles.csv?.data.length} rows
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">✓ Images</h4>
              <p className="text-sm">{Object.keys(extractedFiles.images).length} files</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(extractedFiles.images).join(', ')}
              </p>
            </div>
          </div>

          {isExtracting && (
            <div className="flex items-center gap-2 text-muted-foreground p-2 animate-in fade-in">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing ZIP contents...</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <FileUpload
            onFileSelect={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            maxSize={MAX_FILE_SIZE}
            label="Drag and drop your .zip file here, or click to select"
            fileTypeDescription="ZIP only"
          />
          {isExtracting && (
            <div className="flex items-center gap-2 text-muted-foreground p-2 mt-4 animate-in fade-in">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Extracting ZIP contents...</span>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
