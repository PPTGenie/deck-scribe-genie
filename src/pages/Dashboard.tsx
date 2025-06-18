
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { JobsTable } from '@/components/JobsTable';
import { ContentContainer } from '@/components/ui/ContentContainer';
import { Job } from '@/types/jobs';

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get all jobs for the user
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      if (!jobsData || jobsData.length === 0) return [];

      // Get unique template and CSV IDs
      const templateIds = [...new Set(jobsData.map(job => job.template_id))];
      const csvIds = [...new Set(jobsData.map(job => job.csv_id))];

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('id, filename')
        .in('id', templateIds);

      if (templatesError) throw templatesError;

      // Fetch CSV uploads
      const { data: csvData, error: csvError } = await supabase
        .from('csv_uploads')
        .select('id, rows_count')
        .in('id', csvIds);

      if (csvError) throw csvError;

      // Create lookup maps
      const templatesMap = new Map(templatesData?.map(t => [t.id, t]) || []);
      const csvMap = new Map(csvData?.map(c => [c.id, c]) || []);

      // Combine the data
      return jobsData.map(job => ({
        ...job,
        templates: templatesMap.get(job.template_id) || { filename: 'Unknown Template' },
        csv_uploads: csvMap.get(job.csv_id) || { rows_count: 0 }
      }));
    },
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('jobs-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJobData = payload.new as { [key: string]: any };
          queryClient.setQueryData(['jobs', user?.id], (oldData: Job[] | undefined) => {
            if (!oldData) return [];
            // Find the job in the cache and update it with the new data
            return oldData.map((job) =>
              job.id === updatedJobData.id ? { ...job, ...updatedJobData } : job
            );
          });
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground font-medium">Loading your batch jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-gutter border-b border-border/60 bg-card/80 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1 focus-ring" />
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <h1 className="text-xl font-semibold text-foreground">PPT Genie Dashboard</h1>
            </div>
          </header>
          <main className="flex-1 p-gutter">
            <ContentContainer>
              <div className="space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Your Batch Jobs</h2>
                  <p className="text-base text-muted-foreground max-w-2xl">
                    Track and manage your PowerPoint generation tasks. Monitor progress, download completed batches, and retry failed jobs.
                  </p>
                </div>
                <JobsTable jobs={jobs} />
              </div>
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
