
import PizZip from 'https://esm.sh/pizzip@3.1.5';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.1';
import ImageModule from 'https://esm.sh/docxtemplater-image-module@3.1.0';

// Helper function to extract image variables from template
export const extractImageVariables = (templateData: ArrayBuffer): string[] => {
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

export const createDocumentFromTemplate = (
  templateData: ArrayBuffer,
  imageGetter: any,
  imageVariables: string[],
  jobId: string
) => {
  const zip = new PizZip(templateData);
  
  // Create a fresh ImageModule instance for each presentation with specific configuration
  const imageModule = new ImageModule({
    centered: false,
    getImage: imageGetter,
    getSize: () => [150, 150],
    getProps: (tagName: string, tagValue: string, meta: any) => {
      const isImageVariable = imageVariables.includes(tagName);
      console.log(`[job:${jobId}] Checking if ${tagName} is image variable: ${isImageVariable}`);
      
      if (isImageVariable) {
        console.log(`[job:${jobId}] Processing ${tagName} as image with value: ${tagValue}`);
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

  return doc;
};
