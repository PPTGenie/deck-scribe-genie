
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

// XML validation utility
const validateXMLStructure = (xmlContent: string, fileName: string, jobId: string): boolean => {
  try {
    // Basic XML well-formedness check
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error(`${logPrefix(jobId)} ❌ XML Parse Error in ${fileName}:`, parserError.textContent);
      return false;
    }
    
    // Check for required PowerPoint namespaces if it's a slide
    if (fileName.includes('slide') && fileName.endsWith('.xml')) {
      const requiredNamespaces = [
        'http://schemas.openxmlformats.org/presentationml/2006/main',
        'http://schemas.openxmlformats.org/drawingml/2006/main'
      ];
      
      for (const ns of requiredNamespaces) {
        if (!xmlContent.includes(ns)) {
          console.warn(`${logPrefix(jobId)} ⚠️ Missing namespace ${ns} in ${fileName}`);
        }
      }
    }
    
    console.log(`${logPrefix(jobId)} ✅ XML validation passed for ${fileName}`);
    return true;
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ XML validation failed for ${fileName}:`, error);
    return false;
  }
};

// Enhanced image placeholder extraction with XML structure preservation
const extractImagePlaceholdersWithContext = (zipContent: Uint8Array, jobId: string): Array<{
  fileName: string; 
  placeholders: Array<{
    placeholder: string;
    variableName: string;
    parentElement: string;
    position: { x: number; y: number; width: number; height: number };
    tempMarker: string;
  }>
}> => {
  console.log(`${logPrefix(jobId)} 🔍 EXTRACTING IMAGE PLACEHOLDERS WITH ENHANCED CONTEXT`);
  
  try {
    const zip = new PizZip(zipContent);
    const slidesWithImagePlaceholders: Array<{
      fileName: string; 
      placeholders: Array<{
        placeholder: string;
        variableName: string;
        parentElement: string;
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
          
          // Validate XML structure first
          if (!validateXMLStructure(content, fileName, jobId)) {
            console.error(`${logPrefix(jobId)} ❌ Skipping ${fileName} due to XML validation failure`);
            continue;
          }
          
          const placeholders: Array<{
            placeholder: string;
            variableName: string;
            parentElement: string;
            position: { x: number; y: number; width: number; height: number };
            tempMarker: string;
          }> = [];
          
          // Find text elements containing image placeholders within their XML context
          const textRunRegex = /<a:t[^>]*>([^<]*\{\{[^}]+_img\}\}[^<]*)<\/a:t>/g;
          let match;
          
          while ((match = textRunRegex.exec(content)) !== null) {
            const textContent = match[1];
            const imagePlaceholderRegex = /\{\{([^}]+_img)\}\}/g;
            let imgMatch;
            
            while ((imgMatch = imagePlaceholderRegex.exec(textContent)) !== null) {
              const placeholder = imgMatch[0]; // {{logo_img}}
              const variableName = imgMatch[1]; // logo_img
              
              // Find the parent shape element that contains this text run
              const fullMatch = match[0];
              const matchIndex = match.index;
              const beforeMatch = content.substring(0, matchIndex);
              const afterMatch = content.substring(matchIndex + fullMatch.length);
              
              // Find the containing shape
              const shapeStartRegex = /<p:sp[^>]*>/g;
              const shapeEndRegex = /<\/p:sp>/g;
              
              let shapeStart = -1;
              let shapeMatch;
              while ((shapeMatch = shapeStartRegex.exec(beforeMatch)) !== null) {
                shapeStart = shapeMatch.index;
              }
              
              if (shapeStart === -1) continue;
              
              const shapeEnd = afterMatch.search(shapeEndRegex);
              if (shapeEnd === -1) continue;
              
              const fullShapeXml = content.substring(shapeStart, matchIndex + fullMatch.length + shapeEnd + 7); // +7 for </p:sp>
              
              // Extract position with better defaults
              const positionMatch = fullShapeXml.match(/<a:xfrm[^>]*>.*?<a:off[^>]*x="([^"]*)"[^>]*y="([^"]*)".*?<a:ext[^>]*cx="([^"]*)"[^>]*cy="([^"]*)".*?<\/a:xfrm>/s);
              const position = {
                x: positionMatch ? parseInt(positionMatch[1]) || 914400 : 914400,  // Default to 1 inch
                y: positionMatch ? parseInt(positionMatch[2]) || 914400 : 914400,  // Default to 1 inch
                width: positionMatch ? parseInt(positionMatch[3]) || 2743200 : 2743200,  // Default to 3 inches
                height: positionMatch ? parseInt(positionMatch[4]) || 2057400 : 2057400   // Default to 2.25 inches
              };
              
              // Create unique temporary marker
              const tempMarker = `__TEMP_IMG_${crypto.randomUUID().replace(/-/g, '')}__`;
              
              placeholders.push({
                placeholder,
                variableName,
                parentElement: fullShapeXml,
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

    console.log(`${logPrefix(jobId)} 📊 ENHANCED CONTEXT EXTRACTION: Found ${slidesWithImagePlaceholders.length} slides with image placeholders`);
    return slidesWithImagePlaceholders;
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ ENHANCED CONTEXT EXTRACTION ERROR:`, error);
    return [];
  }
};

