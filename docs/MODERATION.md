# Moderation Tools

This document describes the moderation features for comments in the CDN Blogger application.

## Overview

The moderation system provides tools for managing comment content through:
- User flagging of inappropriate comments
- Moderation queue for reviewing flagged content
- Moderator actions to approve, hide, or delete comments
- Soft-delete functionality that preserves thread structure

## Database Schema

### comment_flags Table

Stores user flags/reports on comments:
- `id` (UUID): Unique identifier
- `comment_id` (UUID): Reference to flagged comment
- `flagged_by` (TEXT): User ID who flagged the comment
- `reason` (TEXT): Optional reason for flagging
- `created_at` (TIMESTAMP): When the flag was created

The table has a unique constraint on `(comment_id, flagged_by)` to prevent duplicate flags.

### Automatic Flag Counting

A database trigger automatically:
- Increments `flags_count` on the comment when a flag is added
- Auto-flags comments with 3+ flags (changes status from 'approved' to 'flagged')
- Decrements `flags_count` when a flag is removed

## API Endpoints

### Flag a Comment (Users)

**POST** `/api/comments/:id/flag`

Allows authenticated users to flag inappropriate comments.

**Headers:**
- `x-user-id`: User identifier (required for authentication)

**Request Body:**
```json
{
  "reason": "Optional reason for flagging (max 500 characters)"
}
```

**Responses:**
- `201`: Flag created successfully
- `400`: Invalid request
- `401`: Authentication required
- `404`: Comment not found
- `409`: Duplicate flag (user already flagged this comment)

**Example:**
```bash
curl -X POST http://localhost:3000/api/comments/comment-123/flag \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-456" \
  -d '{"reason": "Spam content"}'
```

### View Moderation Queue (Moderators/Admins)

**GET** `/api/admin/comments/flags`

Returns comments that have been flagged or are pending moderation.

**Headers:**
- `x-user-id`: User identifier (required)
- `x-user-role`: Must be 'moderator' or 'admin'

