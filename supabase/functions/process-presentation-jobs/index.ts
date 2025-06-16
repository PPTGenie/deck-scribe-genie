
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

// Extract image placeholders with their complete context BEFORE docxtemplater processes them
const extractImagePlaceholdersWithContext = (zipContent: Uint8Array, jobId: string): Array<{
  fileName: string; 
  placeholders: Array<{
    placeholder: string;
    variableName: string;
    shapeXml: string;
    position: { x: number; y: number; width: number; height: number };
    tempMarker: string;
  }>
}> => {
  console.log(`${logPrefix(jobId)} 🔍 EXTRACTING IMAGE PLACEHOLDERS WITH CONTEXT`);
  
  try {
    const zip = new PizZip(zipContent);
    const slidesWithImagePlaceholders: Array<{
      fileName: string; 
      placeholders: Array<{
        placeholder: string;
        variableName: string;
        shapeXml: string;
        position: { x: number; y: number; width: number; height: number };
        tempMarker: string;
      }>
    }> = [];

    for (const fileName of Object.keys(zip.files)) {
      if (fileName.includes('slide') && fileName.endsWith('.xml') && !fileName.includes('_rels')) {
        console.log(`${logPrefix(jobId)} 📄 SCANNING: ${fileName}`);
        
        const file = zip.files[fileName];
        if (file && !file.dir) {
          const content = file.asText();
          const placeholders: Array<{
            placeholder: string;
            variableName: string;
            shapeXml: string;
            position: { x: number; y: number; width: number; height: number };
            tempMarker: string;
          }> = [];
          
          // Find shapes containing image placeholders
          const shapeRegex = /<p:sp[^>]*>.*?<\/p:sp>/gs;
          const shapes = content.match(shapeRegex) || [];
          
          for (const shape of shapes) {
            const imagePlaceholderRegex = /\{\{([^}]+_img)\}\}/g;
            let match;
            
            while ((match = imagePlaceholderRegex.exec(shape)) !== null) {
              const placeholder = match[0]; // {{logo_img}}
              const variableName = match[1]; // logo_img
              
              // Extract position information with defaults
              const positionMatch = shape.match(/<a:xfrm[^>]*>.*?<a:off[^>]*x="([^"]*)"[^>]*y="([^"]*)".*?<a:ext[^>]*cx="([^"]*)"[^>]*cy="([^"]*)".*?<\/a:xfrm>/s);
              const position = {
                x: positionMatch ? parseInt(positionMatch[1]) || 1270000 : 1270000,
                y: positionMatch ? parseInt(positionMatch[2]) || 1270000 : 1270000,
                width: positionMatch ? parseInt(positionMatch[3]) || 2540000 : 2540000,
                height: positionMatch ? parseInt(positionMatch[4]) || 1905000 : 1905000
              };
              
              // Create unique temporary marker
              const tempMarker = `__TEMP_IMG_${crypto.randomUUID().replace(/-/g, '')}__`;
              
              placeholders.push({
                placeholder,
                variableName,
                shapeXml: shape,
                position,
                tempMarker
              });
              
              console.log(`${logPrefix(jobId)} 🎯 FOUND: ${placeholder} at position ${position.x},${position.y} size ${position.width}x${position.height}`);
            }
          }
          
          if (placeholders.length > 0) {
            slidesWithImagePlaceholders.push({ fileName, placeholders });
          }
        }
      }
    }

    console.log(`${logPrefix(jobId)} 📊 CONTEXT EXTRACTION: Found ${slidesWithImagePlaceholders.length} slides with image placeholders`);
    return slidesWithImagePlaceholders;
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ CONTEXT EXTRACTION ERROR:`, error);
    return [];
  }
};

// Replace image placeholders with temporary markers BEFORE docxtemplater
const replaceImagePlaceholdersWithMarkers = (
  zipContent: Uint8Array, 
  detectedPlaceholders: Array<{fileName: string; placeholders: Array<any>}>, 
  jobId: string
): { zip: any; markerMap: Map<string, any> } => {
  console.log(`${logPrefix(jobId)} 🔄 REPLACING IMAGE PLACEHOLDERS WITH TEMPORARY MARKERS`);
  
  const zip = new PizZip(zipContent);
  const markerMap = new Map();
  
  for (const slideInfo of detectedPlaceholders) {
    const { fileName, placeholders } = slideInfo;
    const slideFile = zip.files[fileName];
    
    if (!slideFile || slideFile.dir) continue;
    
    let slideContent = slideFile.asText();
    
    for (const placeholderInfo of placeholders) {
      const { placeholder, tempMarker, variableName, position } = placeholderInfo;
      
      // Replace the image placeholder with temporary marker
      slideContent = slideContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), tempMarker);
      
      // Store mapping for later replacement
      markerMap.set(tempMarker, {
        variableName,
        position,
        fileName
      });
      
      console.log(`${logPrefix(jobId)} 🔄 Replaced ${placeholder} with ${tempMarker}`);
    }
    
    zip.file(fileName, slideContent);
  }
  
  return { zip, markerMap };
};

// Image storage path resolver
const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string, missingImageBehavior: string = 'placeholder') => {
  return async (tagValue: string, tagName: string) => {
    const jobId = 'current';
    console.log(`${logPrefix(jobId)} 🖼️ IMAGE GETTER CALLED for ${tagName}=${tagValue}`);
    
    try {
      const pathsToTry = [
        `${userId}/${templateId}/${tagValue}`,
        `${userId}/${tagValue}`,
        tagValue,
      ];
      
      for (const imagePath of pathsToTry) {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('images')
            .download(imagePath);

          if (!error && data) {
            const imageBuffer = new Uint8Array(await data.arrayBuffer());
            console.log(`${logPrefix(jobId)} ✅ IMAGE FOUND: ${imagePath} (${imageBuffer.length} bytes)`);
            return { buffer: imageBuffer, path: imagePath };
          }
        } catch (pathError: any) {
          continue;
        }
      }

      console.error(`${logPrefix(jobId)} 🚨 IMAGE NOT FOUND: ${tagValue}`);
      
      if (missingImageBehavior === 'placeholder') {
        return { buffer: createMissingImagePlaceholder(), path: 'placeholder' };
      } else if (missingImageBehavior === 'skip') {
        return null;
      } else if (missingImageBehavior === 'fail') {
        throw new Error(`Missing required image: ${tagValue}`);
      }
      
      return { buffer: createMissingImagePlaceholder(), path: 'placeholder' };

    } catch (error: any) {
      console.error(`${logPrefix(jobId)} 💥 ERROR in getImage:`, error);
      
      if (missingImageBehavior === 'fail') {
        throw error;
      } else if (missingImageBehavior === 'placeholder') {
        return { buffer: createMissingImagePlaceholder(), path: 'placeholder' };
      }
      
      return null;
    }
  };
};

// Replace temporary markers with actual PowerPoint image XML
const replaceMarkersWithImages = async (
  zipContent: Uint8Array,
  markerMap: Map<string, any>,
  data: Record<string, string>,
  imageGetter: any,
  jobId: string,
  missingImageBehavior: string
): Promise<Uint8Array> => {
  console.log(`${logPrefix(jobId)} 🎨 REPLACING TEMPORARY MARKERS WITH ACTUAL IMAGES`);
  
  if (markerMap.size === 0) {
    console.log(`${logPrefix(jobId)} ✅ No image markers to process`);
    return zipContent;
  }
  
  try {
    const zip = new PizZip(zipContent);
    let modified = false;
    const imagesToAdd: Record<string, Uint8Array> = {};
    let imageCounter = 1;
    const relationshipsBySlide = new Map();

    // Process each marker
    for (const [tempMarker, markerInfo] of markerMap.entries()) {
      const { variableName, position, fileName } = markerInfo;
      const imageValue = data[variableName];
      
      if (!imageValue) {
        console.log(`${logPrefix(jobId)} ⚠️ No data for ${variableName}`);
        continue;
      }
      
      console.log(`${logPrefix(jobId)} 🖼️ PROCESSING MARKER: ${tempMarker} -> ${variableName}=${imageValue}`);
      
      try {
        const imageResult = await imageGetter(imageValue, variableName);
        
        if (imageResult && imageResult.buffer) {
          // Determine image format
          const isJpeg = imageValue.toLowerCase().includes('.jpg') || imageValue.toLowerCase().includes('.jpeg');
          const imageExt = isJpeg ? 'jpeg' : 'png';
          const imageFileName = `image${imageCounter}.${imageExt}`;
          const relationshipId = `rId${10000 + imageCounter}`;
          
          // Add image to media folder
          imagesToAdd[`ppt/media/${imageFileName}`] = imageResult.buffer;
          
          // Create proper PowerPoint image XML with correct namespaces
          const imageXml = `<p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <p:nvPicPr>
              <p:cNvPr id="${10000 + imageCounter}" name="Picture ${imageCounter}"/>
              <p:cNvPicPr/>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip r:embed="${relationshipId}"/>
              <a:stretch>
                <a:fillRect/>
              </a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm>
                <a:off x="${position.x}" y="${position.y}"/>
                <a:ext cx="${position.width}" cy="${position.height}"/>
              </a:xfrm>
              <a:prstGeom prst="rect">
                <a:avLst/>
              </a:prstGeom>
            </p:spPr>
          </p:pic>`;

          // Replace marker in slide content
          const slideFile = zip.files[fileName];
          if (slideFile && !slideFile.dir) {
            let slideContent = slideFile.asText();
            slideContent = slideContent.replace(tempMarker, imageXml);
            zip.file(fileName, slideContent);
            modified = true;
            console.log(`${logPrefix(jobId)} 🔧 Replaced marker ${tempMarker} with image: ${imageFileName}`);
          }
          
          // Track relationships for this slide
          if (!relationshipsBySlide.has(fileName)) {
            relationshipsBySlide.set(fileName, []);
          }
          relationshipsBySlide.get(fileName).push({
            relationshipId,
            imageFileName
          });
          
          imageCounter++;
        }
      } catch (error: any) {
        console.error(`${logPrefix(jobId)} ❌ Error processing ${variableName}:`, error);
        if (missingImageBehavior === 'fail') throw error;
      }
    }

    // Add relationships for each slide
    for (const [slideFileName, relationships] of relationshipsBySlide.entries()) {
      const relsFileName = slideFileName.replace(/slides\/slide(\d+)\.xml/, 'slides/_rels/slide$1.xml.rels');
      
      if (zip.files[relsFileName]) {
        let relsContent = zip.files[relsFileName].asText();
        
        for (const { relationshipId, imageFileName } of relationships) {
          const imageRelXml = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageFileName}"/>`;
          relsContent = relsContent.replace('</Relationships>', `  ${imageRelXml}\n</Relationships>`);
        }
        
        zip.file(relsFileName, relsContent);
        console.log(`${logPrefix(jobId)} 🔗 Added ${relationships.length} relationships to ${relsFileName}`);
      }
    }

    // Add images to media folder
    for (const [mediaPath, imageBuffer] of Object.entries(imagesToAdd)) {
      zip.file(mediaPath, imageBuffer);
      console.log(`${logPrefix(jobId)} 📁 Added to media: ${mediaPath}`);
    }

    // Update Content Types for new image formats
    if (modified && zip.files['[Content_Types].xml']) {
      let contentTypes = zip.files['[Content_Types].xml'].asText();
      
      if (!contentTypes.includes('image/png')) {
        const pngType = '<Default Extension="png" ContentType="image/png"/>';
        contentTypes = contentTypes.replace('</Types>', `  ${pngType}\n</Types>`);
      }
      
      if (!contentTypes.includes('image/jpeg')) {
        const jpegType = '<Default Extension="jpeg" ContentType="image/jpeg"/>';
        contentTypes = contentTypes.replace('</Types>', `  ${jpegType}\n</Types>`);
      }
      
      zip.file('[Content_Types].xml', contentTypes);
      console.log(`${logPrefix(jobId)} 📋 Updated content types`);
    }

    if (modified) {
      console.log(`${logPrefix(jobId)} ✅ IMAGE REPLACEMENT COMPLETE: Generated presentation with ${imageCounter - 1} images`);
      return zip.generate({ type: 'uint8array' });
    } else {
      console.log(`${logPrefix(jobId)} ✅ No modifications needed`);
      return zipContent;
    }
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ IMAGE REPLACEMENT ERROR:`, error);
    console.log(`${logPrefix(jobId)} 🔄 Falling back to original content`);
    return zipContent;
  }
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

    await updateProgress(supabaseAdmin, job.id, 5, `CSV parsed, processing ${totalRows} presentations...`);

    // --- 3. Extract Image Placeholders BEFORE docxtemplater ---
    console.log(`${logPrefix(job.id)} 🔍 STEP 1: EXTRACTING IMAGE PLACEHOLDERS WITH CONTEXT`);
    const detectedImagePlaceholders = extractImagePlaceholdersWithContext(new Uint8Array(templateData), job.id);

    // --- 4. Setup Image Configuration ---
    const missingImageBehavior = job.missing_image_behavior || 'placeholder';
    console.log(`${logPrefix(job.id)} 🎯 IMAGE BEHAVIOR: ${missingImageBehavior}`);
    
    const imageGetter = createImageGetter(
      supabaseAdmin, 
      job.templates.user_id, 
      job.template_id, 
      missingImageBehavior
    );

    // --- 5. Process Each Row and Generate Presentations ---
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
          
          // STEP 1: Replace image placeholders with temporary markers BEFORE docxtemplater
          console.log(`${logPrefix(job.id)} 🔄 STEP 2: REPLACING IMAGE PLACEHOLDERS WITH MARKERS`);
          const { zip: zipWithMarkers, markerMap } = replaceImagePlaceholdersWithMarkers(
            new Uint8Array(templateData), 
            detectedImagePlaceholders, 
            job.id
          );
          
          // STEP 2: Process text-only with docxtemplater (no image module!)
          console.log(`${logPrefix(job.id)} 🎨 STEP 3: PROCESSING TEXT WITH DOCXTEMPLATER`);
          const textOnlyData: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            if (!key.endsWith('_img')) {
              textOnlyData[key] = value;
            }
          }
          
          const doc = new Docxtemplater(zipWithMarkers, {
              paragraphLoop: true,
              linebreaks: true,
              delimiters: { start: '{{', end: '}}' },
              nullGetter: () => "",
              // NO IMAGE MODULES - text processing only
          });

          doc.render(textOnlyData);
          let generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
          
          // STEP 3: Replace temporary markers with actual PowerPoint image XML
          console.log(`${logPrefix(job.id)} 🎨 STEP 4: REPLACING MARKERS WITH ACTUAL IMAGES`);
          generatedBuffer = await replaceMarkersWithImages(
            generatedBuffer,
            markerMap,
            row, // Full data including image variables
            imageGetter,
            job.id,
            missingImageBehavior
          );
          
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

    // --- 6. Create and Upload ZIP Archive ---
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

    // --- 7. Finalize Job ---
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

    console.log(`${logPrefix(job.id)} 🎉 JOB COMPLETED SUCCESSFULLY with ${successfulPresentations}/${totalRows} presentations`);

    return new Response(JSON.stringify({ 
      message: `Job ${job.id} completed with ${successfulPresentations}/${totalRows} presentations.`,
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
