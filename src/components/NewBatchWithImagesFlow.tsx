
import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { useNewBatchWithImagesState } from '@/hooks/useNewBatchWithImagesState';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { useJobCreation } from '@/hooks/useJobCreation';
import { StepCard } from './StepCard';
import { UploadTemplateStep } from './UploadTemplateStep';
import { ImageUploadStep } from './ImageUploadStep';
import { UploadCSVStep } from './UploadCSVStep';
import { ConfirmStep } from './ConfirmStep';
import { StickyNavigation } from './StickyNavigation';

export function NewBatchWithImagesFlow() {
  const state = useNewBatchWithImagesState();
  
  // Determine steps based on whether images are needed
  const hasImageVariables = state.extractedVariables?.images.length > 0;
  
  const steps = hasImageVariables 
    ? [
        { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
        { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
        { id: 'Step 3', name: 'Upload Images', description: 'Upload images referenced in your template.' },
        { id: 'Step 4', name: 'Confirm & Start', description: 'Review your files and start the job.' },
      ]
    : [
        { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
        { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
        { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
      ];

  const { currentStep, goToNextStep, goToPrevStep } = useStepNavigation(steps.length, state.setError);
  const { isStartingJob, jobProgress, handleStartJob } = useJobCreation({
    templateFile: state.templateFile,
    csvFile: state.csvFile,
    csvPreview: state.csvPreview,
    filenameTemplate: state.filenameTemplate,
    filenameError: state.filenameError,
  });

  const isNextDisabled = () => {
    if (currentStep === 0) {
      return !state.templateFile || !!state.error || state.isExtracting;
    }
    
    if (currentStep === 1) {
      // CSV step - check if CSV is uploaded and no missing variables
      return !state.csvFile || !!state.error || !state.csvPreview || state.missingVariables.length > 0;
    }
    
    if (hasImageVariables && currentStep === 2) {
      // Image step - check if all required images are uploaded
      const missingImages = state.csvImageValues.filter(csvValue => {
        const normalizedCsvValue = csvValue.toLowerCase().replace(/\.jpeg$/i, '.jpg');
        return !state.uploadedImages.some(img => img.normalized === normalizedCsvValue);
      });
      return missingImages.length > 0;
    }
    
    return false;
  };

  const hasError = !!state.error || ((hasImageVariables ? currentStep === 3 : currentStep === 2) && !!state.filenameError);

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <UploadTemplateStep
          templateFile={state.templateFile}
          setTemplateFile={state.setTemplateFile}
          error={state.error}
          setError={state.setError}
          extractedVariables={state.extractedVariables}
          setExtractedVariables={state.setExtractedVariables}
          isExtracting={state.isExtracting}
          setIsExtracting={state.setIsExtracting}
        />
      );
    }

    if (currentStep === 1) {
      return (
        <UploadCSVStep
          csvFile={state.csvFile}
          setCsvFile={state.setCsvFile}
          error={state.error}
          setError={state.setError}
          extractedVariables={state.extractedVariables}
          csvPreview={state.csvPreview}
          setCsvPreview={state.setCsvPreview}
          missingVariables={state.missingVariables}
        />
      );
    }

    if (hasImageVariables && currentStep === 2) {
      return (
        <ImageUploadStep
          uploadedImages={state.uploadedImages}
          setUploadedImages={state.setUploadedImages}
          requiredImages={state.extractedVariables?.images || []}
          csvImageValues={state.csvImageValues}
          error={state.error}
          setError={state.setError}
        />
      );
    }

    const confirmStepIndex = hasImageVariables ? 3 : 2;
    if (currentStep === confirmStepIndex && state.templateFile && state.csvFile && state.csvPreview) {
      return (
        <ConfirmStep 
          templateFile={state.templateFile}
          csvFile={state.csvFile}
          csvPreview={state.csvPreview}
          filenameTemplate={state.filenameTemplate}
          setFilenameTemplate={state.setFilenameTemplate}
          setFilenameError={state.setFilenameError}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps.map(s => ({ id: s.id, name: s.name }))} currentStep={currentStep} />
      <div className="pb-24">
        <StepCard step={steps[currentStep]} hasError={hasError}>
          {renderStepContent()}
        </StepCard>
      </div>
      
      <StickyNavigation
        currentStep={currentStep}
        totalSteps={steps.length}
        goToPrevStep={goToPrevStep}
        goToNextStep={goToNextStep}
        handleStartJob={handleStartJob}
        isNextDisabled={isNextDisabled()}
        isStartingJob={isStartingJob}
        jobProgress={jobProgress}
        filenameError={state.filenameError}
      />
    </div>
  );
}
