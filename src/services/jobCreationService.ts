
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { CsvPreview } from '@/types/files';
import type { NavigateFunction } from 'react-router-dom';

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
    
    const { error: templateUploadError } = await supabase.storage
        .from('templates')
        .upload(templatePath, templateFile);

    if (templateUploadError) throw new Error(`Template upload failed: ${templateUploadError.message}`);

    // 2. Insert Template record
    setJobProgress({ value: 25, message: 'Saving template record...' });
    const { data: templateData, error: templateInsertError } = await supabase
        .from('templates')
        .insert({ user_id: user.id, filename: templateFile.name, storage_path: templatePath })
        .select('id')
        .single();

    if (templateInsertError) throw new Error(`Failed to save template record: ${templateInsertError.message}`);
    if (!templateData) throw new Error("Could not retrieve template ID after insert.");

    // 3. Upload CSV
    setJobProgress({ value: 45, message: `Uploading data file: ${csvFile.name}` });
    const csvExt = csvFile.name.split('.').pop() || 'csv';
    const csvFileName = `${crypto.randomUUID()}.${csvExt}`;
    const csvPath = `${user.id}/${csvFileName}`;
    
    const { error: csvUploadError } = await supabase.storage
        .from('csv_files')
        .upload(csvPath, csvFile);

    if (csvUploadError) throw new Error(`CSV upload failed: ${csvUploadError.message}`);

    // 4. Insert CSV record
    setJobProgress({ value: 65, message: 'Saving data record...' });
    const { data: csvData, error: csvInsertError } = await supabase
        .from('csv_uploads')
        .insert({
            user_id: user.id,
            template_id: templateData.id,
            rows_count: csvPreview.data.length,
            storage_path: csvPath,
        })
        .select('id')
        .single();

    if (csvInsertError) throw new Error(`Failed to save CSV record: ${csvInsertError.message}`);
    if (!csvData) throw new Error("Could not retrieve CSV upload ID after insert.");

    // 5. Insert Job record
    setJobProgress({ value: 85, message: 'Creating job...' });
    const { error: jobInsertError } = await supabase
        .from('jobs')
        .insert({
            user_id: user.id,
            template_id: templateData.id,
            csv_id: csvData.id,
            filename_template: filenameTemplate,
        });

    if (jobInsertError) throw new Error(`Failed to create job record: ${jobInsertError.message}`);
    
    // 6. Trigger edge function to start processing immediately.
    setJobProgress({ value: 95, message: 'Triggering processing...' });
    supabase.functions.invoke('process-presentation-jobs').catch(err => {
        console.error("Error triggering job processing immediately:", err);
    });
    
    setJobProgress({ value: 100, message: 'Job queued successfully!' });
    
    setTimeout(() => navigate('/dashboard'), 2000);
}
