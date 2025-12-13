# API Payload Examples

This document provides example payloads for working with the new comments, tags, and post location features.

## Table of Contents

- [Posts with Location](#posts-with-location)
- [Tags](#tags)
- [Post Tags](#post-tags)
- [Comments](#comments)
- [Nested Comments](#nested-comments)
- [Comment Moderation](#comment-moderation)

## Posts with Location

### Create Post with Location

```typescript
// Using Supabase client
const { data, error } = await supabase
  .from('posts')
  .insert({
    slug: 'my-trip-to-nyc',
    title: 'My Trip to New York City',
    content: '# Amazing Experience\n\nI visited the Big Apple...',
    date: '2024-01-15',
    status: 'published',
    location: {
      lat: 40.7128,
      lon: -74.0060,
      place: 'New York City',
      country: 'USA',
      formatted_address: 'New York, NY, USA'
    },
    created_by: userId
  });
```

### Update Post Location

```typescript
const { data, error } = await supabase
  .from('posts')
  .update({
    location: {
      lat: 51.5074,
      lon: -0.1278,
      place: 'London',
      country: 'UK',
      formatted_address: 'London, UK'
    }
  })
  .eq('slug', 'my-trip-to-london');
```

### Query Posts by Location

```typescript
// Posts with any location
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .not('location', 'is', null)
  .eq('status', 'published');

// Posts in a specific country
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('location->>country', 'USA')
  .eq('status', 'published');
```

## Tags

### Create Tag

```typescript
const { data, error } = await supabase
  .from('tags')
  .insert({
    name: 'Technology',
    slug: 'technology',
    description: 'Posts about technology and software development'
  });
```

### Get All Tags

```typescript
const { data, error } = await supabase
  .from('tags')
  .select('*')
  .order('name');
```

### Find Tag by Slug

```typescript
const { data, error } = await supabase
  .from('tags')
  .select('*')
  .eq('slug', 'technology')
  .single();
```

## Post Tags

### Add Tags to Post

```typescript
// Add multiple tags to a post
const postId = 'post-uuid-here';
const tagIds = ['tag-uuid-1', 'tag-uuid-2', 'tag-uuid-3'];

const { data, error } = await supabase
  .from('post_tags')
  .insert(
    tagIds.map(tagId => ({ post_id: postId, tag_id: tagId }))
  );
```

### Get Post with Tags

```typescript
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    post_tags (
      tags (
        id,
        name,
        slug,
        description
      )
    )
  `)
  .eq('slug', 'my-post')
  .single();

// Result structure:
// {
//   id: 'post-uuid',
//   slug: 'my-post',
//   title: 'My Post',
//   ...
//   post_tags: [
//     { tags: { id: 'uuid1', name: 'Technology', slug: 'technology' } },
//     { tags: { id: 'uuid2', name: 'Tutorial', slug: 'tutorial' } }
//   ]
// }
```

### Get Posts by Tag

```typescript
const { data, error } = await supabase
  .from('post_tags')
  .select(`
    posts (
      id,
      slug,
      title,
      date,
      content,
      status
    )
  `)
  .eq('tags.slug', 'technology');
```

### Remove Tag from Post

```typescript
const { error } = await supabase
  .from('post_tags')
  .delete()
  .eq('post_id', postId)
  .eq('tag_id', tagId);
```

## Comments

### Create Top-Level Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .insert({
    post_id: postId,
    parent_id: null, // Top-level comment
    content: 'This is a great post!',
    sanitized_content: '<p>This is a great post!</p>', // Server-side sanitized
    sanitizer_version: 'DOMPurify-3.0.0',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    created_by: userId,
    moderation_status: 'pending' // Start as pending
  });

// Note: The path will be automatically set by the database trigger
```

### Create Reply Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .insert({
    post_id: postId,
    parent_id: parentCommentId, // ID of the comment being replied to
    content: 'I agree with you!',
    sanitized_content: '<p>I agree with you!</p>',
    sanitizer_version: 'DOMPurify-3.0.0',
    author_name: 'Jane Smith',
    author_email: 'jane@example.com',
    created_by: userId,
    moderation_status: 'pending'
  });

// The path and parent's reply_count will be automatically updated by triggers
```

### Get Top-Level Comments for a Post

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('post_id', postId)
  .is('parent_id', null)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Get Comment with Reply Count

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('id', commentId)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .single();

// The reply_count field will show the number of immediate children
```

## Nested Comments

### Get All Comments for a Post (Threaded)

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('post_id', postId)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .order('path');

// Optional: Add depth calculation in the application
const commentsWithDepth = data.map(comment => ({
  ...comment,
  depth: comment.path.length
}));
```

### Get Replies to a Specific Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('parent_id', parentCommentId)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .order('created_at', { ascending: true });
```

### Get All Descendants of a Comment

Using PostgreSQL array operators:

```typescript
// Using RPC function (recommended for complex queries)
const { data, error } = await supabase.rpc('get_comment_descendants', {
  comment_id: parentCommentId
});

// Or using raw SQL via a custom SQL function in Supabase:
// CREATE OR REPLACE FUNCTION get_comment_descendants(comment_id UUID)
// RETURNS TABLE (
//   id UUID,
//   post_id UUID,
//   parent_id UUID,
//   path UUID[],
//   content TEXT,
//   author_name TEXT,
//   created_at TIMESTAMPTZ,
//   reply_count INTEGER,
//   depth INTEGER
// ) AS $$
// BEGIN
//   RETURN QUERY
//   SELECT 
//     c.id,
//     c.post_id,
//     c.parent_id,
//     c.path,
//     c.content,
//     c.author_name,
//     c.created_at,
//     c.reply_count,
//     array_length(c.path, 1) as depth
//   FROM comments c
//   WHERE c.path @> ARRAY[comment_id]::UUID[]
//     AND c.id != comment_id
//     AND c.moderation_status = 'approved'
//     AND c.is_deleted = FALSE
//   ORDER BY c.path;
// END;
// $$ LANGUAGE plpgsql;
```

### Build Comment Tree Structure

Client-side example for building a nested structure:

```typescript
interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  path: string[];
  content: string;
  author_name: string;
  created_at: string;
  reply_count: number;
  children?: Comment[];
}

function buildCommentTree(flatComments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map and initialize children arrays
  flatComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Second pass: build tree
  flatComments.forEach(comment => {
    const commentWithChildren = commentMap.get(comment.id)!;
    
    if (comment.parent_id === null) {
      rootComments.push(commentWithChildren);
    } else {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children!.push(commentWithChildren);
      }
    }
  });

  return rootComments;
}

// Usage
const { data: flatComments, error } = await supabase
  .from('comments')
  .select('*')
  .eq('post_id', postId)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .order('path');

const commentTree = buildCommentTree(flatComments);
```

## Comment Moderation

### Update Moderation Status

```typescript
// Approve a comment
const { data, error } = await supabase
  .from('comments')
  .update({
    moderation_status: 'approved',
    moderation_notes: 'Approved by moderator'
  })
  .eq('id', commentId);

// Flag a comment for review
const { data, error } = await supabase
  .from('comments')
  .update({
    moderation_status: 'flagged',
    flags_count: 5,
    moderation_notes: 'Flagged by users for inappropriate content'
  })
  .eq('id', commentId);

// Reject a comment
const { data, error } = await supabase
  .from('comments')
  .update({
    moderation_status: 'rejected',
    moderation_notes: 'Contains spam'
  })
  .eq('id', commentId);
```

### Soft Delete Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    content: '[deleted]', // Optional: overwrite content
    sanitized_content: '[deleted]'
  })
  .eq('id', commentId);

// Note: Soft-deleted comments remain in the database to preserve threading
// but should be displayed as [deleted] in the UI
```

### Get Pending Comments (Moderation Queue)

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('moderation_status', 'pending')
  .eq('is_deleted', false)
  .order('created_at', { ascending: true });
```

### Get Flagged Comments

```typescript
const { data, error } = await supabase
  .from('comments')
  .select('*')
  .eq('moderation_status', 'flagged')
  .eq('is_deleted', false)
  .order('flags_count', { ascending: false });
```

### Increment Flag Count

```typescript
const { data, error } = await supabase
  .from('comments')
  .update({
    flags_count: supabase.raw('flags_count + 1')
  })
  .eq('id', commentId);

// Check if threshold reached and auto-flag
const { data: comment } = await supabase
  .from('comments')
  .select('flags_count')
  .eq('id', commentId)
  .single();

if (comment.flags_count >= 5) {
  await supabase
    .from('comments')
    .update({
      moderation_status: 'flagged',
      moderation_notes: 'Auto-flagged: threshold reached'
    })
    .eq('id', commentId);
}
```

## TypeScript Types

Recommended TypeScript interfaces for the new schema:

```typescript
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  date: string;
  status: 'draft' | 'published';
  location?: PostLocation;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PostLocation {
  lat: number;
  lon: number;
  place?: string;
  country?: string;
  formatted_address?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PostTag {
  post_id: string;
  tag_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  path: string[];
  content: string;
  sanitized_content?: string;
  sanitizer_version?: string;
  author_name: string;
  author_email?: string;
  created_by?: string;
  moderation_status: 'pending' | 'approved' | 'flagged' | 'rejected';
  flags_count: number;
  moderation_notes?: string;
  is_deleted: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CommentWithDepth extends Comment {
  depth: number;
  children?: CommentWithDepth[];
}
```

## Error Handling

### Common Errors and Solutions

```typescript
// Handle foreign key constraint errors
try {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: invalidPostId,
      content: 'Test comment'
    });
  
  if (error) {
    if (error.code === '23503') {
      console.error('Post not found');
    }
  }
} catch (err) {
  console.error('Unexpected error:', err);
}

// Handle unique constraint violations
try {
  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: 'Technology',
      slug: 'technology'
    });
  
  if (error) {
    if (error.code === '23505') {
      console.error('Tag already exists');
    }
  }
} catch (err) {
  console.error('Unexpected error:', err);
}
```

## Best Practices

1. **Always sanitize comment content** on the server before storing
2. **Use moderation_status** to control visibility of comments
3. **Implement soft delete** instead of hard delete to preserve threading
4. **Use path field** for efficient nested comment queries
5. **Leverage reply_count** for UI indicators without additional queries
6. **Tag slugs** should be URL-friendly (lowercase, hyphens)
7. **Validate location data** before storing to ensure proper format
8. **Use transactions** when creating multiple related records
9. **Implement pagination** for large comment threads
10. **Cache tag lists** as they change infrequently
