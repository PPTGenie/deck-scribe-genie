import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { CsvPreview } from '@/types/files';
import type { NavigateFunction } from 'react-router-dom';
import { withRetry } from '@/lib/retry';

type SetJobProgress = (progress: { value: number; message: string } | null) => void;

interface JobCreationParams {
    templateFile: File;
    csvFile: File;
    user: User;
    csvPreview: CsvPreview;
    filenameTemplate: string;
    setJobProgress: SetJobProgress;
    navigate: NavigateFunction;
}

export async function createJob({
    templateFile,
    csvFile,
    user,
    csvPreview,
    filenameTemplate,
    setJobProgress,
    navigate,
}: JobCreationParams) {
    // 1. Upload Template
    setJobProgress({ value: 10, message: `Uploading template: ${templateFile.name}` });
    const templateExt = templateFile.name.split('.').pop() || 'pptx';
    const templateFileName = `${crypto.randomUUID()}.${templateExt}`;
    const templatePath = `${user.id}/${templateFileName}`;
    
    await withRetry(async () => {
        const { error } = await supabase.storage
            .from('templates')
            .upload(templatePath, templateFile);
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Template upload failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 10, message: `Template upload failed. Retrying... (${attempt}/3)` });
        },
    });

    // 2. Insert Template record
    setJobProgress({ value: 25, message: 'Saving template record...' });
    const { data: templateData } = await withRetry(async () => {
        const { data, error } = await supabase
            .from('templates')
            .insert({ user_id: user.id, filename: templateFile.name, storage_path: templatePath })
            .select('id')
            .single();

        if (error) throw error;
        if (!data) throw new Error("Could not retrieve template ID after insert.");
        return { data };
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Template DB insert failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 25, message: `DB operation failed. Retrying... (${attempt}/3)` });
        }
    });

    // 3. Upload CSV
    setJobProgress({ value: 45, message: `Uploading data file: ${csvFile.name}` });
    const csvExt = csvFile.name.split('.').pop() || 'csv';
    const csvFileName = `${crypto.randomUUID()}.${csvExt}`;
    const csvPath = `${user.id}/${csvFileName}`;
    
    await withRetry(async () => {
        const { error } = await supabase.storage
            .from('csv_files')
            .upload(csvPath, csvFile);
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`CSV upload failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 45, message: `CSV upload failed. Retrying... (${attempt}/3)` });
        },
    });

    // 4. Insert CSV record
    setJobProgress({ value: 65, message: 'Saving data record...' });
    const { data: csvData } = await withRetry(async () => {
        const { data, error } = await supabase
            .from('csv_uploads')
            .insert({
                user_id: user.id,
                template_id: templateData.id,
                rows_count: csvPreview.data.length,
                storage_path: csvPath,
            })
            .select('id')
            .single();
        if (error) throw error;
        if (!data) throw new Error("Could not retrieve CSV upload ID after insert.");
        return { data };
    }, {
        onRetry: (error, attempt) => {
            console.warn(`CSV DB insert failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 65, message: `DB operation failed. Retrying... (${attempt}/3)` });
        }
    });

    // 5. Insert Job record
    setJobProgress({ value: 85, message: 'Creating job...' });
    await withRetry(async () => {
        const { error } = await supabase
            .from('jobs')
            .insert({
                user_id: user.id,
                template_id: templateData.id,
                csv_id: csvData.id,
                filename_template: filenameTemplate,
            });
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Job DB insert failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 85, message: `Job creation failed. Retrying... (${attempt}/3)` });
        }
    });
    
    // 6. Trigger edge function to start processing immediately.
    setJobProgress({ value: 95, message: 'Triggering processing...' });
    supabase.functions.invoke('process-presentation-jobs').catch(err => {
        console.error("Error triggering job processing immediately:", err);
    });
    
    setJobProgress({ value: 100, message: 'Job queued successfully!' });
    
    setTimeout(() => navigate('/dashboard'), 2000);
}
