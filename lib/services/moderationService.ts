/**
 * Moderation Service Layer
 * 
 * Provides moderation operations for comments including flagging,
 * viewing moderation queue, and moderator actions.
 */

import { supabase } from '../supabase';
import { Comment, ModerationStatus } from '../schemaUtils';
import { softDeleteComment, changeCommentStatus } from './commentService';
import { MODERATION_CONSTANTS } from '../constants/moderation';

// ============================================================================
// Types
// ============================================================================

export interface CommentFlag {
  id: string;
  comment_id: string;
  flagged_by: string;
  reason?: string;
  created_at: string;
}

export interface FlaggedComment extends Comment {
  flags: CommentFlag[];
}

export interface FlagCommentInput {
  comment_id: string;
  flagged_by: string;
  reason?: string;
}

export interface ModerationServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ModerationAction {
  action: 'approve' | 'hide' | 'delete';
  moderation_notes?: string;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Flags a comment for moderation review.
 * Prevents duplicate flags from the same user.
 */
export async function flagComment(
  input: FlagCommentInput
): Promise<{ data: CommentFlag | null; error: ModerationServiceError | null }> {
  try {
    // Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', input.comment_id)
      .single();

    if (commentError || !comment) {
      return {
        data: null,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Comment does not exist',
          details: commentError,
        },
      };
    }

    // Insert flag (unique constraint prevents duplicates)
    const { data: flag, error: insertError } = await supabase
      .from('comment_flags')
      .insert({
        comment_id: input.comment_id,
        flagged_by: input.flagged_by,
        reason: input.reason || null,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate flag error
      if (insertError.code === '23505') {
        return {
          data: null,
          error: {
            code: 'DUPLICATE_FLAG',
            message: 'You have already flagged this comment',
            details: insertError,
          },
        };
      }

      return {
        data: null,
        error: {
          code: 'FLAG_FAILED',
          message: 'Failed to flag comment',
          details: insertError,
        },
      };
    }

    return { data: flag as CommentFlag, error: null };
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
 * Retrieves the moderation queue with flagged and pending comments.
 * Returns comments with their associated flags.
 */
export async function getModerationQueue(
  options: {
    status?: ModerationStatus | ModerationStatus[];
    minFlags?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: FlaggedComment[] | null; error: ModerationServiceError | null }> {
  try {
    const {
      status = ['flagged', 'pending'],
      minFlags = 1,
      limit = MODERATION_CONSTANTS.DEFAULT_MODERATION_QUEUE_LIMIT,
      offset = 0,
    } = options;

    // Build query for comments
    let query = supabase
      .from('comments')
      .select('*')
      .gte('flags_count', minFlags)
      .order('flags_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by moderation status
    if (Array.isArray(status)) {
      query = query.in('moderation_status', status);
    } else {
      query = query.eq('moderation_status', status);
    }

    const { data: comments, error: commentsError } = await query;

    if (commentsError) {
      return {
        data: null,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve moderation queue',
          details: commentsError,
        },
      };
    }

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    // Fetch flags for all comments
    const commentIds = comments.map(c => c.id);
    const { data: flags, error: flagsError } = await supabase
      .from('comment_flags')
      .select('*')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: false });

    if (flagsError) {
      return {
        data: null,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve flags',
          details: flagsError,
        },
      };
    }

    // Group flags by comment_id
    const flagsByCommentId = new Map<string, CommentFlag[]>();
    (flags || []).forEach(flag => {
      const commentFlags = flagsByCommentId.get(flag.comment_id) || [];
      commentFlags.push(flag as CommentFlag);
      flagsByCommentId.set(flag.comment_id, commentFlags);
    });

    // Combine comments with their flags
    const flaggedComments: FlaggedComment[] = comments.map(comment => ({
      ...(comment as Comment),
      flags: flagsByCommentId.get(comment.id) || [],
    }));

    return { data: flaggedComments, error: null };
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
 * Performs a moderation action on a comment.
 * Actions: approve, hide (reject), or soft-delete
 */
export async function moderateComment(
  commentId: string,
  action: ModerationAction
): Promise<{ data: Comment | null; error: ModerationServiceError | null }> {
  try {
    switch (action.action) {
      case 'approve':
        // Set status to approved
        return await changeCommentStatus(
          commentId,
          'approved',
          action.moderation_notes
        );

      case 'hide':
        // Set status to rejected (hidden from public view)
        return await changeCommentStatus(
          commentId,
          'rejected',
          action.moderation_notes
        );

      case 'delete':
        // Soft delete the comment
        const deleteResult = await softDeleteComment(commentId);
        
        // If moderation notes provided, update them
        if (deleteResult.data && action.moderation_notes) {
          const { data, error } = await supabase
            .from('comments')
            .update({
              moderation_notes: action.moderation_notes,
            })
            .eq('id', commentId)
            .select()
            .single();

          if (error) {
            // Return the delete result even if notes update fails
            return deleteResult;
          }
          
          return { data: data as Comment, error: null };
        }
        
        return deleteResult;

      default:
        return {
          data: null,
          error: {
            code: 'INVALID_ACTION',
            message: `Invalid moderation action: ${action.action}`,
          },
        };
    }
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
 * Gets flags for a specific comment.
 */
export async function getCommentFlags(
  commentId: string
): Promise<{ data: CommentFlag[] | null; error: ModerationServiceError | null }> {
  try {
    const { data, error } = await supabase
      .from('comment_flags')
      .select('*')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: null,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve flags',
          details: error,
        },
      };
    }

    return { data: data as CommentFlag[], error: null };
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
