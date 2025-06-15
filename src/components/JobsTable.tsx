
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Job {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  created_at: string;
  templates: { filename: string };
  csv_uploads: { rows_count: number };
  output_zip?: string;
  error_msg?: string;
}

interface JobsTableProps {
  jobs: Job[];
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'done':
      return 'default';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
};

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
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Jobs Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You haven't created any batch jobs yet. Click "New Batch" to get started.
          </p>
        </CardContent>
      </Card>
    );
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
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.templates.filename}
                  </TableCell>
                  <TableCell>{job.csv_uploads.rows_count}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(job.status)} className="capitalize">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-32">
                    <div className="space-y-1">
                      <Progress value={job.progress} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {job.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(job.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleRetry(job.id)}>
                          Retry
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={job.status !== 'done' || !job.output_zip}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {/* Note: Both options trigger the same zip download for now. */}
                              <DropdownMenuItem onClick={() => handleDownload(job)} disabled={downloadingJobId === job.id}>
                                {downloadingJobId === job.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Download .pptx
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(job)} disabled={downloadingJobId === job.id}>
                                {downloadingJobId === job.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Download .pdf
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => setJobToDelete(job)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job record from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
