import { serve } from 'https://deno.land/std@0.212.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.212.0/csv/mod.ts';
import PizZip from 'https://esm.sh/pizzip@3.1.5';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.1';
import ImageModule from 'https://esm.sh/docxtemplater-image-module@3.1.0';
import * as fflate from 'https://esm.sh/fflate@0.8.2';

const logPrefix = (jobId: string) => `[job:${jobId}]`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIXED: Add filename normalization helper to match frontend logic
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

// Create a red "Missing Image" placeholder as base64
const createMissingImagePlaceholder = (): Uint8Array => {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVHic7Z3BaxNBFMafJBG0Wi+99OJF8CJ48ODBg+DBg6dCwYMHL4IHL1686MWLFy9evHjx4sGDBw8ePHjw4MGDB0/ePHjwIPjPzOzszOzMzu7MO/N9EEg2ySTZfG/fvPfem5ndJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJElSM1wAcAvATQDXAVwFcBnAJQAXAZwHcA7AWQC/ATgD4DSAUwBOAjgB4DiAYwCOAjgC4DCAQwAOADgI4DeA/QD2AdgLYA+A3QB2AdgJYAeA7QC2AdgKYAuAzQA2AdgIYAOA9QDWA1gHYC2ANQDWA1gLYA2A1QBWAVgJYAWA5QCWAVgKYAmAxQAWAVgIYAGAeQDmApgDYDaAWQBmApgBYDqAaQCmApgCYDKASQAmApgAYDyAcQDGAhgDYDSAUQBGAhgBYDiAYQCGAhgCYDCAQQAGAhgAoB/APgB7AewBsBvALgA7AewAsB3ANgBbAWwBsBnAJgAbAWwAsB7AOgBrAawBsBrAKgArASwHsAzAUgBLACwGsAjAQgALAMwHMA/AXQC3ANwEcAPAdQDXAFwFcAXAZQCXAFwEcAHAeQDnAJwFcAbAaQCnAJwEcALAcQDHABwFcATAYQCHABwEcADAfgD7AOwFsAfAbgC7AOwEsAPAdgDbAGwFsAXAZgCbAGwEsAHAegDrAKwFsAbAagCrAKwEsALAcgDLACwFsATAYgCLACwEsADAfADzANwFcAvATQA3AFwHcA3AVQBXAFwGcAnARQAXAJwHcA7AWQBnAJwGcArASQAnABwHcAzAUQBHABwGcAjAQQAHAOwHsA/AXgB7AOwGsAvATgA7AGwHsA3AVgBbAGwGsAnARgAbAKwHsA7AWgBrAKwGsArASgArACwHsAzAUgBLACwGsAjAQgALAMwHMA/AXQDfA/gOwHcAvo2SJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSpP8A/AE3gM9n/U3k+wAAAABJRU5ErkJggg==';
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// FIXED: Image storage path resolver with CONSISTENT filename normalization
const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string, missingImageBehavior: string = 'placeholder') => {
  return async (tagValue: string, tagName: string, meta: any) => {
    const jobId = 'current';
    console.log(`${logPrefix(jobId)} 🖼️ IMAGE GETTER CALLED for ${tagName}=${tagValue}`);
    
    try {
      // CRITICAL FIX: Apply same normalization as upload process
      const normalizedTagValue = normalizeFilename(tagValue);
      const standardizedPath = `${userId}/${templateId}/${normalizedTagValue}`;
      
      console.log(`${logPrefix(jobId)} 🔍 Original CSV value: "${tagValue}" -> normalized: "${normalizedTagValue}"`);
      console.log(`${logPrefix(jobId)} 🔍 Attempting to retrieve image from NORMALIZED path: ${standardizedPath}`);
      
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('images')
          .download(standardizedPath);

        if (!error && data) {
          const imageBuffer = new Uint8Array(await data.arrayBuffer());
          console.log(`${logPrefix(jobId)} ✅ IMAGE FOUND at normalized path: ${standardizedPath} (${imageBuffer.length} bytes)`);
          return imageBuffer;
        } else {
          console.error(`${logPrefix(jobId)} ❌ Image not found at normalized path: ${standardizedPath}`, error);
        }
      } catch (pathError: any) {
        console.error(`${logPrefix(jobId)} 💥 Error accessing normalized path: ${standardizedPath}`, pathError);
      }

      console.error(`${logPrefix(jobId)} 🚨 IMAGE NOT FOUND: "${tagValue}" (normalized: "${normalizedTagValue}") at path: ${standardizedPath}`);
      
      if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🔄 Using placeholder image for missing: ${tagValue}`);
        return createMissingImagePlaceholder();
      } else if (missingImageBehavior === 'skip') {
        console.log(`${logPrefix(jobId)} ⏭️ Skipping missing image: ${tagValue}`);
        return null;
      } else if (missingImageBehavior === 'fail') {
        throw new Error(`Missing required image: ${tagValue} (normalized: ${normalizedTagValue}) at path: ${standardizedPath}`);
      }
      
      return createMissingImagePlaceholder();

    } catch (error: any) {
      console.error(`${logPrefix(jobId)} 💥 ERROR in getImage:`, error);
      
      if (missingImageBehavior === 'fail') {
        throw error;
      } else if (missingImageBehavior === 'placeholder') {
        return createMissingImagePlaceholder();
      }
      
      return null;
    }
  };
};

serve(async (req) => {
  console.log(`🚀 PROCESS-PRESENTATION-JOBS FUNCTION INVOKED at: ${new Date().toISOString()}`);
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

    // CRITICAL: Identify image columns from headers
    const imageColumns = headers.filter(header => header.trim().endsWith('_img'));
    console.log(`${logPrefix(job.id)} 🖼️ Detected image columns:`, imageColumns);

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Setup Image Configuration with FIXED normalization ---
    const missingImageBehavior = job.missing_image_behavior || 'placeholder';
    console.log(`${logPrefix(job.id)} 🎯 IMAGE BEHAVIOR: ${missingImageBehavior}`);
    
    const imageGetter = createImageGetter(
      supabaseAdmin, 
      job.templates.user_id, 
      job.template_id, 
      missingImageBehavior
    );

    // --- 4. Process Each Row and Generate Presentations ---
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();
    const processingErrors: string[] = [];
    let successfulPresentations = 0;

    for (const [index, row] of parsedCsv.entries()) {
        const baseProgress = 5;
        const processingProgress = 80;
        const currentProgress = baseProgress + Math.round((index / totalRows) * processingProgress);
        
        await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${index + 1} of ${totalRows}...`);

        try {
          console.log(`${logPrefix(job.id)} 🔄 PROCESSING PRESENTATION ${index + 1}/${totalRows}`);
          console.log(`${logPrefix(job.id)} 📝 Row data:`, row);
          
          // CRITICAL FIX: Identify image variables and prepare data assembly
          const imageVariablesInRow = imageColumns.filter(col => row[col]);
          console.log(`${logPrefix(job.id)} 🖼️ Image variables in this row:`, imageVariablesInRow.map(col => `${col}=${row[col]}`));
          
          const zip = new PizZip(new Uint8Array(templateData));
          
          // CRITICAL FIX: Configure image module with proper getSize function
          const imageModule = new ImageModule({
            centered: false,
            getImage: imageGetter,
            getSize: (img: Uint8Array, tagValue: string, tagName: string, meta: any) => {
              console.log(`${logPrefix(job.id)} 📐 getSize called for ${tagName}=${tagValue}, image size: ${img.length} bytes`);
              // Return reasonable default dimensions - actual image dimensions would require image parsing
              return [300, 200]; // Width x Height in pixels
            }
          });

          const doc = new Docxtemplater(zip, {
              paragraphLoop: true,
              linebreaks: true,
              delimiters: { start: '{{', end: '}}' },
              nullGetter: () => "",
              modules: [imageModule]
          });

          console.log(`${logPrefix(job.id)} 🎨 RENDERING with complete data object including image variables`);
          
          // CRITICAL FIX: Data assembly - pass the row data directly 
          // The imageGetter will handle fetching binary data for _img variables
          doc.render(row);
          
          const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
          
          // VALIDATION: Check if generated PPTX contains media files
          try {
            const validationZip = new PizZip(generatedBuffer);
            const files = Object.keys(validationZip.files);
            const mediaFiles = files.filter(f => f.startsWith('ppt/media/'));
            console.log(`${logPrefix(job.id)} 🔍 Generated PPTX contains ${mediaFiles.length} media files:`, mediaFiles);
            
            if (imageVariablesInRow.length > 0 && mediaFiles.length === 0) {
              console.warn(`${logPrefix(job.id)} ⚠️ Expected images but no media files found in generated PPTX`);
            }
          } catch (validationError) {
            console.warn(`${logPrefix(job.id)} ⚠️ Could not validate PPTX media contents:`, validationError);
          }
          
          // Generate filename
          let outputFilename;
          if (job.filename_template) {
            const renderedName = renderTemplate(job.filename_template, row);
            const sanitized = sanitizeFilename(renderedName);
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
          
          console.log(`${logPrefix(job.id)} ⬆️ UPLOADING: ${outputPath} (${generatedBuffer.length} bytes)`);
          const { error: uploadError } = await storageClient.storage
              .from('outputs')
              .upload(outputPath, generatedBuffer, { 
                upsert: true, 
                contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
              });
              
          if (uploadError) throw new Error(`Failed to upload generated file for row ${index + 1}: ${uploadError.message}`);
          
          outputPaths.push(outputPath);
          successfulPresentations++;
          console.log(`${logPrefix(job.id)} ✅ SUCCESSFULLY PROCESSED presentation ${index + 1}/${totalRows}`);
          
        } catch (error: any) {
          console.error(`${logPrefix(job.id)} ❌ ERROR processing row ${index + 1}:`, error);
          processingErrors.push(`Row ${index + 1}: ${error.message}`);
          
          if (missingImageBehavior === 'fail') {
            throw new Error(`Processing failed at row ${index + 1}: ${error.message}`);
          }
        }
    }

    // Verify we have successful presentations
    if (outputPaths.length === 0) {
      throw new Error('No presentations were successfully generated. All rows failed processing.');
    }

    console.log(`${logPrefix(job.id)} 📊 PROCESSING SUMMARY: ${successfulPresentations}/${totalRows} presentations successful`);

    // --- 5. Create and Upload ZIP Archive ---
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

    // --- 6. Finalize Job ---
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
