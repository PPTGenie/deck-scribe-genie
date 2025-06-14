
-- 000_init_tables.sql
create type job_status as enum ('queued','processing','done','error');

create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  filename text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table csv_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  template_id uuid references templates(id) on delete cascade,
  rows_count int not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  template_id uuid not null,
  csv_id uuid not null,
  status job_status default 'queued' not null,
  progress int default 0 not null,
  output_zip text,
  error_msg text,
  created_at timestamptz default now(),
  finished_at timestamptz
);
