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

// Pre-process template to extract image placeholders before docxtemplater runs
const extractImagePlaceholders = (zipContent: Uint8Array, jobId: string): Array<{fileName: string, placeholders: string[]}> => {
  console.log(`${logPrefix(jobId)} 🔍 PRE-PROCESSING: Extracting image placeholders before docxtemplater`);
  
  try {
    const zip = new PizZip(zipContent);
    const slidesWithImagePlaceholders: Array<{fileName: string, placeholders: string[]}> = [];

    for (const fileName of Object.keys(zip.files)) {
      if (fileName.includes('slide') && fileName.endsWith('.xml') && !fileName.includes('_rels')) {
        console.log(`${logPrefix(jobId)} 📄 SCANNING: ${fileName}`);
        
        const file = zip.files[fileName];
        if (file && !file.dir) {
          let content = file.asText();
          
          // Find all image placeholders ({{*_img}}) in this slide
          const imagePlaceholderRegex = /\{\{([^}]+_img)\}\}/g;
          const placeholders: string[] = [];
          let match;
          
          while ((match = imagePlaceholderRegex.exec(content)) !== null) {
            const placeholder = match[0]; // Full placeholder like {{logo_img}}
            if (!placeholders.includes(placeholder)) {
              placeholders.push(placeholder);
              console.log(`${logPrefix(jobId)} 🎯 FOUND IMAGE PLACEHOLDER: ${placeholder} in ${fileName}`);
            }
          }
          
          if (placeholders.length > 0) {
            slidesWithImagePlaceholders.push({ fileName, placeholders });
          }
        }
      }
    }

    console.log(`${logPrefix(jobId)} 📊 PRE-PROCESS SUMMARY: Found ${slidesWithImagePlaceholders.length} slides with image placeholders`);
    return slidesWithImagePlaceholders;
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ PRE-PROCESS ERROR:`, error);
    return [];
  }
};

// Image storage path resolver
const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string, missingImageBehavior: string = 'placeholder') => {
  return async (tagValue: string, tagName: string) => {
    const jobId = 'current';
    console.log(`${logPrefix(jobId)} 🖼️ IMAGE GETTER CALLED!`);
    console.log(`${logPrefix(jobId)} 📋 Parameters: tagName="${tagName}", tagValue="${tagValue}"`);
    console.log(`${logPrefix(jobId)} 🗂️ Context: userId="${userId}", templateId="${templateId}"`);
    console.log(`${logPrefix(jobId)} ⚙️ Behavior: "${missingImageBehavior}"`);
    
    try {
      // Try different storage paths
      const pathsToTry = [
        `${userId}/${templateId}/${tagValue}`, // Primary: userId/templateId/filename
        `${userId}/${tagValue}`, // Flat structure fallback
        tagValue, // Root level fallback
      ];

      console.log(`${logPrefix(jobId)} 🔍 Will try ${pathsToTry.length} storage paths:`);
      pathsToTry.forEach((path, i) => console.log(`${logPrefix(jobId)}   ${i + 1}. ${path}`));
      
      for (const [index, imagePath] of pathsToTry.entries()) {
        console.log(`${logPrefix(jobId)} 📂 ATTEMPT ${index + 1}/${pathsToTry.length}: "${imagePath}"`);
        
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('images')
            .download(imagePath);

          if (!error && data) {
            const imageSize = data.size;
            const imageBuffer = new Uint8Array(await data.arrayBuffer());
            console.log(`${logPrefix(jobId)} ✅ SUCCESS! Image found at "${imagePath}"`);
            console.log(`${logPrefix(jobId)} 📊 Image size: ${imageSize} bytes, buffer length: ${imageBuffer.length}`);
            console.log(`${logPrefix(jobId)} 🎯 RETURNING IMAGE BUFFER`);
            return imageBuffer;
          } else {
            console.log(`${logPrefix(jobId)} ❌ Path failed: ${error?.message || 'No data'}`);
          }
        } catch (pathError: any) {
          console.log(`${logPrefix(jobId)} 💥 Exception at "${imagePath}": ${pathError.message}`);
        }
      }

      // No image found anywhere
      console.error(`${logPrefix(jobId)} 🚨 IMAGE NOT FOUND: "${tagValue}" not found in any location!`);
      console.log(`${logPrefix(jobId)} 🔧 Applying missing image behavior: "${missingImageBehavior}"`);
      
      if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🖼️ RETURNING PLACEHOLDER IMAGE`);
        return createMissingImagePlaceholder();
      } else if (missingImageBehavior === 'skip') {
        console.log(`${logPrefix(jobId)} ⏭️ SKIPPING MISSING IMAGE`);
        return null;
      } else if (missingImageBehavior === 'fail') {
        const errorMsg = `Missing required image: ${tagValue}`;
        console.error(`${logPrefix(jobId)} 💀 FAILING JOB: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Default fallback
      console.log(`${logPrefix(jobId)} 🔄 DEFAULT TO PLACEHOLDER`);
      return createMissingImagePlaceholder();

    } catch (error: any) {
      console.error(`${logPrefix(jobId)} 💥 CRITICAL ERROR in getImage:`, error);
      
      if (missingImageBehavior === 'fail') {
        throw error;
      } else if (missingImageBehavior === 'placeholder') {
        console.log(`${logPrefix(jobId)} 🆘 ERROR FALLBACK: Using placeholder`);
        return createMissingImagePlaceholder();
      }
      
      console.log(`${logPrefix(jobId)} ⏭️ ERROR FALLBACK: Skipping`);
      return null;
    }
  };
};

// Advanced image injection for text placeholders - now works on pre-identified placeholders
const injectImagesIntoSlides = async (
  zipContent: Uint8Array,
  data: Record<string, string>,
  imageGetter: any,
  jobId: string,
  missingImageBehavior: string,
  detectedPlaceholders: Array<{fileName: string, placeholders: string[]}>
): Promise<Uint8Array> => {
  console.log(`${logPrefix(jobId)} 🎨 ADVANCED IMAGE INJECTION: Processing ${detectedPlaceholders.length} slides with image placeholders`);
  
  if (detectedPlaceholders.length === 0) {
    console.log(`${logPrefix(jobId)} ✅ No image placeholders to process - returning original`);
    return zipContent;
  }
  
  try {
    const zip = new PizZip(zipContent);
    let modified = false;
    const imagesToAdd: Record<string, Uint8Array> = {};
    let imageCounter = 1;

    // Step 1: Process each slide with detected placeholders
    const imageReplacements: Array<{fileName: string, placeholder: string, imageData: string, relationshipId: string, imageFileName: string}> = [];

    for (const slideInfo of detectedPlaceholders) {
      const { fileName, placeholders } = slideInfo;
      console.log(`${logPrefix(jobId)} 📄 Processing slide: ${fileName} with ${placeholders.length} image placeholders`);
      
      for (const placeholder of placeholders) {
        // Extract variable name from placeholder (e.g., "logo_img" from "{{logo_img}}")
        const variableName = placeholder.replace(/[{}]/g, '');
        const imageValue = data[variableName];
        
        if (!imageValue) {
          console.log(`${logPrefix(jobId)} ⚠️ No data for image variable: ${variableName}`);
          continue;
        }
        
        console.log(`${logPrefix(jobId)} 🖼️ PROCESSING IMAGE PLACEHOLDER: ${placeholder} -> ${imageValue}`);
        
        try {
          // Get the image data
          const imageBuffer = await imageGetter(imageValue, variableName);
          
          if (imageBuffer) {
            const imageFileName = `image${imageCounter}.png`;
            const relationshipId = `rId${10000 + imageCounter}`; // Use high numbers to avoid conflicts
            
            imagesToAdd[`ppt/media/${imageFileName}`] = imageBuffer;
            imageReplacements.push({
              fileName,
              placeholder,
              imageData: imageValue,
              relationshipId,
              imageFileName
            });
            
            console.log(`${logPrefix(jobId)} ✅ Image prepared: ${imageValue} -> ${imageFileName} (${relationshipId})`);
            imageCounter++;
          } else {
            console.log(`${logPrefix(jobId)} ⚠️ No image data for ${placeholder}`);
            
            if (missingImageBehavior === 'placeholder') {
              const placeholderBuffer = createMissingImagePlaceholder();
              const imageFileName = `placeholder${imageCounter}.png`;
              const relationshipId = `rId${10000 + imageCounter}`;
              
              imagesToAdd[`ppt/media/${imageFileName}`] = placeholderBuffer;
              imageReplacements.push({
                fileName,
                placeholder,
                imageData: `[Missing: ${imageValue}]`,
                relationshipId,
                imageFileName
              });
              
              imageCounter++;
            }
          }
        } catch (error: any) {
          console.error(`${logPrefix(jobId)} ❌ Error processing image ${variableName}:`, error);
          
          if (missingImageBehavior === 'fail') {
            throw error;
          }
        }
      }
    }

    console.log(`${logPrefix(jobId)} 📊 Prepared ${imageReplacements.length} image replacements`);

    if (imageReplacements.length === 0) {
      console.log(`${logPrefix(jobId)} ✅ No images to inject - returning original`);
      return zipContent;
    }

    // Step 2: Add images to media folder
    for (const [mediaPath, imageBuffer] of Object.entries(imagesToAdd)) {
      zip.file(mediaPath, imageBuffer);
      console.log(`${logPrefix(jobId)} 📁 Added image to media: ${mediaPath} (${imageBuffer.length} bytes)`);
    }

    // Step 3: Replace text placeholders with proper image XML
    const processedSlides = new Set<string>();
    
    for (const replacement of imageReplacements) {
      const { fileName, placeholder, relationshipId, imageFileName } = replacement;
      
      // Process slide content
      const slideFile = zip.files[fileName];
      if (slideFile && !slideFile.dir) {
        let slideContent = slideFile.asText();
        
        // Verify the placeholder still exists
        if (!slideContent.includes(placeholder)) {
          console.log(`${logPrefix(jobId)} ⚠️ Placeholder ${placeholder} not found in ${fileName} - may have been processed already`);
          continue;
        }
        
        // Create proper PowerPoint image XML
        const imageXml = `
<p:pic>
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
      <a:off x="1270000" y="1270000"/>
      <a:ext cx="2540000" cy="1905000"/>
    </a:xfrm>
    <a:prstGeom prst="rect">
      <a:avLst/>
    </a:prstGeom>
  </p:spPr>
</p:pic>`.trim();

        // Replace the text placeholder with image XML
        slideContent = slideContent.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
          imageXml
        );
        
        zip.file(fileName, slideContent);
        processedSlides.add(fileName);
        modified = true;
        
        console.log(`${logPrefix(jobId)} 🔧 Replaced ${placeholder} with image XML in ${fileName}`);
      }

      // Process relationship file
      const relsFileName = fileName.replace(/slides\/slide(\d+)\.xml/, 'slides/_rels/slide$1.xml.rels');
      
      if (zip.files[relsFileName]) {
        let relsContent = zip.files[relsFileName].asText();
        
        // Add image relationship
        const imageRelXml = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageFileName}"/>`;
        
        // Insert before closing tag
        relsContent = relsContent.replace('</Relationships>', `  ${imageRelXml}\n</Relationships>`);
        
        zip.file(relsFileName, relsContent);
        console.log(`${logPrefix(jobId)} 🔗 Added relationship ${relationshipId} to ${relsFileName}`);
      }
    }

    // Step 4: Update Content Types
    if (modified && zip.files['[Content_Types].xml']) {
      let contentTypes = zip.files['[Content_Types].xml'].asText();
      
      // Add PNG content type if not present
      if (!contentTypes.includes('image/png')) {
        const pngType = '<Default Extension="png" ContentType="image/png"/>';
        contentTypes = contentTypes.replace('<Types', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  ${pngType}`);
        zip.file('[Content_Types].xml', contentTypes);
        console.log(`${logPrefix(jobId)} 📋 Updated content types for PNG images`);
      }
    }

    if (modified) {
      console.log(`${logPrefix(jobId)} ✅ IMAGE INJECTION COMPLETE: Generated new presentation with ${imageReplacements.length} images`);
      return zip.generate({ type: 'uint8array' });
    } else {
      console.log(`${logPrefix(jobId)} ✅ No modifications needed`);
      return zipContent;
    }
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ IMAGE INJECTION ERROR:`, error);
    console.log(`${logPrefix(jobId)} 🔄 Falling back to original content`);
    return zipContent; // Return original on error
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
  console.log(`${logPrefix(job.id)} 📋 Job details:`, {
    id: job.id,
    userId: job.templates.user_id,
    templateId: job.template_id,
    missingImageBehavior: job.missing_image_behavior || 'placeholder'
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

    // --- 3. PRE-PROCESS: Extract Image Placeholders ---
    console.log(`${logPrefix(job.id)} 🔍 STEP 1: PRE-PROCESSING TEMPLATE FOR IMAGE PLACEHOLDERS`);
    const detectedImagePlaceholders = extractImagePlaceholders(new Uint8Array(templateData), job.id);

    // --- 4. Setup Image Configuration ---
    const missingImageBehavior = job.missing_image_behavior || 'placeholder';
    console.log(`${logPrefix(job.id)} 🎯 IMAGE PROCESSING SETUP: behavior="${missingImageBehavior}"`);
    
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
          console.log(`${logPrefix(job.id)} 🔄 STARTING PRESENTATION ${index + 1}/${totalRows}`);
          console.log(`${logPrefix(job.id)} 📝 Row data keys:`, Object.keys(row));
          console.log(`${logPrefix(job.id)} 📝 Row data values:`, Object.values(row));
          
          // STEP 1: Create fresh instances for each presentation
          console.log(`${logPrefix(job.id)} 📦 Creating fresh PizZip from template data`);
          const zip = new PizZip(templateData);
          
          // STEP 2: Split data - remove image variables for docxtemplater, keep them for post-processing
          const textOnlyData: Record<string, string> = {};
          const imageData: Record<string, string> = {};
          
          for (const [key, value] of Object.entries(row)) {
            if (key.endsWith('_img')) {
              imageData[key] = value;
              console.log(`${logPrefix(job.id)} 🖼️ SEPARATED IMAGE VAR: ${key} = ${value}`);
            } else {
              textOnlyData[key] = value;
            }
          }
          
          console.log(`${logPrefix(job.id)} 📊 DATA SPLIT: ${Object.keys(textOnlyData).length} text vars, ${Object.keys(imageData).length} image vars`);
          
          // STEP 3: Run docxtemplater with text-only data (NO IMAGE MODULE!)
          console.log(`${logPrefix(job.id)} 🔧 Configuring docxtemplater WITHOUT image module`);
          const doc = new Docxtemplater(zip, {
              paragraphLoop: true,
              linebreaks: true,
              delimiters: { start: '{{', end: '}}' },
              nullGetter: () => "",
              // NO MODULES! This is key - we don't want any image processing at all
          });

          console.log(`${logPrefix(job.id)} 🎨 RENDERING TEMPLATE with TEXT-ONLY data for row ${index + 1}`);
          console.log(`${logPrefix(job.id)} 📊 Text data being passed:`, textOnlyData);
          doc.render(textOnlyData);
          
          console.log(`${logPrefix(job.id)} 📦 GENERATING OUTPUT FILE for row ${index + 1}`);
          let generatedBuffer = doc.getZip().generate({ type: 'uint8array' });
          
          // STEP 4: Now inject images into the remaining placeholders
          console.log(`${logPrefix(job.id)} 🎨 INJECTING IMAGES into preserved placeholders`);
          generatedBuffer = await injectImagesIntoSlides(
            generatedBuffer, 
            { ...textOnlyData, ...imageData }, // Full data for image injection
            imageGetter, 
            job.id, 
            missingImageBehavior,
            detectedImagePlaceholders
          );
          
          // Generate filename
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
          
          console.log(`${logPrefix(job.id)} ⬆️ UPLOADING to storage: ${outputPath}`);
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
    
    if (processingErrors.length > 0) {
      console.warn(`${logPrefix(job.id)} ⚠️ Processing errors encountered: ${processingErrors.join('; ')}`);
    }

    // --- 6. Create and Upload ZIP Archive ---
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

    console.log(`${logPrefix(job.id)} 🎉 JOB COMPLETED SUCCESSFULLY with ${successfulPresentations}/${totalRows} presentations.${processingErrors.length > 0 ? ` With ${processingErrors.length} warnings.` : ''}`);

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
