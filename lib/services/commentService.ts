/**
 * Comment Service Layer
 * 
 * Provides CRUD operations and business logic for managing comments.
 * Includes nested comment queries, pagination, depth limiting, soft-deletion,
 * cycle prevention, and moderation utilities.
 */

import { supabase } from '../supabase';
import { Comment, CommentWithDepth, ModerationStatus, buildCommentTree } from '../schemaUtils';
import { processCommentContent, SANITIZER_VERSION } from '../../src/utils/sanitize';

// ============================================================================
// Types
// ============================================================================

export interface CreateCommentInput {
  post_id: string;
  parent_id?: string | null;
  content: string;
  author_name: string;
  author_email?: string;
  created_by?: string;
}

export interface UpdateCommentInput {
  content?: string;
  author_name?: string;
  author_email?: string;
}

export interface GetCommentsOptions {
  /** Include deleted comments (default: false) */
  includeDeleted?: boolean;
  /** Filter by moderation status */
  moderationStatus?: ModerationStatus | ModerationStatus[];
  /** Return as nested tree structure (default: false) */
  asTree?: boolean;
  /** Maximum nesting depth to return (only applies when asTree is true) */
  maxDepth?: number;
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort order (default: created_at ascending) */
  sortBy?: 'created_at' | 'updated_at';
  /** Sort direction (default: asc) */
  sortDirection?: 'asc' | 'desc';
}

export interface CommentServiceError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Creates a new comment with validation and cycle prevention.
 * Automatically sets the path based on parent.
 */
