import { getSortedPostsData, getPostData } from '../lib/posts';
import { supabase } from '../lib/supabase';

// Mock the module
jest.mock('../lib/supabase', () => {
    const mockSingle = jest.fn();
    // Chain for getPostData: .from().select().eq().single()
    // Chain for getSortedPostsData: .from().select().eq().order()

    // We need a flexible chain.
    const mockOrder = jest.fn();

    // The `.eq` needs to return an object that has both `.single` (for getPostData)
    // AND `.order` (for getSortedPostsData, because we added .eq('status', 'published') before .order)
    const mockEq = jest.fn(() => ({
        single: mockSingle,
        order: mockOrder,
        eq: jest.fn(), // In case of multiple .eq calls, though not used yet
    }));

    const mockSelect = jest.fn(() => ({
        eq: mockEq,
        order: mockOrder // Keeping this for backward compat if select().order() is called directly (it isn't anymore)
    }));

    const mockFrom = jest.fn(() => ({ select: mockSelect }));

    return {
        supabase: {
            from: mockFrom,
        },
    };
});

describe('lib/posts', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Retrieve the mocks from the imported object.
        const mFrom = supabase.from as jest.Mock;
        // Re-construct the chain to get the specific mock instances
        // Note: Since we return new objects in the mock factory functions above,
        // we need to be careful. Ideally, we should define the mock functions outside
        // and return them.
    });

    // Helper to get fresh mocks since the factory creates new ones on import
    // Actually, jest.mock is hoisted. The inner functions are created once per test file run if defined outside?
    // No, the factory runs.
    // Let's just rely on the implementation details we set up.

    describe('getSortedPostsData', () => {
        it('should return mapped posts sorted by date', async () => {
            const mockData = [
                { slug: 'post-1', title: 'Post 1', date: '2023-01-02', content: 'Content 1', created_by: 'user1', status: 'published' },
                { slug: 'post-2', title: 'Post 2', date: '2023-01-01', content: 'Content 2', created_by: 'user1', status: 'published' },
            ];

            // Access the mock functions
            // Implementation: supabase.from('posts').select(...).eq('status', 'published').order(...)
            const mFrom = supabase.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mEq = mSelect().eq as jest.Mock;
            const mOrder = mEq().order as jest.Mock;

            mOrder.mockResolvedValueOnce({ data: mockData, error: null });

            const posts = await getSortedPostsData();

            expect(mFrom).toHaveBeenCalledWith('posts');
            expect(mSelect).toHaveBeenCalledWith('slug, title, date, content, created_by, status');
            expect(mEq).toHaveBeenCalledWith('status', 'published');
            expect(mOrder).toHaveBeenCalledWith('date', { ascending: false });

            expect(posts).toHaveLength(2);
            expect(posts[0].id).toBe('post-1');
            expect(posts[0].title).toBe('Post 1');
            expect(posts[0].status).toBe('published');
        });

        it('should return empty array on error', async () => {
             const mFrom = supabase.from as jest.Mock;
             const mSelect = mFrom().select as jest.Mock;
             const mEq = mSelect().eq as jest.Mock;
             const mOrder = mEq().order as jest.Mock;

            mOrder.mockResolvedValueOnce({ data: null, error: { message: 'Some error' } });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const posts = await getSortedPostsData();

            expect(posts).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('getPostData', () => {
        it('should return data for a specific post', async () => {
            const mockPost = { slug: 'welcome', title: 'Welcome', date: '2023-01-01', content: 'Hello', created_by: 'user1', status: 'published' };

            // Implementation: supabase.from('posts').select(...).eq('slug', id).single()
            const mFrom = supabase.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mEq = mSelect().eq as jest.Mock;
            const mSingle = mEq().single as jest.Mock;

            mSingle.mockResolvedValueOnce({ data: mockPost, error: null });

            const postData = await getPostData('welcome');

            expect(mFrom).toHaveBeenCalledWith('posts');
            expect(mSelect).toHaveBeenCalledWith('slug, title, date, content, created_by, status');
            expect(mEq).toHaveBeenCalledWith('slug', 'welcome');
            expect(postData.id).toBe('welcome');
            expect(postData.title).toBe('Welcome');
        });

        it('should throw error if post not found', async () => {
            const mFrom = supabase.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mEq = mSelect().eq as jest.Mock;
            const mSingle = mEq().single as jest.Mock;

            mSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

            await expect(getPostData('missing')).rejects.toThrow('Post not found: missing');
        });
    });
});
