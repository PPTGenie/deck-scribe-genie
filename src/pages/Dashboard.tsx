
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <div className="text-lg font-medium text-neutral-700">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-neutral-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-4 px-6 border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors" />
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary-500"></div>
              <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
            </div>
          </header>
          <main className="flex-1 py-8">
            <ContentContainer>
              <div className="space-y-8">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Your Batch Jobs</h2>
                  <p className="text-base text-neutral-600 leading-relaxed">
                    Track your PowerPoint generation tasks and download completed presentations
                  </p>
                </div>
                <div className="animate-fade-in">
                  <JobsTable jobs={jobs} />
                </div>
              </div>
            </ContentContainer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
