
import React from 'react';
import { Progress } from './ui/progress';

interface JobCreationProgressProps {
  progress: number;
  message: string;
}

export function JobCreationProgress({ progress, message }: JobCreationProgressProps) {
  return (
    <div className="w-full flex-grow flex flex-col items-center justify-center gap-3 animate-in fade-in px-4">
      <div className="w-full flex items-center gap-4">
        <Progress value={progress} className="w-full" />
        <span className="text-sm font-semibold text-muted-foreground w-12 text-right">{progress}%</span>
      </div>
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}
