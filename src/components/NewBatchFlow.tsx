import React, { useState } from 'react';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DRAFT_TO_LOAD_KEY, saveDraft, getDraft, fileToBase64, base64ToFile, DraftFile, Draft, CURRENT_DRAFT_ID_KEY } from '@/lib/drafts';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<string[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Load draft on mount
  React.useEffect(() => {
    const draftIdToLoad = sessionStorage.getItem(DRAFT_TO_LOAD_KEY);
    let idToLoad = draftIdToLoad;

    if (!idToLoad) {
      idToLoad = sessionStorage.getItem(CURRENT_DRAFT_ID_KEY);
    }
    
    if (idToLoad) {
      const draft = getDraft(idToLoad);
      if (draft) {
        const restore = async () => {
          setCurrentStep(draft.currentStep);
          setExtractedVariables(draft.extractedVariables);
          setCsvPreview(draft.csvPreview);

          if (draft.templateFile) {
            setTemplateFile(base64ToFile(draft.templateFile.content, draft.templateFile.name));
          }
          if (draft.csvFile) {
            setCsvFile(base64ToFile(draft.csvFile.content, draft.csvFile.name));
          }
          
          setDraftId(draft.id);
          sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, draft.id);
          
          if (draftIdToLoad) { // Came from drafts page
            sessionStorage.removeItem(DRAFT_TO_LOAD_KEY);
            toast.success("Draft Loaded", { description: `Restored "${draft.name}".`});
          }
          setIsRestoring(false);
        };
        restore();
      } else {
        sessionStorage.removeItem(DRAFT_TO_LOAD_KEY);
        sessionStorage.removeItem(CURRENT_DRAFT_ID_KEY);
        setIsRestoring(false);
      }
    } else {
      setIsRestoring(false);
    }
  }, []);

  // When template file is cleared, also clear extracted variables and csv data.
  React.useEffect(() => {
    if (!templateFile) {
        setExtractedVariables(null);
        setCsvFile(null);
        setCsvPreview(null);
        setMissingVariables([]);
    }
  }, [templateFile]);
  
  // Recalculate missing variables when template variables or CSV headers change
  React.useEffect(() => {
    if (extractedVariables && csvPreview?.headers) {
      const missing = extractedVariables.filter(v => !csvPreview.headers.includes(v));
      setMissingVariables(missing);
    } else {
      setMissingVariables([]);
    }
  }, [extractedVariables, csvPreview]);

  // Auto-save draft
  React.useEffect(() => {
    if (isRestoring) return;

    const handler = setTimeout(async () => {
      if (!templateFile && !csvFile) {
        return;
      }

      const currentDraftId = draftId || uuidv4();
      if (!draftId) {
        setDraftId(currentDraftId);
        sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, currentDraftId);
      }

      let serializedTemplate: DraftFile | null = null;
      if (templateFile) {
        const content = await fileToBase64(templateFile);
        serializedTemplate = { name: templateFile.name, type: templateFile.type, content };
      }

      let serializedCsv: DraftFile | null = null;
      if (csvFile) {
        const content = await fileToBase64(csvFile);
        serializedCsv = { name: csvFile.name, type: csvFile.type, content };
      }

      const draftToSave: Draft = {
        id: currentDraftId,
        name: templateFile?.name || 'Untitled Draft',
        timestamp: Date.now(),
        currentStep,
        templateFile: serializedTemplate,
        csvFile: serializedCsv,
        extractedVariables,
        csvPreview,
      };

      saveDraft(draftToSave);
      toast.info("Draft auto-saved", { description: `Your progress for "${draftToSave.name}" has been saved.` });

    }, 2000); // Debounce save

    return () => {
      clearTimeout(handler);
    };
  }, [isRestoring, currentStep, templateFile, csvFile, extractedVariables, csvPreview, draftId]);

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
