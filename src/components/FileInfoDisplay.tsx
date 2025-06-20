
import React from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileInfoDisplayProps {
  file: File;
  onRemove?: () => void;
  title?: string;
  icon?: string;
  extraInfo?: string;
}

const getFileSize = (size: number) => {
    if (size / 1024 / 1024 < 0.01) {
      return `${Math.ceil(size / 1024)} KB`;
    }
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

export function FileInfoDisplay({ file, onRemove, title, icon, extraInfo }: FileInfoDisplayProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground">
      <div className="flex items-center gap-3 overflow-hidden">
        {icon ? (
          <span className="text-lg flex-shrink-0">{icon}</span>
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-grow overflow-hidden">
          {title && <p className="text-sm font-medium text-muted-foreground">{title}</p>}
          <p className="font-medium truncate" title={file.name}>{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {getFileSize(file.size)}
            {extraInfo && ` • ${extraInfo}`}
          </p>
        </div>
      </div>
      {onRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} className="flex-shrink-0 ml-2">
          <X className="h-4 w-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      )}
    </div>
  );
}
