
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

const renderTemplate = (template: string, data: Record<string, string>): string => {
  if (!template) return "";
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] || "");
};

const sanitizeFilename = (filename: string): string => {
  // 1. Normalize to NFD to separate base characters from diacritics
  // and remove the diacritics.
  const withoutDiacritics = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const withReplacements = withoutDiacritics
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L');

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

// Image processing helper - simplified version that replaces image placeholders with base64
const processImagePlaceholders = async (supabaseAdmin: any, userId: string, templateId: string, templateData: Uint8Array, rowData: Record<string, string>) => {
  const zip = new PizZip(templateData);
  
  // Get all files in the template
  const files = zip.files;
  
  for (const filename in files) {
    if (filename.includes('word/document.xml') || filename.includes('word/slides/')) {
      const file = files[filename];
      if (!file.dir) {
        let content = file.asText();
        
        // Look for image placeholders in the format {{variablename_img}}
        const imageRegex = /\{\{([^}]+_img)\}\}/g;
        let match;
        
        while ((match = imageRegex.exec(content)) !== null) {
          const placeholder = match[0];
          const variableName = match[1];
          const imageBaseName = variableName.replace(/_img$/, '');
          
          // Check if we have this image in the row data
          if (rowData[variableName]) {
            try {
              const normalizedFilename = rowData[variableName].toLowerCase()
                .replace(/\.jpeg$/i, '.jpg')
                .replace(/\.png$/i, '.png')
                .replace(/\.jpg$/i, '.jpg');

              const imagePath = `${userId}/${templateId}/${normalizedFilename}`;
              
              console.log(`Fetching image: ${imagePath}`);
              
              const { data: imageData, error } = await supabaseAdmin.storage
                .from('images')
                .download(imagePath);

              if (!error && imageData) {
                // For now, replace with a simple text placeholder
                // In a full implementation, we'd need to properly embed the image in the document XML
                content = content.replace(placeholder, `[IMAGE: ${imageBaseName}]`);
                console.log(`Replaced image placeholder ${placeholder} with text reference`);
              } else {
                console.warn(`Image not found: ${imagePath}`);
                content = content.replace(placeholder, `[MISSING IMAGE: ${imageBaseName}]`);
              }
            } catch (error) {
              console.error(`Error processing image ${variableName}:`, error);
              content = content.replace(placeholder, `[ERROR: ${imageBaseName}]`);
            }
          } else {
            // Remove placeholder if no image data provided
            content = content.replace(placeholder, '');
          }
        }
        
        // Update the file content
        zip.file(filename, content);
      }
    }
  }
  
  return zip;
};

serve(async (req) => {
  console.log(`process-presentation-jobs function invoked at: ${new Date().toISOString()}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

  console.log(`${logPrefix(job.id)} Claimed job.`);
  
  const storageClient = supabaseAdmin;

  try {
    // --- 2. Download Template and CSV Files (5% total) ---
    await updateProgress(supabaseAdmin, job.id, 1, 'Downloading template file...');
    
    const [templateFile, csvFile] = await Promise.all([
      storageClient.storage.from('templates').download(job.templates.storage_path),
      storageClient.storage.from('csv_files').download(job.csv_uploads.storage_path),
    ]);

    if (templateFile.error) throw new Error(`Failed to download template: ${templateFile.error.message}`);
    if (csvFile.error) throw new Error(`Failed to download CSV: ${csvFile.error.message}`);

    await updateProgress(supabaseAdmin, job.id, 3, 'Files downloaded, parsing CSV...');

    const templateData = new Uint8Array(await templateFile.data.arrayBuffer());
    const csvData = await csvFile.data.text();
    
    const allRows = parse(csvData, { skipFirstRow: false }) as string[][];

    if (allRows.length < 2) {
      throw new Error('CSV file requires a header row and at least one data row.');
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    console.log(`${logPrefix(job.id)} Found headers: [${headers.join(', ')}]`);

    const parsedCsv: Record<string, string>[] = dataRows.map((row, rowIndex) => {
      if (row.length !== headers.length) {
        console.warn(`${logPrefix(job.id)} Warning: Row ${rowIndex + 2} has ${row.length} columns, but header has ${headers.length}. Data may be inconsistent.`);
      }
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header.trim()] = row[index] || '';
      });
      return rowData;
    });
    
    const totalRows = parsedCsv.length;
    console.log(`${logPrefix(job.id)} Successfully parsed ${totalRows} data rows.`);

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 4. Process Each Row and Generate Presentations (5% to 85% - 80% for processing) ---
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();

    for (const [index, row] of parsedCsv.entries()) {
        const baseProgress = 5;
        const processingProgress = 80;
        const currentProgress = baseProgress + Math.round((index / totalRows) * processingProgress);
        
        await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${index + 1} of ${totalRows}...`);

        // First process images, then use docxtemplater for text
        const processedZip = await processImagePlaceholders(supabaseAdmin, job.templates.user_id, job.template_id, templateData, row);
        
        const doc = new Docxtemplater(processedZip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => "",
        });

        // Filter out image variables for text processing
        const textOnlyRow = Object.fromEntries(
          Object.entries(row).filter(([key]) => !key.endsWith('_img'))
        );

        doc.render(textOnlyRow);
        
        const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
        
        // --- Generate Filename ---
        let outputFilename;
        if (job.filename_template) {
          const renderedName = renderTemplate(job.filename_template, row);
          const sanitized = sanitizeFilename(renderedName);
          console.log(`${logPrefix(job.id)} Sanitizing filename: "${renderedName}" -> "${sanitized}"`);
          outputFilename = sanitized + '.pptx';
        }

        if (!outputFilename || outputFilename === '.pptx') {
          outputFilename = `row_${index + 1}.pptx`;
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
        
        const { error: uploadError } = await storageClient.storage
            .from('outputs')
            .upload(outputPath, generatedBuffer, { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
            
        if (uploadError) throw new Error(`Failed to upload generated file for row ${index + 1}: ${uploadError.message}`);
        
        outputPaths.push(outputPath);
    }

    // --- 5. Create and Upload ZIP Archive (85% to 95%) ---
    await updateProgress(supabaseAdmin, job.id, 85, 'All presentations generated, creating ZIP archive...');
    
    const zipPath = `${job.user_id}/${job.id}/presentations.zip`;
    
    await updateProgress(supabaseAdmin, job.id, 87, 'Downloading files for ZIP creation...');
    
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

    await updateProgress(supabaseAdmin, job.id, 90, 'Compressing files into ZIP...');

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

    // --- 6. Finalize Job (95% to 100%) ---
    await updateProgress(supabaseAdmin, job.id, 97, 'Finalizing job...');
    
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'done',
        progress: 100,
        output_zip: zipPath,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`${logPrefix(job.id)} Job completed successfully at 100%.`);

    return new Response(JSON.stringify({ message: `Job ${job.id} completed.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`${logPrefix(job.id)} An error occurred:`, error);
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
