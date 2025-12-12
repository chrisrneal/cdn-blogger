import { getSortedPostsData, getPostData } from '../lib/posts';
import { supabaseAdmin } from '../lib/supabase';

// Mock the module
jest.mock('../lib/supabase', () => {
    const mockSingle = jest.fn();
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockOrder = jest.fn();
    const mockSelect = jest.fn(() => ({ order: mockOrder, eq: mockEq }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));

    return {
        supabaseAdmin: {
            from: mockFrom,
        },
    };
});

describe('lib/posts', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Retrieve the mocks from the imported object.
        const mFrom = supabaseAdmin.from as jest.Mock;
        const mSelect = mFrom().select as jest.Mock;
        const mOrder = mSelect().order as jest.Mock;
        const mEq = mSelect().eq as jest.Mock;
        const mSingle = mEq().single as jest.Mock;

        // Set default resolved values
        mOrder.mockResolvedValue({ data: [], error: null });
        mSingle.mockResolvedValue({ data: null, error: null });
    });

    describe('getSortedPostsData', () => {
        it('should return mapped posts sorted by date', async () => {
            const mockData = [
                { slug: 'post-1', title: 'Post 1', date: '2023-01-02', content: 'Content 1' },
                { slug: 'post-2', title: 'Post 2', date: '2023-01-01', content: 'Content 2' },
            ];

            const mFrom = supabaseAdmin.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mOrder = mSelect().order as jest.Mock;

            mOrder.mockResolvedValueOnce({ data: mockData, error: null });

            const posts = await getSortedPostsData();

            expect(mFrom).toHaveBeenCalledWith('posts');
            expect(mSelect).toHaveBeenCalledWith('slug, title, date, content');
            expect(mOrder).toHaveBeenCalledWith('date', { ascending: false });

            expect(posts).toHaveLength(2);
            expect(posts[0].id).toBe('post-1');
            expect(posts[0].title).toBe('Post 1');
        });

        it('should return empty array on error', async () => {
             const mFrom = supabaseAdmin.from as jest.Mock;
             const mSelect = mFrom().select as jest.Mock;
             const mOrder = mSelect().order as jest.Mock;

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
            const mockPost = { slug: 'welcome', title: 'Welcome', date: '2023-01-01', content: 'Hello' };

            const mFrom = supabaseAdmin.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mEq = mSelect().eq as jest.Mock;
            const mSingle = mEq().single as jest.Mock;

            mSingle.mockResolvedValueOnce({ data: mockPost, error: null });

            const postData = await getPostData('welcome');

            expect(mFrom).toHaveBeenCalledWith('posts');
            expect(mSelect).toHaveBeenCalledWith('slug, title, date, content');
            expect(mEq).toHaveBeenCalledWith('slug', 'welcome');
            expect(postData.id).toBe('welcome');
            expect(postData.title).toBe('Welcome');
        });

        it('should throw error if post not found', async () => {
            const mFrom = supabaseAdmin.from as jest.Mock;
            const mSelect = mFrom().select as jest.Mock;
            const mEq = mSelect().eq as jest.Mock;
            const mSingle = mEq().single as jest.Mock;

            mSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

            await expect(getPostData('missing')).rejects.toThrow('Post not found: missing');
        });
    });
});
