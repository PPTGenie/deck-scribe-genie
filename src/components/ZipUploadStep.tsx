
import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, Archive, CheckCircle2, Loader2, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TemplateVariables } from '@/types/files';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for ZIP files
const ACCEPTED_FILE_TYPES = {
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

interface ZipUploadStepProps {
  zipFile: File | null;
  setZipFile: (file: File | null) => void;
  extractedFiles: {
    template?: File;
    csv?: File;
    images: { [key: string]: File };
  } | null;
  setExtractedFiles: (files: any) => void;
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
  setIsExtracting
}: ZipUploadStepProps) {
  const [extractionProgress, setExtractionProgress] = useState('');

  const normalizeImageFilename = (filename: string): string => {
    return filename.toLowerCase()
      .replace(/\.jpeg$/i, '.jpg')
      .replace(/\.png$/i, '.png')
      .replace(/\.jpg$/i, '.jpg');
  };

  const extractZipContents = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setExtractionProgress('Reading ZIP file...');

    try {
      // Dynamic import to load JSZip
      const JSZip = (await import('jszip')).default;
      
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const extracted: {
        template?: File;
        csv?: File;
        images: { [key: string]: File };
      } = {
        images: {}
      };

      setExtractionProgress('Processing files...');

      for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
        if (zipEntry.dir) continue;

        const filename = relativePath.split('/').pop()?.toLowerCase() || '';
        
        // Skip hidden files and system files
        if (filename.startsWith('.') || filename.includes('__MACOSX')) {
          continue;
        }

        const blob = await zipEntry.async('blob');
        const extractedFile = new File([blob], filename);

        // Categorize files
        if (filename.endsWith('.pptx')) {
          if (extracted.template) {
            throw new Error('ZIP contains multiple .pptx files. Please include only one template.');
          }
          extracted.template = extractedFile;
        } else if (filename.endsWith('.csv')) {
          if (extracted.csv) {
            throw new Error('ZIP contains multiple .csv files. Please include only one data file.');
          }
          extracted.csv = extractedFile;
        } else if (filename.match(/\.(png|jpg|jpeg)$/i)) {
          const normalizedName = normalizeImageFilename(filename);
          extracted.images[normalizedName] = extractedFile;
        }
      }

      // Validate required files
      if (!extracted.template) {
        throw new Error('ZIP must contain a .pptx template file.');
      }
      if (!extracted.csv) {
        throw new Error('ZIP must contain a .csv data file.');
      }

      setExtractionProgress('Analyzing template variables...');

      // Extract variables from template
      const { extractTemplateVariables } = await import('@/lib/pptx');
      const variables = await extractTemplateVariables(extracted.template);
      
      setExtractedFiles(extracted);
      setExtractedVariables(variables);
      setExtractionProgress('');

    } catch (e: any) {
      console.error('ZIP extraction error:', e);
      setError(e.message || 'Failed to extract ZIP file contents.');
      setExtractionProgress('');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (files: File[]) => {
    setError(null);
    setZipFile(null);
    setExtractedFiles(null);
    setExtractedVariables(null);

    const file = files[0];
    if (!file) {
      setError("Invalid file. We only accept .zip files under 100MB.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 100MB. Please select a smaller file.');
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
    setExtractedFiles(null);
    setExtractedVariables(null);
    setError(null);
  };

  const imageVariables = extractedVariables?.images || [];
  const availableImages = Object.keys(extractedFiles?.images || {});
  const missingImages = imageVariables.filter(img => 
    !availableImages.some(available => 
      available.replace(/\.(png|jpg|jpeg)$/i, '') === img.replace(/_img$/, '')
    )
  );

  return (
    <div className="space-y-6">
      <Alert>
        <Archive className="h-4 w-4" />
        <AlertTitle>ZIP File Requirements</AlertTitle>
        <AlertDescription>
          Your ZIP should contain:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>One .pptx template file with placeholders</li>
            <li>One .csv data file</li>
            <li>Image files (PNG/JPG) in /images/ folder or root</li>
          </ul>
        </AlertDescription>
      </Alert>

      {zipFile ? (
        <div className="w-full animate-in fade-in duration-300 space-y-4">
          <Alert className="border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200 [&>svg]:text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>ZIP File Ready</AlertTitle>
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

          {isExtracting && (
            <div className="flex items-center gap-2 text-muted-foreground p-2 animate-in fade-in">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{extractionProgress || 'Extracting ZIP contents...'}</span>
            </div>
          )}

          {extractedFiles && !isExtracting && (
            <div className="space-y-4">
              <div className="rounded-md border bg-secondary p-4">
                <h3 className="font-semibold mb-3">Extracted Files</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Template</Badge>
                    <span className="text-sm">{extractedFiles.template?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Data</Badge>
                    <span className="text-sm">{extractedFiles.csv?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Image className="h-3 w-3 mr-1" />
                      Images
                    </Badge>
                    <span className="text-sm">{availableImages.length} files</span>
                  </div>
                </div>
              </div>

              {imageVariables.length > 0 && (
                <div className="rounded-md border bg-secondary p-4">
                  <h4 className="font-semibold mb-2">Image Mapping Status</h4>
                  <div className="space-y-2">
                    {imageVariables.map(variable => {
                      const expectedName = variable.replace(/_img$/, '');
                      const matchingImage = availableImages.find(img => 
                        img.replace(/\.(png|jpg|jpeg)$/i, '') === expectedName
                      );
                      
                      return (
                        <div key={variable} className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {`{{${variable}}}`}
                          </code>
                          {matchingImage ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              ✓ {matchingImage}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              ✗ Missing {expectedName}.(png|jpg)
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {missingImages.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Missing Images</AlertTitle>
                  <AlertDescription>
                    The following images are required but not found in your ZIP:
                    <div className="flex flex-wrap gap-1 mt-2">
                      {missingImages.map(img => (
                        <code key={img} className="text-xs font-semibold p-1 bg-red-200/50 rounded-sm">
                          {img.replace(/_img$/, '')}.(png|jpg)
                        </code>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
              {error}
            </p>
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
