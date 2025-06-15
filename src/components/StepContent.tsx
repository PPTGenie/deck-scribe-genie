
import React from 'react';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { ConfirmStep } from './ConfirmStep';
import type { CsvPreview } from '@/types/files';

interface StepContentProps {
    currentStep: number;
    templateFile: File | null;
    setTemplateFile: (file: File | null) => void;
    error: string | null;
    setError: (error: string | null) => void;
    extractedVariables: string[] | null;
    setExtractedVariables: (vars: string[] | null) => void;
    isExtracting: boolean;
    setIsExtracting: (isExtracting: boolean) => void;
    csvFile: File | null;
    setCsvFile: (file: File | null) => void;
    csvPreview: CsvPreview | null;
    setCsvPreview: (preview: CsvPreview | null) => void;
    missingVariables: string[];
    filenameTemplate: string;
    setFilenameTemplate: React.Dispatch<React.SetStateAction<string>>;
    setFilenameError: (error: string | null) => void;
}

export function StepContent(props: StepContentProps) {
    const { currentStep, ...rest } = props;

    if (currentStep === 0) {
        return <UploadTemplateStep {...rest} />;
    }
    if (currentStep === 1) {
        return <UploadCSVStep {...rest} />;
    }
    if (currentStep === 2 && props.templateFile && props.csvFile && props.csvPreview) {
        const { templateFile, csvFile, csvPreview, filenameTemplate, setFilenameTemplate, setFilenameError } = props;
        return <ConfirmStep 
            templateFile={templateFile}
            csvFile={csvFile}
            csvPreview={csvPreview}
            filenameTemplate={filenameTemplate}
            setFilenameTemplate={setFilenameTemplate}
            setFilenameError={setFilenameError}
        />;
    }
    return null;
}
