# Database Schema Documentation

## Overview

This document describes the database schema for the cdn-blogger application, including support for nested comments, moderation, tags, and post location features.

## Tables

### posts

The main posts table storing blog content.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | TEXT | Unique URL-friendly identifier |
| title | TEXT | Post title |
| content | TEXT | Post content (markdown) |
| date | TIMESTAMP WITH TIME ZONE | Publication date |
| status | TEXT | Status: 'draft' or 'published' |
| location | JSONB | Geographic data (optional) |
| created_by | TEXT | User ID of creator |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

**Indexes:**
- `posts_pkey` (PRIMARY KEY on id)
- `posts_slug_key` (UNIQUE on slug)
- `idx_posts_location` (GIN on location)

**Location Field Format:**
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "place": "New York City",
  "country": "USA",
  "formatted_address": "New York, NY, USA"
}
```

### tags

Tag taxonomy for categorizing posts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Tag display name (unique) |
| slug | TEXT | URL-friendly tag identifier (unique) |
| description | TEXT | Tag description (optional) |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

**Indexes:**
- `tags_pkey` (PRIMARY KEY on id)
- `tags_name_key` (UNIQUE on name)
- `tags_slug_key` (UNIQUE on slug)
- `idx_tags_name` (on name)
- `idx_tags_slug` (on slug)

### post_tags

Many-to-many join table connecting posts and tags.

| Column | Type | Description |
|--------|------|-------------|
| post_id | UUID | Foreign key to posts.id |
| tag_id | UUID | Foreign key to tags.id |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |

**Indexes:**
- `post_tags_pkey` (PRIMARY KEY on (post_id, tag_id))
- `idx_post_tags_post_id` (on post_id)
- `idx_post_tags_tag_id` (on tag_id)

### comments

Comments table with support for nested/threaded comments and moderation.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| post_id | UUID | Foreign key to posts.id |
| parent_id | UUID | Foreign key to comments.id (nullable) |
| path | UUID[] | Materialized path for hierarchy |
| content | TEXT | Original comment content |
| sanitized_content | TEXT | Sanitized HTML content (optional) |
| sanitizer_version | TEXT | Version of sanitizer used (optional) |
| author_name | TEXT | Comment author display name |
| author_email | TEXT | Comment author email (optional) |
| created_by | TEXT | User ID if authenticated (optional) |
| moderation_status | TEXT | Status: 'pending', 'approved', 'flagged', 'rejected' |
| flags_count | INTEGER | Number of user flags |
| moderation_notes | TEXT | Internal moderation notes |
| is_deleted | BOOLEAN | Soft delete flag |
| reply_count | INTEGER | Count of immediate children |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |
| deleted_at | TIMESTAMP WITH TIME ZONE | Soft delete timestamp |

**Indexes:**
- `comments_pkey` (PRIMARY KEY on id)
- `idx_comments_post_id` (on post_id)
- `idx_comments_parent_id` (on parent_id)
- `idx_comments_path` (GIN on path)
- `idx_comments_moderation_status` (on moderation_status)
- `idx_comments_created_at` (on created_at)
- `idx_comments_is_deleted` (on is_deleted)
- `idx_comments_post_approved` (on (post_id, moderation_status, is_deleted))

**Triggers:**
- `set_comment_path` - Automatically sets path before insert
- `increment_parent_reply_count` - Increments parent's reply_count after insert
- `decrement_parent_reply_count` - Decrements parent's reply_count after delete
- `update_reply_count_on_update` - Updates reply_count when parent changes
- `update_comments_updated_at` - Updates updated_at timestamp on update

## Nested Comments Design

### Materialized Path Pattern

Comments use a **materialized path** approach for efficient hierarchical queries:

- **path**: Array of UUIDs representing the full path from root to current comment
- Top-level comment: `path = [comment_id]`
- Child comment: `path = [parent_id, ..., comment_id]`

### Benefits

1. **Efficient subtree queries**: Get all descendants with `path @> ARRAY[parent_id]`
2. **Depth calculation**: `array_length(path, 1)` gives nesting depth
3. **Ancestor queries**: All ancestors are in the path array
4. **Ordering**: Can sort by path for threaded display

### Example Hierarchy

```
Comment A (id: aaa, path: [aaa])
├── Comment B (id: bbb, path: [aaa, bbb])
│   └── Comment C (id: ccc, path: [aaa, bbb, ccc])
└── Comment D (id: ddd, path: [aaa, ddd])
```

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### posts
- Public read access for all posts
- Authenticated users can insert/update/delete their own posts

### tags
- Public read access for all tags
- Authenticated users can create new tags

### post_tags
- Public read access for all associations
- Post owners can manage their post's tags

### comments
- Public read access for approved, non-deleted comments
- Users can view their own comments regardless of status
- Authenticated users can create comments
- Users can update/delete their own comments

## Moderation Workflow

### Comment Moderation Statuses

1. **pending**: Newly created comment awaiting moderation
2. **approved**: Comment has been approved and is publicly visible
3. **flagged**: Comment has been flagged for review
4. **rejected**: Comment has been rejected and is hidden

### Soft Delete

Comments use soft delete (`is_deleted = TRUE`) to:
- Preserve reply threading
- Maintain audit trail
- Allow potential restoration

Soft-deleted comments should display as "[deleted]" in the UI but maintain their position in the thread.

## Migration Steps

### 1. Run the Migration

Execute `SUPABASE_COMMENTS_TAGS_MIGRATION.sql` in the Supabase SQL Editor:

```bash
# Via Supabase CLI
supabase db reset
# Or copy contents to SQL Editor in Supabase Dashboard
```

### 2. Backfill Existing Data (if applicable)

If you have existing comments in the system, run `SUPABASE_COMMENTS_BACKFILL.sql`:

```bash
# Via Supabase SQL Editor
# Copy and paste contents of SUPABASE_COMMENTS_BACKFILL.sql
```

### 3. Verify Migration

Check that all tables, indexes, and triggers were created:

```sql
-- List all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 4. Rollback (if needed)

