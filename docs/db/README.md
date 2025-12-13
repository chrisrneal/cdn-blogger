# Database Migration Guide

## Overview

This migration adds support for:
- **Nested/threaded comments** with efficient hierarchy queries
- **Comment moderation** (pending, approved, flagged, rejected statuses)
- **Soft-delete** for comments to preserve threading
- **Tags system** with many-to-many relationship to posts
- **Post location** data (JSONB field for geodata)
- **Performance optimizations** (indexes, triggers, denormalized reply counts)

## Files in This Migration

### SQL Scripts

1. **SUPABASE_COMMENTS_TAGS_MIGRATION.sql** - Main migration script
   - Creates comments, tags, and post_tags tables
   - Adds location column to posts
   - Creates all indexes and triggers
   - Sets up Row Level Security (RLS) policies

2. **SUPABASE_COMMENTS_BACKFILL.sql** - Backfill script (optional)
   - Populates comment paths for existing comments
   - Recalculates reply counts
   - Only needed if you have existing comment data

3. **SUPABASE_COMMENTS_TAGS_ROLLBACK.sql** - Rollback script
   - Removes all tables, triggers, and functions
   - **WARNING**: Deletes all comment and tag data!

### Documentation

1. **docs/db/schema.md** - Complete schema documentation
   - Table structures and field descriptions
   - Nested comments design patterns
   - RLS policies
   - Performance considerations
   - Query examples

2. **docs/db/api-examples.md** - API usage examples
   - TypeScript code examples
   - Payload formats for all operations
   - Client-side utilities
   - Error handling patterns

### Tests

1. **__tests__/schema.test.ts** - Schema utility tests (24 tests)
   - Comment tree builder
   - Path validation
   - Tag slug generation
   - Location validation
   - Moderation status validation
   - Comment filtering logic

## Migration Steps

### Prerequisites

- Access to Supabase SQL Editor or CLI
- Backup of existing database (recommended)
- Node.js and npm installed (for running tests)

### Step 1: Review Current Schema

Before migrating, verify your current schema:

```sql
-- Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check existing indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Step 2: Run the Migration

**Option A: Via Supabase Dashboard**

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy the entire contents of `SUPABASE_COMMENTS_TAGS_MIGRATION.sql`
4. Paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Wait for completion (should take a few seconds)

**Option B: Via Supabase CLI**

```bash
# If using Supabase CLI
supabase db push

# Or execute the SQL file directly
psql postgresql://[your-connection-string] < SUPABASE_COMMENTS_TAGS_MIGRATION.sql
```

### Step 3: Verify Migration Success

After running the migration, verify that everything was created:

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('comments', 'tags', 'post_tags')
ORDER BY table_name;

-- Should return 3 rows: comments, post_tags, tags

-- Check posts table has location column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'location';

-- Should return 1 row with jsonb type

-- Check triggers were created
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('comments', 'posts', 'tags')
ORDER BY event_object_table, trigger_name;

-- Should return multiple triggers
```

### Step 4: Run Backfill (If Needed)

If you have existing comment data (unlikely for a new migration), run the backfill script:

```sql
-- Copy and paste contents of SUPABASE_COMMENTS_BACKFILL.sql into SQL Editor
-- This will populate paths and reply counts for existing comments
```

### Step 5: Test the Schema

Run some basic queries to ensure everything works:

```sql
-- Create a test tag
INSERT INTO tags (name, slug, description)
VALUES ('Test Tag', 'test-tag', 'A test tag')
RETURNING *;

-- Create a test comment (you'll need a valid post_id)
INSERT INTO comments (
  post_id, 
  parent_id, 
  content, 
  author_name, 
  moderation_status
)
SELECT 
  id,
  NULL,
  'Test comment',
  'Test User',
  'pending'
FROM posts
LIMIT 1
RETURNING id, path, reply_count;

-- Verify the path was set automatically
-- Should show: path = [comment_id]

-- Add a reply to test nesting
-- (Use the comment_id from previous query)
INSERT INTO comments (
  post_id,
  parent_id,
  content,
  author_name,
  moderation_status
)
SELECT
  post_id,
  id, -- parent_id
  'Test reply',
  'Test User 2',
  'pending'
FROM comments
WHERE content = 'Test comment'
RETURNING id, parent_id, path, reply_count;

-- Verify parent's reply_count was incremented
SELECT id, reply_count FROM comments
WHERE content = 'Test comment';

-- Should show reply_count = 1

-- Clean up test data
DELETE FROM comments WHERE author_name IN ('Test User', 'Test User 2');
DELETE FROM tags WHERE slug = 'test-tag';
```

