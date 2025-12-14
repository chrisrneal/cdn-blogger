'use client';

import { useState, useEffect } from 'react';
import { CommentWithDepth } from '@/lib/schemaUtils';
import CommentItem from './CommentItem';
import ReplyForm from './ReplyForm';
import { MessageSquare } from 'lucide-react';

interface CommentsListProps {
  postId: string;
}

export default function CommentsList({ postId }: CommentsListProps) {
  const [comments, setComments] = useState<CommentWithDepth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);

  const fetchComments = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/comments?postId=${postId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleCommentUpdate = () => {
    fetchComments();
  };

  const handleCommentSuccess = () => {
    setShowCommentForm(false);
    fetchComments();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100"></div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchComments}
          className="mt-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare size={20} />
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
        {!showCommentForm && (
          <button
            onClick={() => setShowCommentForm(true)}
            className="text-sm font-medium text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Add comment
          </button>
        )}
      </div>

      {/* New Comment Form */}
      {showCommentForm && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
          <ReplyForm
            postId={postId}
            onSuccess={handleCommentSuccess}
            onCancel={() => setShowCommentForm(false)}
          />
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            No comments yet. Be the first to comment!
          </p>
          {!showCommentForm && (
            <button
              onClick={() => setShowCommentForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
            >
              Write a comment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onCommentUpdate={handleCommentUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
