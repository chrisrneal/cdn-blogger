import { getPostData, getAllPostIds } from '../../../lib/posts';

// Generate static params for all posts
export async function generateStaticParams() {
  const paths = getAllPostIds();
  return paths.map((path) => path.params);
}

// Page component
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postData = getPostData(id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
            <header className="mb-10 text-center">
              <time className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2 block">
                {new Date(postData.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                {postData.title}
              </h1>
            </header>

            <article className="prose prose-slate dark:prose-invert lg:prose-lg mx-auto bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="whitespace-pre-wrap">
                    {postData.body}
                </div>
            </article>

            <div className="mt-10 text-center">
               <a href="/" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  ← Back to home
               </a>
            </div>
        </div>
      </main>

      <footer className="mt-20 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} CDN Blogger. All rights reserved.</p>
      </footer>
    </div>
  );
}
