
import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { useNewBatchWithImagesState } from '@/hooks/useNewBatchWithImagesState';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { useZipJobCreation } from '@/hooks/useZipJobCreation';
import { useStorageValidation } from '@/hooks/useStorageValidation';
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
  
  // Storage validation hook
  const { storageValidation, isValidating } = useStorageValidation({
    templateFile: state.templateFile,
    csvPreview: state.csvPreview,
    extractedVariables: state.extractedVariables,
    shouldValidate: hasImageVariables && currentStep >= 2
  });

  // Create extracted files structure for ZIP job creation
  const extractedFiles = React.useMemo(() => {
    if (!state.templateFile || !state.csvFile) return null;
    
    const images: Record<string, File> = {};
    state.uploadedImages.forEach(imageFile => {
      images[imageFile.file.name] = imageFile.file;
    });

    return {
      template: { file: state.templateFile, name: state.templateFile.name },
      csv: { file: state.csvFile, name: state.csvFile.name, data: state.csvPreview?.data || [] },
      images
    };
  }, [state.templateFile, state.csvFile, state.uploadedImages, state.csvPreview]);

  // Use ZIP job creation hook with missing image behavior
  const { isStartingJob, jobProgress, handleStartJob } = useZipJobCreation({
    extractedFiles,
    csvPreview: state.csvPreview,
    filenameTemplate: state.filenameTemplate,
    filenameError: state.filenameError,
    missingImageBehavior: state.missingImageBehavior,
  });

  const isNextDisabled = () => {
    if (currentStep === 0) {
      return !state.templateFile || !!state.error || state.isExtracting;
    }
    
    if (currentStep === 1) {
      // CSV step - check if CSV is uploaded, no missing variables, and no image validation errors
      const hasImageValidationErrors = state.csvPreview?.imageValidation && !state.csvPreview.imageValidation.isValid;
      return !state.csvFile || !!state.error || !state.csvPreview || state.missingVariables.length > 0 || hasImageValidationErrors;
    }
    
    if (hasImageVariables && currentStep === 2) {
      // Image step - validation based on missing image behavior
      if (state.missingImageBehavior === 'fail') {
        // STRICT validation: every CSV image value must have a matching uploaded image
        const missingImages = state.csvImageValues.filter(csvValue => {
          const normalizedCsvValue = csvValue.toLowerCase().replace(/\.jpeg$/i, '.jpg');
          return !state.uploadedImages.some(img => img.normalized === normalizedCsvValue);
        });
        return missingImages.length > 0;
      }
      // For 'placeholder' and 'skip' behaviors, allow proceeding even with missing images
      return false;
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
          hasImageVariables={hasImageVariables}
          missingImageBehavior={state.missingImageBehavior}
          setMissingImageBehavior={state.setMissingImageBehavior}
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
