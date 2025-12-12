import { getPostData, getSortedPostsData } from '@/lib/posts';

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    id: post.id,
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postData = await getPostData(id);

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">{postData.title}</h1>
      <div className="text-gray-500 mb-6">{postData.date}</div>
      <div
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: postData.contentHtml || '' }}
      />
    </div>
  );
}
