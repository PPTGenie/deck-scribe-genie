
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Extracts variables from a .pptx file template.
 * Variables are expected to be in {{variable_name}} format.
 * @param file The .pptx file to parse.
 * @returns A promise that resolves with an array of unique variable names.
 */
export const extractTemplateVariables = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (!content) {
                    return reject(new Error("Failed to read file content."));
                }
                const zip = new PizZip(content as ArrayBuffer);
                
                const doc = new Docxtemplater(zip, {
                    delimiters: {
                        start: '{{',
                        end: '}}'
                    },
                    paragraphLoop: true,
                    linebreaks: true,
                    // nullGetter is used to prevent errors when parsing templates with variables that have no data provided.
                    // We are only interested in extracting the tags.
                    nullGetter: () => "", 
                });

                // This will throw an error if the template is corrupt
                doc.render();
                
                const allTags = doc.inspectModule('parser').getAllTags();
                const variables = Object.keys(allTags);

                resolve([...new Set(variables)]);
            } catch (error: any) {
                console.error("Error parsing PPTX file:", error);
                if (error.properties && error.properties.id === 'corrupted_zip') {
                   reject(new Error("Could not parse the presentation file. It seems to be corrupted."));
                } else {
                   reject(new Error("Could not parse the presentation file. Please ensure it's a valid .pptx file."));
                }
            }
        };
        reader.onerror = () => {
            reject(new Error("Failed to read file."));
        };
        reader.readAsArrayBuffer(file);
    });
};