export async function createComment(
  input: CreateCommentInput
): Promise<{ data: Comment | null; error: CommentServiceError | null }> {
  try {
    // Sanitize and validate content
    const { result: sanitizationResult, error: sanitizationError } = processCommentContent(input.content);
    
    if (sanitizationError || !sanitizationResult) {
      return {
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: sanitizationError || 'Invalid content',
        },
      };
    }

    if (!input.author_name?.trim()) {
      return {
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Author name is required',
        },
      };
    }

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', input.post_id)
      .single();

    if (postError || !post) {
      return {
        data: null,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post does not exist',
          details: postError,
        },
      };
    }

    // If parent_id is provided, verify parent and prevent cycles
    if (input.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('comments')
        .select('id, post_id, path')
        .eq('id', input.parent_id)
        .single();

      if (parentError || !parent) {
        return {
          data: null,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent comment does not exist',
            details: parentError,
          },
        };
      }

      // Verify parent belongs to the same post
      if (parent.post_id !== input.post_id) {
        return {
          data: null,
          error: {
            code: 'PARENT_POST_MISMATCH',
            message: 'Parent comment must belong to the same post',
          },
        };
      }

      // Note: Cycle prevention is inherently handled by the path structure
      // since a comment cannot be its own ancestor (path is set on insert via trigger)
    }

    // Insert comment (path will be set by database trigger)
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: input.post_id,
        parent_id: input.parent_id || null,
        content: sanitizationResult.original,
        sanitized_content: sanitizationResult.sanitized,
        sanitizer_version: sanitizationResult.version,
        author_name: input.author_name.trim(),
        author_email: input.author_email,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (insertError) {
      return {
        data: null,
        error: {
          code: 'INSERT_FAILED',
          message: 'Failed to create comment',
          details: insertError,
        },
      };
    }

    return { data: comment as Comment, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Retrieves a single comment by ID.
 */
export async function getCommentById(
  commentId: string,
  includeDeleted: boolean = false
): Promise<{ data: Comment | null; error: CommentServiceError | null }> {
  try {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('id', commentId);

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query.single();

    if (error) {
      return {
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Comment not found',
          details: error,
        },
      };
    }

    return { data: data as Comment, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Retrieves comments for a post with various filtering and formatting options.
 * Can return flat list or nested tree structure with pagination and depth limiting.
 */
export async function getCommentsForPost(
  postId: string,
  options: GetCommentsOptions = {}
): Promise<{ data: Comment[] | CommentWithDepth[] | null; error: CommentServiceError | null }> {
  try {
    const {
      includeDeleted = false,
      moderationStatus,
      asTree = false,
      maxDepth,
      limit,
      offset = 0,
      sortBy = 'created_at',
      sortDirection = 'asc',
    } = options;

    // Build query
    let query = supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId);

    // Filter by deletion status
    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    // Filter by moderation status
    if (moderationStatus) {
      if (Array.isArray(moderationStatus)) {
        query = query.in('moderation_status', moderationStatus);
      } else {
        query = query.eq('moderation_status', moderationStatus);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // Apply pagination for flat list
    if (!asTree && limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: null,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve comments',
          details: error,
        },
      };
    }

    const comments = data as Comment[];

    // Return flat list
    if (!asTree) {
      return { data: comments, error: null };
    }

    // Build tree structure
    const tree = buildCommentTree(comments);

    // Apply depth limiting if specified
    let limitedTree = tree;
    if (maxDepth !== undefined && maxDepth > 0) {
      limitedTree = limitTreeDepth(tree, maxDepth);
    }

    // Apply pagination to root-level comments if limit is specified
    if (limit) {
      return { data: limitedTree.slice(offset, offset + limit), error: null };
    }

    return { data: limitedTree, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Updates a comment's content or author information.
 * Does not allow updating structural fields like parent_id or post_id.
 */
export async function updateComment(
  commentId: string,
  updates: UpdateCommentInput
): Promise<{ data: Comment | null; error: CommentServiceError | null }> {
  try {
    // Validate that at least one field is being updated
    if (!updates.content && !updates.author_name && !updates.author_email) {
      return {
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'No fields to update',
        },
      };
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: getCurrentTimestamp(),
    };

    if (updates.content !== undefined) {
      // Sanitize and validate content
      const { result: sanitizationResult, error: sanitizationError } = processCommentContent(updates.content);
      
      if (sanitizationError || !sanitizationResult) {
        return {
          data: null,
          error: {
            code: 'INVALID_INPUT',
            message: sanitizationError || 'Invalid content',
          },
        };
      }
      updateData.content = sanitizationResult.original;
      updateData.sanitized_content = sanitizationResult.sanitized;
      updateData.sanitizer_version = sanitizationResult.version;
    }

    if (updates.author_name !== undefined) {
      if (!updates.author_name.trim()) {
        return {
          data: null,
          error: {
            code: 'INVALID_INPUT',
            message: 'Author name cannot be empty',
          },
        };
      }
      updateData.author_name = updates.author_name.trim();
    }

    if (updates.author_email !== undefined) {
      updateData.author_email = updates.author_email;
    }

    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update comment',
          details: error,
        },
      };
    }

    return { data: data as Comment, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Soft-deletes a comment by setting is_deleted flag and deleted_at timestamp.
 * Preserves the comment structure for reply hierarchies.
 */
export async function softDeleteComment(
  commentId: string
): Promise<{ data: Comment | null; error: CommentServiceError | null }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete comment',
          details: error,
        },
      };
    }

    return { data: data as Comment, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Changes the moderation status of a comment.
 * Used for basic moderation actions (approve, reject, flag).
 */
export async function changeCommentStatus(
  commentId: string,
  status: ModerationStatus,
  moderationNotes?: string
): Promise<{ data: Comment | null; error: CommentServiceError | null }> {
  try {
    // Validate status
    const validStatuses: ModerationStatus[] = ['pending', 'approved', 'flagged', 'rejected'];
    if (!validStatuses.includes(status)) {
      return {
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: `Invalid moderation status: ${status}`,
        },
      };
    }

    const updateData: Record<string, unknown> = {
      moderation_status: status,
      updated_at: getCurrentTimestamp(),
    };

    if (moderationNotes !== undefined) {
      updateData.moderation_notes = moderationNotes;
    }

    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          code: 'STATUS_CHANGE_FAILED',
          message: 'Failed to change comment status',
          details: error,
        },
      };
    }

    return { data: data as Comment, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

/**
 * Retrieves all comments created by a specific user.
 * Includes post information for each comment.
 */
export async function getCommentsByUser(
  userId: string,
  options: GetCommentsOptions = {}
): Promise<{ data: (Comment & { post_title?: string })[] | null; error: CommentServiceError | null }> {
  try {
    const {
      includeDeleted = false,
      moderationStatus,
      limit,
      offset = 0,
      sortBy = 'created_at',
      sortDirection = 'desc', // Most recent first by default
    } = options;

    // Build query - join with posts to get post title
    let query = supabase
      .from('comments')
      .select(`
        *,
        posts!inner(title)
      `)
      .eq('created_by', userId);

    // Filter by deletion status
    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    // Filter by moderation status
    if (moderationStatus) {
      if (Array.isArray(moderationStatus)) {
        query = query.in('moderation_status', moderationStatus);
      } else {
        query = query.eq('moderation_status', moderationStatus);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // Apply pagination
    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: null,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve user comments',
          details: error,
        },
      };
    }

    // Transform the data to include post_title at the comment level
    const comments = (data || []).map((item: any) => ({
      ...item,
      post_title: item.posts?.title,
      posts: undefined, // Remove nested posts object
    }));

    return { data: comments, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
        details: err,
      },
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates the current timestamp in ISO format.
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Limits the depth of a comment tree to the specified maximum.
 * Removes all children beyond the maximum depth.
 * 
 * @param comments - The comments to process at this level
 * @param maxDepth - Maximum depth to display (e.g., maxDepth=2 shows depths 1 and 2)
 * @param currentDepth - Current depth level being processed (starts at 1 for root)
 * @returns The depth-limited comment tree
 * 
 * @example
 * // With maxDepth=2, shows root (depth 1) and immediate children (depth 2)
 * // All grandchildren (depth 3+) are removed
 */
function limitTreeDepth(
  comments: CommentWithDepth[],
  maxDepth: number,
  currentDepth: number = 1
): CommentWithDepth[] {
  // At max depth, remove all children to prevent deeper nesting
  if (currentDepth >= maxDepth) {
    return comments.map(comment => ({
      ...comment,
      children: [],
    }));
  }

  // Recursively process children at deeper levels
  return comments.map(comment => ({
    ...comment,
    children: comment.children
      ? limitTreeDepth(comment.children, maxDepth, currentDepth + 1)
      : [],
  }));
}
