
/**
 * Normalize filename to ensure consistency across upload and retrieval
 * - Convert to lowercase
 * - Replace .jpeg with .jpg
 * - Trim whitespace
 */
export function normalizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return filename;
  }
  
  return filename
    .trim()
    .toLowerCase()
    .replace(/\.jpeg$/i, '.jpg');
}

/**
 * Extract filename from a full path
 */
export function extractFilename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Check if a filename is an image file
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.bmp', '.webp'];
  const ext = filename.toLowerCase().split('.').pop();
  return imageExtensions.includes(`.${ext}`);
}
