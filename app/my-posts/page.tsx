'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  status: 'draft' | 'published';
  location?: string;
}

export default function MyPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchPosts() {
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/posts', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch (e) {
        console.error('Failed to fetch posts', e);
      } finally {
        setLoadingPosts(false);
      }
    }

    if (user) {
      fetchPosts();
    }
  }, [user, session]);

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const res = await fetch(`/api/posts/${slug}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            }
        });

        if (res.ok) {
            setPosts(posts.filter(p => p.slug !== slug));
        } else {
            alert('Failed to delete post');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting post');
    }
  };

  if (loading || loadingPosts) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Posts</h1>
            <div className="space-x-4">
                <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Home
                </Link>
                <Link
                    href="/editor"
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    New Post
                </Link>
            </div>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
            {posts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    You haven't created any posts yet.
                </div>
            ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {posts.map(post => (
                        <li key={post.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                    {post.title}
                                </h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>{new Date(post.date).toLocaleDateString()}</span>
                                    {post.location && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                                    <circle cx="12" cy="10" r="3"></circle>
                                                </svg>
                                                {post.location}
                                            </span>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        post.status === 'published'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/editor?slug=${post.slug}`}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(post.slug)}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                >
                                    Delete
                                </button>
                                {post.status === 'published' && (
                                    <Link
                                        href={`/posts/${post.slug}`}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        title="View Live"
                                    >
                                        <span className="sr-only">View</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                    </Link>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
}