### Step 6: Update Application Code

Update your application to use the new schema:

1. **Add TypeScript types** (see docs/db/api-examples.md for examples)
2. **Implement comment API endpoints**
3. **Add tag management features**
4. **Update post forms** to include location picker
5. **Implement moderation UI** for admins
6. **Add content sanitization** middleware

### Step 7: Run Application Tests

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Should show all tests passing (49+ tests)
```

## Rollback Instructions

If you need to rollback the migration:

**WARNING**: This will delete all comments, tags, and post_tags data!

1. Backup your data first:
   ```sql
   -- Export comments to backup
   COPY comments TO '/tmp/comments_backup.csv' CSV HEADER;
   COPY tags TO '/tmp/tags_backup.csv' CSV HEADER;
   COPY post_tags TO '/tmp/post_tags_backup.csv' CSV HEADER;
   ```

2. Run the rollback script:
   ```sql
   -- Copy contents of SUPABASE_COMMENTS_TAGS_ROLLBACK.sql
   -- Paste into SQL Editor and run
   ```

3. Verify rollback:
   ```sql
   -- Check tables were removed
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('comments', 'tags', 'post_tags');
   
   -- Should return 0 rows
   
   -- Check location column was removed
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'posts'
     AND column_name = 'location';
   
   -- Should return 0 rows
   ```

## Common Issues and Solutions

### Issue: Migration fails with permission error

**Solution**: Make sure you're running the migration with sufficient privileges. In Supabase, use the SQL Editor which runs with elevated permissions, or use the service role key.

### Issue: Triggers not firing

**Solution**: Check that the functions exist:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
```

If functions are missing, re-run the migration script.

### Issue: RLS policies blocking operations

**Solution**: 
- For testing, you can temporarily disable RLS:
  ```sql
  ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
  ```
- For production, ensure you're using the correct authentication context
- Service role key bypasses RLS entirely

### Issue: Path not being set for new comments

**Solution**: Check that the `set_comment_path` trigger exists and is enabled:
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'set_comment_path';
```

### Issue: Reply count not updating

**Solution**: Verify the increment/decrement triggers are present:
```sql
SELECT trigger_name 
FROM information_schema.triggers
WHERE trigger_name LIKE '%reply_count%';
```

## Performance Monitoring

After migration, monitor query performance:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Next Steps

After successful migration:

1. ✅ Review the schema documentation (docs/db/schema.md)
2. ✅ Study the API examples (docs/db/api-examples.md)
3. ⬜ Implement comment API endpoints
4. ⬜ Create comment UI components
5. ⬜ Implement tag management
6. ⬜ Add location picker for posts
7. ⬜ Build moderation dashboard
8. ⬜ Add content sanitization
9. ⬜ Implement pagination for comments
10. ⬜ Add real-time subscriptions for new comments

## Support

For issues or questions:
1. Check the documentation in `docs/db/`
2. Review the test examples in `__tests__/schema.test.ts`
3. Consult Supabase documentation: https://supabase.com/docs
4. Check PostgreSQL documentation for advanced queries

## Summary

This migration provides a solid foundation for advanced commenting, moderation, and content organization features. The schema is designed for performance with proper indexing, uses best practices like soft-delete and materialized paths, and includes comprehensive RLS policies for security.

All 49 tests pass, including 24 new tests for the schema utilities. The migration is production-ready and can be rolled back if needed.
