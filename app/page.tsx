import Link from 'next/link';
import { getSortedPostsData } from '../lib/posts';

export default async function Home() {
  const allPostsData = await getSortedPostsData();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <section className="mb-12">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Latest Posts
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Thoughts, ideas, and stories from the community.
            </p>
          </section>

          <section>
            <h2 className="sr-only">Blog Posts</h2>
            <div className="flex flex-col gap-10">
              {allPostsData.map(({ id, title, date }) => (
                <article key={id} className="group">
                  <Link href={`/posts/${id}`} className="block">
                    <time className="text-sm text-slate-400 mb-1 block">
                      {new Date(date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {title}
                    </h3>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-20 py-8 text-center text-slate-400 text-sm max-w-2xl mx-auto border-t border-slate-100 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} CDN Blogger.</p>
      </footer>
    </div>
  );
}
