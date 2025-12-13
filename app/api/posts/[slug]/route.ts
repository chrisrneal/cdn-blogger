import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Helper to get authenticated client
const getAuthenticatedSupabase = (token: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAuthenticated = getAuthenticatedSupabase(token);

    const { data, error } = await supabaseAuthenticated
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check ownership
    // Note: RLS might handle this if configured, but explicit check is good
    if (data.created_by !== user.id) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { title, content, status, date, location } = await request.json();

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAuthenticated = getAuthenticatedSupabase(token);

    // Verify ownership first
    const { data: existingPost, error: fetchError } = await supabaseAuthenticated
        .from('posts')
        .select('created_by')
        .eq('slug', slug)
        .single();

    if (fetchError || !existingPost) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.created_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update
    const updateData: any = { title, content, updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (date) updateData.date = date; // Allow updating the display date if passed
    if (location !== undefined) updateData.location = location || null; // Allow clearing location

    const { error } = await supabaseAuthenticated
      .from('posts')
      .update(updateData)
      .eq('slug', slug);

    if (error) {
      throw error;
    }

    revalidatePath(`/posts/${slug}`);
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
  ) {
    try {
      const { slug } = await params;
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const supabaseAuthenticated = getAuthenticatedSupabase(token);

      // Verify ownership
      const { data: existingPost, error: fetchError } = await supabaseAuthenticated
        .from('posts')
        .select('created_by')
        .eq('slug', slug)
        .single();

      if (fetchError || !existingPost) {
          return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      if (existingPost.created_by !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await supabaseAuthenticated
        .from('posts')
        .delete()
        .eq('slug', slug);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
  }
