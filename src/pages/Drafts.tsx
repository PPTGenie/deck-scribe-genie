
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ContentContainer } from '@/components/ui/ContentContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDrafts, deleteDraft, Draft } from '@/lib/drafts';
import { formatDistanceToNow } from 'date-fns';

const Drafts = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const updateDrafts = () => setDrafts(getDrafts());
    updateDrafts();
    window.addEventListener('draftsUpdated', updateDrafts);
    return () => window.removeEventListener('draftsUpdated', updateDrafts);
  }, []);

  const handleContinue = (draftId: string) => {
    navigate(`/dashboard/new-batch?draftId=${draftId}`);
  };

  const handleDelete = (draftId: string) => {
    deleteDraft(draftId);
    // The 'draftsUpdated' event will trigger a re-render with the latest drafts.
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold">My Drafts</h1>
          </header>
          <main className="flex-1 py-6">
            <ContentContainer>
              {drafts.length === 0 ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold">No Drafts Found</h2>
                  <p className="text-muted-foreground mt-2">
                    Start a new batch, and your progress will be saved here automatically.
                  </p>
                  <Button onClick={() => navigate('/dashboard/new-batch')} className="mt-4">
                    Create New Batch
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drafts.map((draft) => (
                    <Card key={draft.id}>
                      <CardHeader>
                        <CardTitle className="truncate">{draft.name}</CardTitle>
                        <CardDescription>
                          Last saved {formatDistanceToNow(new Date(draft.timestamp), { addSuffix: true })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-2">
                          <p>
                            <span className="font-semibold">Template:</span>{' '}
                            {draft.templateFile?.name || 'Not set'}
                          </p>
                          <p>
                            <span className="font-semibold">CSV Data:</span>{' '}
                            {draft.csvFile?.name || 'Not set'}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="destructive" onClick={() => handleDelete(draft.id)}>
                          Delete
                        </Button>
                        <Button onClick={() => handleContinue(draft.id)}>
                          Continue
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Drafts;
