import { NextRequest, NextResponse } from 'next/server';
import { getModerationQueue } from '@/lib/services/moderationService';
import { requireModerator } from '@/lib/auth';
import { ModerationStatus } from '@/lib/schemaUtils';
import { MODERATION_CONSTANTS } from '@/lib/constants/moderation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/comments/flags - Get moderation queue with flagged comments
 * 
 * Returns comments that have been flagged by users or are pending moderation.
 * Requires moderator or admin privileges.
 */
export async function GET(request: NextRequest) {
  try {
    // Require moderator or admin privileges
    requireModerator(request);
    
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const statusParam = searchParams.get('status');
    const minFlags = parseInt(searchParams.get('minFlags') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(MODERATION_CONSTANTS.DEFAULT_MODERATION_QUEUE_LIMIT), 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate parameters
    if (limit < 1 || limit > MODERATION_CONSTANTS.MAX_MODERATION_QUEUE_LIMIT) {
      return NextResponse.json(
        { error: `Limit must be between 1 and ${MODERATION_CONSTANTS.MAX_MODERATION_QUEUE_LIMIT}` },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    if (minFlags < 0) {
      return NextResponse.json(
        { error: 'minFlags must be non-negative' },
        { status: 400 }
      );
    }

    // Parse status parameter
    let status: ModerationStatus | ModerationStatus[] | undefined;
    if (statusParam) {
      const statuses = statusParam.split(',') as ModerationStatus[];
      const validStatuses: ModerationStatus[] = ['pending', 'approved', 'flagged', 'rejected'];
      
      // Validate all statuses
      const invalidStatus = statuses.find(s => !validStatuses.includes(s));
      if (invalidStatus) {
        return NextResponse.json(
          { error: `Invalid status: ${invalidStatus}` },
          { status: 400 }
        );
      }
      
      status = statuses.length === 1 ? statuses[0] : statuses;
    }

    const { data, error } = await getModerationQueue({
      status,
      minFlags,
      limit,
      offset,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: data,
      pagination: {
        limit,
        offset,
        count: data?.length || 0,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve moderation queue';
    
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
