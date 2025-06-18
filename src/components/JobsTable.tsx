
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Job } from '@/types/jobs';
import { NoJobsCard } from './NoJobsCard';
import { JobTableRow } from './JobTableRow';
import { DeleteJobDialog } from './DeleteJobDialog';

interface JobsTableProps {
  jobs: Job[];
}

export function JobsTable({ jobs }: JobsTableProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const handleDownload = async (job: Job) => {
    if (!job.output_zip) return;
    setDownloadingJobId(job.id);
    const downloadToast = toast.loading("Preparing your download...");

    try {
      const { data, error } = await supabase.storage
        .from('outputs')
        .createSignedUrl(job.output_zip, 300); // URL valid for 5 minutes

      if (error) throw error;
      
      // Trigger download
      window.location.href = data.signedUrl;

      toast.success("Your download will begin shortly.", { id: downloadToast });

    } catch (error: any) {
      toast.error(error.message || "Failed to create download link.", { id: downloadToast });
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handleRetry = async (jobId: string) => {
    const retryToast = toast.loading("Retrying job...");
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'queued', progress: 0, error_msg: null, finished_at: null })
        .eq('id', jobId);
      if (error) throw error;
      toast.success("Job has been queued for retry.", { id: retryToast });
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
    } catch (error: any) {
      toast.error(error.message || "Failed to retry job.", { id: retryToast });
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    const deleteToast = toast.loading("Deleting job...");
    try {
      // Note: This does not delete the associated output file from storage.
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete.id);

      if (error) throw error;
      
      toast.success("Job deleted successfully.", { id: deleteToast });
      await queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete job.", { id: deleteToast });
    } finally {
      setJobToDelete(null);
    }
  };

  if (jobs.length === 0) {
    return <NoJobsCard />;
  }

  return (
    <>
      <div className="modern-card">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Recent Jobs</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-xs text-muted-foreground">Live updates</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-card border border-border/60 overflow-hidden bg-card/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                  <TableHead className="font-semibold text-foreground/80 py-4 px-6 text-sm">Template</TableHead>
                  <TableHead className="font-semibold text-foreground/80 py-4 px-6 text-sm">Rows</TableHead>
                  <TableHead className="font-semibold text-foreground/80 py-4 px-6 text-sm">Status</TableHead>
                  <TableHead className="font-semibold text-foreground/80 py-4 px-6 text-sm">Progress</TableHead>
                  <TableHead className="font-semibold text-foreground/80 py-4 px-6 text-sm">Created</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80 py-4 px-6 text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    downloadingJobId={downloadingJobId}
                    onRetry={handleRetry}
                    onDownload={handleDownload}
                    onDelete={setJobToDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <DeleteJobDialog
        isOpen={!!jobToDelete}
        onOpenChange={(open) => !open && setJobToDelete(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
