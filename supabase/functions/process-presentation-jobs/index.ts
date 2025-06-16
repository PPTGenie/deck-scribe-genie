
import { serve } from 'https://deno.land/std@0.212.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import PizZip from 'https://esm.sh/pizzip@3.1.5';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.1';
import ImageModule from 'https://esm.sh/docxtemplater-image-module@3.1.0';
import * as fflate from 'https://esm.sh/fflate@0.8.2';

import { logPrefix, updateProgress } from './utils/logging.ts';
import { renderTemplate, sanitizeFilename } from './utils/filename.ts';
import { parseCSVAsStrings } from './utils/csv.ts';
import { createImageGetter, createImageOptions } from './utils/images.ts';
import { claimJob, markJobComplete, markJobError } from './utils/job.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract image variables from template
const extractImageVariables = (templateData: ArrayBuffer): string[] => {
  try {
    const zip = new PizZip(templateData);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    // Get all variables from the template
    const variables = doc.getFullText().match(/\{\{([^}]+)\}\}/g) || [];
    const imageVariables = variables
      .map(v => v.replace(/[{}]/g, '').trim())
      .filter(v => v.endsWith('_img'));
    
    console.log('Extracted image variables:', imageVariables);
    return imageVariables;
  } catch (error) {
    console.error('Error extracting image variables:', error);
    return [];
  }
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
  const job = await claimJob(supabaseAdmin);
  
  if (!job) {
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

    const templateData = await templateFile.data.arrayBuffer();
    const csvData = await csvFile.data.text();
    
    // Extract image variables from template
    const imageVariables = extractImageVariables(templateData);
    console.log(`${logPrefix(job.id)} Found image variables: ${imageVariables.join(', ')}`);
    
    // Use our custom string-preserving CSV parser
    const parsedCsv = parseCSVAsStrings(csvData);
    const totalRows = parsedCsv.length;
    
    console.log(`${logPrefix(job.id)} Successfully parsed ${totalRows} data rows as strings.`);

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Setup Image Getter with proper configuration ---
    const imageGetter = createImageGetter(supabaseAdmin, job.templates.user_id, job.template_id);
    const imageOptions = createImageOptions(imageGetter, imageVariables);

    // --- 4. Process Each Row and Generate Presentations (5% to 85% - 80% for processing) ---
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();

    for (const [index, row] of parsedCsv.entries()) {
        const baseProgress = 5;
        const processingProgress = 80;
        const currentProgress = baseProgress + Math.round((index / totalRows) * processingProgress);
        
        await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${index + 1} of ${totalRows}...`);

        const zip = new PizZip(templateData);
        
        // Create a fresh ImageModule instance for each presentation with specific configuration
        const imageModule = new ImageModule({
          centered: false,
          getImage: imageGetter,
          getSize: () => [150, 150],
          getProps: (tagName: string, tagValue: string, meta: any) => {
            const isImageVariable = imageVariables.includes(tagName);
            console.log(`${logPrefix(job.id)} Checking if ${tagName} is image variable: ${isImageVariable}`);
            
            if (isImageVariable) {
              console.log(`${logPrefix(job.id)} Processing ${tagName} as image with value: ${tagValue}`);
              return {
                centered: false,
                getSize: () => [150, 150]
              };
            }
            
            return false; // Not an image variable
          }
        });
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => "",
            modules: [imageModule]
        });

        // Log the actual values being used for debugging
        console.log(`${logPrefix(job.id)} Row ${index + 1} data:`, JSON.stringify(row));
        
        // Log which variables are being processed as images
        for (const variable of imageVariables) {
          if (row[variable]) {
            console.log(`${logPrefix(job.id)} Processing image variable ${variable} with value: ${row[variable]}`);
          }
        }

        doc.render(row);
        
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
    
    await markJobComplete(supabaseAdmin, job.id, zipPath);

    console.log(`${logPrefix(job.id)} Job completed successfully at 100%.`);

    return new Response(JSON.stringify({ message: `Job ${job.id} completed.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`${logPrefix(job.id)} An error occurred:`, error);
    await markJobError(supabaseAdmin, job.id, error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
