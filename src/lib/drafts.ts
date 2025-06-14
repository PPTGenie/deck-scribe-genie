
export interface Draft {
  id: string;
  name: string;
  timestamp: number;
  templateFile: { name: string; content: string } | null;
  csvFile: { name: string; content: string } | null;
  extractedVariables: string[] | null;
  csvPreview: { headers: string[]; data: Record<string, string>[] } | null;
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const DRAFTS_STORAGE_KEY = 'ppt-genie-drafts';

export const saveDraftToStorage = (draft: Draft) => {
  try {
    const drafts = JSON.parse(sessionStorage.getItem(DRAFTS_STORAGE_KEY) || '{}');
    drafts[draft.id] = draft;
    sessionStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error("Failed to save draft:", error);
    throw new Error("Failed to save draft to sessionStorage.");
  }
};

export const loadDraftFromStorage = (draftId: string): Draft | null => {
  try {
    const drafts = JSON.parse(sessionStorage.getItem(DRAFTS_STORAGE_KEY) || '{}');
    return drafts[draftId] || null;
  } catch (error) {
    console.error("Failed to load draft:", error);
    return null;
  }
};
