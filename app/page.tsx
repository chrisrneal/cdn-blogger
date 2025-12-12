export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to CDN Blogger
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              A simple blogger/social media tool
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                Get Started
              </button>
              <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                Learn More
              </button>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Create Content
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Write and publish engaging blog posts with ease
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-3xl mb-3">🌐</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Share Everywhere
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect with your audience across platforms
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Track Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your content performance and engagement
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
