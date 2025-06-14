
import React, { createContext, useContext, ReactNode } from 'react';
import { useDraftManager, DraftManagerResult } from '@/hooks/useDraftManager';

const DraftContext = createContext<DraftManagerResult | undefined>(undefined);

export const DraftProvider = ({ children, draftIdToLoad }: { children: ReactNode, draftIdToLoad: string | null }) => {
  const value = useDraftManager(draftIdToLoad);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
};

export const useDraft = () => {
  const context = useContext(DraftContext);
  if (context === undefined) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
};
