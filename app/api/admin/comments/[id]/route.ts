import { NextRequest, NextResponse } from 'next/server';
import { moderateComment, getCommentFlags } from '@/lib/services/moderationService';
import { requireModerator } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/comments/[id] - Perform moderation action on a comment
 * 
 * Allows moderators/admins to approve, hide, or soft-delete comments.
 * Requires moderator or admin privileges.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require moderator or admin privileges
    requireModerator(request);
    
    const { id: commentId } = await params;
    const body = await request.json();
    const { action, moderation_notes } = body;

    // Validate action
    const validActions = ['approve', 'hide', 'delete'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate moderation_notes length if provided
    if (moderation_notes && typeof moderation_notes === 'string' && moderation_notes.length > 1000) {
      return NextResponse.json(
        { error: 'Moderation notes are too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    const { data, error } = await moderateComment(commentId, {
      action,
      moderation_notes,
    });

    if (error) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ comment: data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to moderate comment';
    
    // Handle auth errors
    if (errorMessage.includes('required')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/comments/[id] - Get comment with flags for moderation review
 * 
 * Returns a comment with all associated flags.
 * Requires moderator or admin privileges.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require moderator or admin privileges
    requireModerator(request);
    
    const { id: commentId } = await params;

    // Get the comment
    const { supabase } = await import('@/lib/supabase');
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Get flags for the comment
    const { data: flags, error: flagsError } = await getCommentFlags(commentId);

    if (flagsError) {
      return NextResponse.json(
        { error: flagsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comment: {
        ...comment,
        flags: flags || [],
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve comment';
    
    // Handle auth errors
    if (errorMessage.includes('required')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
