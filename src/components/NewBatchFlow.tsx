
import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useDraftState } from '@/hooks/useDraftState';
import { Save } from 'lucide-react';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow({ draftId }: { draftId: string | null }) {
  const {
    templateFile,
    csvFile,
    error,
    setError,
    extractedVariables,
    isExtracting,
    csvPreview,
    missingVariables,
    currentStep,
    saveDraft,
    handleTemplateFileChange,
    handleCsvFileChange,
  } = useDraftState(draftId);

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps.map(s => ({ id: s.id, name: s.name }))} currentStep={currentStep} />
      <Card className={cn("transition-all", error && "border-destructive ring-1 ring-destructive/50")}>
        <CardHeader>
          <CardTitle>{steps[currentStep].name}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <UploadTemplateStep
              templateFile={templateFile}
              error={error}
              extractedVariables={extractedVariables}
              isExtracting={isExtracting}
              onFileChange={handleTemplateFileChange}
            />
          )}
          {currentStep === 1 && (
            <UploadCSVStep
              csvFile={csvFile}
              error={error}
              extractedVariables={extractedVariables}
              csvPreview={csvPreview}
              missingVariables={missingVariables}
              onFileChange={handleCsvFileChange}
            />
          )}
          {currentStep === 2 && (
            <div className="text-center p-8 space-y-4">
               <h3 className="text-xl font-bold">Review and Confirm</h3>
                <p className="text-muted-foreground">You're all set! Your template and data are valid.</p>
                <p>Ready to generate your documents?</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex w-full items-center justify-between pt-4">
        <Button variant="outline" onClick={saveDraft}>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>

        {currentStep === 2 ? (
          <Button>Start Job</Button>
        ) : (
          <Button disabled>Start Job</Button>
        )}
      </div>

    </div>
  );
}
