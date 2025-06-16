
import PizZip from 'https://esm.sh/pizzip@3.1.5';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.1';
import ImageModule from 'https://esm.sh/docxtemplater-image-module@3.1.0';

// Extract image variables from template
export const extractImageVariables = (templateData: ArrayBuffer): string[] => {
  try {
    const zip = new PizZip(templateData);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

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

// Create document with proper image module configuration
export const createDocumentFromTemplate = (
  templateData: ArrayBuffer,
  imageGetter: any,
  imageVariables: string[]
) => {
  const zip = new PizZip(templateData);
  
  const imageModule = new ImageModule({
    centered: false,
    getImage: imageGetter,
    getSize: () => [150, 150],
    getProps: (tagName: string) => {
      // Only process variables that end with _img as images
      if (imageVariables.includes(tagName)) {
        return {
          centered: false,
          getSize: () => [150, 150]
        };
      }
      return false; // Let docxtemplater handle as text
    }
  });
  
  return new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => "",
    modules: [imageModule]
  });
};
