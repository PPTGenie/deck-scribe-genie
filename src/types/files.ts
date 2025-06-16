
export interface TemplateVariables {
  text: string[];
  images: string[];
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  invalidFiles: { column: string; value: string; suggested?: string }[];
}

export interface CsvPreview {
  headers: string[];
  data: Record<string, string>[];
  imageValidation?: ImageValidationResult;
}
