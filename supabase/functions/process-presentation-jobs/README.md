
# Edge Function: `process-presentation-jobs`

This function processes queued presentation generation jobs. It is intended to be run on a schedule via a cron job.

## Logic

1.  **Claim Job**: Atomically selects one `queued` job from the `jobs` table and updates its status to `processing`.
2.  **Download Files**: Downloads the associated `.pptx` template and `.csv` data file from Supabase Storage.
3.  **Generate Decks**: Iterates through each row in the CSV file, populates the template, and uploads the resulting `.pptx` file to the `outputs` bucket.
4.  **Update Progress**: Updates the job's progress in the database after each deck is generated.
5.  **Create ZIP**: Once all decks are generated, it creates a ZIP archive of all the output files.
6.  **Finalize**: Uploads the ZIP file and updates the job's status to `done`, setting the `output_zip` path.

## Environment Variables

This function requires the following environment variables to be set in your Supabase project settings:

-   `SUPABASE_URL`: The URL of your Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: Your project's service role key, used for admin-level access to the database and storage.

## Cron Job Setup

This function is designed to be triggered by `pg_cron`. The `supabase/config.toml` is configured to run this function every 30 seconds.

You must enable `pg_cron` in your Supabase project's database extensions for the schedule to work.
