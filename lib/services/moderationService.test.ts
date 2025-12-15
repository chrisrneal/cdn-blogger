/**
 * Tests for Moderation Service
 */

import {
  flagComment,
  getModerationQueue,
  moderateComment,
  getCommentFlags,
  type FlagCommentInput,
  type ModerationAction,
} from './moderationService';
import { supabase } from '../supabase';
import { Comment, ModerationStatus } from '../schemaUtils';
import * as commentService from './commentService';

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock comment service
jest.mock('./commentService', () => ({
  softDeleteComment: jest.fn(),
  changeCommentStatus: jest.fn(),
}));

describe('moderationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('flagComment', () => {
    it('should flag a comment successfully', async () => {
      const mockComment = { id: 'comment-1' };
      const mockFlag = {
        id: 'flag-1',
        comment_id: 'comment-1',
        flagged_by: 'user-1',
        reason: 'Inappropriate content',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle.mockResolvedValue({ data: mockComment, error: null }),
              }),
            }),
          };
        }
        if (table === 'comment_flags') {
          return {
            insert: mockInsert.mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockFlag, error: null }),
              }),
            }),
          };
        }
      });

      const input: FlagCommentInput = {
        comment_id: 'comment-1',
        flagged_by: 'user-1',
        reason: 'Inappropriate content',
      };

      const result = await flagComment(input);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockFlag);
      expect(mockInsert).toHaveBeenCalledWith({
        comment_id: 'comment-1',
        flagged_by: 'user-1',
        reason: 'Inappropriate content',
      });
    });

    it('should return error if comment does not exist', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
      });

      const input: FlagCommentInput = {
        comment_id: 'non-existent',
        flagged_by: 'user-1',
      };

      const result = await flagComment(input);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('COMMENT_NOT_FOUND');
    });

    it('should return error for duplicate flag', async () => {
      const mockComment = { id: 'comment-1' };

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle.mockResolvedValue({ data: mockComment, error: null }),
              }),
            }),
          };
        }
        if (table === 'comment_flags') {
          return {
            insert: mockInsert.mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'Duplicate key' },
                }),
              }),
            }),
          };
        }
      });

      const input: FlagCommentInput = {
        comment_id: 'comment-1',
        flagged_by: 'user-1',
      };

      const result = await flagComment(input);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('DUPLICATE_FLAG');
    });
  });

  describe('getModerationQueue', () => {
    it('should retrieve flagged comments with their flags', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          post_id: 'post-1',
          content: 'Comment 1',
          flags_count: 3,
          moderation_status: 'flagged',
        },
        {
          id: 'comment-2',
          post_id: 'post-1',
          content: 'Comment 2',
          flags_count: 2,
          moderation_status: 'flagged',
        },
      ];

      const mockFlags = [
        { id: 'flag-1', comment_id: 'comment-1', flagged_by: 'user-1', created_at: '2024-01-01' },
        { id: 'flag-2', comment_id: 'comment-1', flagged_by: 'user-2', created_at: '2024-01-02' },
        { id: 'flag-3', comment_id: 'comment-2', flagged_by: 'user-3', created_at: '2024-01-03' },
      ];

      const mockIn = jest.fn();
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        in: mockIn,
      };

      // After the query is built, calling .in() on it should return a promise
      mockIn.mockResolvedValue({ data: mockComments, error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return queryBuilder;
        }
        if (table === 'comment_flags') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockFlags, error: null }),
              }),
            }),
          };
        }
      });

      const result = await getModerationQueue();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data![0].flags).toHaveLength(2);
      expect(result.data![1].flags).toHaveLength(1);
    });

    it('should filter by moderation status', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          moderation_status: 'pending',
          flags_count: 1,
        },
      ];

      const mockEq = jest.fn();
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        eq: mockEq,
      };

      // After the query is built, calling .eq() on it should return a promise
      mockEq.mockResolvedValue({ data: mockComments, error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return queryBuilder;
        }
        if (table === 'comment_flags') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
      });

      const result = await getModerationQueue({ status: 'pending' });

      expect(result.error).toBeNull();
      expect(mockEq).toHaveBeenCalled();
    });
  });

  describe('moderateComment', () => {
    it('should approve a comment', async () => {
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test',
        author_name: 'User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (commentService.changeCommentStatus as jest.Mock).mockResolvedValue({
        data: mockComment,
        error: null,
      });

      const action: ModerationAction = {
        action: 'approve',
        moderation_notes: 'Approved after review',
      };

      const result = await moderateComment('comment-1', action);

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('approved');
      expect(commentService.changeCommentStatus).toHaveBeenCalledWith(
        'comment-1',
        'approved',
        'Approved after review'
      );
    });

    it('should hide a comment', async () => {
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test',
        author_name: 'User',
        moderation_status: 'rejected',
        flags_count: 0,
        is_deleted: false,
        reply_count: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (commentService.changeCommentStatus as jest.Mock).mockResolvedValue({
        data: mockComment,
        error: null,
      });

      const action: ModerationAction = {
        action: 'hide',
      };

      const result = await moderateComment('comment-1', action);

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('rejected');
      expect(commentService.changeCommentStatus).toHaveBeenCalledWith(
        'comment-1',
        'rejected',
        undefined
      );
    });

    it('should soft-delete a comment', async () => {
      const mockComment: Comment = {
        id: 'comment-1',
        post_id: 'post-1',
        parent_id: null,
        path: ['comment-1'],
        content: 'Test',
        author_name: 'User',
        moderation_status: 'approved',
        flags_count: 0,
        is_deleted: true,
        reply_count: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        deleted_at: '2024-01-02',
      };

      (commentService.softDeleteComment as jest.Mock).mockResolvedValue({
        data: mockComment,
        error: null,
      });

      const mockFrom = jest.fn().mockReturnThis();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockComment, error: null });

      (supabase.from as jest.Mock).mockImplementation(() => ({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      }));

      const action: ModerationAction = {
        action: 'delete',
        moderation_notes: 'Deleted for violations',
      };

      const result = await moderateComment('comment-1', action);

      expect(result.error).toBeNull();
      expect(commentService.softDeleteComment).toHaveBeenCalledWith('comment-1');
    });

    it('should return error for invalid action', async () => {
      const action = {
        action: 'invalid' as any,
      };

      const result = await moderateComment('comment-1', action);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_ACTION');
    });
  });

  describe('getCommentFlags', () => {
    it('should retrieve flags for a specific comment', async () => {
      const mockFlags = [
        { id: 'flag-1', comment_id: 'comment-1', flagged_by: 'user-1', created_at: '2024-01-01' },
        { id: 'flag-2', comment_id: 'comment-1', flagged_by: 'user-2', created_at: '2024-01-02' },
      ];

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockFlags, error: null });

      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder,
          }),
        }),
      }));

      const result = await getCommentFlags('comment-1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(mockEq).toHaveBeenCalledWith('comment_id', 'comment-1');
    });

    it('should return empty array if no flags found', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder,
          }),
        }),
      }));

      const result = await getCommentFlags('comment-1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });
});
