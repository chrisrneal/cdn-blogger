'use client';

import { useState, useEffect, Suspense } from 'react';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

function EditorContent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [postStatus, setPostStatus] = useState<'draft' | 'published'>('draft');
  const [loadingPost, setLoadingPost] = useState(false);

  const { user, session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch post if slug exists
  useEffect(() => {
    async function fetchPost() {
      if (!slug || !session?.access_token) return;

      setLoadingPost(true);
      try {
        const res = await fetch(`/api/posts/${slug}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (res.ok) {
          const { post } = await res.json();
          setTitle(post.title);
          setContent(post.content);
          setPostStatus(post.status);
        } else {
           console.error('Failed to fetch post');
           // Optionally redirect or show error
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingPost(false);
      }
    }

    if (slug && session) {
      fetchPost();
    }
  }, [slug, session]);

  const handleSave = async (targetStatus: 'draft' | 'published') => {
    setStatus('saving');
    try {
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token available');

      const body: any = {
        title,
        content,
        status: targetStatus
      };

      let url = '/api/posts';
      let method = 'POST';

      if (slug) {
        // Update existing
        url = `/api/posts/${slug}`;
        method = 'PUT';
      } else {
        // Create new
        body.date = new Date().toISOString();
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // If we just created a post, redirect to edit mode or my posts?
      // Or if we published it, maybe just update local state.
      if (!slug) {
         const data = await response.json();
         // Redirect to edit mode for the new post to prevent duplicate creations on subsequent saves
         router.replace(`/editor?slug=${data.slug}`);
      }

      setPostStatus(targetStatus);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  if (loading || loadingPost) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/my-posts" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                ← My Posts
            </Link>
            {slug && (
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    postStatus === 'published'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                    {postStatus === 'published' ? 'Published' : 'Draft'}
                </span>
            )}
          </div>

          <div className="flex items-center gap-3">
             {/* Only show "Save as Draft" if it is not yet published */}
             {postStatus !== 'published' && (
                <button
                    onClick={() => handleSave('draft')}
                    disabled={status === 'saving'}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    Save as Draft
                </button>
             )}

            <button
                onClick={() => handleSave('published')}
                disabled={status === 'saving'}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {status === 'saving'
                    ? 'Saving...'
                    : status === 'saved'
                        ? 'Saved!'
                        : postStatus === 'published' ? 'Update Post' : 'Publish'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto h-[calc(100vh-12rem)]">
          {/* Editor Column */}
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Post Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white px-0"
            />
            <textarea
              placeholder="Write your story in Markdown..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 resize-none bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 px-0 leading-relaxed text-lg"
            />
          </div>

          {/* Preview Column */}
          <div className="hidden lg:block border-l border-slate-200 dark:border-slate-800 pl-8 overflow-y-auto">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8">Preview</h2>
            {title && (
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {title}
              </h1>
            )}
            <MarkdownRenderer content={content || '*Nothing to preview*'} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
    return (
        <Suspense fallback={<div>Loading editor...</div>}>
            <EditorContent />
        </Suspense>
    );
}
