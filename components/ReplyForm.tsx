'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

interface ReplyFormProps {
  postId: string;
  parentId?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ReplyForm({ postId, parentId, onSuccess, onCancel }: ReplyFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: postId,
          parent_id: parentId,
          content: content.trim(),
          author_name: user ? (user.email?.split('@')[0] || 'User') : (authorName.trim() || 'Anonymous'),
          author_email: authorEmail.trim() || undefined,
          created_by: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit comment');
      }

      setContent('');
      setAuthorName('');
      setAuthorEmail('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label={parentId ? "Reply to comment" : "New comment form"}>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor={`comment-${parentId || 'new'}`} className="sr-only">
          {parentId ? "Your reply" : "Your comment"}
        </label>
        <textarea
          id={`comment-${parentId || 'new'}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={parentId ? "Write a reply..." : "Write a comment..."}
          maxLength={10000}
          rows={3}
          required
          aria-describedby={`comment-length-${parentId || 'new'}`}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y"
        />
        <div id={`comment-length-${parentId || 'new'}`} className="text-xs text-slate-400 dark:text-slate-500 mt-1" aria-live="polite">
          {content.length} / 10000 characters
        </div>
      </div>

      {!user && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`author-name-${parentId || 'new'}`} className="sr-only">
              Your name
            </label>
            <input
              id={`author-name-${parentId || 'new'}`}
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div>
            <label htmlFor={`author-email-${parentId || 'new'}`} className="sr-only">
              Email (optional)
            </label>
            <input
              id={`author-email-${parentId || 'new'}`}
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="Email (optional)"
              maxLength={255}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : parentId ? 'Reply' : 'Comment'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
