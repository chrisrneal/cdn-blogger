'use client';

import { useState } from 'react';
import { CommentWithDepth } from '@/lib/schemaUtils';
import ReplyForm from './ReplyForm';
import { useAuth } from './AuthContext';
import { MessageSquare, ThumbsUp, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface CommentItemProps {
  comment: CommentWithDepth;
  postId: string;
  onCommentUpdate: () => void;
}

export default function CommentItem({ comment, postId, onCommentUpdate }: CommentItemProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [collapsed, setCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = user?.id === comment.created_by;
  const hasReplies = comment.children && comment.children.length > 0;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
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

      setIsEditing(false);
      onCommentUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete comment');
      }

      onCommentUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    onCommentUpdate();
  };

  const indentClass = comment.depth > 0 ? 'ml-6 sm:ml-8 md:ml-12' : '';
  const borderClass = comment.depth > 0 ? 'border-l-2 border-slate-200 dark:border-slate-700 pl-4' : '';

  // If comment is soft-deleted, show placeholder
  if (comment.is_deleted) {
    return (
      <div className={`${indentClass} ${borderClass}`}>
        <div className="py-3">
          <div className="flex items-start gap-3">
            {/* Deleted indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Trash2 size={14} className="text-slate-400 dark:text-slate-600" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm italic text-slate-400 dark:text-slate-600">
                [Comment deleted]
              </p>

              {hasReplies && (
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? 'Show' : 'Hide'} ${comment.children!.length} ${comment.children!.length === 1 ? 'reply' : 'replies'}`}
                  >
                    {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {collapsed ? 'Show' : 'Hide'} {comment.children!.length} {comment.children!.length === 1 ? 'reply' : 'replies'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nested Replies - still show them */}
        {!collapsed && hasReplies && (
          <div className="space-y-0" role="group" aria-label="Replies">
            {comment.children?.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                postId={postId}
                onCommentUpdate={onCommentUpdate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${indentClass} ${borderClass}`}>
      <div className="py-3">
        {error && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {comment.author_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {comment.author_name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-slate-400 dark:text-slate-500">(edited)</span>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={10000}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:border-transparent text-slate-900 dark:text-white resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    disabled={submitting || !editContent.trim()}
                    className="px-3 py-1 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                      setError(null);
                    }}
                    className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-4 mt-2" role="group" aria-label="Comment actions">
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-expanded={showReplyForm}
                  aria-label="Reply to comment"
                >
                  <MessageSquare size={14} aria-hidden="true" />
                  Reply
                </button>

                <button
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Upvote (coming soon)"
                  aria-label="Upvote comment"
                  disabled
                >
                  <ThumbsUp size={14} aria-hidden="true" />
                  <span>0</span>
                </button>

                {isAuthor && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      aria-label="Edit comment"
                    >
                      <Edit2 size={14} aria-hidden="true" />
                      Edit
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={submitting}
                      className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Delete
                    </button>
                  </>
                )}

                {hasReplies && (
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? 'Show' : 'Hide'} ${comment.children!.length} ${comment.children!.length === 1 ? 'reply' : 'replies'}`}
                  >
                    {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {collapsed ? 'Show' : 'Hide'} {comment.children!.length} {comment.children!.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && !isEditing && (
          <div className="mt-3 ml-11">
            <ReplyForm
              postId={postId}
              parentId={comment.id}
              onSuccess={handleReplySuccess}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {!collapsed && hasReplies && (
        <div className="space-y-0" role="group" aria-label="Replies">
          {comment.children?.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              onCommentUpdate={onCommentUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
