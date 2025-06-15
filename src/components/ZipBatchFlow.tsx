
import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { useZipBatchState } from '@/hooks/useZipBatchState';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import { useZipJobCreation } from '@/hooks/useZipJobCreation';
import { StepCard } from './StepCard';
import { ZipUploadStep } from './ZipUploadStep';
import { CSVPreviewTable } from './CSVPreviewTable';
import { FilenameTemplateForm } from './FilenameTemplateForm';
import { StickyNavigation } from './StickyNavigation';

const steps = [
  { id: 'Step 1', name: 'Upload ZIP', description: 'Select your .zip file with template, data, and images.' },
  { id: 'Step 2', name: 'Review Data', description: 'Review your CSV data and image mappings.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Set filename template and start the job.' },
];

export function ZipBatchFlow() {
  const state = useZipBatchState();
  const { currentStep, goToNextStep, goToPrevStep } = useStepNavigation(steps.length, state.setError);
  const { isStartingJob, jobProgress, handleStartJob } = useZipJobCreation({
    extractedFiles: state.extractedFiles,
    csvPreview: state.csvPreview,
    filenameTemplate: state.filenameTemplate,
    filenameError: state.filenameError,
  });

  const isNextDisabled = () => {
    if (currentStep === 0) {
      return !state.extractedFiles || !!state.error || state.isExtracting;
    }
    if (currentStep === 1) {
      return !state.csvPreview || state.missingVariables.length > 0;
    }
    return false;
  };

  const hasError = !!state.error || (currentStep === 2 && !!state.filenameError);
  const imageVariables = state.extractedVariables?.images || [];
  const missingImages = imageVariables.filter(img => {
    const expectedName = img.replace(/_img$/, '');
    return !Object.keys(state.extractedFiles?.images || {}).some(available => 
      available.replace(/\.(png|jpg|jpeg)$/i, '') === expectedName
    );
  });

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <ZipUploadStep
          zipFile={state.zipFile}
          setZipFile={state.setZipFile}
          extractedFiles={state.extractedFiles}
          setExtractedFiles={state.setExtractedFiles}
          error={state.error}
          setError={state.setError}
          extractedVariables={state.extractedVariables}
          setExtractedVariables={state.setExtractedVariables}
          isExtracting={state.isExtracting}
          setIsExtracting={state.setIsExtracting}
        />
      );
    }

    if (currentStep === 1 && state.csvPreview) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
            <CSVPreviewTable 
              headers={state.csvPreview.headers} 
              data={state.csvPreview.data} 
              templateVariables={state.extractedVariables ? [...state.extractedVariables.text, ...state.extractedVariables.images] : []} 
            />
          </div>
          
          {missingImages.length > 0 && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
              <h4 className="font-semibold text-destructive mb-2">Missing Images</h4>
              <p className="text-sm text-muted-foreground mb-2">
                The following images are required but missing from your ZIP:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingImages.map(img => (
                  <code key={img} className="text-xs bg-destructive/20 px-2 py-1 rounded">
                    {img.replace(/_img$/, '')}.(png|jpg)
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (currentStep === 2 && state.csvPreview) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Job Summary</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Template:</span>
                <p className="font-medium">{state.extractedFiles?.template?.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Data Rows:</span>
                <p className="font-medium">{state.csvPreview.data.length}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Images:</span>
                <p className="font-medium">{Object.keys(state.extractedFiles?.images || {}).length}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Variables:</span>
                <p className="font-medium">
                  {(state.extractedVariables?.text.length || 0) + (state.extractedVariables?.images.length || 0)}
                </p>
              </div>
            </div>
          </div>

          <FilenameTemplateForm
            filenameTemplate={state.filenameTemplate}
            setFilenameTemplate={state.setFilenameTemplate}
            setFilenameError={state.setFilenameError}
            csvPreview={state.csvPreview}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps.map(s => ({ id: s.id, name: s.name }))} currentStep={currentStep} />
      <div className="pb-24">
        <StepCard step={steps[currentStep]} hasError={hasError || missingImages.length > 0}>
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
