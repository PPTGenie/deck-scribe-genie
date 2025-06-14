
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { NewBatchFlow } from '@/components/NewBatchFlow';
import { ContentContainer } from '@/components/ui/ContentContainer';
import { Button } from '@/components/ui/button';
import { DraftProvider, useDraft } from '@/context/DraftContext';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { format } from 'date-fns';

const NewBatchContent = () => {
  const { isSaving, draft, saveCurrentDraft } = useDraft();

  const handleSave = () => {
    if (saveCurrentDraft) {
      saveCurrentDraft(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="-ml-1" />
        <div className="flex justify-between w-full items-center">
          <h1 className="text-xl font-semibold">New Batch Job</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {isSaving ? (
                "Saving..."
              ) : draft?.timestamp ? (
                `Last saved: ${format(new Date(draft.timestamp), "p, MM/dd/yyyy")}`
              ) : (
                "Not saved yet"
              )}
            </div>
            <Button variant="outline" onClick={handleSave} disabled={isSaving || !draft}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-6">
        <ContentContainer>
          <NewBatchFlow />
        </ContentContainer>
      </main>
    </SidebarInset>
  );
}


const NewBatch = () => {
  const [searchParams] = useSearchParams();
  const draftIdToLoad = searchParams.get('draftId');
  const providerKey = draftIdToLoad || 'new';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <DraftProvider key={providerKey} draftIdToLoad={draftIdToLoad}>
          <NewBatchContent />
        </DraftProvider>
      </div>
    </SidebarProvider>
  );
};

export default NewBatch;
