
import { supabase } from '@/integrations/supabase/client';

export interface StorageValidationResult {
  isValid: boolean;
  missingImages: string[];
  errors: string[];
}

/**
 * Validates that all referenced images exist in storage before creating a job
 */
export async function validateImagesInStorage(
  userId: string,
  templateId: string,
  imageFilenames: string[]
): Promise<StorageValidationResult> {
  const missingImages: string[] = [];
  const errors: string[] = [];

  if (imageFilenames.length === 0) {
    return { isValid: true, missingImages: [], errors: [] };
  }

  try {
    // Check each image file
    for (const filename of imageFilenames) {
      const normalizedFilename = filename.toLowerCase().replace(/\.jpeg$/i, '.jpg');
      const imagePath = `${userId}/${templateId}/${normalizedFilename}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .list(`${userId}/${templateId}`, {
          search: normalizedFilename
        });

      if (error) {
        errors.push(`Error checking ${filename}: ${error.message}`);
        continue;
      }

      // Check if file exists in the list
      const fileExists = data?.some(file => 
        file.name.toLowerCase() === normalizedFilename
      );

      if (!fileExists) {
        missingImages.push(filename);
      }
    }
  } catch (error: any) {
    errors.push(`Storage validation failed: ${error.message}`);
  }

  return {
    isValid: missingImages.length === 0 && errors.length === 0,
    missingImages,
    errors
  };
}

/**
 * Gets unique image filenames from CSV data for specified image columns
 */
export function extractImageFilenames(
  csvData: Record<string, string>[],
  imageColumns: string[]
): string[] {
  const uniqueFilenames = new Set<string>();

  imageColumns.forEach(column => {
    csvData.forEach(row => {
      const value = row[column];
      if (value && value.trim()) {
        uniqueFilenames.add(value.trim());
      }
    });
  });

  return Array.from(uniqueFilenames);
}
