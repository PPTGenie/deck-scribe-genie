
import { serve } from 'https://deno.land/std@0.212.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.212.0/csv/mod.ts';
import PizZip from 'https://esm.sh/pizzip@3.1.5';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.1';
import * as fflate from 'https://esm.sh/fflate@0.8.2';

const logPrefix = (jobId: string) => `[job:${jobId}]`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Add filename normalization helper to match frontend logic
const normalizeFilename = (filename: string): string => {
  return filename.toLowerCase().replace(/\.jpeg$/i, '.jpg');
};

const renderTemplate = (template: string, data: Record<string, string>): string => {
  if (!template) return "";
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] || "");
};

const sanitizeFilename = (filename: string): string => {
  const withoutDiacritics = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const withReplacements = withoutDiacritics
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L');

  // eslint-disable-next-line no-control-regex
  const invalidCharsRegex = /[<>:"/\\|?*`!^~[\]{}';=,+]|[\x00-\x1F]/g;
  const reservedNamesRegex = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

  let sanitized = withReplacements
    .replace(invalidCharsRegex, '')
    .replace(/\s+/g, ' ')
    .trim();

  sanitized = sanitized.replace(/^\.+|\.+$/g, '');

  if (reservedNamesRegex.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  sanitized = sanitized.slice(0, 200);

  return sanitized;
};

const updateProgress = async (supabaseAdmin: any, jobId: string, progress: number, step: string) => {
  console.log(`${logPrefix(jobId)} ${step} (${progress}%)`);
  await supabaseAdmin.from('jobs').update({ progress }).eq('id', jobId);
};

// Optimized batch processing function
const processPresentationsBatch = async (
  supabaseAdmin: any,
  job: any,
  templateData: ArrayBuffer,
  parsedCsv: Record<string, string>[],
  batchSize: number = 5
) => {
  const outputPaths: string[] = [];
  const usedFilenames = new Set<string>();
  const processingErrors: string[] = [];
  let successfulPresentations = 0;

  // Process in smaller batches to avoid timeout
  for (let i = 0; i < parsedCsv.length; i += batchSize) {
    const batch = parsedCsv.slice(i, i + batchSize);
    const batchStart = i;
    
    console.log(`${logPrefix(job.id)} 📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parsedCsv.length/batchSize)} (rows ${i + 1}-${Math.min(i + batchSize, parsedCsv.length)})`);
    
    for (const [batchIndex, row] of batch.entries()) {
      const globalIndex = batchStart + batchIndex;
      const baseProgress = 10;
      const processingProgress = 70;
      const currentProgress = baseProgress + Math.round((globalIndex / parsedCsv.length) * processingProgress);
      
      await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${globalIndex + 1} of ${parsedCsv.length}...`);

      try {
        console.log(`${logPrefix(job.id)} 🔄 PROCESSING PRESENTATION ${globalIndex + 1}/${parsedCsv.length}`);
        
        // Create fresh zip instance for each presentation
        const zip = new PizZip(new Uint8Array(templateData));
        
        // Use simple docxtemplater without image module to avoid complexity
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{{', end: '}}' },
          nullGetter: () => "",
        });

        console.log(`${logPrefix(job.id)} 🎨 RENDERING with row data`);
        doc.render(row);
        
        const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
        
        // Generate filename
        let outputFilename;
        if (job.filename_template) {
          const renderedName = renderTemplate(job.filename_template, row);
          const sanitized = sanitizeFilename(renderedName);
          outputFilename = sanitized + '.pptx';
        }

        if (!outputFilename || outputFilename === '.pptx') {
          outputFilename = `presentation_${globalIndex + 1}.pptx`;
        }

        let finalFilename = outputFilename;
        let duplicateCount = 1;
        while (usedFilenames.has(finalFilename)) {
          const nameWithoutExt = outputFilename.replace(/\.pptx$/, '');
          finalFilename = `${nameWithoutExt}_${duplicateCount}.pptx`;
          duplicateCount++;
        }
        usedFilenames.add(finalFilename);
        
        const outputPath = `${job.user_id}/${job.id}/${finalFilename}`;
        
        console.log(`${logPrefix(job.id)} ⬆️ UPLOADING: ${outputPath} (${generatedBuffer.length} bytes)`);
        const { error: uploadError } = await supabaseAdmin.storage
            .from('outputs')
            .upload(outputPath, generatedBuffer, { 
              upsert: true, 
              contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
            });
            
        if (uploadError) throw new Error(`Failed to upload generated file for row ${globalIndex + 1}: ${uploadError.message}`);
        
        outputPaths.push(outputPath);
        successfulPresentations++;
        console.log(`${logPrefix(job.id)} ✅ SUCCESSFULLY PROCESSED presentation ${globalIndex + 1}/${parsedCsv.length}`);
        
      } catch (error: any) {
        console.error(`${logPrefix(job.id)} ❌ ERROR processing row ${globalIndex + 1}:`, error);
        processingErrors.push(`Row ${globalIndex + 1}: ${error.message}`);
        
        if (job.missing_image_behavior === 'fail') {
          throw new Error(`Processing failed at row ${globalIndex + 1}: ${error.message}`);
        }
      }
    }
    
    // Small delay between batches to prevent overwhelming the system
    if (i + batchSize < parsedCsv.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { outputPaths, successfulPresentations, processingErrors };
};

serve(async (req) => {
  console.log(`🚀 PROCESS-PRESENTATION-JOBS FUNCTION INVOKED at: ${new Date().toISOString()}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // CRITICAL FIX: Use service role key for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // --- 1. Atomically Claim a Job ---
  const { data: job, error: claimError } = await supabaseAdmin
    .from('jobs')
    .update({ status: 'processing' })
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .select(`
      *,
      templates(storage_path, user_id),
      csv_uploads(storage_path, rows_count)
    `)
    .single();

  if (claimError || !job) {
    if (claimError && claimError.code !== 'PGRST116') {
      console.error('Error claiming job:', claimError);
    }
    return new Response(JSON.stringify({ message: 'No queued jobs found.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  console.log(`${logPrefix(job.id)} 🎯 CLAIMED JOB SUCCESSFULLY`);
  console.log(`${logPrefix(job.id)} 📋 Job details:`, {
    jobId: job.id,
    userId: job.templates.user_id,
    templateId: job.template_id,
    missingImageBehavior: job.missing_image_behavior
  });
  
  const storageClient = supabaseAdmin;

  try {
    // --- 2. Download Template and CSV Files ---
    await updateProgress(supabaseAdmin, job.id, 1, 'Downloading template file...');
    
    const [templateFile, csvFile] = await Promise.all([
      storageClient.storage.from('templates').download(job.templates.storage_path),
      storageClient.storage.from('csv_files').download(job.csv_uploads.storage_path),
    ]);

    if (templateFile.error) throw new Error(`Failed to download template: ${templateFile.error.message}`);
    if (csvFile.error) throw new Error(`Failed to download CSV: ${csvFile.error.message}`);

    await updateProgress(supabaseAdmin, job.id, 3, 'Files downloaded, parsing CSV...');

    const templateData = await templateFile.data.arrayBuffer();
    const csvData = await csvFile.data.text();
    
    const allRows = parse(csvData, { skipFirstRow: false }) as string[][];

    if (allRows.length < 2) {
      throw new Error('CSV file requires a header row and at least one data row.');
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    const parsedCsv: Record<string, string>[] = dataRows.map((row, rowIndex) => {
      if (row.length !== headers.length) {
        console.warn(`${logPrefix(job.id)} ⚠️ Row ${rowIndex + 2} has ${row.length} columns, but header has ${headers.length}`);
      }
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header.trim()] = row[index] || '';
      });
      return rowData;
    });
    
    const totalRows = parsedCsv.length;
    console.log(`${logPrefix(job.id)} ✅ Successfully parsed ${totalRows} data rows`);
    console.log(`${logPrefix(job.id)} 📊 CSV headers:`, headers);

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Process Presentations in Optimized Batches ---
    const batchSize = Math.min(5, Math.max(1, Math.floor(20 / totalRows))); // Adaptive batch size
    console.log(`${logPrefix(job.id)} 📦 Using batch size: ${batchSize}`);
    
    const { outputPaths, successfulPresentations, processingErrors } = await processPresentationsBatch(
      supabaseAdmin, 
      job, 
      templateData, 
      parsedCsv,
      batchSize
    );

    // Verify we have successful presentations
    if (outputPaths.length === 0) {
      throw new Error('No presentations were successfully generated. All rows failed processing.');
    }

    console.log(`${logPrefix(job.id)} 📊 PROCESSING SUMMARY: ${successfulPresentations}/${totalRows} presentations successful`);

    // --- 4. Create and Upload ZIP Archive ---
    await updateProgress(supabaseAdmin, job.id, 85, `Creating ZIP with ${outputPaths.length} presentations...`);
    
    const zipPath = `${job.user_id}/${job.id}/presentations.zip`;
    
    const filesToZip = await Promise.all(
      outputPaths.map(async (p) => {
        const { data, error } = await storageClient.storage.from('outputs').download(p);
        if (error) throw new Error(`Failed to download ${p} for zipping: ${error.message}`);
        if (!data) throw new Error(`No data for ${p} when zipping`);
        const content = await data.arrayBuffer();
        return {
          path: p.split('/').pop()!,
          data: new Uint8Array(content),
        };
      })
    );

    await updateProgress(supabaseAdmin, job.id, 90, `Compressing ${filesToZip.length} files into ZIP...`);

    const filesToZipObj: { [key: string]: Uint8Array } = {};
    for (const file of filesToZip) {
        filesToZipObj[file.path] = file.data;
    }

    const zippedData = fflate.zipSync(filesToZipObj);

    await updateProgress(supabaseAdmin, job.id, 93, 'Uploading ZIP file...');

    const zipUploadResponse = await storageClient.storage
      .from('outputs')
      .upload(zipPath, zippedData, { upsert: true, contentType: 'application/zip' });

    if (zipUploadResponse.error) throw new Error(`Failed to upload ZIP file: ${zipUploadResponse.error.message}`);

    // --- 5. Finalize Job ---
    await updateProgress(supabaseAdmin, job.id, 97, 'Finalizing job...');
    
    const finalErrorMessage = processingErrors.length > 0 
      ? `Completed with ${processingErrors.length} processing warnings` 
      : null;
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'done',
        progress: 100,
        output_zip: zipPath,
        finished_at: new Date().toISOString(),
        error_msg: finalErrorMessage,
      })
      .eq('id', job.id);

    console.log(`${logPrefix(job.id)} 🎉 JOB COMPLETED SUCCESSFULLY: ${successfulPresentations}/${totalRows} presentations`);

    return new Response(JSON.stringify({ 
      message: `Job ${job.id} completed: ${successfulPresentations}/${totalRows} presentations.`,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`${logPrefix(job.id)} 💥 CRITICAL ERROR occurred:`, error);
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'error',
        error_msg: error.message,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
