
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { JobsTable } from '@/components/JobsTable';

const Dashboard = () => {
  const { user } = useAuth();

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold">PPT Genie Dashboard</h1>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Batch Jobs</h2>
              <p className="text-muted-foreground">
                Track your PowerPoint generation tasks
              </p>
            </div>
            <JobsTable jobs={jobs} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
