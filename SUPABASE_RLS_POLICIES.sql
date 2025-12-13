-- RLS policies for posts table
-- Run this in the Supabase SQL Editor (or via supabase CLI) to allow authenticated users
-- to insert/update/delete only their own posts.

-- Allow authenticated users to insert rows when `created_by` equals their auth uid
create policy "Allow owners to insert posts"
  on posts
  for insert
  with check (
    auth.role() = 'authenticated' and created_by = auth.uid()::text
  );

-- Allow owners to update rows they own
create policy "Allow owners to update posts"
  on posts
  for update
  using ( created_by = auth.uid()::text )
  with check ( created_by = auth.uid()::text );

-- Allow owners to delete rows they own
create policy "Allow owners to delete posts"
  on posts
  for delete
  using ( created_by = auth.uid()::text );

-- Note: Service Role key and the Supabase 'anon' key behavior
-- - The service role key bypasses RLS entirely and can perform any write; keep it secret.
-- - The anon/public key acts as a client key and will be subject to these RLS policies.
