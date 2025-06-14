
import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useDraft } from '@/context/DraftContext';
import { Skeleton } from '@/components/ui/skeleton';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const {
    isLoading,
    currentStep,
    templateFile,
    setTemplateFile,
    csvFile,
    setCsvFile,
    extractedVariables,
    setExtractedVariables,
    csvPreview,
    setCsvPreview,
    updateCurrentStep,
    error,
    setError,
    isExtracting,
    setIsExtracting,
    missingVariables,
  } = useDraft();
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      updateCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      updateCurrentStep(currentStep - 1);
    }
  };

  let isNextDisabled = false;
  if (currentStep === 0) {
    isNextDisabled = !templateFile || !!error || isExtracting;
  } else if (currentStep === 1) {
    isNextDisabled = !csvFile || !!error || !csvPreview || missingVariables.length > 0;
  }

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
              setTemplateFile={setTemplateFile}
              error={error}
              setError={setError}
              extractedVariables={extractedVariables}
              setExtractedVariables={setExtractedVariables}
              isExtracting={isExtracting}
              setIsExtracting={setIsExtracting}
            />
          )}
          {currentStep === 1 && (
            <UploadCSVStep
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              error={error}
              setError={setError}
              extractedVariables={extractedVariables}
              csvPreview={csvPreview}
              setCsvPreview={setCsvPreview}
              missingVariables={missingVariables}
            />
          )}
          {currentStep === 2 && (
            <div className="text-center p-8 space-y-4">
              <p>Step 3: Confirm & Start - Coming soon!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex w-full items-center justify-between pt-4">
        {currentStep > 0 ? (
          <Button variant="outline" onClick={goToPrevStep}>
            Back
          </Button>
        ) : <div />}

        {currentStep < steps.length - 1 ? (
          <Button onClick={goToNextStep} disabled={isNextDisabled}>
            Next
          </Button>
        ) : (
          <Button disabled>Start Job</Button>
        )}
      </div>

    </div>
  );
}
