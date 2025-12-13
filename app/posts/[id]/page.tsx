import { getPostData, getSortedPostsData } from '../../../lib/posts';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditPostButton from '@/components/EditPostButton';

// Force dynamic rendering to ensure the latest data is fetched from the DB
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const posts = await getSortedPostsData();
  return posts.map((post) => ({
    id: post.id,
  }));
}

export default async function Post({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postData = await getPostData(id);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
      <main className="container mx-auto px-4 py-16">
        <article className="max-w-2xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {postData.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <time>
                {new Date(postData.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {postData.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {postData.location}
                  </span>
                </>
              )}
            </div>
            {postData.created_by && (
                <EditPostButton authorId={postData.created_by} slug={postData.id} />
            )}
          </header>

          <MarkdownRenderer content={postData.body} />
        </article>
      </main>
    </div>
  );
}
