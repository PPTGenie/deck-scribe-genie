
export const claimJob = async (supabaseAdmin: any) => {
  const { data: job, error: claimError } = await supabaseAdmin
    .from('jobs')
    .update({ status: 'processing' })
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .select(`
      *,
      templates(storage_path, user_id),
      csv_uploads(storage_path, rows_count)
    `)
    .single();

  if (claimError || !job) {
    if (claimError && claimError.code !== 'PGRST116') {
      console.error('Error claiming job:', claimError);
    }
    return null;
  }

  return job;
};

export const markJobComplete = async (supabaseAdmin: any, jobId: string, zipPath: string) => {
  await supabaseAdmin
    .from('jobs')
    .update({
      status: 'done',
      progress: 100,
      output_zip: zipPath,
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};

export const markJobError = async (supabaseAdmin: any, jobId: string, errorMessage: string) => {
  await supabaseAdmin
    .from('jobs')
    .update({
      status: 'error',
      error_msg: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};
