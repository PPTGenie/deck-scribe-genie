
import type { CsvPreview } from '@/types/files';

interface ValidationParams {
    currentStep: number;
    templateFile: File | null;
    error: string | null;
    isExtracting: boolean;
    csvFile: File | null;
    csvPreview: CsvPreview | null;
    missingVariables: string[];
}

export function isNextStepDisabled({
    currentStep,
    templateFile,
    error,
    isExtracting,
    csvFile,
    csvPreview,
    missingVariables,
}: ValidationParams): boolean {
    if (currentStep === 0) {
        return !templateFile || !!error || isExtracting;
    }
    if (currentStep === 1) {
        return !csvFile || !!error || !csvPreview || missingVariables.length > 0;
    }
    return false;
}
