'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPreview } from '../lib/stringUtils';
import LocationIcon from './LocationIcon';

interface Post {
  id: string;
  title: string;
  date: string;
  body: string;
  location?: string;
}

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  const [locationFilter, setLocationFilter] = useState('');

  const filteredPosts = posts.filter(post => {
    if (!locationFilter.trim()) return true;
    return post.location?.toLowerCase().includes(locationFilter.toLowerCase());
  });

  return (
    <>
      {posts.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          {locationFilter && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredPosts.length} of {posts.length} posts
            </p>
          )}
        </div>
      )}
      
      <div className="flex flex-col gap-10">
        {filteredPosts.map(({ id, title, date, body, location }) => {
          const preview = getPreview(body, 6);
          
          return (
            <article key={id} className="group">
              <div className="flex items-center gap-3 text-sm text-slate-400 mb-1">
                <time>
                  {new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                {location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <LocationIcon size={12} />
                      {location}
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                <Link href={`/posts/${id}`} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {title}
                </Link>
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none mb-3 text-slate-600 dark:text-slate-400">
                <ReactMarkdown>{preview}</ReactMarkdown>
              </div>
              <Link 
                href={`/posts/${id}`} 
                className="text-sm font-medium text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors inline-flex items-center"
              >
                Read more →
              </Link>
            </article>
          );
        })}
        {filteredPosts.length === 0 && locationFilter && (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">
            No posts found for location "{locationFilter}"
          </p>
        )}
      </div>
    </>
  );
}
