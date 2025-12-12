import { getSortedPostsData, getPostData } from '../lib/posts';

describe('getSortedPostsData', () => {
  it('should return posts sorted by date', () => {
    const posts = getSortedPostsData();

    // We expect 2 posts based on our dummy data
    expect(posts.length).toBeGreaterThanOrEqual(2);

    const [firstPost, secondPost] = posts;

    // Verify sorting (Newest first)
    // 2023-11-01 should be before 2023-10-27
    expect(new Date(firstPost.date).getTime()).toBeGreaterThan(new Date(secondPost.date).getTime());

    // Verify content structure
    expect(firstPost).toHaveProperty('title');
    expect(firstPost).toHaveProperty('date');
    expect(firstPost).toHaveProperty('body');
  });

  it('should parse metadata correctly', () => {
      const posts = getSortedPostsData();
      const welcomePost = posts.find(p => p.title === 'Welcome to Next.js');

      expect(welcomePost).toBeDefined();
      expect(welcomePost?.date).toBe('2023-10-27');
      expect(welcomePost?.body).toContain('Hello World');
  });
});

describe('getPostData', () => {
  it('should return post data with HTML content', async () => {
    const posts = getSortedPostsData();
    const firstPostId = posts[0].id;

    const postData = await getPostData(firstPostId);

    expect(postData).toHaveProperty('id');
    expect(postData.id).toBe(firstPostId);
    expect(postData).toHaveProperty('title');
    expect(postData).toHaveProperty('date');
    expect(postData).toHaveProperty('contentHtml');
    expect(postData.contentHtml).toContain('<p>'); // Expecting HTML content
  });
});
