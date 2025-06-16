
import * as fflate from 'https://esm.sh/fflate@0.8.2';
import { renderTemplate, sanitizeFilename } from './filename.ts';

export const generateUniqueFilename = (
  job: any,
  row: Record<string, string>,
  index: number,
  usedFilenames: Set<string>
): string => {
  let outputFilename;
  if (job.filename_template) {
    const renderedName = renderTemplate(job.filename_template, row);
    const sanitized = sanitizeFilename(renderedName);
    console.log(`[job:${job.id}] Sanitizing filename: "${renderedName}" -> "${sanitized}"`);
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
  
  return finalFilename;
};

export const createZipArchive = async (
  storageClient: any,
  outputPaths: string[]
): Promise<Uint8Array> => {
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

  return fflate.zipSync(filesToZipObj);
};
