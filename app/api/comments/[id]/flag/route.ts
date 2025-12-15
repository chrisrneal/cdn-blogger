import { NextRequest, NextResponse } from 'next/server';
import { flagComment } from '@/lib/services/moderationService';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/comments/[id]/flag - Flag a comment for moderation
 * 
 * Allows authenticated users to flag inappropriate comments.
 * Duplicate flags from the same user are prevented.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const auth = requireAuth(request);
    
    const { id: commentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Validate reason length if provided
    if (reason && typeof reason === 'string' && reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const { data, error } = await flagComment({
      comment_id: commentId,
      flagged_by: auth.userId!,
      reason,
    });

    if (error) {
      if (error.code === 'DUPLICATE_FLAG') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.code === 'COMMENT_NOT_FOUND') {
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

    return NextResponse.json({ flag: data }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to flag comment';
    
    // Handle auth errors
    if (errorMessage.includes('required')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
