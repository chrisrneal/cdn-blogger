/**
 * Tests for Comment Service
 */

import {
  createComment,
  getCommentById,
  getCommentsForPost,
  updateComment,
  softDeleteComment,
  changeCommentStatus,
  type CreateCommentInput,
  type UpdateCommentInput,
  type GetCommentsOptions,
} from './commentService';
import { supabase } from '../supabase';
import { Comment, ModerationStatus } from '../schemaUtils';

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('commentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a top-level comment successfully', async () => {
      const mockPost = { id: 'post-1' };
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'pending',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockPost, error: null });
      const mockInsert = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            insert: mockInsert.mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
              }),
            }),
          };
        }
      });

      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: 'Test comment',
        author_name: 'Test User',
      };

      const result = await createComment(input);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockComment);
      expect(mockInsert).toHaveBeenCalledWith({
        post_id: 'post-1',
        parent_id: null,
        content: 'Test comment',
        author_name: 'Test User',
        author_email: undefined,
        created_by: undefined,
      });
    });

    it('should create a reply comment with parent_id', async () => {
      const mockPost = { id: 'post-1' };
      const mockParent = {
        id: 'parent-1',
        post_id: 'post-1',
        path: ['parent-1'],
      };
      const mockComment: Comment = {
        id: 'comment-2',
        post_id: 'post-1',
        parent_id: 'parent-1',
        path: ['parent-1', 'comment-2'],
        content: 'Reply comment',
        author_name: 'Test User 2',
        moderation_status: 'pending',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T01:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockPost, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockParent, error: null }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
              }),
            }),
          };
        }
      });

      const input: CreateCommentInput = {
        post_id: 'post-1',
        parent_id: 'parent-1',
        content: 'Reply comment',
        author_name: 'Test User 2',
      };

      const result = await createComment(input);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockComment);
    });

    it('should reject empty content', async () => {
      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: '   ',
        author_name: 'Test User',
      };

      const result = await createComment(input);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'INVALID_INPUT',
        message: 'Comment content cannot be empty',
      });
    });

    it('should reject empty author name', async () => {
      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: 'Test comment',
        author_name: '   ',
      };

      const result = await createComment(input);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'INVALID_INPUT',
        message: 'Author name is required',
      });
    });

    it('should reject if post does not exist', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const input: CreateCommentInput = {
        post_id: 'non-existent-post',
        content: 'Test comment',
        author_name: 'Test User',
      };

      const result = await createComment(input);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('POST_NOT_FOUND');
    });

    it('should reject if parent does not exist', async () => {
      const mockPost = { id: 'post-1' };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockPost, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
      });

      const input: CreateCommentInput = {
        post_id: 'post-1',
        parent_id: 'non-existent-parent',
        content: 'Test comment',
        author_name: 'Test User',
      };

      const result = await createComment(input);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('PARENT_NOT_FOUND');
    });

    it('should reject if parent belongs to different post', async () => {
      const mockPost = { id: 'post-1' };
      const mockParent = {
        id: 'parent-1',
        post_id: 'post-2', // Different post!
        path: ['parent-1'],
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockPost, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockParent, error: null }),
              }),
            }),
          };
        }
      });

      const input: CreateCommentInput = {
        post_id: 'post-1',
        parent_id: 'parent-1',
        content: 'Test comment',
        author_name: 'Test User',
      };

      const result = await createComment(input);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('PARENT_POST_MISMATCH');
    });
  });

  describe('getCommentById', () => {
    it('should retrieve a comment by ID', async () => {
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
            }),
          }),
        }),
      });

      const result = await getCommentById('comment-1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockComment);
    });

    it('should exclude deleted comments by default', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      const result = await getCommentById('comment-1', false);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should include deleted comments when requested', async () => {
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: true,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: '2024-01-02T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
          }),
        }),
      });

      const result = await getCommentById('comment-1', true);

      expect(result.error).toBeNull();
      expect(result.data?.is_deleted).toBe(true);
    });
  });

  describe('getCommentsForPost', () => {
    const mockComments: Comment[] = [
      {
        id: 'c1',
        post_id: 'post-1',
        parent_id: null,
        path: ['c1'],
        content: 'Comment 1',
        author_name: 'User 1',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'c2',
        post_id: 'post-1',
        parent_id: 'c1',
        path: ['c1', 'c2'],
        content: 'Reply 1',
        author_name: 'User 2',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 1,
        created_at: '2024-01-01T01:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      },
      {
        id: 'c3',
        post_id: 'post-1',
        parent_id: 'c2',
        path: ['c1', 'c2', 'c3'],
        content: 'Nested Reply',
        author_name: 'User 3',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T02:00:00Z',
        updated_at: '2024-01-01T02:00:00Z',
      },
    ];

    it('should return flat list of comments', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', { asTree: false });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockComments);
    });

    it('should return nested tree structure', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', { asTree: true });

      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      
      const tree = result.data as CommentWithDepth[];
      expect(tree).toHaveLength(1); // One root comment
      expect(tree[0].id).toBe('c1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children![0].id).toBe('c2');
      expect(tree[0].children![0].children).toHaveLength(1);
      expect(tree[0].children![0].children![0].id).toBe('c3');
    });

    it('should apply depth limiting', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', {
        asTree: true,
        maxDepth: 2,
      });

      expect(result.error).toBeNull();
      
      const tree = result.data as CommentWithDepth[];
      // With maxDepth=2, we should see:
      // - c1 (depth 1) ✓
      // - c2 (depth 2) ✓  
      // - c3 (depth 3) ✗ (removed)
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('c1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children![0].id).toBe('c2');
      expect(tree[0].children![0].children).toEqual([]);
    });

    it('should filter by moderation status', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockComments[0]], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', {
        moderationStatus: 'approved',
      });

      expect(result.error).toBeNull();
      expect(mockQuery.eq).toHaveBeenCalledWith('moderation_status', 'approved');
    });

    it('should filter by multiple moderation statuses', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', {
        moderationStatus: ['approved', 'pending'],
      });

      expect(result.error).toBeNull();
      expect(mockQuery.in).toHaveBeenCalledWith('moderation_status', ['approved', 'pending']);
    });

    it('should apply pagination for flat list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockComments[0]], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCommentsForPost('post-1', {
        asTree: false,
        limit: 10,
        offset: 0,
      });

      expect(result.error).toBeNull();
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });

    it('should exclude deleted comments by default', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockComments, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await getCommentsForPost('post-1');

      expect(mockQuery.eq).toHaveBeenCalledWith('is_deleted', false);
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const updatedComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Updated content',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedComment, error: null }),
            }),
          }),
        }),
      });

      const updates: UpdateCommentInput = {
        content: 'Updated content',
      };

      const result = await updateComment('comment-1', updates);

      expect(result.error).toBeNull();
      expect(result.data?.content).toBe('Updated content');
    });

    it('should reject empty content update', async () => {
      const updates: UpdateCommentInput = {
        content: '   ',
      };

      const result = await updateComment('comment-1', updates);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject empty author name update', async () => {
      const updates: UpdateCommentInput = {
        author_name: '   ',
      };

      const result = await updateComment('comment-1', updates);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject update with no fields', async () => {
      const updates: UpdateCommentInput = {};

      const result = await updateComment('comment-1', updates);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.error?.message).toBe('No fields to update');
    });

    it('should update multiple fields', async () => {
      const updatedComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Updated content',
        author_name: 'Updated Name',
        author_email: 'updated@example.com',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedComment, error: null }),
            }),
          }),
        }),
      });

      const updates: UpdateCommentInput = {
        content: 'Updated content',
        author_name: 'Updated Name',
        author_email: 'updated@example.com',
      };

      const result = await updateComment('comment-1', updates);

      expect(result.error).toBeNull();
      expect(result.data?.content).toBe('Updated content');
      expect(result.data?.author_name).toBe('Updated Name');
    });
  });

  describe('softDeleteComment', () => {
    it('should soft delete a comment', async () => {
      const deletedComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: true,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        deleted_at: '2024-01-02T00:00:00Z',
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: deletedComment, error: null }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await softDeleteComment('comment-1');

      expect(result.error).toBeNull();
      expect(result.data?.is_deleted).toBe(true);
      expect(result.data?.deleted_at).toBeDefined();
      
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.is_deleted).toBe(true);
      expect(updateCall.deleted_at).toBeDefined();
    });
  });

  describe('changeCommentStatus', () => {
    it('should change comment to approved status', async () => {
      const approvedComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: approvedComment, error: null }),
            }),
          }),
        }),
      });

      const result = await changeCommentStatus('comment-1', 'approved');

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('approved');
    });

    it('should change comment to flagged status with notes', async () => {
      const flaggedComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test comment',
        author_name: 'Test User',
        moderation_status: 'flagged',
        moderation_notes: 'Inappropriate content',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: flaggedComment, error: null }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await changeCommentStatus(
        'comment-1',
        'flagged',
        'Inappropriate content'
      );

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('flagged');
      
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.moderation_notes).toBe('Inappropriate content');
    });

    it('should reject invalid status', async () => {
      const result = await changeCommentStatus('comment-1', 'invalid' as ModerationStatus);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should accept all valid statuses', async () => {
      const statuses: ModerationStatus[] = ['pending', 'approved', 'flagged', 'rejected'];

      for (const status of statuses) {
        const mockComment: Comment = {
          id: 'comment-1',
          post_id: 'post-1',
          parent_id: null,
          path: ['comment-1'],
          content: 'Test',
          author_name: 'User',
          moderation_status: status,
          flags_count: 0,
          is_deleted: false,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
              }),
            }),
          }),
        });

        const result = await changeCommentStatus('comment-1', status);
        expect(result.error).toBeNull();
      }
    });
  });
});
