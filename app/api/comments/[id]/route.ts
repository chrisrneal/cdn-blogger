import { NextRequest, NextResponse } from 'next/server';
import { updateComment, softDeleteComment } from '@/lib/services/commentService';

export const dynamic = 'force-dynamic';

// PUT /api/comments/[id] - Update a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, author_name, author_email } = body;

    // Validate content length if provided
    if (content && content.length > 10000) {
      return NextResponse.json(
        { error: 'Comment content is too long (max 10000 characters)' },
        { status: 400 }
      );
    }

    const { data, error } = await updateComment(id, {
      content,
      author_name,
      author_email,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ comment: data });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments/[id] - Soft delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await softDeleteComment(id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ comment: data });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
