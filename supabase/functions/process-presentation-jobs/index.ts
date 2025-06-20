
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

// Get image dimensions from binary data
const getImageDimensions = async (imageData: Uint8Array): Promise<[number, number]> => {
  try {
    // For PNG files, read dimensions from header
    if (imageData.length > 24 && 
        imageData[0] === 0x89 && imageData[1] === 0x50 && 
        imageData[2] === 0x4E && imageData[3] === 0x47) {
      const width = (imageData[16] << 24) | (imageData[17] << 16) | (imageData[18] << 8) | imageData[19];
      const height = (imageData[20] << 24) | (imageData[21] << 16) | (imageData[22] << 8) | imageData[23];
      return [width, height];
    }
    
    // For JPEG files, scan for SOF markers
    if (imageData.length > 2 && imageData[0] === 0xFF && imageData[1] === 0xD8) {
      for (let i = 2; i < imageData.length - 8; i++) {
        if (imageData[i] === 0xFF && (imageData[i + 1] === 0xC0 || imageData[i + 1] === 0xC2)) {
          const height = (imageData[i + 5] << 8) | imageData[i + 6];
          const width = (imageData[i + 7] << 8) | imageData[i + 8];
          return [width, height];
        }
      }
    }
    
    // Default size if can't determine
    return [300, 300];
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return [300, 300];
  }
};

// Debug function to log PPTX content
const debugPptxContent = (jobId: string, zip: any) => {
  console.log(`${logPrefix(jobId)} 🔍 DEBUGGING PPTX CONTENT:`);
  const files = Object.keys(zip.files);
  console.log(`${logPrefix(jobId)} 📁 PPTX FILES:`, files);
  
  // Look for slide files
  const slideFiles = files.filter(f => f.includes('slide') && f.endsWith('.xml'));
  console.log(`${logPrefix(jobId)} 🎯 SLIDE FILES:`, slideFiles);
  
  // Check first slide content for placeholders
  if (slideFiles.length > 0) {
    try {
      const slideContent = zip.files[slideFiles[0]].asText();
      const hasImagePlaceholders = slideContent.includes('{{') && slideContent.includes('_img}}');
      console.log(`${logPrefix(jobId)} 🎯 SLIDE HAS IMAGE PLACEHOLDERS:`, hasImagePlaceholders);
      
      // Extract all {{...}} patterns
      const placeholders = slideContent.match(/\{\{[^}]+\}\}/g) || [];
      console.log(`${logPrefix(jobId)} 🎯 ALL PLACEHOLDERS FOUND:`, placeholders);
      
      // Extract image placeholders specifically
      const imagePlaceholders = placeholders.filter(p => p.includes('_img'));
      console.log(`${logPrefix(jobId)} 🖼️ IMAGE PLACEHOLDERS FOUND:`, imagePlaceholders);
    } catch (error) {
      console.error(`${logPrefix(jobId)} ❌ ERROR reading slide content:`, error);
    }
  }
};

