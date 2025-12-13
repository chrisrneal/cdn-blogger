# Quick Start Guide

## For Developers: Using the New Schema

### Installation

1. **Run the migration**:
   ```sql
   -- Copy contents of SUPABASE_COMMENTS_TAGS_MIGRATION.sql
   -- Paste into Supabase SQL Editor
   -- Execute
   ```

2. **Import utilities in your code**:
   ```typescript
   import { 
     buildCommentTree,
     isValidLocation,
     generateTagSlug,
     type Comment,
     type Tag,
     type PostLocation
   } from '@/lib/schemaUtils';
   ```

### Common Tasks

#### Add a Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .insert({
    post_id: postId,
    parent_id: null, // or parent comment id
    content: userInput,
    sanitized_content: DOMPurify.sanitize(userInput),
    sanitizer_version: 'DOMPurify-3.0.0',
    author_name: userName,
    created_by: userId,
    moderation_status: 'pending'
  });
// Path and reply_count are set automatically by triggers!
```

#### Get Comment Thread

```typescript
// Fetch all comments for a post
const { data: comments } = await supabase
  .from('comments')
  .select('*')
  .eq('post_id', postId)
  .eq('moderation_status', 'approved')
  .eq('is_deleted', false)
  .order('path');

// Build nested tree
const tree = buildCommentTree(comments);
```

#### Add Tags to Post

```typescript
// Create tag if it doesn't exist
const slug = generateTagSlug(tagName);
const { data: tag } = await supabase
  .from('tags')
  .insert({ name: tagName, slug })
  .select()
  .single();

// Associate with post
await supabase
  .from('post_tags')
  .insert({ post_id: postId, tag_id: tag.id });
```

#### Add Location to Post

```typescript
const location: PostLocation = {
  lat: 40.7128,
  lon: -74.0060,
  place: 'New York City',
  country: 'USA'
};

if (isValidLocation(location)) {
  await supabase
    .from('posts')
    .update({ location })
    .eq('id', postId);
}
```

### Testing

```bash
npm test                    # Run all tests
npm test schema.test.ts     # Test schema utilities
npm test schemaUtils.test.ts # Test utility functions
```

### Documentation

- 📚 Full schema docs: `docs/db/schema.md`
- 💻 Code examples: `docs/db/api-examples.md`
- 🚀 Migration guide: `docs/db/README.md`
- 📊 Summary: `MIGRATION_SUMMARY.md`

### Need Help?

1. Check the docs in `docs/db/`
2. Review test examples in `__tests__/` and `lib/`
3. See MIGRATION_SUMMARY.md for overview

### Important Notes

⚠️ **Always sanitize user input** before storing in `sanitized_content`
⚠️ **Set moderation_status** to 'pending' for new comments
⚠️ **Use soft delete** (is_deleted = true) instead of DELETE
⚠️ **Validate location data** with `isValidLocation()` before storing

### Quick Reference

**Comment Statuses**: pending | approved | flagged | rejected
**Post Statuses**: draft | published
**Comment Path**: Auto-generated UUID array
**Reply Count**: Auto-updated by triggers
**Tags**: Must have unique name and slug
**Location**: Must have valid lat (-90 to 90) and lon (-180 to 180)

---

Happy coding! 🎉
