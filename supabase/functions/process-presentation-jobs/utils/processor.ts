
import { updateProgress, logPrefix } from './logging.ts';
import { parseCSVAsStrings } from './csv.ts';
import { createImageGetter } from './images.ts';
import { extractImageVariables, createDocumentFromTemplate } from './template.ts';
import { generateUniqueFilename, createZipArchive } from './fileGeneration.ts';
import { markJobComplete, markJobError } from './job.ts';

export const processJob = async (supabaseAdmin: any, job: any) => {
  const storageClient = supabaseAdmin;

  try {
    // Download Template and CSV Files (5% total)
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

    // Setup Image Getter
    const imageGetter = createImageGetter(supabaseAdmin, job.templates.user_id, job.template_id);

    // Process Each Row and Generate Presentations (5% to 85% - 80% for processing)
    const outputPaths: string[] = [];
    const usedFilenames = new Set<string>();

    for (const [index, row] of parsedCsv.entries()) {
      const baseProgress = 5;
      const processingProgress = 80;
      const currentProgress = baseProgress + Math.round((index / totalRows) * processingProgress);
      
      await updateProgress(supabaseAdmin, job.id, currentProgress, `Processing presentation ${index + 1} of ${totalRows}...`);

      const doc = createDocumentFromTemplate(templateData, imageGetter, imageVariables, job.id);

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
      
      // Generate Filename
      const finalFilename = generateUniqueFilename(job, row, index, usedFilenames);
      const outputPath = `${job.user_id}/${job.id}/${finalFilename}`;
      
      const { error: uploadError } = await storageClient.storage
        .from('outputs')
        .upload(outputPath, generatedBuffer, { 
          upsert: true, 
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
        });
        
      if (uploadError) throw new Error(`Failed to upload generated file for row ${index + 1}: ${uploadError.message}`);
      
      outputPaths.push(outputPath);
    }

    // Create and Upload ZIP Archive (85% to 95%)
    await updateProgress(supabaseAdmin, job.id, 85, 'All presentations generated, creating ZIP archive...');
    
    const zipPath = `${job.user_id}/${job.id}/presentations.zip`;
    
    await updateProgress(supabaseAdmin, job.id, 87, 'Downloading files for ZIP creation...');
    
    const zippedData = await createZipArchive(storageClient, outputPaths);

    await updateProgress(supabaseAdmin, job.id, 93, 'Uploading ZIP file...');

    const zipUploadResponse = await storageClient.storage
      .from('outputs')
      .upload(zipPath, zippedData, { upsert: true, contentType: 'application/zip' });

    if (zipUploadResponse.error) throw new Error(`Failed to upload ZIP file: ${zipUploadResponse.error.message}`);

    // Finalize Job (95% to 100%)
    await updateProgress(supabaseAdmin, job.id, 97, 'Finalizing job...');
    
    await markJobComplete(supabaseAdmin, job.id, zipPath);

    console.log(`${logPrefix(job.id)} Job completed successfully at 100%.`);

    return { message: `Job ${job.id} completed.` };

  } catch (error) {
    console.error(`${logPrefix(job.id)} An error occurred:`, error);
    await markJobError(supabaseAdmin, job.id, error.message);
    throw error;
  }
};
