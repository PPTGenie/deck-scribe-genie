
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileToBase64, base64ToFile, loadDraftFromStorage, saveDraftToStorage } from '@/lib/drafts';
import type { Draft } from '@/lib/drafts';
import { extractTemplateVariables } from '@/lib/pptx';
import Papa from 'papaparse';
import { useToast } from '@/components/ui/use-toast';

export const useDraftState = (initialDraftId: string | null) => {
  const [draftId, setDraftId] = useState(initialDraftId || `draft-${Date.now()}`);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<string[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadDraft = async () => {
      if (initialDraftId) {
        const storedDraft = loadDraftFromStorage(initialDraftId);
        if (storedDraft) {
          if (storedDraft.templateFile) {
            const file = base64ToFile(storedDraft.templateFile.content, storedDraft.templateFile.name);
            await handleTemplateFileChange([file], true);
          }
          if (storedDraft.csvFile) {
            const file = base64ToFile(storedDraft.csvFile.content, storedDraft.csvFile.name);
            await handleCsvFileChange([file], true);
          }
        }
      }
    };
    loadDraft();
  }, [initialDraftId]);

  const missingVariables = useMemo(() => {
    if (extractedVariables && csvPreview?.headers) {
      return extractedVariables.filter(v => !csvPreview.headers.includes(v));
    }
    return [];
  }, [extractedVariables, csvPreview]);

  const currentStep = useMemo(() => {
    if (!templateFile) return 0;
    if (!csvFile || !csvPreview || missingVariables.length > 0) return 1;
    return 2;
  }, [templateFile, csvFile, csvPreview, missingVariables]);

  const handleTemplateFileChange = async (files: File[], silent = false) => {
    setError(null);
    setExtractedVariables(null);
    setCsvFile(null);
    setCsvPreview(null);
    
    const file = files[0];
    if (!file) {
      setTemplateFile(null);
      if (!silent) setError("Invalid file. We only accept .pptx files under 50MB.");
      return;
    }
    
    setTemplateFile(file);
    setIsExtracting(true);
    try {
      const variables = await extractTemplateVariables(file);
      setExtractedVariables(variables);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during variable extraction.");
      setTemplateFile(null);
      setExtractedVariables(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCsvFileChange = async (files: File[], silent = false) => {
    setError(null);

    const file = files[0];
    if (!file) {
        setCsvFile(null);
        setCsvPreview(null);
        if (!silent) setError("Invalid file. We only accept .csv files under 5MB.");
        return;
    }

    setCsvFile(null);
    setCsvPreview(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }
        if (!results.meta.fields || results.meta.fields.length === 0) {
            setError("Your CSV file appears to be empty or missing a header.");
            return;
        }
        if (results.data.length === 0) {
            setError("Your CSV file only contains a header. Please add data rows.");
            return;
        }
        setCsvFile(file);
        setCsvPreview({ headers: results.meta.fields, data: results.data as Record<string, string>[] });
      },
      error: (err: any) => {
        setError(`An unexpected error occurred while parsing: ${err.message}`);
      }
    });
  };

  const saveDraft = async () => {
    try {
      const draftData: Draft = {
        id: draftId,
        name: templateFile?.name || 'Untitled Draft',
        timestamp: Date.now(),
        templateFile: templateFile ? { name: templateFile.name, content: await fileToBase64(templateFile) } : null,
        csvFile: csvFile ? { name: csvFile.name, content: await fileToBase64(csvFile) } : null,
        extractedVariables,
        csvPreview,
      };
      saveDraftToStorage(draftData);
      toast({ title: "Draft Saved!", description: "Your progress has been saved." });
      
      if (!initialDraftId) {
        navigate(`/dashboard/new-batch?draft=${draftId}`, { replace: true });
        setDraftId(draftId); // Ensure the component knows its new official ID
      }
    } catch (err) {
      console.error("Failed to save draft:", err);
      setError("Failed to save draft.");
      toast({ variant: "destructive", title: "Error", description: "Could not save your draft." });
    }
  };
  
  return {
    templateFile,
    csvFile,
    error,
    setError,
    extractedVariables,
    isExtracting,
    csvPreview,
    missingVariables,
    currentStep,
    saveDraft,
    handleTemplateFileChange,
    handleCsvFileChange,
  };
};
