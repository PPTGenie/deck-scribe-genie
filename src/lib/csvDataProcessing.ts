
/**
 * Detects and converts scientific notation strings back to full numeric representation
 */
export function convertScientificNotation(value: string): string {
  if (typeof value !== 'string') return value;
  
  // Pattern to match scientific notation: optional minus, digits, optional decimal, optional digits, E/e, optional +/-, digits
  const scientificPattern = /^-?\d+\.?\d*[eE][+-]?\d+$/;
  
  if (!scientificPattern.test(value)) {
    return value;
  }
  
  try {
    // Convert to number then back to string to get full representation
    const num = parseFloat(value);
    
    // For very large numbers, use toFixed(0) to avoid decimal places
    // For smaller numbers, preserve precision but remove unnecessary decimals
    if (Math.abs(num) >= 1e15) {
      return num.toFixed(0);
    } else {
      // Remove trailing zeros and unnecessary decimal point
      return num.toString().replace(/\.?0+$/, '');
    }
  } catch (error) {
    console.warn('Failed to convert scientific notation:', value, error);
    return value;
  }
}

/**
 * Processes CSV data to convert scientific notation values
 */
export function processCsvData(data: Record<string, string>[]): {
  processedData: Record<string, string>[];
  conversionsFound: Array<{ row: number; column: string; original: string; converted: string }>;
} {
  const conversionsFound: Array<{ row: number; column: string; original: string; converted: string }> = [];
  
  const processedData = data.map((row, rowIndex) => {
    const processedRow: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(row)) {
      const converted = convertScientificNotation(value);
      processedRow[key] = converted;
      
      if (converted !== value) {
        conversionsFound.push({
          row: rowIndex + 1, // 1-based for user display
          column: key,
          original: value,
          converted: converted
        });
      }
    }
    
    return processedRow;
  });
  
  return { processedData, conversionsFound };
}