To rollback the migration, run `SUPABASE_COMMENTS_TAGS_ROLLBACK.sql`:

**WARNING**: This will delete all comments, tags, and post_tags data!

## Performance Considerations

### Indexes

The migration creates several indexes to optimize common query patterns:

1. **Comment queries by post**: `idx_comments_post_id`
2. **Nested comment queries**: `idx_comments_path` (GIN index for array operations)
3. **Moderation queries**: `idx_comments_moderation_status`
4. **Composite queries**: `idx_comments_post_approved` for fetching approved comments per post

### Query Examples

#### Get all comments for a post (top-level only)

```sql
SELECT * FROM comments
WHERE post_id = 'POST_UUID'
  AND parent_id IS NULL
  AND moderation_status = 'approved'
  AND is_deleted = FALSE
ORDER BY created_at DESC;
```

#### Get all descendants of a comment

```sql
SELECT * FROM comments
WHERE path @> ARRAY['PARENT_UUID']::UUID[]
  AND id != 'PARENT_UUID'
  AND moderation_status = 'approved'
  AND is_deleted = FALSE
ORDER BY path;
```

#### Get comment thread with depth

```sql
SELECT 
  *,
  array_length(path, 1) as depth
FROM comments
WHERE post_id = 'POST_UUID'
  AND moderation_status = 'approved'
  AND is_deleted = FALSE
ORDER BY path;
```

#### Get posts by tag

```sql
SELECT p.* FROM posts p
INNER JOIN post_tags pt ON p.id = pt.post_id
INNER JOIN tags t ON pt.tag_id = t.id
WHERE t.slug = 'technology'
  AND p.status = 'published'
ORDER BY p.date DESC;
```

#### Get posts with location near a point (requires PostGIS extension)

```sql
-- Basic location existence check
SELECT * FROM posts
WHERE location IS NOT NULL
  AND location->>'country' = 'USA'
  AND status = 'published';
```

## Best Practices

### Comments

1. **Always sanitize content**: Use a server-side sanitizer and store both original and sanitized content
2. **Set moderation status**: New comments should start as 'pending' in production
3. **Limit nesting depth**: Consider limiting comment nesting to 5-10 levels in the application layer
4. **Pagination**: Use cursor-based pagination for large comment threads

### Tags

1. **Normalize tag names**: Convert to lowercase and create slugs consistently
2. **Prevent duplicates**: Check for existing tags before creating new ones
3. **Limit tags per post**: Consider limiting to 5-10 tags per post

### Moderation

1. **Auto-approve trusted users**: Consider auto-approving comments from users with good history
2. **Flag threshold**: Automatically flag comments after N user flags
3. **Moderation queue**: Create views for pending and flagged comments

## Security Notes

1. **RLS Policies**: All tables have Row Level Security enabled
2. **Service Role**: The service role key bypasses RLS - keep it secret and server-side only
3. **Anon Key**: The anon/public key is subject to RLS policies
4. **Input Sanitization**: Always sanitize user input on the server before storing
5. **SQL Injection**: Use parameterized queries or Supabase client methods

## Next Steps

After running the migration:

1. Update application code to work with new schema
2. Implement comment API endpoints
3. Create moderation UI for admins
4. Add tag management interface
5. Implement location picker for posts
6. Add sanitization middleware
7. Create comment thread UI components
