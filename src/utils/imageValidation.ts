
// Valid image extensions (case-insensitive)
const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedValue?: string;
}

export interface CSVImageValidationResult {
  isValid: boolean;
  errors: string[];
  invalidFiles: { column: string; value: string; suggested?: string }[];
}

/**
 * Validates a single image filename
 */
export function validateImageFilename(filename: string): ImageValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { isValid: true, errors: [] }; // Empty values are okay
  }

  const trimmed = filename.trim();
  if (!trimmed) {
    return { isValid: true, errors: [] };
  }

  // Extract extension
  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      isValid: false,
      errors: [`"${trimmed}" has no file extension. Expected: ${VALID_IMAGE_EXTENSIONS.join(', ')}`]
    };
  }

  const extension = trimmed.substring(lastDotIndex).toLowerCase();
  const baseName = trimmed.substring(0, lastDotIndex);

  // Check if extension is valid
  if (!VALID_IMAGE_EXTENSIONS.includes(extension)) {
    // Try to suggest a correction for common typos
    let suggested: string | undefined;
    if (extension === '.pmg' || extension === '.pnq') {
      suggested = `${baseName}.png`;
    } else if (extension === '.jpe' || extension === '.jpge') {
      suggested = `${baseName}.jpg`;
    }

    return {
      isValid: false,
      errors: [`"${trimmed}" has invalid extension "${extension}". Expected: ${VALID_IMAGE_EXTENSIONS.join(', ')}${suggested ? `. Did you mean "${suggested}"?` : ''}`],
      normalizedValue: suggested
    };
  }

  // Normalize the filename (lowercase extension)
  const normalizedFilename = `${baseName}${extension}`;
  
  return {
    isValid: true,
    errors: [],
    normalizedValue: normalizedFilename
  };
}

/**
 * Validates all image filenames in CSV data for image columns
 */
export function validateCSVImages(
  csvData: Record<string, string>[],
  imageColumns: string[]
): CSVImageValidationResult {
  const errors: string[] = [];
  const invalidFiles: { column: string; value: string; suggested?: string }[] = [];

  imageColumns.forEach(column => {
    const uniqueValues = new Set<string>();
    
    csvData.forEach((row, rowIndex) => {
      const value = row[column];
      if (value && value.trim()) {
        uniqueValues.add(value.trim());
      }
    });

    uniqueValues.forEach(value => {
      const validation = validateImageFilename(value);
      if (!validation.isValid) {
        invalidFiles.push({
          column,
          value,
          suggested: validation.normalizedValue
        });
        errors.push(`Column "${column}": ${validation.errors[0]}`);
      }
    });
  });

  return {
    isValid: invalidFiles.length === 0,
    errors,
    invalidFiles
  };
}

/**
 * Normalizes image filename extensions to lowercase
 */
export function normalizeImageFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return filename;
  }

  const trimmed = filename.trim();
  const lastDotIndex = trimmed.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return trimmed;
  }

  const baseName = trimmed.substring(0, lastDotIndex);
  const extension = trimmed.substring(lastDotIndex).toLowerCase();
  
  return `${baseName}${extension}`;
}
