
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createJob } from '@/services/jobCreationService';
import type { CsvPreview } from '@/types/files';

interface useJobCreationProps {
    templateFile: File | null;
    csvFile: File | null;
    csvPreview: CsvPreview | null;
    filenameTemplate: string;
    filenameError: string | null;
}

export function useJobCreation({
    templateFile,
    csvFile,
    csvPreview,
    filenameTemplate,
    filenameError,
}: useJobCreationProps) {
    const [isStartingJob, setIsStartingJob] = useState(false);
    const [jobProgress, setJobProgress] = useState<{ value: number; message: string } | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleStartJob = async () => {
        if (!templateFile || !csvFile || !user || !csvPreview || !filenameTemplate || !!filenameError) {
            toast.error("Missing required files, user session, or invalid filename template. Please check your inputs.");
            return;
        }

        setIsStartingJob(true);
        setJobProgress({ value: 0, message: 'Initiating job...' });
        const jobToast = toast.loading("Queuing your batch job...");

        try {
            await createJob({
                templateFile,
                csvFile,
                user,
                csvPreview,
                filenameTemplate,
                setJobProgress,
                navigate,
            });
            toast.success("Job successfully queued! Redirecting to dashboard...", { id: jobToast, duration: 3000 });
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.", { id: jobToast });
            setIsStartingJob(false);
            setJobProgress(null);
        }
    };
    
    return { isStartingJob, jobProgress, handleStartJob };
}
