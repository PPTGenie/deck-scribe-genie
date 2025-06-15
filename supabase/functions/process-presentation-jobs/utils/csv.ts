// Parse CSV while ensuring all values remain as strings
export const parseCSVAsStrings = (csvData: string): Record<string, string>[] => {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file requires a header row and at least one data row.');
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(header => header.trim().replace(/^["']|["']$/g, ''));

  // Parse data rows
  const dataRows = lines.slice(1);
  const parsedData: Record<string, string>[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const line = dataRows[i].trim();
    if (!line) continue; // Skip empty lines

    // Simple CSV parsing that preserves all values as strings
    const values = line.split(',').map(value => {
      // Remove surrounding quotes if present, but keep the value as a string
      return value.trim().replace(/^["']|["']$/g, '');
    });

    if (values.length !== headers.length) {
      console.warn(`Warning: Row ${i + 2} has ${values.length} columns, but header has ${headers.length}. Data may be inconsistent.`);
    }

    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      // Ensure all values are explicitly treated as strings
      rowData[header] = String(values[index] || '');
    });
    parsedData.push(rowData);
  }

  return parsedData;
};
