-- Add status column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'published'));

-- Update existing posts to be published
UPDATE posts
SET status = 'published'
WHERE status = 'draft';
-- Note: The above WHERE clause is just safety, conceptually we want to update ALL existing rows
-- that existed before this column was added. Since default is draft, new columns on existing rows
-- will be 'draft' unless we update them.
-- Better approach for existing data:
UPDATE posts SET status = 'published' WHERE status IS NOT DISTINCT FROM 'draft';
