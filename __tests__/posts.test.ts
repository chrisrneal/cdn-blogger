
// Correct approach for Jest hoisting:
// 1. Define the mock implementation inside the factory or use `jest.fn()` inside.
// 2. OR import the mock if using `__mocks__`.
// 3. OR use a variable that is hoisted? No, variables aren't hoisted.
// Standard pattern:

import { getSortedPostsData, getPostData } from '../lib/posts';
import { supabaseAdmin } from '../lib/supabase';

// Mock the module
jest.mock('../lib/supabase', () => {
    // We create the mock functions inside the factory to avoid hoisting issues,
    // OR we can just return a basic structure and spy on it later?
    // But since we are importing `supabaseAdmin`, we can't easily replace it unless we mock the whole module.

    // We need to support the chain: from().select().order() and from().select().eq().single()

    const mockSingle = jest.fn();
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockOrder = jest.fn();
    const mockSelect = jest.fn(() => ({ order: mockOrder, eq: mockEq }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));

    return {
        supabaseAdmin: {
            from: mockFrom,
        },
        // expose mocks for assertion (optional, but tricky with module factory)
        // A better way is to attach them to the mocked object if possible.
        // Or simply rely on the fact that we can traverse the mock structure.
    };
});

// To get access to the mocks we just created:
// Since we mocked `../lib/supabase`, the imported `supabaseAdmin` is the mocked version.
// We can cast it to `jest.Mocked` or `any` to access the methods.

describe('lib/posts', () => {
    const mockFrom = (supabaseAdmin.from as jest.Mock);

    // We need to traverse down to get the inner mocks to configure/assert them.
    // This is cumbersome.

    // BETTER APPROACH:
    // Define the mocks globally but use `var` (hoisted)? No.
    // Use `jest.doMock` inside beforeEach? No.

    // EASIEST APPROACH:
    // Create the mocks, then `jest.mock` using a factory that returns an object referencing those mocks?
    // BUT this failed before because of TDZ (Temporal Dead Zone).

    // FIX: Moving `jest.mock` to top is required.
    // Variables used in factory must be prefixed with `mock` AND initialized... but `const` has TDZ.

    // The solution is to use `require` or define the mocks in the factory itself,
    // and then in the test, get the mocks via the imported module.

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the default chain behavior
        // Since we are creating fresh functions in the factory each time? No, factory runs once.
        // So we need to access the SAME mock instances.

        // Let's retrieve the mocks from the imported object.
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
