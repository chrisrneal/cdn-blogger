import { supabase } from './supabase';

export interface PostData {
  id: string; // This will map to slug for backward compatibility in the app logic
  title: string;
  date: string;
  body: string;
  created_by?: string;
  status?: 'draft' | 'published';
}

export async function getSortedPostsData(): Promise<PostData[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('slug, title, date, content, created_by, status')
    .eq('status', 'published') // Only fetch published posts for the public list
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data.map((post) => ({
    id: post.slug, // Mapping slug to id to keep component compatibility
    title: post.title,
    date: post.date,
    body: post.content,
    created_by: post.created_by,
    status: post.status,
  }));
}

export async function getPostData(id: string): Promise<PostData> {
  // 'id' here is actually the slug
  const { data, error } = await supabase
    .from('posts')
    .select('slug, title, date, content, created_by, status')
    .eq('slug', id)
    .single();

  if (error || !data) {
    throw new Error(`Post not found: ${id}`);
  }

  return {
    id: data.slug,
    title: data.title,
    date: data.date,
    body: data.content,
    created_by: data.created_by,
    status: data.status,
  };
}
