
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Draft, saveDraft, getDraft, fileToBase64, base64ToFile, DraftFile, CURRENT_DRAFT_ID_KEY } from '@/lib/drafts';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface DraftContextState {
  draft: Draft | null;
  isLoading: boolean;
  isSaving: boolean;
  templateFile: File | null;
  csvFile: File | null;
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
  updateCurrentStep: (step: number) => void;
  setTemplateFile: (file: File | null) => void;
  setCsvFile: (file: File | null) => void;
  setExtractedVariables: (variables: string[] | null) => void;
  setCsvPreview: (preview: { headers: string[]; data: Record<string, string>[] } | null) => void;
}

const DraftContext = createContext<DraftContextState | undefined>(undefined);

export const DraftProvider = ({ children, draftIdToLoad }: { children: ReactNode, draftIdToLoad: string | null }) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Prevent auto-save on initial load

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [extractedVariables, setExtractedVariables] = useState<string[] | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);

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
          setExtractedVariables(existingDraft.extractedVariables);
          setCsvPreview(existingDraft.csvPreview);

          if (existingDraft.templateFile) {
            setTemplateFile(base64ToFile(existingDraft.templateFile.content, existingDraft.templateFile.name));
          } else {
            setTemplateFile(null);
          }
          if (existingDraft.csvFile) {
            setCsvFile(base64ToFile(existingDraft.csvFile.content, existingDraft.csvFile.name));
          } else {
            setCsvFile(null);
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
        currentStep: 0,
        templateFile: null,
        csvFile: null,
        extractedVariables: null,
        csvPreview: null,
      });
      setTemplateFile(null);
      setCsvFile(null);
      setExtractedVariables(null);
      setCsvPreview(null);
      sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, newDraftId);
    };

    loadOrCreateDraft();
    
    return () => { active = false; };
  }, [draftIdToLoad]);
  
  const currentStep = draft?.currentStep;

  // Auto-save draft
  useEffect(() => {
    if (isRestoring || isLoading || !draft) return;

    let isMounted = true;
    const autoSave = async () => {
      setIsSaving(true);
      let serializedTemplate: DraftFile | null = null;
      if (templateFile) {
        const content = await fileToBase64(templateFile);
        if (!isMounted) return;
        serializedTemplate = { name: templateFile.name, type: templateFile.type, content };
      }

      let serializedCsv: DraftFile | null = null;
      if (csvFile) {
        const content = await fileToBase64(csvFile);
        if (!isMounted) return;
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
        if (isMounted) {
          sessionStorage.setItem(CURRENT_DRAFT_ID_KEY, savedDraft.id);
          toast.info("Draft auto-saved", { description: `Your progress for "${savedDraft.name}" has been saved.` });
        }
        return savedDraft;
      });
      
      if (isMounted) {
        setIsSaving(false);
      }
    };

    const handler = setTimeout(autoSave, 1000);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [templateFile, csvFile, extractedVariables, csvPreview, currentStep, isRestoring, isLoading]);
  
  useEffect(() => {
    if (!templateFile) {
        setExtractedVariables(null);
        setCsvFile(null);
        setCsvPreview(null);
    }
  }, [templateFile]);

  const updateCurrentStep = (step: number) => {
    setDraft(d => d ? { ...d, currentStep: step } : null);
  };
  
  const value = {
    draft,
    isLoading,
    isSaving,
    templateFile,
    csvFile,
    extractedVariables,
    csvPreview,
    updateCurrentStep,
    setTemplateFile,
    setCsvFile,
    setExtractedVariables,
    setCsvPreview,
  };

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
};

export const useDraft = () => {
  const context = useContext(DraftContext);
  if (context === undefined) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
};
