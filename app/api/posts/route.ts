import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { title, date, content } = await request.json();

    if (!title || !date || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const { error } = await supabaseAdmin.from('posts').insert({
      slug,
      title,
      date, // Assuming date string is compatible with timestamp (ISO) or Supabase handles cast
      content,
      created_by: 'api_user', // Dummy user for now
    });

    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    );
  }
}
