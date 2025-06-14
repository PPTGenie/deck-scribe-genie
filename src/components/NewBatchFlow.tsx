
import React, { useState } from 'react';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const steps = [
  { name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { name: 'Upload CSV', description: 'Provide the data for generation.' },
  { name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const [currentStep, setCurrentStep] = useState(1); // MOCK: Start at step 2 to show completed state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null); // This will be used in the next step
  const [error, setError] = useState<string | null>("❌ Whoops! That’s not a .pptx file. Only .pptx accepted."); // MOCK: For error state review

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <Stepper steps={steps} currentStep={currentStep} />
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
            <div className="text-center p-8 space-y-4">
              <p>Step 2: Upload CSV - Coming soon!</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>Back</Button>
                <Button onClick={goToNextStep}>Next</Button>
              </div>
            </div>
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
