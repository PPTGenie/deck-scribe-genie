
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

// Enhanced image processing with better path resolution and logging
const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string, missingImageBehavior: string = 'placeholder') => {
  return async (tagValue: string, tagName: string) => {
    const jobId = 'current';
    console.log(`${logPrefix(jobId)} 🖼️ Processing image: tagName="${tagName}", tagValue="${tagValue}"`);
    console.log(`${logPrefix(jobId)} 📁 Storage context: userId="${userId}", templateId="${templateId}"`);
    console.log(`${logPrefix(jobId)} ⚙️ Missing image behavior: "${missingImageBehavior}"`);
    
    try {
      // Normalize the image filename for consistent matching
      const normalizedFilename = tagValue.toLowerCase().replace(/\.jpeg$/i, '.jpg');
      console.log(`${logPrefix(jobId)} 🔄 Normalized filename: "${tagValue}" → "${normalizedFilename}"`);

      // Try the most likely storage paths first - focusing on the actual structure
      const pathsToTry = [
        // Primary path pattern: userId/templateId/filename
        `${userId}/${templateId}/${normalizedFilename}`,
        `${userId}/${templateId}/${tagValue}`, // original case
        
        // Secondary patterns if images are uploaded differently
        `${userId}/${normalizedFilename}`, // flat user structure
        `images/${userId}/${templateId}/${normalizedFilename}`, // with images prefix
        `images/${userId}/${normalizedFilename}`, // flat images structure
        
        // Fallback patterns
        normalizedFilename, // just filename in root
        `uploads/${userId}/${normalizedFilename}`, // uploads structure
        `${userId}/${templateId}/${tagValue.toLowerCase()}`, // lowercase original
      ];

      console.log(`${logPrefix(jobId)} 🔍 Will try ${pathsToTry.length} storage paths for: ${tagValue}`);
      
      for (const [index, imagePath] of pathsToTry.entries()) {
        console.log(`${logPrefix(jobId)} 📂 Attempt ${index + 1}/${pathsToTry.length}: ${imagePath}`);
        
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('images')
            .download(imagePath);

          if (!error && data) {
            const imageSize = data.size;
            console.log(`${logPrefix(jobId)} ✅ SUCCESS: Found image at "${imagePath}" (${imageSize} bytes)`);
            return new Uint8Array(await data.arrayBuffer());
          } else {
            console.log(`${logPrefix(jobId)} ❌ Failed at "${imagePath}": ${error?.message || 'No data returned'}`);
          }
        } catch (pathError: any) {
          console.log(`${logPrefix(jobId)} 💥 Exception at "${imagePath}": ${pathError.message}`);
        }
      }

      // No image found in any location - handle based on behavior
      console.error(`${logPrefix(jobId)} 🚨 IMAGE NOT FOUND: "${tagValue}" not found in any of ${pathsToTry.length} locations`);
      console.log(`${logPrefix(jobId)} 🔧 Applying missing image behavior: "${missingImageBehavior}"`);
      
      if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🖼️ Using red placeholder for missing image: ${tagValue}`);
        return createMissingImagePlaceholder();
      } else if (missingImageBehavior === 'skip') {
        console.log(`${logPrefix(jobId)} ⏭️ Skipping missing image: ${tagValue}`);
        return null;
      } else if (missingImageBehavior === 'fail') {
        const errorMsg = `Missing required image: ${tagValue}`;
        console.error(`${logPrefix(jobId)} 💀 FAILING JOB: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Default fallback to placeholder
      console.log(`${logPrefix(jobId)} 🔄 Defaulting to placeholder for: ${tagValue}`);
      return createMissingImagePlaceholder();

    } catch (error: any) {
      console.error(`${logPrefix(jobId)} 💥 CRITICAL ERROR processing image ${tagValue}:`, error);
      
      if (missingImageBehavior === 'fail') {
        throw error;
      } else if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🆘 Using placeholder due to error for: ${tagValue}`);
        return createMissingImagePlaceholder();
      }
      
      console.log(`${logPrefix(jobId)} ⏭️ Skipping due to error for: ${tagValue}`);
      return null;
    }
  };
};

// Enhanced image module configuration
const createImageModule = (imageGetter: any) => {
  return new ImageModule({
    centered: false,
    getImage: imageGetter,
    getSize: (img: any, tagValue: string, tagName: string) => {
      console.log(`${logPrefix('current')} 📏 getSize called for: ${tagName} = ${tagValue}`);
      // Return appropriate size for PowerPoint slides (in pixels)
      return [200, 150]; // Width x Height in pixels
    },
    getProps: (img: any, tagValue: string, tagName: string) => {
      console.log(`${logPrefix('current')} ⚙️ getProps called for: ${tagName} = ${tagValue}`);
      return {
        centered: false,
        fit: 'contain' // Ensure image fits within bounds without distortion
      };
    }
  });
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

  console.log(`${logPrefix(job.id)} 🎯 Claimed job successfully`);
  console.log(`${logPrefix(job.id)} 📋 Job details:`, {
    id: job.id,
    userId: job.templates.user_id,
    templateId: job.template_id,
    missingImageBehavior: job.missing_image_behavior || 'placeholder'
  });
  
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

    const templateData = await templateFile.data.arrayBuffer();
    const csvData = await csvFile.data.text();
    
    const allRows = parse(csvData, { skipFirstRow: false }) as string[][];

    if (allRows.length < 2) {
      throw new Error('CSV file requires a header row and at least one data row.');
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    console.log(`${logPrefix(job.id)} 📊 CSV structure: headers=[${headers.join(', ')}], rows=${dataRows.length}`);

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

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Setup Image Configuration with proper behavior ---
    const missingImageBehavior = job.missing_image_behavior || 'placeholder';
    console.log(`${logPrefix(job.id)} 🎯 Image processing setup: behavior="${missingImageBehavior}"`);
    
    const imageGetter = createImageGetter(
      supabaseAdmin, 
      job.templates.user_id, 
      job.template_id, 
      missingImageBehavior
    );

    // --- 4. Process Each Row and Generate Presentations (5% to 85% - 80% for processing) ---
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
          console.log(`${logPrefix(job.id)} 🔄 Starting presentation ${index + 1}/${totalRows}`);
          console.log(`${logPrefix(job.id)} 📝 Row data:`, Object.keys(row));
          
          // Create fresh instances for each presentation to avoid module reuse issues
          const zip = new PizZip(templateData);
          const imageModule = createImageModule(imageGetter);
          
          console.log(`${logPrefix(job.id)} 🔧 Configuring docxtemplater with image module`);
          const doc = new Docxtemplater(zip, {
              paragraphLoop: true,
              linebreaks: true,
              delimiters: { start: '{{', end: '}}' },
              nullGetter: () => "",
              modules: [imageModule]
          });

          console.log(`${logPrefix(job.id)} 🎨 Rendering template with data for row ${index + 1}`);
          doc.render(row);
          
          console.log(`${logPrefix(job.id)} 📦 Generating output file for row ${index + 1}`);
          const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
          
          // --- Generate Filename ---
          let outputFilename;
          if (job.filename_template) {
            const renderedName = renderTemplate(job.filename_template, row);
            const sanitized = sanitizeFilename(renderedName);
            console.log(`${logPrefix(job.id)} 📝 Filename: "${renderedName}" → "${sanitized}"`);
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
          
          console.log(`${logPrefix(job.id)} ⬆️ Uploading to storage: ${outputPath}`);
          const { error: uploadError } = await storageClient.storage
              .from('outputs')
              .upload(outputPath, generatedBuffer, { 
                upsert: true, 
                contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
              });
              
          if (uploadError) throw new Error(`Failed to upload generated file for row ${index + 1}: ${uploadError.message}`);
          
          outputPaths.push(outputPath);
          successfulPresentations++;
          console.log(`${logPrefix(job.id)} ✅ Successfully processed presentation ${index + 1}/${totalRows}`);
          
        } catch (error: any) {
          console.error(`${logPrefix(job.id)} ❌ Error processing row ${index + 1}:`, error);
          processingErrors.push(`Row ${index + 1}: ${error.message}`);
          
          // Stop processing if critical error and behavior is 'fail'
          if (missingImageBehavior === 'fail') {
            throw new Error(`Processing failed at row ${index + 1}: ${error.message}`);
          }
        }
    }

    // Verify we have at least some successful presentations
    if (outputPaths.length === 0) {
      throw new Error('No presentations were successfully generated. All rows failed processing.');
    }

    console.log(`${logPrefix(job.id)} 📊 Processing summary: ${successfulPresentations}/${totalRows} presentations successful`);
    
    if (processingErrors.length > 0) {
      console.warn(`${logPrefix(job.id)} ⚠️ Processing errors encountered: ${processingErrors.join('; ')}`);
    }

    // --- 5. Create and Upload ZIP Archive (85% to 95%) ---
    await updateProgress(supabaseAdmin, job.id, 85, `Creating ZIP with ${outputPaths.length} presentations...`);
    
    const zipPath = `${job.user_id}/${job.id}/presentations.zip`;
    
    await updateProgress(supabaseAdmin, job.id, 87, 'Downloading generated files for ZIP creation...');
    
    console.log(`${logPrefix(job.id)} 📥 Downloading ${outputPaths.length} files for ZIP creation`);
    const filesToZip = await Promise.all(
      outputPaths.map(async (p) => {
        console.log(`${logPrefix(job.id)} 📂 Downloading for ZIP: ${p}`);
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
        console.log(`${logPrefix(job.id)} 📦 Added to ZIP: ${file.path} (${file.data.length} bytes)`);
    }

    console.log(`${logPrefix(job.id)} 🗜️ Creating ZIP with ${Object.keys(filesToZipObj).length} files`);
    const zippedData = fflate.zipSync(filesToZipObj);

    await updateProgress(supabaseAdmin, job.id, 93, 'Uploading ZIP file...');

    const zipUploadResponse = await storageClient.storage
      .from('outputs')
      .upload(zipPath, zippedData, { upsert: true, contentType: 'application/zip' });

    if (zipUploadResponse.error) throw new Error(`Failed to upload ZIP file: ${zipUploadResponse.error.message}`);

    // --- 6. Finalize Job (95% to 100%) ---
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

    console.log(`${logPrefix(job.id)} 🎉 Job completed successfully with ${successfulPresentations}/${totalRows} presentations.${processingErrors.length > 0 ? ` With ${processingErrors.length} warnings.` : ''}`);

    return new Response(JSON.stringify({ 
      message: `Job ${job.id} completed with ${successfulPresentations}/${totalRows} presentations.`,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`${logPrefix(job.id)} 💥 Critical error occurred:`, error);
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
