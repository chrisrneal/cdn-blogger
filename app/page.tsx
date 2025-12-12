import { getSortedPostsData } from '../lib/posts';

export default function Home() {
  const allPostsData = getSortedPostsData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 md:p-12 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to CDN Blogger
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              A simple blogger/social media tool
            </p>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Blog Posts</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {allPostsData.map(({ title, date, body }) => (
              <div key={title + date} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                 <small className="text-gray-500 dark:text-gray-400 block mb-2">{date}</small>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
                 <div className="prose dark:prose-invert max-w-none">
                   {/* Render a snippet or full body. Rendering raw markdown for now as requested by user to display body */}
                   <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                     {body}
                   </pre>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