// Replace image placeholders with temporary markers
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

// Generate PowerPoint-compliant image XML with proper structure
const generatePowerPointImageXML = (
  imageId: number,
  relationshipId: string,
  position: { x: number; y: number; width: number; height: number }
): string => {
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${10000 + imageId}" name="Picture ${imageId}"/>
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
};

// Enhanced image replacement with proper XML structure handling
const replaceMarkersWithImages = async (
  zipContent: Uint8Array,
  markerMap: Map<string, any>,
  data: Record<string, string>,
  imageGetter: any,
  jobId: string,
  missingImageBehavior: string
): Promise<Uint8Array> => {
  console.log(`${logPrefix(jobId)} 🎨 REPLACING TEMPORARY MARKERS WITH POWERPOINT-COMPLIANT IMAGES`);
  
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
          
          // Generate PowerPoint-compliant image XML
          const imageXml = generatePowerPointImageXML(imageCounter, relationshipId, position);

          // Replace marker in slide content with proper XML structure
          const slideFile = zip.files[fileName];
          if (slideFile && !slideFile.dir) {
            let slideContent = slideFile.asText();
            
            // Find the text run containing the marker and replace the entire text run with image
            const textRunPattern = new RegExp(`<a:t[^>]*>[^<]*${tempMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</a:t>`, 'g');
            
            if (textRunPattern.test(slideContent)) {
              // Replace the text run with a placeholder that we'll later replace with proper image structure
              slideContent = slideContent.replace(textRunPattern, `<!--IMAGE_PLACEHOLDER_${imageCounter}-->`);
              
              // Now find the parent paragraph and replace it with proper image structure
              const paragraphPattern = new RegExp(`<a:p[^>]*>.*?<!--IMAGE_PLACEHOLDER_${imageCounter}-->.*?</a:p>`, 's');
              slideContent = slideContent.replace(paragraphPattern, imageXml);
            } else {
              // Fallback: direct replacement if text run pattern doesn't match
              slideContent = slideContent.replace(tempMarker, imageXml);
            }
            
            // Validate the resulting XML
            if (validateXMLStructure(slideContent, fileName, jobId)) {
              zip.file(fileName, slideContent);
              modified = true;
              console.log(`${logPrefix(jobId)} 🔧 Successfully replaced marker ${tempMarker} with PowerPoint image: ${imageFileName}`);
            } else {
              console.error(`${logPrefix(jobId)} ❌ XML validation failed after image replacement for ${tempMarker}`);
              continue;
            }
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

    // Add relationships for each slide with proper XML structure
    for (const [slideFileName, relationships] of relationshipsBySlide.entries()) {
      const relsFileName = slideFileName.replace(/slides\/slide(\d+)\.xml/, 'slides/_rels/slide$1.xml.rels');
      
      if (zip.files[relsFileName]) {
        let relsContent = zip.files[relsFileName].asText();
        
        // Validate existing relationships XML
        if (!validateXMLStructure(relsContent, relsFileName, jobId)) {
          console.error(`${logPrefix(jobId)} ❌ Invalid relationships XML: ${relsFileName}`);
          continue;
        }
        
        for (const { relationshipId, imageFileName } of relationships) {
          const imageRelXml = `  <Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageFileName}"/>`;
          relsContent = relsContent.replace('</Relationships>', `${imageRelXml}\n</Relationships>`);
        }
        
        // Validate the modified relationships XML
        if (validateXMLStructure(relsContent, relsFileName, jobId)) {
          zip.file(relsFileName, relsContent);
          console.log(`${logPrefix(jobId)} 🔗 Added ${relationships.length} relationships to ${relsFileName}`);
        } else {
          console.error(`${logPrefix(jobId)} ❌ Failed to validate modified relationships XML: ${relsFileName}`);
        }
      }
    }

    // Add images to media folder
    for (const [mediaPath, imageBuffer] of Object.entries(imagesToAdd)) {
      zip.file(mediaPath, imageBuffer);
      console.log(`${logPrefix(jobId)} 📁 Added to media: ${mediaPath}`);
    }

    // Update Content Types with proper XML handling
    if (modified && zip.files['[Content_Types].xml']) {
      let contentTypes = zip.files['[Content_Types].xml'].asText();
      
      // Validate existing content types
      if (validateXMLStructure(contentTypes, '[Content_Types].xml', jobId)) {
        if (!contentTypes.includes('image/png')) {
          const pngType = '  <Default Extension="png" ContentType="image/png"/>';
          contentTypes = contentTypes.replace('</Types>', `${pngType}\n</Types>`);
        }
        
        if (!contentTypes.includes('image/jpeg')) {
          const jpegType = '  <Default Extension="jpeg" ContentType="image/jpeg"/>';
          contentTypes = contentTypes.replace('</Types>', `${jpegType}\n</Types>`);
        }
        
        // Validate the modified content types
        if (validateXMLStructure(contentTypes, '[Content_Types].xml', jobId)) {
          zip.file('[Content_Types].xml', contentTypes);
          console.log(`${logPrefix(jobId)} 📋 Updated content types with validation`);
        } else {
          console.error(`${logPrefix(jobId)} ❌ Failed to validate modified content types`);
        }
      } else {
        console.error(`${logPrefix(jobId)} ❌ Invalid content types XML structure`);
      }
    }

    if (modified) {
      const generatedZip = zip.generate({ type: 'uint8array' });
      console.log(`${logPrefix(jobId)} ✅ POWERPOINT-COMPLIANT IMAGE REPLACEMENT COMPLETE: Generated presentation with ${imageCounter - 1} images`);
      return generatedZip;
    } else {
      console.log(`${logPrefix(jobId)} ✅ No modifications needed`);
      return zipContent;
    }
    
  } catch (error: any) {
    console.error(`${logPrefix(jobId)} ❌ POWERPOINT-COMPLIANT IMAGE REPLACEMENT ERROR:`, error);
    console.log(`${logPrefix(jobId)} 🔄 Falling back to original content due to XML validation failure`);
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

    // --- 3. Extract Image Placeholders with Enhanced Context ---
    console.log(`${logPrefix(job.id)} 🔍 STEP 1: EXTRACTING IMAGE PLACEHOLDERS WITH ENHANCED CONTEXT`);
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
          console.log(`${logPrefix(job.id)} 🔄 PROCESSING PRESENTATION ${index + 1}/${totalRows} with XML validation`);
          
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
          
          // STEP 3: Replace temporary markers with PowerPoint-compliant image XML
          console.log(`${logPrefix(job.id)} 🎨 STEP 4: REPLACING MARKERS WITH POWERPOINT-COMPLIANT IMAGES`);
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
          console.log(`${logPrefix(job.id)} ✅ SUCCESSFULLY PROCESSED XML-validated presentation ${index + 1}/${totalRows}`);
          
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

    console.log(`${logPrefix(job.id)} 📊 PROCESSING SUMMARY: ${successfulPresentations}/${totalRows} presentations successful with XML validation`);

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

    console.log(`${logPrefix(job.id)} 🎉 JOB COMPLETED SUCCESSFULLY with XML validation: ${successfulPresentations}/${totalRows} presentations`);

    return new Response(JSON.stringify({ 
      message: `Job ${job.id} completed with XML validation: ${successfulPresentations}/${totalRows} presentations.`,
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
