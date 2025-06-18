
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
import { Download, Loader2, Trash2 } from 'lucide-react';
import { Job } from '@/types/jobs';

interface JobTableRowProps {
  job: Job;
  downloadingJobId: string | null;
  onRetry: (jobId: string) => void;
  onDownload: (job: Job) => void;
  onDelete: (job: Job) => void;
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

export function JobTableRow({ job, downloadingJobId, onRetry, onDownload, onDelete }: JobTableRowProps) {
  return (
    <TableRow>
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
            <DropdownMenuItem onClick={() => onRetry(job.id)}>
              Retry
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={job.status !== 'done' || !job.output_zip}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDownload(job)} disabled={downloadingJobId === job.id}>
                    {downloadingJobId === job.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Download .pptx
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="flex justify-between items-center">
                    <span>Download .pdf</span>
                    <Badge variant="outline">Soon</Badge>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => onDelete(job)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