**Query Parameters:**
- `status` (optional): Filter by moderation status (comma-separated: 'pending', 'approved', 'flagged', 'rejected')
- `minFlags` (optional): Minimum number of flags (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "comments": [
    {
      "id": "comment-123",
      "content": "Comment text",
      "flags_count": 3,
      "moderation_status": "flagged",
      "flags": [
        {
          "id": "flag-1",
          "flagged_by": "user-1",
          "reason": "Inappropriate content",
          "created_at": "2024-01-01T00:00:00Z"
        }
      ],
      ...
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 10
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/admin/comments/flags?status=flagged&minFlags=2 \
  -H "x-user-id: admin-123" \
  -H "x-user-role: admin"
```

### Get Comment Details (Moderators/Admins)

**GET** `/api/admin/comments/:id`

Returns a specific comment with all associated flags.

**Headers:**
- `x-user-id`: User identifier (required)
- `x-user-role`: Must be 'moderator' or 'admin'

**Response:**
```json
{
  "comment": {
    "id": "comment-123",
    "content": "Comment text",
    "flags_count": 2,
    "flags": [...],
    ...
  }
}
```

### Moderate Comment (Moderators/Admins)

**PATCH** `/api/admin/comments/:id`

Perform moderation actions on a comment.

**Headers:**
- `x-user-id`: User identifier (required)
- `x-user-role`: Must be 'moderator' or 'admin'

**Request Body:**
```json
{
  "action": "approve" | "hide" | "delete",
  "moderation_notes": "Optional notes (max 1000 characters)"
}
```

**Actions:**
- `approve`: Sets moderation_status to 'approved' (comment visible to public)
- `hide`: Sets moderation_status to 'rejected' (comment hidden from public)
- `delete`: Soft-deletes the comment (shows placeholder, preserves children)

**Response:**
```json
{
  "comment": {
    "id": "comment-123",
    "moderation_status": "approved",
    "moderation_notes": "Reviewed and approved",
    ...
  }
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/admin/comments/comment-123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: moderator-456" \
  -H "x-user-role: moderator" \
  -d '{"action": "approve", "moderation_notes": "Content is appropriate"}'
```

## Authorization

The system uses a simple header-based authorization for moderation endpoints:

- **Users**: Need `x-user-id` header to flag comments
- **Moderators**: Need `x-user-id` + `x-user-role: moderator` headers
- **Admins**: Need `x-user-id` + `x-user-role: admin` headers

Environment variables can also define moderator/admin user IDs:
- `MODERATOR_USER_IDS`: Comma-separated list of moderator user IDs
- `ADMIN_USER_IDS`: Comma-separated list of admin user IDs

**Note:** This is a simple implementation for testing. In production, you should:
1. Implement proper JWT/session-based authentication
2. Store roles in the database
3. Use Supabase auth or another authentication provider

## Frontend Display

### Soft-Deleted Comments

When a comment is soft-deleted (via moderator action or user deletion), it appears as a placeholder:

```
[Trash Icon] [Comment deleted]
              [Show/Hide N replies]
```

This preserves the thread structure so child comments remain visible and contextual.

### Comment Properties

The `Comment` interface includes these moderation-related fields:
- `moderation_status`: 'pending' | 'approved' | 'flagged' | 'rejected'
- `flags_count`: Number of times the comment has been flagged
- `moderation_notes`: Optional notes from moderators
- `is_deleted`: Whether the comment is soft-deleted
- `deleted_at`: Timestamp of deletion

## Migration

To enable moderation features, run the migration:

```sql
-- Run in Supabase SQL Editor
\i SUPABASE_COMMENT_FLAGS_MIGRATION.sql
```

This creates:
- `comment_flags` table
- Indexes for efficient queries
- Row-level security policies
- Trigger for automatic flag counting

## Usage Examples

### 1. User Flags a Comment

```javascript
async function flagComment(commentId, reason) {
  const response = await fetch(`/api/comments/${commentId}/flag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': currentUserId,
    },
    body: JSON.stringify({ reason }),
  });
  
  if (response.status === 409) {
    console.log('You already flagged this comment');
  }
  
  return response.json();
}
```

### 2. Moderator Reviews Queue

```javascript
async function getModerationQueue(status = 'flagged') {
  const response = await fetch(
    `/api/admin/comments/flags?status=${status}`,
    {
      headers: {
        'x-user-id': moderatorId,
        'x-user-role': 'moderator',
      },
    }
  );
  
  const { comments } = await response.json();
  return comments;
}
```

### 3. Moderator Takes Action

```javascript
async function moderateComment(commentId, action, notes) {
  const response = await fetch(`/api/admin/comments/${commentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': moderatorId,
      'x-user-role': 'moderator',
    },
    body: JSON.stringify({
      action, // 'approve', 'hide', or 'delete'
      moderation_notes: notes,
    }),
  });
  
  return response.json();
}
```

## Service Layer Functions

The `moderationService.ts` provides the following functions:

### flagComment(input)
Flags a comment for moderation review.

### getModerationQueue(options)
Retrieves the moderation queue with filtering options.

### moderateComment(commentId, action)
Performs a moderation action on a comment.

### getCommentFlags(commentId)
Gets all flags for a specific comment.

See the service file for detailed TypeScript interfaces and documentation.

## Testing

Run moderation service tests:
```bash
npm test -- lib/services/moderationService.test.ts
```

The test suite covers:
- Flagging comments
- Duplicate flag prevention
- Moderation queue retrieval
- Moderation actions (approve, hide, delete)
- Flag retrieval

## Security Considerations

1. **Input Validation**: All user inputs are validated for length and content
2. **SQL Injection Prevention**: Uses Supabase parameterized queries
3. **XSS Prevention**: Comments are sanitized on creation/update
4. **Authorization**: Moderation endpoints check user roles
5. **Rate Limiting**: Consider adding rate limiting for flag endpoints
6. **Audit Trail**: moderation_notes field provides basic audit trail

## Future Enhancements

Potential improvements for the moderation system:
- Email notifications for moderators when flags reach threshold
- Automated content filtering (e.g., profanity filter)
- User reputation system based on flag history
- Bulk moderation actions
- Moderation dashboard UI
- Appeal system for hidden/deleted comments
- Integration with external moderation services (e.g., Perspective API)
