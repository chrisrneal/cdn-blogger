'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flag, CheckCircle, XCircle, Trash2, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';

interface CommentFlag {
  id: string;
  comment_id: string;
  flagged_by: string;
  reason?: string;
  created_at: string;
}

interface FlaggedComment {
  id: string;
  post_id: string;
  content: string;
  sanitized_content?: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  moderation_status: string;
  flags_count: number;
  moderation_notes?: string;
  is_deleted: boolean;
  flags: CommentFlag[];
}

export default function ReviewPage() {
  const [comments, setComments] = useState<FlaggedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchFlaggedComments() {
      if (!session?.access_token || !user) return;

      try {
        const res = await fetch('/api/admin/comments/flags?status=flagged,pending', {
          headers: {
            'x-user-id': user.id,
            'x-user-role': 'moderator',
          }
        });

        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        } else {
          const errorData = await res.json();
          setError(errorData.error || 'Failed to load flagged comments');
        }
      } catch (e) {
        console.error('Failed to fetch flagged comments', e);
        setError('Failed to load flagged comments');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchFlaggedComments();
    }
  }, [user, session]);

  const handleModerate = async (commentId: string, action: 'approve' | 'hide' | 'delete') => {
    if (!user) return;

    const confirmMessage = action === 'delete' 
      ? 'Are you sure you want to delete this comment?' 
      : `Are you sure you want to ${action} this comment?`;
    
    if (!confirm(confirmMessage)) return;

    setError(null);
    setSubmitting(commentId);

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': 'moderator',
        },
        body: JSON.stringify({
          action,
          moderation_notes: `${action} by ${user.email}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to moderate comment');
      }

      // Remove the comment from the list after moderation
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate comment');
    } finally {
      setSubmitting(null);
    }
  };

  if (authLoading || loading) {
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
            <Flag size={28} aria-hidden="true" />
            Review Flagged Comments
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
              <Flag size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <p>No flagged comments to review.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {comments.map(comment => (
                <li key={comment.id} className="p-6">
                  {/* Comment Metadata */}
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          By {comment.author_name}
                        </span>
                        {comment.moderation_status === 'flagged' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Flagged ({comment.flags_count})
                          </span>
                        )}
                        {comment.moderation_status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                    <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap break-words">
                      {comment.is_deleted ? (
                        <span className="italic text-slate-400">[Comment deleted]</span>
                      ) : (
                        comment.content
                      )}
                    </div>
                  </div>

                  {/* Flags Details */}
                  {comment.flags && comment.flags.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-800">
                      <h3 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                        Flags ({comment.flags.length}):
                      </h3>
                      <ul className="space-y-1">
                        {comment.flags.map(flag => (
                          <li key={flag.id} className="text-xs text-slate-600 dark:text-slate-400">
                            {flag.reason ? (
                              <span>• {flag.reason}</span>
                            ) : (
                              <span>• Flagged by user</span>
                            )}
                            <span className="text-slate-400 ml-2">
                              ({new Date(flag.created_at).toLocaleDateString()})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Moderation Actions */}
                  {!comment.is_deleted && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => handleModerate(comment.id, 'approve')}
                        disabled={submitting !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        {submitting === comment.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleModerate(comment.id, 'hide')}
                        disabled={submitting !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        {submitting === comment.id ? 'Processing...' : 'Hide'}
                      </button>
                      <button
                        onClick={() => handleModerate(comment.id, 'delete')}
                        disabled={submitting !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {submitting === comment.id ? 'Processing...' : 'Delete'}
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
