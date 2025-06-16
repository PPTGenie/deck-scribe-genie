
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      // Reset all job fields to ensure clean retry
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'queued', 
          progress: 0, 
          error_msg: null, 
          finished_at: null,
          output_zip: null  // Clear any previous output
        })
        .eq('id', jobId);
      
      if (error) throw error;
      
      // Immediately trigger job processing
      supabase.functions.invoke('process-presentation-jobs').catch(err => {
        console.error("Error triggering job processing:", err);
      });
      
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
      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>CSV Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
        </CardContent>
      </Card>
      <DeleteJobDialog
        isOpen={!!jobToDelete}
        onOpenChange={(open) => !open && setJobToDelete(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
