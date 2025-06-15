
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

serve(async (req) => {
  console.log(`process-presentation-jobs function invoked at: ${new Date().toISOString()}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Use admin client to claim a job and update status
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
    if (claimError && claimError.code !== 'PGRST116') { // Ignore 'no rows' error
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
    // --- 2. Download Template and CSV Files ---
    console.log(`${logPrefix(job.id)} Downloading source files...`);
    const [templateFile, csvFile] = await Promise.all([
      storageClient.storage.from('templates').download(job.templates.storage_path),
      storageClient.storage.from('csv_files').download(job.csv_uploads.storage_path),
    ]);

    if (templateFile.error) throw new Error(`Failed to download template: ${templateFile.error.message}`);
    if (csvFile.error) throw new Error(`Failed to download CSV: ${csvFile.error.message}`);

    const templateData = await templateFile.data.arrayBuffer();
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

    // --- 3. Process Each Row and Generate Presentations ---
    const outputPaths: string[] = [];
    for (const [index, row] of parsedCsv.entries()) {
        const zip = new PizZip(templateData);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => ""
        });

        doc.render(row);
        
        const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
        const outputFilename = `row_${index + 1}.pptx`;
        const outputPath = `${job.templates.user_id}/${job.id}/${outputFilename}`;
        
        const { error: uploadError } = await storageClient.storage
            .from('outputs')
            .upload(outputPath, generatedBuffer, { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
            
        if (uploadError) throw new Error(`Failed to upload generated file for row ${index + 1}: ${uploadError.message}`);
        
        outputPaths.push(outputPath);

        // --- 4. Update Progress ---
        const progress = Math.round(((index + 1) / totalRows) * 95); // Reserve last 5% for zipping
        await supabaseAdmin.from('jobs').update({ progress }).eq('id', job.id);
        console.log(`${logPrefix(job.id)} Progress: ${progress}%`);
    }

    // --- 5. Create and Upload ZIP Archive ---
    console.log(`${logPrefix(job.id)} Zipping generated files...`);
    const zipPath = `${job.templates.user_id}/${job.id}/presentations.zip`;
    
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

    const filesToZipObj: { [key: string]: Uint8Array } = {};
    for (const file of filesToZip) {
        filesToZipObj[file.path] = file.data;
    }

    const zippedData = fflate.zipSync(filesToZipObj);

    const zipUploadResponse = await storageClient.storage
      .from('outputs')
      .upload(zipPath, zippedData, { upsert: true, contentType: 'application/zip' });

    if (zipUploadResponse.error) throw new Error(`Failed to upload ZIP file: ${zipUploadResponse.error.message}`);

    // --- 6. Finalize Job ---
    console.log(`${logPrefix(job.id)} Finalizing job.`);
    await supabaseAdmin
      .from('jobs')
      .update({
        status: 'done',
        progress: 100,
        output_zip: zipPath,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);

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

