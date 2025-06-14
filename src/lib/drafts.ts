import { v4 as uuidv4 } from 'uuid';

export interface DraftFile {
  name: string;
  type: string;
  content: string; // base64 data URL
}

export interface Draft {
  id: string;
  name: string;
  timestamp: number;
  templateFile: DraftFile | null;
  csvFile: DraftFile | null;
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
}

const DRAFTS_KEY = 'ppt_genie_drafts';
export const CURRENT_DRAFT_ID_KEY = 'new_batch_current_draft_id';

const dispatchUpdateEvent = () => {
  window.dispatchEvent(new Event('draftsUpdated'));
};

// File handling utilities
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const getDrafts = (): Draft[] => {
  try {
    const draftsJson = sessionStorage.getItem(DRAFTS_KEY);
    return draftsJson ? JSON.parse(draftsJson) : [];
  } catch (error) {
    console.error('Failed to get drafts:', error);
    return [];
  }
};

export const saveDraft = (draft: Omit<Draft, 'id'> & { id?: string | null }): Draft => {
  const draftWithId = { ...draft, id: draft.id || uuidv4() } as Draft;
  try {
    const drafts = getDrafts();
    const existingIndex = drafts.findIndex((d) => d.id === draftWithId.id);
    if (existingIndex > -1) {
      drafts[existingIndex] = draftWithId;
    } else {
      drafts.unshift(draftWithId);
    }
    sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    dispatchUpdateEvent();
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
  return draftWithId;
};

export const getDraft = (id: string): Draft | undefined => {
  return getDrafts().find((d) => d.id === id);
};

export const deleteDraft = (id: string) => {
  try {
    let drafts = getDrafts();
    drafts = drafts.filter((d) => d.id !== id);
    sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    dispatchUpdateEvent();
  } catch (error) {
    console.error('Failed to delete draft:', error);
  }
};
