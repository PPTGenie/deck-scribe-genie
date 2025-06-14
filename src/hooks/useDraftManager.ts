import { useState, useEffect } from 'react';
import { Draft, saveDraft, getDraft, fileToBase64, base64ToFile, DraftFile, CURRENT_DRAFT_ID_KEY } from '@/lib/drafts';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface DraftManagerResult {
  draft: Draft | null;
  isLoading: boolean;
  isSaving: boolean;
  currentStep: number;
  templateFile: File | null;
  csvFile: File | null;
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
  error: string | null;
  isExtracting: boolean;
  missingVariables: string[];
  updateCurrentStep: (step: number) => void;
  setTemplateFile: (file: File | null) => void;
  setCsvFile: (file: File | null) => void;
  setExtractedVariables: (variables: string[] | null) => void;
  setCsvPreview: (preview: { headers: string[]; data: Record<string, string>[] } | null) => void;
  setError: (error: string | null) => void;
  setIsExtracting: (isExtracting: boolean) => void;
  saveCurrentDraft: (isAutoSave?: boolean) => Promise<void>;
}


export const useDraftManager = (draftIdToLoad: string | null): DraftManagerResult => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Prevent auto-save on initial load
  const [currentStep, setCurrentStep] = useState(0);

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [extractedVariables, setExtractedVariables] = useState<string[] | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);

  // State moved from NewBatchFlow
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);

  // Load/initialize draft
  useEffect(() => {
    let active = true;
    const loadOrCreateDraft = async () => {
      setIsLoading(true);
      setIsRestoring(true);
      
      const id = draftIdToLoad || sessionStorage.getItem(CURRENT_DRAFT_ID_KEY);
      
      if (id) {
        const existingDraft = getDraft(id);
        if (existingDraft) {
          if (!active) return;
          setDraft(existingDraft);

          const loadedTemplateFile = existingDraft.templateFile ? base64ToFile(existingDraft.templateFile.content, existingDraft.templateFile.name) : null;
          const loadedCsvFile = existingDraft.csvFile ? base64ToFile(existingDraft.csvFile.content, existingDraft.csvFile.name) : null;
          
          setTemplateFile(loadedTemplateFile);
          setCsvFile(loadedCsvFile);
          setExtractedVariables(existingDraft.extractedVariables);
          setCsvPreview(existingDraft.csvPreview);

          // Compute initial step after loading
          const csvHeaders = existingDraft.csvPreview?.headers ?? [];
          const initialMissing = existingDraft.extractedVariables?.filter(v => !csvHeaders.includes(v)) ?? [];

          if (loadedTemplateFile && existingDraft.extractedVariables) {
            if (loadedCsvFile && existingDraft.csvPreview && initialMissing.length === 0) {
              setCurrentStep(2);
            } else {
              setCurrentStep(1);
            }
          } else {
            setCurrentStep(0);
          }

          sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, existingDraft.id);
          if (draftIdToLoad) {
            toast.success("Draft Loaded", { description: `Restored "${existingDraft.name}".` });
          }
        } else {
          createNewDraft();
        }
      } else {
        createNewDraft();
      }
      
      if (active) {
        setIsLoading(false);
        setTimeout(() => setIsRestoring(false), 100);
      }
    };
    
    const createNewDraft = () => {
      if (!active) return;
      const newDraftId = uuidv4();
      setDraft({
        id: newDraftId,
        name: 'Untitled Draft',
        timestamp: Date.now(),
        templateFile: null,
        csvFile: null,
        extractedVariables: null,
        csvPreview: null,
      });
      setTemplateFile(null);
      setCsvFile(null);
      setExtractedVariables(null);
      setCsvPreview(null);
      setCurrentStep(0);
      sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, newDraftId);
    };

    loadOrCreateDraft();
    
    return () => { active = false; };
  }, [draftIdToLoad]);
  
  const saveCurrentDraft = async (isAutoSave = false) => {
    if (!draft) return;

    setIsSaving(true);
    try {
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

      setDraft(currentDraft => {
        if (!currentDraft) return null;

        const draftData: Draft = {
          ...currentDraft,
          name: templateFile?.name || currentDraft.name,
          timestamp: Date.now(),
          templateFile: serializedTemplate,
          csvFile: serializedCsv,
          extractedVariables,
          csvPreview,
        };

        const savedDraft = saveDraft(draftData);
        sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, savedDraft.id);
        if (isAutoSave) {
          toast.info("Draft auto-saved", { description: `Your progress for "${savedDraft.name}" has been saved.` });
        } else {
          toast.success("Draft Saved", { description: `Your progress for "${savedDraft.name}" has been saved.` });
        }
        return savedDraft;
      });
    } catch (error) {
      console.error("Failed to save draft", error);
      toast.error("Save failed", { description: "Could not save your draft. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save draft
  useEffect(() => {
    if (isRestoring || isLoading || !draft) return;

    const handler = setTimeout(() => saveCurrentDraft(true), 1000);
    return () => {
      clearTimeout(handler);
    };
  }, [templateFile, csvFile, extractedVariables, csvPreview, isRestoring, isLoading]);
  
  useEffect(() => {
    if (!templateFile) {
        setExtractedVariables(null);
        setCsvFile(null);
        setCsvPreview(null);
    }
  }, [templateFile]);

  // Recalculate missing variables when template variables or CSV headers change
  useEffect(() => {
    if (extractedVariables && csvPreview?.headers) {
      const missing = extractedVariables.filter(v => !csvPreview.headers.includes(v));
      setMissingVariables(missing);
    } else {
      setMissingVariables([]);
    }
  }, [extractedVariables, csvPreview]);

  // Step validation logic
  useEffect(() => {
    if (isLoading || isRestoring) return;
    
    // Can't be on step 1 or 2 without a template
    if (currentStep > 0 && !templateFile) {
        setCurrentStep(0);
        return;
    }
    // Can't be on step 2 without a valid CSV
    if (currentStep > 1 && (!csvFile || !csvPreview || missingVariables.length > 0)) {
        setCurrentStep(1);
    }
  }, [currentStep, templateFile, csvFile, csvPreview, missingVariables, isLoading, isRestoring]);

  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
    setError(null); // Also reset error on step change
  };
  
  return {
    draft,
    isLoading,
    isSaving,
    currentStep,
    templateFile,
    csvFile,
    extractedVariables,
    csvPreview,
    error,
    isExtracting,
    missingVariables,
    updateCurrentStep,
    setTemplateFile,
    setCsvFile,
    setExtractedVariables,
    setCsvPreview,
    setError,
    setIsExtracting,
    saveCurrentDraft,
  };
};
