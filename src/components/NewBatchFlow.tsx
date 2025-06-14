
import React, { useState } from 'react';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const [currentStep, setCurrentStep] = useState(0); // Start at step 1
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null); // No default error

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
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
              goToNextStep={goToNextStep}
              error={error}
              setError={setError}
            />
          )}
          {currentStep === 1 && (
            <UploadCSVStep
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              goToNextStep={goToNextStep}
              goToPrevStep={goToPrevStep}
              error={error}
              setError={setError}
            />
          )}
          {currentStep === 2 && (
            <div className="text-center p-8 space-y-4">
              <p>Step 3: Confirm & Start - Coming soon!</p>
               <div className="flex justify-start">
                <Button variant="outline" onClick={goToPrevStep}>Back</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
