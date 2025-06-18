
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
    <TableRow className="hover:bg-slate-50/50 border-slate-200/40 transition-colors">
      <TableCell className="font-medium text-slate-800 py-5 px-6">
        {job.templates.filename}
      </TableCell>
      <TableCell className="text-slate-600 py-5 px-6">{job.csv_uploads.rows_count}</TableCell>
      <TableCell className="py-5 px-6">
        <Badge variant={getStatusVariant(job.status)} className="capitalize font-medium">
          {job.status}
        </Badge>
      </TableCell>
      <TableCell className="w-32 py-5 px-6">
        <div className="space-y-2">
          <Progress value={job.progress} className="h-2.5 bg-slate-200" />
          <span className="text-sm text-slate-500 font-medium">
            {job.progress}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-slate-600 py-5 px-6">
        {new Date(job.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right py-5 px-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-slate-300 hover:bg-slate-50">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-white border-slate-200 shadow-lg">
            <DropdownMenuItem onClick={() => onRetry(job.id)} className="hover:bg-slate-50">
              Retry
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={job.status !== 'done' || !job.output_zip} className="hover:bg-slate-50">
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-white border-slate-200 shadow-lg">
                  <DropdownMenuItem onClick={() => onDownload(job)} disabled={downloadingJobId === job.id} className="hover:bg-slate-50">
                    {downloadingJobId === job.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Download .pptx
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="flex justify-between items-center opacity-50">
                    <span>Download .pdf</span>
                    <Badge variant="outline" className="text-xs">Soon</Badge>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="bg-slate-200" />
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
