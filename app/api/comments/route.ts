import { NextRequest, NextResponse } from 'next/server';
import { createComment, getCommentsForPost } from '@/lib/services/commentService';

export const dynamic = 'force-dynamic';

// GET /api/comments?postId=xxx - Get comments for a post
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json(
      { error: 'postId is required' },
      { status: 400 }
    );
  }

  const { data, error } = await getCommentsForPost(postId, {
    asTree: true,
    moderationStatus: 'approved',
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ comments: data });
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, parent_id, content, author_name, author_email, created_by } = body;

    if (!post_id || !content || !author_name) {
      return NextResponse.json(
        { error: 'post_id, content, and author_name are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Comment content is too long (max 10000 characters)' },
        { status: 400 }
      );
    }

    const { data, error } = await createComment({
      post_id,
      parent_id: parent_id || null,
      content,
      author_name,
      author_email,
      created_by,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
