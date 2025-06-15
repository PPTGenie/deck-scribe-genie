
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, Upload, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFile {
  file: File;
  preview: string;
  normalized: string; // normalized filename for matching
}

interface ImageUploadStepProps {
  uploadedImages: ImageFile[];
  setUploadedImages: (images: ImageFile[]) => void;
  requiredImages: string[]; // from template variables
  csvImageValues: string[]; // actual values from CSV *_img columns
  error: string | null;
  setError: (error: string | null) => void;
}

const ACCEPTED_IMAGE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image

export function ImageUploadStep({
  uploadedImages,
  setUploadedImages,
  requiredImages,
  csvImageValues,
  error,
  setError,
}: ImageUploadStepProps) {
  
  const normalizeFilename = (filename: string): string => {
    return filename.toLowerCase().replace(/\.(jpeg)$/i, '.jpg');
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => f.errors[0]?.message).join(', ');
      setError(`Some files were rejected: ${reasons}`);
      return;
    }

    const newImages: ImageFile[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      normalized: normalizeFilename(file.name),
    }));

    setUploadedImages([...uploadedImages, ...newImages]);
  }, [uploadedImages, setUploadedImages, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setUploadedImages(newImages);
  };

  // Check which required images are missing
  const uploadedFilenames = uploadedImages.map(img => img.normalized);
  const missingImages = csvImageValues.filter(csvValue => {
    const normalizedCsvValue = normalizeFilename(csvValue);
    return !uploadedFilenames.includes(normalizedCsvValue);
  });

  const extraImages = uploadedImages.filter(img => {
    return !csvImageValues.some(csvValue => normalizeFilename(csvValue) === img.normalized);
  });

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertTitle>Image Upload Instructions</AlertTitle>
        <AlertDescription>
          Upload images that match the filenames in your CSV. Image filenames will be normalized to lowercase and .jpeg will be treated as .jpg.
          {requiredImages.length > 0 && (
            <div className="mt-2">
              <strong>Required image columns:</strong> {requiredImages.join(', ')}
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent transition-all duration-200',
          isDragActive && 'border-primary bg-accent animate-pulse',
          error && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <Upload className={cn("w-10 h-10 mb-3 text-muted-foreground", isDragActive && "text-primary")} />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload images</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, JPEG, SVG (max 10MB each)
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Status */}
      {csvImageValues.length > 0 && (
        <div className="space-y-4">
          {missingImages.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Images</AlertTitle>
              <AlertDescription>
                The following images are referenced in your CSV but not uploaded:
                <div className="flex flex-wrap gap-2 mt-2">
                  {missingImages.map(img => (
                    <code key={img} className="text-xs bg-destructive/20 px-2 py-1 rounded">
                      {img}
                    </code>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {extraImages.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Extra Images</AlertTitle>
              <AlertDescription>
                These uploaded images are not referenced in your CSV and will be ignored:
                <div className="flex flex-wrap gap-2 mt-2">
                  {extraImages.map(img => (
                    <code key={img.normalized} className="text-xs bg-muted px-2 py-1 rounded">
                      {img.file.name}
                    </code>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Uploaded Images ({uploadedImages.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((image, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-2">
                  <div className="aspect-square relative mb-2">
                    <img
                      src={image.preview}
                      alt={image.file.name}
                      className="w-full h-full object-cover rounded"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-center">
                    <div className="font-medium truncate" title={image.file.name}>
                      {image.file.name}
                    </div>
                    <div className="text-muted-foreground">
                      {(image.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    {csvImageValues.includes(image.normalized) && (
                      <div className="text-green-600 font-medium">✓ Required</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
