-- Rollback Migration: Remove nested comments, moderation, tags, and post location
-- Run this in the Supabase SQL Editor (or via supabase CLI) to undo the migration
-- WARNING: This will delete all comments, tags, and post_tags data!

-- ============================================================================
-- 1. DROP TRIGGERS
-- ============================================================================

-- Drop comment triggers
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS update_reply_count_on_update ON comments;
DROP TRIGGER IF EXISTS decrement_parent_reply_count ON comments;
DROP TRIGGER IF EXISTS increment_parent_reply_count ON comments;
DROP TRIGGER IF EXISTS set_comment_path ON comments;

-- ============================================================================
-- 2. DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_reply_count_on_parent_change();
DROP FUNCTION IF EXISTS decrement_reply_count();
DROP FUNCTION IF EXISTS increment_reply_count();
DROP FUNCTION IF EXISTS update_comment_path();

-- ============================================================================
-- 3. DROP TABLES
-- ============================================================================

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;

-- ============================================================================
-- 4. REMOVE LOCATION COLUMN FROM POSTS
-- ============================================================================

-- Drop location index
DROP INDEX IF EXISTS idx_posts_location;

-- Remove location column
ALTER TABLE posts DROP COLUMN IF EXISTS location;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
