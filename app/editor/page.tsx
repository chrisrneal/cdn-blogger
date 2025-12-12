'use client';

import { useState } from 'react';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import Link from 'next/link';

export default function Editor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    try {
      const date = new Date().toISOString();
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, date, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setStatus('saved');
      // Reset after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Post'}
          </button>
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
