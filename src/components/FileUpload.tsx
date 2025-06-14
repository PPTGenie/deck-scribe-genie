
import React, { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
    accept: Accept;
    maxSize: number;
    label: string;
}

export function FileUpload({ onFileSelect, accept, maxSize, label }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileSelect(acceptedFiles);
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
        'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent',
        isDragActive && !isDragReject && 'border-primary',
        isDragReject && 'border-destructive'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
        <p className="mb-2 text-sm text-muted-foreground">
          {isDragReject ? (
            <span className="font-semibold text-destructive">Invalid file</span>
          ) : (
            <span className="font-semibold">{label}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
            Max file size: {maxSize / 1024 / 1024}MB.
        </p>
      </div>
    </div>
  );
}
