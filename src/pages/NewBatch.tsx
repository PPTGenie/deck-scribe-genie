
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { NewBatchFlow } from '@/components/NewBatchFlow';
import { ContentContainer } from '@/components/ui/ContentContainer';
import { Button } from '@/components/ui/button';
import { DRAFT_TO_LOAD_KEY, CURRENT_DRAFT_ID_KEY } from '@/lib/drafts';

const NewBatch = () => {
  const [key, setKey] = useState(Date.now());

  const startNew = () => {
    sessionStorage.removeItem(CURRENT_DRAFT_ID_KEY);
    sessionStorage.removeItem(DRAFT_TO_LOAD_KEY);
    setKey(Date.now()); // Re-mount NewBatchFlow to reset its state
  };

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
              <NewBatchFlow key={key} />
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NewBatch;
