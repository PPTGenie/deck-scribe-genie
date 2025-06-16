
import { updateProgress, logPrefix } from './logging.ts';
import { parseCSVAsStrings } from './csv.ts';
import { createImageGetter } from './images.ts';
import { extractImageVariables, createDocumentFromTemplate } from './template.ts';
import { generateUniqueFilename, createZipArchive } from './fileGeneration.ts';
import { markJobComplete, markJobError } from './job.ts';

export const processJob = async (supabaseAdmin: any, job: any) => {
  try {
    // Download files
    await updateProgress(supabaseAdmin, job.id, 1, 'Downloading files...');
    
    const [templateFile, csvFile] = await Promise.all([
      supabaseAdmin.storage.from('templates').download(job.templates.storage_path),
      supabaseAdmin.storage.from('csv_files').download(job.csv_uploads.storage_path),
    ]);

    if (templateFile.error) throw new Error(`Template download failed: ${templateFile.error.message}`);
    if (csvFile.error) throw new Error(`CSV download failed: ${csvFile.error.message}`);

    const templateData = await templateFile.data.arrayBuffer();
    const csvData = await csvFile.data.text();
    
    // Extract image variables and parse CSV
    const imageVariables = extractImageVariables(templateData);
    const parsedCsv = parseCSVAsStrings(csvData);
    const totalRows = parsedCsv.length;
    
    console.log(`${logPrefix(job.id)} Found ${imageVariables.length} image variables: ${imageVariables.join(', ')}`);
    console.log(`${logPrefix(job.id)} Processing ${totalRows} rows`);

    await updateProgress(supabaseAdmin, job.id, 5, `Processing ${totalRows} presentations...`);

    // Setup image getter
    const imageGetter = createImageGetter(supabaseAdmin, job.templates.user_id, job.template_id);

    // Process each row
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();

    for (const [index, row] of parsedCsv.entries()) {
      const progress = 5 + Math.round((index / totalRows) * 80);
      await updateProgress(supabaseAdmin, job.id, progress, `Processing presentation ${index + 1} of ${totalRows}...`);

      // Create fresh document for each presentation
      const doc = createDocumentFromTemplate(templateData, imageGetter, imageVariables);

      // Log row data for debugging
      console.log(`${logPrefix(job.id)} Row ${index + 1} data:`, JSON.stringify(row));
      
      // Log image processing
      for (const variable of imageVariables) {
        if (row[variable]) {
          console.log(`${logPrefix(job.id)} Processing image variable ${variable} with value: ${row[variable]}`);
        }
      }

      // Render the document
      doc.render(row);
      
      const generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
      
      // Generate unique filename
      const finalFilename = generateUniqueFilename(job, row, index, usedFilenames);
      const outputPath = `${job.user_id}/${job.id}/${finalFilename}`;
      
      // Upload generated file
      const { error: uploadError } = await supabaseAdmin.storage
        .from('outputs')
        .upload(outputPath, generatedBuffer, { 
          upsert: true, 
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
        });
        
      if (uploadError) throw new Error(`Upload failed for row ${index + 1}: ${uploadError.message}`);
      
      outputPaths.push(outputPath);
    }

    // Create ZIP archive
    await updateProgress(supabaseAdmin, job.id, 85, 'Creating ZIP archive...');
    
    const zipPath = `${job.user_id}/${job.id}/presentations.zip`;
    const zippedData = await createZipArchive(supabaseAdmin, outputPaths);

    await updateProgress(supabaseAdmin, job.id, 95, 'Uploading ZIP file...');

    const { error: zipUploadError } = await supabaseAdmin.storage
      .from('outputs')
      .upload(zipPath, zippedData, { upsert: true, contentType: 'application/zip' });

    if (zipUploadError) throw new Error(`ZIP upload failed: ${zipUploadError.message}`);

    // Mark job complete
    await markJobComplete(supabaseAdmin, job.id, zipPath);
    console.log(`${logPrefix(job.id)} Job completed successfully`);

    return { message: `Job ${job.id} completed` };

  } catch (error) {
    console.error(`${logPrefix(job.id)} Error:`, error);
    await markJobError(supabaseAdmin, job.id, error.message);
    throw error;
  }
};
