-- Migration: Add support for nested comments, moderation, tags, and post location
-- Run this in the Supabase SQL Editor (or via supabase CLI)
-- This migration adds:
-- 1. Comments table with nested/threaded support
-- 2. Moderation and soft-delete features
-- 3. Tags and post_tags for many-to-many relationships
-- 4. Location field for posts
-- 5. Indexes and triggers for performance

-- ============================================================================
-- 1. ADD LOCATION TO POSTS TABLE
-- ============================================================================
-- Add location column to posts table for geodata (lat/lon/place/country)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS location JSONB DEFAULT NULL;

-- Create index on location for potential geographic queries
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts USING GIN (location);

-- ============================================================================
-- 2. CREATE TAGS TABLE
-- ============================================================================
-- Tags table for categorizing posts
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);

-- Enable RLS for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to tags
CREATE POLICY "Public tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to create tags
CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 3. CREATE POST_TAGS JOIN TABLE
-- ============================================================================
-- Join table for many-to-many relationship between posts and tags
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, tag_id)
);

-- Indexes for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags (post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags (tag_id);

-- Enable RLS for post_tags
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to post_tags
CREATE POLICY "Public post_tags are viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

-- Policy: Allow post owners to manage their post tags
CREATE POLICY "Post owners can manage their post tags"
  ON post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.created_by = auth.uid()::text
    )
  );

-- ============================================================================
-- 4. CREATE COMMENTS TABLE
-- ============================================================================
-- Comments table with nested/threaded support and moderation
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Hierarchy path for efficient querying of nested comments
  -- Uses materialized path pattern with UUID array
  path UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  
  -- Content fields
  content TEXT NOT NULL,
  sanitized_content TEXT,
  sanitizer_version TEXT,
  
  -- Author information
  author_name TEXT NOT NULL,
  author_email TEXT,
  created_by TEXT,
  
  -- Moderation fields
  moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
  flags_count INTEGER NOT NULL DEFAULT 0,
  moderation_notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Reply count (denormalized for performance)
  reply_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient comment queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_path ON comments USING GIN (path);
CREATE INDEX IF NOT EXISTS idx_comments_moderation_status ON comments (moderation_status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments (is_deleted);

-- Composite index for common queries (approved, non-deleted comments for a post)
CREATE INDEX IF NOT EXISTS idx_comments_post_approved ON comments (post_id, moderation_status, is_deleted);

-- Enable RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to approved, non-deleted comments
CREATE POLICY "Public approved comments are viewable"
  ON comments FOR SELECT
  USING (moderation_status = 'approved' AND is_deleted = FALSE);

-- Policy: Allow users to view their own comments regardless of status
CREATE POLICY "Users can view their own comments"
  ON comments FOR SELECT
  USING (created_by = auth.uid()::text);

-- Policy: Allow authenticated users to insert comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND created_by = auth.uid()::text
  );

-- Policy: Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (created_by = auth.uid()::text)
  WITH CHECK (created_by = auth.uid()::text);

-- Policy: Allow users to soft-delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (created_by = auth.uid()::text);

-- ============================================================================
-- 5. CREATE TRIGGERS FOR COMMENT PATH AND REPLY COUNT
-- ============================================================================

-- Function to update comment path on insert
CREATE OR REPLACE FUNCTION update_comment_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Top-level comment: path is just the comment's own ID
    NEW.path := ARRAY[NEW.id];
  ELSE
    -- Child comment: append to parent's path
    NEW.path := (
      SELECT path || NEW.id
      FROM comments
      WHERE id = NEW.parent_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set path before insert
CREATE TRIGGER set_comment_path
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_path();

-- Function to increment parent reply count on insert
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment reply count after insert
CREATE TRIGGER increment_parent_reply_count
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_reply_count();

-- Function to decrement parent reply count on delete
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id AND reply_count > 0;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement reply count after delete
CREATE TRIGGER decrement_parent_reply_count
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reply_count();

-- Function to update reply count when parent changes
CREATE OR REPLACE FUNCTION update_reply_count_on_parent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_id changed
  IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Decrement old parent
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE comments
      SET reply_count = reply_count - 1
      WHERE id = OLD.parent_id AND reply_count > 0;
    END IF;
    
    -- Increment new parent
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE comments
      SET reply_count = reply_count + 1
      WHERE id = NEW.parent_id;
      
      -- Update path
      NEW.path := (
        SELECT path || NEW.id
        FROM comments
        WHERE id = NEW.parent_id
      );
    ELSE
      NEW.path := ARRAY[NEW.id];
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reply counts when parent changes
CREATE TRIGGER update_reply_count_on_update
  BEFORE UPDATE ON comments
  FOR EACH ROW
  WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
  EXECUTE FUNCTION update_reply_count_on_parent_change();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on tags
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Note: To rollback this migration, run the SUPABASE_COMMENTS_TAGS_ROLLBACK.sql script
