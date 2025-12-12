import { getSortedPostsData, getPostData, getAllPostIds } from '../lib/posts';

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
  it('should return data for a specific post', () => {
    const postData = getPostData('welcome');
    expect(postData.id).toBe('welcome');
    expect(postData.title).toBe('Welcome to Next.js');
    expect(postData.date).toBe('2023-10-27');
    expect(postData.body).toContain('Hello World');
  });
});

describe('getAllPostIds', () => {
  it('should return all post ids', () => {
    const ids = getAllPostIds();
    // We expect at least the welcome post and the second post
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const welcomeId = ids.find(p => p.params.id === 'welcome');
    expect(welcomeId).toBeDefined();
  });
});
