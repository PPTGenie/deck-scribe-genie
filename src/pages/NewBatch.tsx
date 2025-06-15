
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ZipBatchFlow } from '@/components/ZipBatchFlow';
import { ContentContainer } from '@/components/ui/ContentContainer';

const NewBatch = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold">New Batch Job</h1>
          </header>
          <main className="flex-1 py-6">
            <ContentContainer>
              <ZipBatchFlow />
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NewBatch;
