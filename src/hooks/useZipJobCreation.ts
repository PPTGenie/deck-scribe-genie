
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createZipJob } from '@/services/zipJobCreationService';
import type { CsvPreview } from '@/types/files';

interface useZipJobCreationProps {
    extractedFiles: {
        template?: File;
        csv?: File;
        images: { [key: string]: File };
    } | null;
    csvPreview: CsvPreview | null;
    filenameTemplate: string;
    filenameError: string | null;
}

export function useZipJobCreation({
    extractedFiles,
    csvPreview,
    filenameTemplate,
    filenameError,
}: useZipJobCreationProps) {
    const [isStartingJob, setIsStartingJob] = useState(false);
    const [jobProgress, setJobProgress] = useState<{ value: number; message: string } | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleStartJob = async () => {
        if (!extractedFiles?.template || !extractedFiles?.csv || !user || !csvPreview || !filenameTemplate || !!filenameError) {
            toast.error("Missing required files, user session, or invalid filename template. Please check your inputs.");
            return;
        }

        setIsStartingJob(true);
        setJobProgress({ value: 0, message: 'Initiating job...' });
        
        try {
            await createZipJob({
                extractedFiles,
                user,
                csvPreview,
                filenameTemplate,
                setJobProgress,
                navigate,
            });
            toast.success("Job successfully queued! Redirecting to dashboard...", { duration: 3000 });
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.");
            setIsStartingJob(false);
            setJobProgress(null);
        }
    };
    
    return { isStartingJob, jobProgress, handleStartJob };
}
