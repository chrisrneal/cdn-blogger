-- Data Migration for existing posts
-- Run this in the Supabase SQL Editor

INSERT INTO posts (slug, title, date, content, created_by)
VALUES
  (
    'second',
    'Second Post',
    '2023-11-01',
    'This is the second post.',
    'migration_sql'
  ),
  (
    'welcome',
    'Welcome to Next.js',
    '2023-10-27',
    '# Hello World\n\nThis is a sample post.',
    'migration_sql'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  date = EXCLUDED.date,
  content = EXCLUDED.content;
