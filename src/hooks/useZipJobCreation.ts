
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createZipJob } from '@/services/zipJobCreationService';
import type { CsvPreview } from '@/types/files';

interface ExtractedFiles {
  template?: { file: File; name: string };
  csv?: { file: File; name: string; data: any[] };
  images: Record<string, File>;
}

interface UseZipJobCreationParams {
  extractedFiles: ExtractedFiles | null;
  csvPreview: CsvPreview | null;
  filenameTemplate: string;
  filenameError: string | null;
  missingImageBehavior?: string;
}

export function useZipJobCreation({
  extractedFiles,
  csvPreview,
  filenameTemplate,
  filenameError,
  missingImageBehavior = 'placeholder'
}: UseZipJobCreationParams) {
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [jobProgress, setJobProgress] = useState<{ value: number; message: string } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartJob = async () => {
    if (!extractedFiles || !csvPreview || !user || filenameError) {
      return;
    }

    try {
      setIsStartingJob(true);
      await createZipJob({
        extractedFiles,
        user,
        csvPreview,
        filenameTemplate,
        missingImageBehavior,
        setJobProgress,
        navigate,
      });
    } catch (error: any) {
      console.error('Failed to create job:', error);
      setJobProgress({ value: 0, message: `Error: ${error.message}` });
    } finally {
      setIsStartingJob(false);
    }
  };

  return {
    isStartingJob,
    jobProgress,
    handleStartJob,
  };
}
