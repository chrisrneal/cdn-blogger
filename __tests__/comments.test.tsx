import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentsList from '@/components/CommentsList';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the AuthContext
jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

describe('CommentsList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<CommentsList postId="test-post-id" />);
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument();
  });

  it('should render empty state when no comments exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: [] }),
    });

    render(<CommentsList postId="test-post-id" />);

    // Wait for loading to complete
    await screen.findByText(/no comments yet/i);
    expect(screen.getByText(/be the first to comment/i)).toBeInTheDocument();
  });

  it('should render comments when they exist', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        post_id: 'test-post-id',
        parent_id: null,
        path: ['comment-1'],
        content: 'This is a test comment',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        depth: 1,
        children: [],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: mockComments }),
    });

    render(<CommentsList postId="test-post-id" />);

    // Wait for comment to appear
    await screen.findByText('This is a test comment');
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to load' }),
    });

    render(<CommentsList postId="test-post-id" />);

    // Wait for error to appear
    await screen.findByText(/failed to load comments/i);
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('should call fetch with correct postId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: [] }),
    });

    render(<CommentsList postId="my-post-123" />);

    await screen.findByText(/no comments yet/i);

    expect(global.fetch).toHaveBeenCalledWith('/api/comments?postId=my-post-123');
  });
});
