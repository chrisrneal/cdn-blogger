'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Trash2, Edit2, ExternalLink, Calendar, FileText } from 'lucide-react';

interface Comment {
  id: string;
  post_id: string;
  post_title?: string;
  content: string;
  sanitized_content?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  moderation_status: string;
}

export default function MyComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchComments() {
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/user/comments', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        } else {
          setError('Failed to load comments');
        }
      } catch (e) {
        console.error('Failed to fetch comments', e);
        setError('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    }

    if (user) {
      fetchComments();
    }
  }, [user, session]);

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update comment');
      }

      // Update local state
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, content: editContent.trim(), updated_at: new Date().toISOString() }
          : c
      ));
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete comment');
      }

      // Update local state
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, is_deleted: true }
          : c
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setError(null);
  };

  if (loading || loadingComments) {
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={28} aria-hidden="true" />
            My Comments
          </h1>
          <div className="space-x-4">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
          {comments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <p>You haven't posted any comments yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {comments.map(comment => (
                <li key={comment.id} className="p-6">
                  {/* Post Title & Metadata */}
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={14} className="text-slate-400" />
                        <Link 
                          href={`/posts/${comment.post_id}`}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {comment.post_title || 'Untitled Post'}
                        </Link>
                        <ExternalLink size={12} className="text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString()}</span>
                        {comment.updated_at !== comment.created_at && (
                          <span className="text-slate-400">(edited)</span>
                        )}
                        {comment.is_deleted && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Deleted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Content */}
                  {editingId === comment.id ? (
                    <div className="mb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        disabled={submitting}
                        maxLength={10000}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          {editContent.length} / 10,000 characters
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={submitting}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEdit(comment.id)}
                            disabled={submitting || !editContent.trim()}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                          >
                            {submitting ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap break-words">
                        {comment.is_deleted ? (
                          <span className="italic text-slate-400">[Comment deleted]</span>
                        ) : (
                          comment.content
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!comment.is_deleted && editingId !== comment.id && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(comment)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
