import { getPostData, getSortedPostsData } from '../../../lib/posts';
import MarkdownRenderer from '../../../components/MarkdownRenderer';

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
            <time className="text-sm text-slate-500 dark:text-slate-400">
              {new Date(postData.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </header>

          <MarkdownRenderer content={postData.body} />
        </article>
      </main>
    </div>
  );
}
