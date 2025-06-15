
export interface ImageValidationResult {
  isValid: boolean;
  suggestedFix?: string;
  error?: string;
}

const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

const COMMON_TYPOS: Record<string, string> = {
  '.pmg': '.png',
  '.pngg': '.png',
  '.pgn': '.png',
  '.jpge': '.jpeg',
  '.jepg': '.jpeg',
  '.jpg': '.jpg', // normalize jpeg to jpg
  '.jpeg': '.jpg',
  '.svg': '.svg',
  '.png': '.png',
};

export function validateImageExtension(filename: string): ImageValidationResult {
  if (!filename || typeof filename !== 'string') {
    return {
      isValid: false,
      error: 'Invalid filename'
    };
  }

  const normalizedFilename = filename.toLowerCase().trim();
  
  // Extract extension
  const lastDotIndex = normalizedFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      isValid: false,
      error: 'No file extension found',
      suggestedFix: `${filename}.png`
    };
  }

  const extension = normalizedFilename.substring(lastDotIndex);
  
  // Check if it's a valid extension
  if (VALID_IMAGE_EXTENSIONS.includes(extension)) {
    return { isValid: true };
  }

  // Check for common typos
  const suggestedExtension = COMMON_TYPOS[extension];
  if (suggestedExtension) {
    const suggestedFilename = filename.substring(0, filename.lastIndexOf('.')) + suggestedExtension;
    return {
      isValid: false,
      error: `Invalid extension "${extension}"`,
      suggestedFix: suggestedFilename
    };
  }

  return {
    isValid: false,
    error: `"${extension}" is not a supported image format. Use: ${VALID_IMAGE_EXTENSIONS.join(', ')}`
  };
}

export function validateAllImageFilenames(csvData: Record<string, string>[], imageColumns: string[]) {
  const issues: Array<{
    row: number;
    column: string;
    filename: string;
    validation: ImageValidationResult;
  }> = [];

  csvData.forEach((row, rowIndex) => {
    imageColumns.forEach(column => {
      const filename = row[column];
      if (filename) {
        const validation = validateImageExtension(filename);
        if (!validation.isValid) {
          issues.push({
            row: rowIndex + 1, // 1-based for user display
            column,
            filename,
            validation
          });
        }
      }
    });
  });

  return issues;
}

export function generateCorrectedCSV(csvData: Record<string, string>[], imageColumns: string[]) {
  return csvData.map(row => {
    const correctedRow = { ...row };
    imageColumns.forEach(column => {
      const filename = row[column];
      if (filename) {
        const validation = validateImageExtension(filename);
        if (!validation.isValid && validation.suggestedFix) {
          correctedRow[column] = validation.suggestedFix;
        }
      }
    });
    return correctedRow;
  });
}
