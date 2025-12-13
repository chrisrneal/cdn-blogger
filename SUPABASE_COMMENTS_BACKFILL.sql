-- Backfill script for existing comments data
-- Run this AFTER running the main migration if you have existing comments
-- This script will:
-- 1. Update comment paths for any existing comments
-- 2. Recalculate reply counts for all parent comments

-- ============================================================================
-- BACKFILL COMMENT PATHS
-- ============================================================================

-- Update paths for top-level comments (no parent)
UPDATE comments
SET path = ARRAY[id]
WHERE parent_id IS NULL AND (path IS NULL OR path = ARRAY[]::UUID[]);

-- Update paths for nested comments
-- This uses a recursive approach via a temporary function
CREATE OR REPLACE FUNCTION backfill_comment_paths()
RETURNS void AS $$
DECLARE
  max_depth INTEGER := 10;  -- Maximum nesting depth to process
  current_depth INTEGER := 1;
  updated_count INTEGER;
BEGIN
  -- Process each level of nesting
  WHILE current_depth <= max_depth LOOP
    -- Update comments at this depth level
    WITH parent_paths AS (
      SELECT 
        c.id as comment_id,
        p.path || c.id as new_path
      FROM comments c
      INNER JOIN comments p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL
        AND (c.path IS NULL OR c.path = ARRAY[]::UUID[] OR array_length(c.path, 1) != array_length(p.path, 1) + 1)
    )
    UPDATE comments c
    SET path = pp.new_path
    FROM parent_paths pp
    WHERE c.id = pp.comment_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Exit if no more comments were updated
    IF updated_count = 0 THEN
      EXIT;
    END IF;
    
    current_depth := current_depth + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled paths for % levels of nesting', current_depth - 1;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill
SELECT backfill_comment_paths();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS backfill_comment_paths();

-- ============================================================================
-- BACKFILL REPLY COUNTS
-- ============================================================================

-- Reset all reply counts to 0
UPDATE comments SET reply_count = 0;

-- Calculate and update reply counts for all comments
UPDATE comments parent
SET reply_count = (
  SELECT COUNT(*)
  FROM comments child
  WHERE child.parent_id = parent.id
    AND child.is_deleted = FALSE
)
WHERE EXISTS (
  SELECT 1
  FROM comments child
  WHERE child.parent_id = parent.id
);

-- ============================================================================
-- VERIFY BACKFILL
-- ============================================================================

-- Check for any comments with missing or invalid paths
SELECT 
  COUNT(*) as comments_with_invalid_paths
FROM comments
WHERE path IS NULL OR path = ARRAY[]::UUID[];

-- Display summary statistics
SELECT 
  COUNT(*) as total_comments,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_comments,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as nested_comments,
  MAX(array_length(path, 1)) as max_nesting_depth,
  SUM(reply_count) as total_replies
FROM comments;

-- ============================================================================
-- END OF BACKFILL
-- ============================================================================
