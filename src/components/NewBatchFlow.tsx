import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { useNewBatchState } from '@/hooks/useNewBatchState';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { useJobCreation } from '@/hooks/useJobCreation';
import { isNextStepDisabled } from '@/lib/stepValidation';
import { StepCard } from './StepCard';
import { StepContent } from './StepContent';
import { StickyNavigation } from './StickyNavigation';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const state = useNewBatchState();
  const { currentStep, goToNextStep, goToPrevStep } = useStepNavigation(steps.length, state.setError);
  const { isStartingJob, jobProgress, handleStartJob } = useJobCreation({
    templateFile: state.templateFile,
    csvFile: state.csvFile,
    csvPreview: state.csvPreview,
    filenameTemplate: state.filenameTemplate,
    filenameError: state.filenameError,
  });

  const isNextDisabled = isNextStepDisabled({
    currentStep,
    templateFile: state.templateFile,
    error: state.error,
    isExtracting: state.isExtracting,
    csvFile: state.csvFile,
    csvPreview: state.csvPreview,
    missingVariables: state.missingVariables,
  });

  const hasError = !!state.error || (currentStep === 2 && !!state.filenameError);

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps.map(s => ({ id: s.id, name: s.name }))} currentStep={currentStep} />
      <div className="pb-24">
        <StepCard step={steps[currentStep]} hasError={hasError}>
          <StepContent
            currentStep={currentStep}
            {...state}
          />
        </StepCard>
      </div>
      
      <StickyNavigation
        currentStep={currentStep}
        totalSteps={steps.length}
        goToPrevStep={goToPrevStep}
        goToNextStep={goToNextStep}
        handleStartJob={handleStartJob}
        isNextDisabled={isNextDisabled}
        isStartingJob={isStartingJob}
        jobProgress={jobProgress}
        filenameError={state.filenameError}
      />
    </div>
  );
}
