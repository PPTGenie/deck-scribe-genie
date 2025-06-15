
// Image processing helper
export const createImageGetter = (supabaseAdmin: any, userId: string, templateId: string) => {
  return async (tagValue: string, tagName: string) => {
    try {
      // Normalize the image filename
      const normalizedFilename = tagValue.toLowerCase()
        .replace(/\.jpeg$/i, '.jpg')
        .replace(/\.png$/i, '.png')
        .replace(/\.jpg$/i, '.jpg');

      const imagePath = `${userId}/${templateId}/${normalizedFilename}`;
      
      console.log(`Fetching image: ${imagePath}`);
      
      const { data, error } = await supabaseAdmin.storage
        .from('images')
        .download(imagePath);

      if (error) {
        console.warn(`Image not found: ${imagePath}, trying without path...`);
        // Try alternative path (flat structure)
        const flatPath = `${userId}/${templateId}/${tagValue}`;
        const { data: flatData, error: flatError } = await supabaseAdmin.storage
          .from('images')
          .download(flatPath);
        
        if (flatError) {
          console.error(`Image not found in either location: ${imagePath} or ${flatPath}`);
          return null; // Return null for missing images rather than throwing
        }
        
        return new Uint8Array(await flatData.arrayBuffer());
      }

      return new Uint8Array(await data.arrayBuffer());
    } catch (error) {
      console.error(`Error loading image ${tagValue}:`, error);
      return null;
    }
  };
};

export const createImageOptions = (imageGetter: any) => {
  return {
    centered: false,
    getImage: imageGetter,
    getSize: () => [150, 150], // Default size in pixels
  };
};
