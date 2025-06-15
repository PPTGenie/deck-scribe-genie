
import React, { useState } from 'react';
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
import { Download, Loader2 } from 'lucide-react';
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'queued':
      return 'secondary';
    case 'processing':
      return 'default';
    case 'done':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
};

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
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

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
                  {job.status === 'done' && job.output_zip && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(job)}
                      disabled={downloadingJobId === job.id}
                    >
                      {downloadingJobId === job.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
