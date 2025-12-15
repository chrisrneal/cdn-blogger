-- Migration: Add comment_flags table for moderation
-- This migration adds support for flagging comments for moderation review

-- ============================================================================
-- CREATE COMMENT_FLAGS TABLE
-- ============================================================================
-- Table to track user flags/reports on comments
CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  flagged_by TEXT NOT NULL, -- user_id or identifier of the flagger
  reason TEXT, -- optional reason for flagging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate flags from same user on same comment
  UNIQUE(comment_id, flagged_by)
);

-- Indexes for efficient flag queries
CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id ON comment_flags (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_flags_created_at ON comment_flags (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_flags_flagged_by ON comment_flags (flagged_by);

-- Enable RLS for comment_flags
ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to create flags
CREATE POLICY "Authenticated users can flag comments"
  ON comment_flags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow users to view their own flags
CREATE POLICY "Users can view their own flags"
  ON comment_flags FOR SELECT
  USING (flagged_by = auth.uid()::text);

-- Policy: Allow service role (admin/moderator) to view all flags
-- Note: This will be handled via service role key which bypasses RLS
-- For app-level moderator access, we'll handle authorization in the API layer

-- ============================================================================
-- TRIGGER: Update flags_count on comments table
-- ============================================================================
-- Function to update flags_count when a flag is added or removed
CREATE OR REPLACE FUNCTION update_comment_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE comments
    SET flags_count = flags_count + 1,
        moderation_status = CASE 
          WHEN flags_count + 1 >= 3 AND moderation_status = 'approved' THEN 'flagged'
          ELSE moderation_status
        END
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE comments
    SET flags_count = GREATEST(flags_count - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update flags_count
DROP TRIGGER IF EXISTS trigger_update_comment_flags_count ON comment_flags;
CREATE TRIGGER trigger_update_comment_flags_count
  AFTER INSERT OR DELETE ON comment_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_flags_count();

-- Add comment
COMMENT ON TABLE comment_flags IS 'Stores user flags/reports on comments for moderation';
COMMENT ON COLUMN comment_flags.comment_id IS 'ID of the comment being flagged';
COMMENT ON COLUMN comment_flags.flagged_by IS 'User ID or identifier of the person who flagged the comment';
COMMENT ON COLUMN comment_flags.reason IS 'Optional reason for flagging the comment';