// Enhanced image getter with detailed logging
const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string, missingImageBehavior: string = 'placeholder') => {
  return async (tagValue: string, tagName: string, meta: any) => {
    const jobId = 'current';
    console.log(`${logPrefix(jobId)} 🖼️ IMAGE GETTER CALLED`);
    console.log(`${logPrefix(jobId)} - tagName: "${tagName}"`);
    console.log(`${logPrefix(jobId)} - tagValue: "${tagValue}"`);
    console.log(`${logPrefix(jobId)} - meta:`, JSON.stringify(meta, null, 2));
    
    try {
      // Try different path combinations
      const pathsToTry = [
        `${userId}/${templateId}/${tagValue}`,
        `${userId}/${tagValue}`,
        tagValue,
      ];
      
      console.log(`${logPrefix(jobId)} 🔍 SEARCHING FOR IMAGE IN PATHS:`, pathsToTry);
      
      for (const imagePath of pathsToTry) {
        try {
          console.log(`${logPrefix(jobId)} 🔍 TRYING PATH: ${imagePath}`);
          
          const { data, error } = await supabaseAdmin.storage
            .from('images')
            .download(imagePath);

          if (!error && data) {
            const imageBuffer = new Uint8Array(await data.arrayBuffer());
            console.log(`${logPrefix(jobId)} ✅ IMAGE FOUND: ${imagePath} (${imageBuffer.length} bytes)`);
            return imageBuffer;
          } else if (error) {
            console.log(`${logPrefix(jobId)} ❌ PATH FAILED: ${imagePath} - ${error.message}`);
          }
        } catch (pathError: any) {
          console.log(`${logPrefix(jobId)} ❌ PATH ERROR: ${imagePath} - ${pathError.message}`);
          continue;
        }
      }

      console.error(`${logPrefix(jobId)} 🚨 IMAGE NOT FOUND: ${tagValue}`);
      
      if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🔧 USING PLACEHOLDER IMAGE`);
        return createMissingImagePlaceholder();
      } else if (missingImageBehavior === 'skip') {
        console.log(`${logPrefix(jobId)} ⏭️ SKIPPING MISSING IMAGE`);
        return null;
      } else if (missingImageBehavior === 'fail') {
        throw new Error(`Missing required image: ${tagValue}`);
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
  console.log('🔍 LOOKING FOR QUEUED JOBS...');
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
      console.error('❌ ERROR claiming job:', claimError);
    } else {
      console.log('ℹ️ NO QUEUED JOBS FOUND');
    }
    return new Response(JSON.stringify({ message: 'No queued jobs found.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  console.log(`${logPrefix(job.id)} 🎯 CLAIMED JOB SUCCESSFULLY`);
  console.log(`${logPrefix(job.id)} 📋 JOB DETAILS:`, {
    jobId: job.id,
    userId: job.templates.user_id,
    templateId: job.template_id,
    csvRows: job.csv_uploads.rows_count,
    filenameTemplate: job.filename_template,
    missingImageBehavior: job.missing_image_behavior || 'placeholder'
  });
  
  const storageClient = supabaseAdmin;

  try {
    // --- 2. Download Template and CSV Files ---
    await updateProgress(supabaseAdmin, job.id, 1, 'Downloading template file...');
    
    console.log(`${logPrefix(job.id)} 📥 DOWNLOADING FILES...`);
    console.log(`${logPrefix(job.id)} - Template path: ${job.templates.storage_path}`);
    console.log(`${logPrefix(job.id)} - CSV path: ${job.csv_uploads.storage_path}`);
    
    const [templateFile, csvFile] = await Promise.all([
      storageClient.storage.from('templates').download(job.templates.storage_path),
      storageClient.storage.from('csv_files').download(job.csv_uploads.storage_path),
    ]);

    if (templateFile.error) throw new Error(`Failed to download template: ${templateFile.error.message}`);
    if (csvFile.error) throw new Error(`Failed to download CSV: ${csvFile.error.message}`);

    console.log(`${logPrefix(job.id)} ✅ FILES DOWNLOADED SUCCESSFULLY`);

    await updateProgress(supabaseAdmin, job.id, 3, 'Files downloaded, parsing CSV...');

    const templateData = await templateFile.data.arrayBuffer();
    const csvData = await csvFile.data.text();
    
    console.log(`${logPrefix(job.id)} 📊 TEMPLATE SIZE: ${templateData.byteLength} bytes`);
    console.log(`${logPrefix(job.id)} 📊 CSV SIZE: ${csvData.length} characters`);
    
    const allRows = parse(csvData, { skipFirstRow: false }) as string[][];

    if (allRows.length < 2) {
      throw new Error('CSV file requires a header row and at least one data row.');
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    console.log(`${logPrefix(job.id)} 📋 CSV HEADERS:`, headers);
    console.log(`${logPrefix(job.id)} 📊 DATA ROWS COUNT: ${dataRows.length}`);

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

    // Debug first row data
    if (parsedCsv.length > 0) {
      console.log(`${logPrefix(job.id)} 🔍 FIRST ROW DATA:`, JSON.stringify(parsedCsv[0], null, 2));
    }

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Debug PPTX Template Structure ---
    console.log(`${logPrefix(job.id)} 🔍 ANALYZING TEMPLATE STRUCTURE...`);
    const zip = new PizZip(new Uint8Array(templateData));
    debugPptxContent(job.id, zip);

    // --- 4. Setup Image Configuration ---
    const missingImageBehavior = job.missing_image_behavior || 'placeholder';
    console.log(`${logPrefix(job.id)} 🎯 IMAGE BEHAVIOR: ${missingImageBehavior}`);
    
    const imageGetter = createImageGetter(
      supabaseAdmin, 
      job.templates.user_id, 
      job.template_id, 
      missingImageBehavior
    );

    // --- 5. Test Image Module Configuration ---
    console.log(`${logPrefix(job.id)} 🧪 TESTING IMAGE MODULE CONFIGURATION...`);
    
    try {
      const testImageModule = new ImageModule({
        centered: false,
        getImage: imageGetter,
        getSize: async (img: Uint8Array, tagValue: string, tagName: string) => {
          console.log(`${logPrefix(job.id)} 📏 GET SIZE CALLED for ${tagName}=${tagValue}`);
          const dimensions = await getImageDimensions(img);
          console.log(`${logPrefix(job.id)} 📏 IMAGE DIMENSIONS: ${dimensions[0]}x${dimensions[1]}`);
          return dimensions;
        }
      });
      console.log(`${logPrefix(job.id)} ✅ IMAGE MODULE CREATED SUCCESSFULLY`);
    } catch (moduleError: any) {
      console.error(`${logPrefix(job.id)} ❌ IMAGE MODULE CREATION FAILED:`, moduleError);
      throw new Error(`Image module initialization failed: ${moduleError.message}`);
    }

    // --- 6. Process Each Row and Generate Presentations ---
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();
    const processingErrors: string[] = [];
    let successfulPresentations = 0;

    // Test with just the first row initially
    const testRows = parsedCsv.slice(0, 1);
    console.log(`${logPrefix(job.id)} 🧪 TESTING WITH FIRST ROW ONLY`);

    for (const [index, row] of testRows.entries()) {
        const baseProgress = 5;
        const processingProgress = 80;
        const currentProgress = baseProgress + Math.round((index / totalRows) * processingProgress);
        
        await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${index + 1} of ${totalRows}...`);

        try {
          console.log(`${logPrefix(job.id)} 🔄 PROCESSING PRESENTATION ${index + 1}/${totalRows}`);
          console.log(`${logPrefix(job.id)} 📊 ROW DATA:`, JSON.stringify(row, null, 2));
          
          // Create fresh ZIP for each iteration
          const freshZip = new PizZip(new Uint8Array(templateData));
          
          // Create image module with proper configuration
          const imageModule = new ImageModule({
            centered: false,
            getImage: imageGetter,
            getSize: async (img: Uint8Array, tagValue: string, tagName: string) => {
              console.log(`${logPrefix(job.id)} 📏 GET SIZE CALLED for ${tagName}=${tagValue}`);
              const dimensions = await getImageDimensions(img);
              console.log(`${logPrefix(job.id)} 📏 IMAGE DIMENSIONS: ${dimensions[0]}x${dimensions[1]}`);
              return dimensions;
            }
          });

          console.log(`${logPrefix(job.id)} 🔧 CREATING DOCXTEMPLATER WITH IMAGE MODULE`);
          
          const doc = new Docxtemplater(freshZip, {
              paragraphLoop: true,
              linebreaks: true,
              delimiters: { start: '{{', end: '}}' },
              nullGetter: () => "",
              modules: [imageModule]
          });

          console.log(`${logPrefix(job.id)} 🎨 RENDERING TEMPLATE WITH DATA`);
          console.log(`${logPrefix(job.id)} 🎨 DATA BEING PASSED:`, Object.keys(row));
          
          // Debug: Check what variables the template expects
          try {
            const templateTags = doc.getFullText();
            console.log(`${logPrefix(job.id)} 🎯 TEMPLATE FULL TEXT LENGTH:`, templateTags.length);
          } catch (error) {
            console.warn(`${logPrefix(job.id)} ⚠️ Could not get template text:`, error);
          }
          
          doc.render(row);
          
          console.log(`${logPrefix(job.id)} 📦 GENERATING OUTPUT BUFFER`);
          const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
          
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
          
          console.log(`${logPrefix(job.id)} ⬆️ UPLOADING: ${outputPath}`);
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
          
          // For testing, break after first successful processing
          console.log(`${logPrefix(job.id)} 🧪 TEST COMPLETE - Breaking after first successful presentation`);
          break;
          
        } catch (error: any) {
          console.error(`${logPrefix(job.id)} ❌ ERROR processing row ${index + 1}:`, error);
          console.error(`${logPrefix(job.id)} ❌ ERROR STACK:`, error.stack);
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

    console.log(`${logPrefix(job.id)} 📊 PROCESSING SUMMARY: ${successfulPresentations}/${testRows.length} presentations successful`);

    // --- 7. Create and Upload ZIP Archive ---
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

    // --- 8. Finalize Job ---
    await updateProgress(supabaseAdmin, job.id, 97, 'Finalizing job...');
    
    const finalErrorMessage = processingErrors.length > 0 
      ? `Test completed with ${processingErrors.length} processing warnings` 
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

    console.log(`${logPrefix(job.id)} 🎉 JOB COMPLETED SUCCESSFULLY: ${successfulPresentations}/${testRows.length} presentations (TEST MODE)`);

    return new Response(JSON.stringify({ 
      message: `Job ${job.id} completed (TEST): ${successfulPresentations}/${testRows.length} presentations.`,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`${logPrefix(job.id)} 💥 CRITICAL ERROR occurred:`, error);
    console.error(`${logPrefix(job.id)} 💥 ERROR STACK:`, error.stack);
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
