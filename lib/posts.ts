import { supabase } from './supabase';

export interface PostData {
  id: string; // This will map to slug for backward compatibility in the app logic
  uuid?: string; // The actual UUID from the database for foreign key references
  title: string;
  date: string;
  body: string;
  created_by?: string;
  status?: 'draft' | 'published';
  location?: string;
}

export async function getSortedPostsData(locationFilter?: string): Promise<PostData[]> {
  let query = supabase
    .from('posts')
    .select('id, slug, title, date, content, created_by, status, location')
    .eq('status', 'published'); // Only fetch published posts for the public list

  // Apply location filter if provided
  if (locationFilter) {
    query = query.ilike('location', `%${locationFilter}%`);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data.map((post) => ({
    id: post.slug, // Mapping slug to id to keep component compatibility
    uuid: post.id, // Store the actual UUID for foreign key references
    title: post.title,
    date: post.date,
    body: post.content,
    created_by: post.created_by,
    status: post.status,
    location: post.location,
  }));
}

export async function getPostData(id: string): Promise<PostData> {
  // 'id' here is actually the slug
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, date, content, created_by, status, location')
    .eq('slug', id)
    .single();

  if (error || !data) {
    throw new Error(`Post not found: ${id}`);
  }

  return {
    id: data.slug,
    uuid: data.id, // Store the actual UUID for foreign key references
    title: data.title,
    date: data.date,
    body: data.content,
    created_by: data.created_by,
    status: data.status,
    location: data.location,
  };
}
