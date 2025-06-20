import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { CsvPreview } from '@/types/files';
import type { NavigateFunction } from 'react-router-dom';
import { withRetry } from '@/lib/retry';

type SetJobProgress = (progress: { value: number; message: string } | null) => void;

interface ExtractedFiles {
  template?: { file: File; name: string };
  csv?: { file: File; name: string; data: any[] };
  images: Record<string, File>;
}

interface ZipJobCreationParams {
    extractedFiles: ExtractedFiles;
    user: User;
    csvPreview: CsvPreview;
    filenameTemplate: string;
    missingImageBehavior?: string;
    setJobProgress: SetJobProgress;
    navigate: NavigateFunction;
}

export async function createZipJob({
    extractedFiles,
    user,
    csvPreview,
    filenameTemplate,
    missingImageBehavior = 'placeholder',
    setJobProgress,
    navigate,
}: ZipJobCreationParams) {
    if (!extractedFiles.template || !extractedFiles.csv) {
        throw new Error('Missing required template or CSV file');
    }

    console.log('🚀 Starting ZIP job creation with extracted files:', {
        templateName: extractedFiles.template.name,
        csvName: extractedFiles.csv.name,
        imageCount: Object.keys(extractedFiles.images).length,
        csvRows: csvPreview.data.length,
        missingImageBehavior
    });

    // 1. Upload Template
    setJobProgress({ value: 5, message: `Uploading template file...` });
    const templateExt = extractedFiles.template.name.split('.').pop() || 'pptx';
    const templateFileName = `${crypto.randomUUID()}.${templateExt}`;
    const templatePath = `${user.id}/${templateFileName}`;
    
    console.log('📄 Uploading template to:', templatePath);
    
    await withRetry(async () => {
        const { error } = await supabase.storage
            .from('templates')
            .upload(templatePath, extractedFiles.template!.file);
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Template upload failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 5, message: `Template upload failed. Retrying... (${attempt}/3)` });
        },
    });

    // 2. Insert Template record
    setJobProgress({ value: 15, message: 'Saving template record...' });
    const { data: templateData } = await withRetry(async () => {
        const { data, error } = await supabase
            .from('templates')
            .insert({ user_id: user.id, filename: extractedFiles.template!.name, storage_path: templatePath })
            .select('id')
            .single();

        if (error) throw error;
        if (!data) throw new Error("Could not retrieve template ID after insert.");
        return { data };
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Template DB insert failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 15, message: `DB operation failed. Retrying... (${attempt}/3)` });
        }
    });

    console.log('✅ Template record created with ID:', templateData.id);

    // 3. Upload CSV
    setJobProgress({ value: 25, message: `Uploading data file...` });
    const csvExt = extractedFiles.csv.name.split('.').pop() || 'csv';
    const csvFileName = `${crypto.randomUUID()}.${csvExt}`;
    const csvPath = `${user.id}/${csvFileName}`;
    
    console.log('📊 Uploading CSV to:', csvPath);
    
    await withRetry(async () => {
        const { error } = await supabase.storage
            .from('csv_files')
            .upload(csvPath, extractedFiles.csv!.file);
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`CSV upload failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 25, message: `CSV upload failed. Retrying... (${attempt}/3)` });
        },
    });

    // 4. Insert CSV record
    setJobProgress({ value: 35, message: 'Saving data record...' });
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
            setJobProgress({ value: 35, message: `DB operation failed. Retrying... (${attempt}/3)` });
        }
    });

    console.log('✅ CSV record created with ID:', csvData.id);

    // 5. Upload Images using STANDARDIZED path: {user_id}/{template_id}/{filename}
    const imageCount = Object.keys(extractedFiles.images).length;
    let uploadedImages = 0;
    
    console.log(`🖼️ Starting upload of ${imageCount} images using standardized path format`);

    for (const [filename, file] of Object.entries(extractedFiles.images)) {
        setJobProgress({ 
            value: 35 + Math.round((uploadedImages / imageCount) * 40), 
            message: `Uploading image ${uploadedImages + 1}/${imageCount}: ${filename}` 
        });

        // CRITICAL: Use standardized path format for consistent retrieval
        const imagePath = `${user.id}/${templateData.id}/${filename}`;
        
        console.log(`📸 Uploading image "${filename}" to standardized path:`, imagePath);
        
        await withRetry(async () => {
            const { error } = await supabase.storage
                .from('images')
                .upload(imagePath, file);
            if (error) throw error;
        }, {
            onRetry: (error, attempt) => {
                console.warn(`Image upload failed on attempt ${attempt}:`, error.message);
                setJobProgress({ 
                    value: 35 + Math.round((uploadedImages / imageCount) * 40), 
                    message: `Image upload failed. Retrying... (${attempt}/3)` 
                });
            },
        });

        console.log(`✅ Successfully uploaded image "${filename}" to path:`, imagePath);
        uploadedImages++;
    }

    console.log(`🎉 All ${imageCount} images uploaded successfully using standardized paths`);

    // 6. Insert Job record with missing_image_behavior
    setJobProgress({ value: 85, message: 'Creating job...' });
    await withRetry(async () => {
        const { error } = await supabase
            .from('jobs')
            .insert({
                user_id: user.id,
                template_id: templateData.id,
                csv_id: csvData.id,
                filename_template: filenameTemplate,
                missing_image_behavior: missingImageBehavior,
            });
        if (error) throw error;
    }, {
        onRetry: (error, attempt) => {
            console.warn(`Job DB insert failed on attempt ${attempt}:`, error.message);
            setJobProgress({ value: 85, message: `Job creation failed. Retrying... (${attempt}/3)` });
        }
    });
    
    console.log('✅ Job record created successfully with missing_image_behavior:', missingImageBehavior);
    
    // 7. Trigger edge function to start processing immediately
    setJobProgress({ value: 95, message: 'Triggering processing...' });
    supabase.functions.invoke('process-presentation-jobs').catch(err => {
        console.error("Error triggering job processing immediately:", err);
    });
    
    setJobProgress({ value: 100, message: 'Job queued successfully!' });
    
    setTimeout(() => navigate('/dashboard'), 2000);
}
