
export interface Job {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  created_at: string;
  templates: { filename: string };
  csv_uploads: { rows_count: number };
  output_zip?: string;
  error_msg?: string;
}
