-- Create the posts table
create table posts (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  content text not null,
  date timestamp with time zone not null,
  created_by text default 'system',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table posts enable row level security;

-- Policy: Allow public read access
create policy "Public posts are viewable by everyone"
  on posts for select
  using ( true );

-- Policy: Allow admin write access (Service Role Key bypasses RLS, but this is good documentation)
-- Note: Service Role bypasses RLS automatically, so explicit policies for it aren't strictly necessary
-- unless you want to restrict the Service Role (which is rare).
