
export const claimJob = async (supabaseAdmin: any) => {
  console.log('Attempting to claim a job...');
  
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
    } else {
      console.log('No queued jobs found.');
    }
    return null;
  }

  console.log(`Successfully claimed job ${job.id}`);
  return job;
};

export const markJobComplete = async (supabaseAdmin: any, jobId: string, zipPath: string) => {
  console.log(`Marking job ${jobId} as complete`);
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
  console.log(`Marking job ${jobId} as error: ${errorMessage}`);
  await supabaseAdmin
    .from('jobs')
    .update({
      status: 'error',
      error_msg: errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};
