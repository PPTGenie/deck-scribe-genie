
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { NewBatchFlow } from '@/components/NewBatchFlow';
import { ContentContainer } from '@/components/ui/ContentContainer';
import { Button } from '@/components/ui/button';
import { DraftProvider } from '@/context/DraftContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

const NewBatch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftIdToLoad = searchParams.get('draftId');

  const startNew = () => {
    navigate('/dashboard/new-batch', { replace: true });
  };

  const providerKey = draftIdToLoad || 'new';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <div className="flex justify-between w-full items-center">
              <h1 className="text-xl font-semibold">New Batch Job</h1>
              <Button variant="outline" onClick={startNew}>Start New</Button>
            </div>
          </header>
          <main className="flex-1 py-6">
            <ContentContainer>
              <DraftProvider key={providerKey} draftIdToLoad={draftIdToLoad}>
                <NewBatchFlow />
              </DraftProvider>
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NewBatch;
