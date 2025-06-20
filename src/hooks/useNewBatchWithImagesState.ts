
import { useState, useEffect } from 'react';
import type { TemplateVariables, CsvPreview } from '@/types/files';
import { normalizeFilename } from '@/utils/filenameNormalization';

interface UploadedImage {
  file: File;
  normalized: string;
  preview: string;
}

export function useNewBatchWithImagesState() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<TemplateVariables | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [filenameTemplate, setFilenameTemplate] = useState('');
  const [filenameError, setFilenameError] = useState<string | null>('Filename template must contain at least one variable.');
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

  // Set default filename template when CSV preview is available
  useEffect(() => {
    if (csvPreview?.headers.length && !filenameTemplate) {
      const firstHeader = csvPreview.headers[0];
      const defaultTemplate = `{{${firstHeader}}}`;
      setFilenameTemplate(defaultTemplate);
      setFilenameError(null); // Clear error when setting valid default
      console.log('🏷️ Set default filename template:', defaultTemplate);
    }
  }, [csvPreview, filenameTemplate]);

  // Custom setter for uploaded images that ensures preview URLs are created
  const setUploadedImagesWithPreviews = (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => {
    if (typeof images === 'function') {
      setUploadedImages(prevImages => {
        const newImages = images(prevImages);
        // Ensure all images have preview URLs and normalized filenames
        return newImages.map(img => ({
          ...img,
          preview: img.preview || URL.createObjectURL(img.file),
          normalized: normalizeFilename(img.file.name)
        }));
      });
    } else {
      // Ensure all images have preview URLs and normalized filenames
      const imagesWithPreviews = images.map(img => ({
        ...img,
        preview: img.preview || URL.createObjectURL(img.file),
        normalized: normalizeFilename(img.file.name)
      }));
      setUploadedImages(imagesWithPreviews);
    }
  };

  return {
    templateFile,
    setTemplateFile,
    csvFile,
    setCsvFile,
    uploadedImages,
    setUploadedImages: setUploadedImagesWithPreviews,
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
