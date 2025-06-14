
import React, { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
    accept: Accept;
    maxSize: number;
    label: string;
    fileTypeDescription: string;
}

export function FileUpload({ onFileSelect, accept, maxSize, label, fileTypeDescription }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      onFileSelect([]);
      return;
    }
    
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center w-full h-36 md:h-48 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent transition-all duration-200 ease-in-out',
        isDragActive && !isDragReject && 'border-primary scale-105 bg-accent animate-pulse',
        isDragReject && 'border-destructive bg-destructive/10'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center animate-in fade-in">
        <UploadCloud className={cn("w-10 h-10 mb-3 text-muted-foreground", isDragActive && !isDragReject && "text-primary")} />
        <p className="mb-2 text-sm text-muted-foreground">
          {isDragReject ? (
            <span className="font-semibold text-destructive">Invalid file type or size</span>
          ) : (
            <span className="font-semibold">{label}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
            {fileTypeDescription}, max {maxSize / 1024 / 1024}MB.
        </p>
      </div>
    </div>
  );
}
