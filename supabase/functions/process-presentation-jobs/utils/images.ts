
// Image processing utilities
export const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string) => {
  return async (tagValue: string) => {
    try {
      console.log(`Image getter called for: ${tagValue}`);
      
      // Try the exact filename first
      let imagePath = `${userId}/${templateId}/${tagValue}`;
      
      let { data, error } = await supabaseAdmin.storage
        .from('images')
        .download(imagePath);

      if (error) {
        // Try with normalized filename (lowercase, .jpeg -> .jpg)
        const normalizedFilename = tagValue.toLowerCase().replace(/\.jpeg$/i, '.jpg');
        imagePath = `${userId}/${templateId}/${normalizedFilename}`;
        
        const result = await supabaseAdmin.storage
          .from('images')
          .download(imagePath);
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error(`Image not found: ${tagValue} at ${imagePath}`);
        return null;
      }

      console.log(`Successfully loaded image: ${tagValue}`);
      const arrayBuffer = await data.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (err) {
      console.error(`Error loading image ${tagValue}:`, err);
      return null;
    }
  };
};
