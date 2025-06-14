import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { NewBatchFlow } from '@/components/NewBatchFlow';

const NewBatch = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold">New Batch Job</h1>
          </header>
          <div className="flex flex-1 flex-col">
            <NewBatchFlow />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NewBatch;
