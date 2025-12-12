import Link from 'next/link';
import { getSortedPostsData } from '../lib/posts';

export default function Home() {
  const allPostsData = getSortedPostsData();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              CDN Blogger
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
              Thoughts, ideas, and stories.
            </p>
          </header>

          <section>
            <h2 className="sr-only">Blog Posts</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {allPostsData.map(({ id, title, date }) => (
                <Link href={`/posts/${id}`} key={id} className="group">
                  <article className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between">
                    <div>
                      <time className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2 block">
                        {new Date(date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3">
                        {title}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Read article
                      <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-20 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} CDN Blogger. All rights reserved.</p>
      </footer>
    </div>
  );
}
