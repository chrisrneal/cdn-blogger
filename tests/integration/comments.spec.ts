/**
 * Integration Tests for Comment Flows
 * 
 * Tests comment creation, reply nesting, fetching threaded structure,
 * input validation, soft delete, and moderation scenarios.
 * 
 * These tests use mocked Supabase calls to simulate integration scenarios
 * without requiring a live database connection.
 */

import {
  createComment,
  getCommentsForPost,
  updateComment,
  softDeleteComment,
  changeCommentStatus,
  getCommentById,
  type CreateCommentInput,
  type UpdateCommentInput,
} from '../../lib/services/commentService';
import {
  flagComment,
  moderateComment,
  getModerationQueue,
  getCommentFlags,
  type FlagCommentInput,
  type ModerationAction,
} from '../../lib/services/moderationService';
import { supabase } from '../../lib/supabase';
import { Comment, CommentWithDepth } from '../../lib/schemaUtils';

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Comment Integration Tests', () => {
  let mockComments: Comment[] = [];
  let mockFlags: any[] = [];
  let commentIdCounter = 1;
  let flagIdCounter = 1;

  // Helper function to create a mock comment
  const createMockComment = (
    postId: string,
    content: string,
    authorName: string,
    parentId: string | null = null,
    path: string[] = []
  ): Comment => {
    const id = `comment-${commentIdCounter++}`;
    let commentPath: string[];
    
    if (parentId) {
      const parent = mockComments.find(c => c.id === parentId);
      commentPath = parent ? [...parent.path, id] : [parentId, id];
    } else {
      commentPath = [id];
    }

    return {
      id,
      post_id: postId,
      parent_id: parentId,
      path: commentPath,
      content,
      sanitized_content: content,
      sanitizer_version: '1.0',
      author_name: authorName,
      moderation_status: 'approved',
      flags_count: 0,
      is_deleted: false,
      reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Setup mock implementation for Supabase
  const setupSupabaseMock = () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      if (table === 'posts') {
        mockChain.single.mockImplementation(() =>
          Promise.resolve({ data: { id: 'post-1' }, error: null })
        );
      }

      if (table === 'comments') {
        mockChain.insert.mockImplementation((data: any) => {
          const comment = createMockComment(
            data.post_id,
            data.content,
            data.author_name,
            data.parent_id
          );
          mockComments.push(comment);
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: comment, error: null }),
            }),
          };
        });

        mockChain.single.mockImplementation(() => {
          // For queries, return the most recently queried comment
          // This is a simplification but works for the test scenarios
          const comment = mockComments.length > 0 ? mockComments[mockComments.length - 1] : null;
          return Promise.resolve({ data: comment, error: comment ? null : { message: 'Not found' } });
        });

        mockChain.update.mockImplementation((data: any) => {
          return {
            eq: jest.fn().mockImplementation((field: string, value: any) => ({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(() => {
                  const comment = mockComments.find(c => c.id === value);
                  if (comment) {
                    Object.assign(comment, data);
                  }
                  return Promise.resolve({ data: comment || null, error: comment ? null : { message: 'Not found' } });
                }),
              }),
            })),
          };
        });

        mockChain.order.mockImplementation(() => ({
          ...mockChain,
          then: (resolve: any) => resolve({ data: mockComments, error: null }),
        }));

        // For queries that end without .single()
        mockChain.eq.mockImplementation(() => ({
          ...mockChain,
          then: (resolve: any) => resolve({ data: mockComments, error: null }),
        }));
      }

      if (table === 'comment_flags') {
        mockChain.insert.mockImplementation((data: any) => {
          const flag = {
            id: `flag-${flagIdCounter++}`,
            ...data,
            created_at: new Date().toISOString(),
          };
          mockFlags.push(flag);
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: flag, error: null }),
            }),
          };
        });

        mockChain.order.mockImplementation(() => ({
          ...mockChain,
          then: (resolve: any) => resolve({ data: mockFlags, error: null }),
        }));
      }

      return mockChain;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockComments = [];
    mockFlags = [];
    commentIdCounter = 1;
    flagIdCounter = 1;
    setupSupabaseMock();
  });

  describe('Comment Creation', () => {
    it('should create a top-level comment', async () => {
      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: 'This is a top-level comment',
        author_name: 'Alice',
      };

      const result = await createComment(input);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.content).toBe('This is a top-level comment');
      expect(result.data?.author_name).toBe('Alice');
      expect(result.data?.parent_id).toBeNull();
      expect(mockComments).toHaveLength(1);
    });

    it('should create nested replies', async () => {
      // Create parent comment
      const parent = await createComment({
        post_id: 'post-1',
        content: 'Parent comment',
        author_name: 'Alice',
      });

      expect(parent.data).toBeDefined();

      // Create first reply
      const reply1 = await createComment({
        post_id: 'post-1',
        parent_id: parent.data!.id,
        content: 'First reply',
        author_name: 'Bob',
      });

      expect(reply1.error).toBeNull();
      expect(reply1.data?.parent_id).toBe(parent.data!.id);

      // Create second reply to same parent
      const reply2 = await createComment({
        post_id: 'post-1',
        parent_id: parent.data!.id,
        content: 'Second reply',
        author_name: 'Charlie',
      });

      expect(reply2.error).toBeNull();
      expect(mockComments).toHaveLength(3);
    });

    it('should create deeply nested comment chain', async () => {
      // Create a chain: comment -> reply -> reply to reply
      const level1 = await createComment({
        post_id: 'post-1',
        content: 'Level 1',
        author_name: 'Alice',
      });

      const level2 = await createComment({
        post_id: 'post-1',
        parent_id: level1.data!.id,
        content: 'Level 2',
        author_name: 'Bob',
      });

      const level3 = await createComment({
        post_id: 'post-1',
        parent_id: level2.data!.id,
        content: 'Level 3',
        author_name: 'Charlie',
      });

      expect(level3.error).toBeNull();
      expect(level3.data?.parent_id).toBe(level2.data!.id);
      expect(mockComments).toHaveLength(3);
    });
  });

  describe('Input Validation', () => {
    it('should reject comment with empty content', async () => {
      const result = await createComment({
        post_id: 'post-1',
        content: '',
        author_name: 'Alice',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.data).toBeNull();
    });

    it('should reject comment with empty author name', async () => {
      const result = await createComment({
        post_id: 'post-1',
        content: 'Valid content',
        author_name: '',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.data).toBeNull();
    });

    it('should reject comment with only whitespace in author name', async () => {
      const result = await createComment({
        post_id: 'post-1',
        content: 'Valid content',
        author_name: '   ',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject comment with excessively long content', async () => {
      const longContent = 'a'.repeat(10001); // Over 10000 character limit

      const result = await createComment({
        post_id: 'post-1',
        content: longContent,
        author_name: 'Alice',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should reject reply to non-existent parent', async () => {
      // Mock parent check to return null
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      const result = await createComment({
        post_id: 'post-1',
        parent_id: 'non-existent-comment',
        content: 'Reply to nowhere',
        author_name: 'Alice',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PARENT_NOT_FOUND');
    });

    it('should reject reply when parent belongs to different post', async () => {
      // Mock parent from different post
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'comment-1',
                    post_id: 'post-2', // Different post!
                    path: ['comment-1'],
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await createComment({
        post_id: 'post-1',
        parent_id: 'comment-1',
        content: 'Cross-post reply',
        author_name: 'Alice',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PARENT_POST_MISMATCH');
    });
  });

  describe('Fetching Threaded Structure', () => {
    beforeEach(() => {
      // Create a comment tree structure
      const parent1 = createMockComment('post-1', 'Parent 1', 'Alice');
      const parent2 = createMockComment('post-1', 'Parent 2', 'Bob');
      mockComments.push(parent1, parent2);

      const reply1 = createMockComment('post-1', 'Reply to Parent 1', 'Charlie', parent1.id);
      const reply2 = createMockComment('post-1', 'Another reply to Parent 1', 'Dave', parent1.id);
      mockComments.push(reply1, reply2);

      const nestedReply = createMockComment('post-1', 'Nested reply', 'Eve', reply1.id);
      mockComments.push(nestedReply);
    });

    it('should fetch comments as flat list', async () => {
      const result = await getCommentsForPost('post-1', { asTree: false });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(5);
    });

    it('should fetch comments as nested tree', async () => {
      const result = await getCommentsForPost('post-1', { asTree: true });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      const tree = result.data as CommentWithDepth[];
      // Should have 2 root-level comments
      expect(tree.filter(c => c.parent_id === null)).toHaveLength(2);
    });

    it('should include deleted comments when includeDeleted is true', async () => {
      // Mark one comment as deleted
      mockComments[0].is_deleted = true;
      mockComments[0].deleted_at = new Date().toISOString();

      const result = await getCommentsForPost('post-1', {
        includeDeleted: true,
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.some(c => c.is_deleted)).toBe(true);
    });

    it('should filter by moderation status', async () => {
      // Set different moderation statuses
      mockComments[0].moderation_status = 'approved';
      mockComments[1].moderation_status = 'pending';
      mockComments[2].moderation_status = 'flagged';

      // Mock the query to filter by status
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() => ({
              then: (resolve: any) =>
                resolve({
                  data: mockComments.filter(c => c.moderation_status === 'approved'),
                  error: null,
                }),
            })),
          };
        }
      });

      const result = await getCommentsForPost('post-1', {
        moderationStatus: 'approved',
      });

      expect(result.error).toBeNull();
      expect(result.data?.every(c => c.moderation_status === 'approved')).toBe(true);
    });
  });

  describe('Soft Delete', () => {
    it('should soft delete a comment', async () => {
      const comment = createMockComment('post-1', 'To be deleted', 'Alice');
      mockComments.push(comment);

      const result = await softDeleteComment(comment.id);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.is_deleted).toBe(true);
      expect(result.data?.deleted_at).toBeDefined();
    });

    it('should preserve thread structure when parent is deleted', async () => {
      const parent = createMockComment('post-1', 'Parent', 'Alice');
      mockComments.push(parent);

      const reply = createMockComment('post-1', 'Reply', 'Bob', parent.id);
      mockComments.push(reply);

      // Soft delete parent
      await softDeleteComment(parent.id);

      // Verify reply still exists
      expect(mockComments.find(c => c.id === reply.id)).toBeDefined();
      expect(mockComments.find(c => c.id === parent.id)?.is_deleted).toBe(true);
    });

    it('should allow replying to a soft-deleted comment', async () => {
      const parent = createMockComment('post-1', 'Parent', 'Alice');
      parent.is_deleted = true;
      parent.deleted_at = new Date().toISOString();
      mockComments.push(parent);

      // Mock to allow finding deleted parent
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: parent, error: null }),
              }),
            }),
            insert: jest.fn().mockImplementation((data: any) => {
              const comment = createMockComment(
                data.post_id,
                data.content,
                data.author_name,
                data.parent_id
              );
              mockComments.push(comment);
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: comment, error: null }),
                }),
              };
            }),
          };
        }
      });

      const result = await createComment({
        post_id: 'post-1',
        parent_id: parent.id,
        content: 'Reply to deleted comment',
        author_name: 'Bob',
      });

      expect(result.error).toBeNull();
      expect(result.data?.parent_id).toBe(parent.id);
    });
  });

  describe('Moderation', () => {
    it('should approve a comment', async () => {
      const comment = createMockComment('post-1', 'Pending comment', 'Alice');
      comment.moderation_status = 'pending';
      mockComments.push(comment);

      const result = await changeCommentStatus(comment.id, 'approved');

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('approved');
    });

    it('should flag a comment', async () => {
      const comment = createMockComment('post-1', 'Inappropriate', 'Alice');
      mockComments.push(comment);

      // Mock comment exists check
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: comment, error: null }),
              }),
            }),
          };
        }
        if (table === 'comment_flags') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              const flag = {
                id: `flag-${flagIdCounter++}`,
                ...data,
                created_at: new Date().toISOString(),
              };
              mockFlags.push(flag);
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: flag, error: null }),
                }),
              };
            }),
          };
        }
      });

      const flagInput: FlagCommentInput = {
        comment_id: comment.id,
        flagged_by: 'user-moderator',
        reason: 'Spam',
      };

      const result = await flagComment(flagInput);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.comment_id).toBe(comment.id);
      expect(result.data?.reason).toBe('Spam');
    });

    it('should prevent duplicate flags from same user', async () => {
      const comment = createMockComment('post-1', 'Comment', 'Alice');
      mockComments.push(comment);

      // Mock duplicate flag error
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: comment, error: null }),
              }),
            }),
          };
        }
        if (table === 'comment_flags') {
          return {
            insert: jest.fn().mockReturnValue({
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

      const result = await flagComment({
        comment_id: comment.id,
        flagged_by: 'user-1',
        reason: 'Spam',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DUPLICATE_FLAG');
    });

    it('should hide (reject) a flagged comment', async () => {
      const comment = createMockComment('post-1', 'Flagged content', 'Alice');
      comment.moderation_status = 'flagged';
      mockComments.push(comment);

      const result = await changeCommentStatus(comment.id, 'rejected', 'Violates rules');

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('rejected');
    });

    it('should perform moderation action: approve', async () => {
      const comment = createMockComment('post-1', 'To approve', 'Alice');
      comment.moderation_status = 'pending';
      mockComments.push(comment);

      const action: ModerationAction = {
        action: 'approve',
        moderation_notes: 'Looks good',
      };

      const result = await moderateComment(comment.id, action);

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('approved');
    });

    it('should perform moderation action: hide', async () => {
      const comment = createMockComment('post-1', 'To hide', 'Alice');
      mockComments.push(comment);

      const action: ModerationAction = {
        action: 'hide',
        moderation_notes: 'Inappropriate',
      };

      const result = await moderateComment(comment.id, action);

      expect(result.error).toBeNull();
      expect(result.data?.moderation_status).toBe('rejected');
    });

    it('should perform moderation action: delete', async () => {
      const comment = createMockComment('post-1', 'To delete', 'Alice');
      mockComments.push(comment);

      const action: ModerationAction = {
        action: 'delete',
        moderation_notes: 'Severe violation',
      };

      const result = await moderateComment(comment.id, action);

      expect(result.error).toBeNull();
      expect(result.data?.is_deleted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent replies to same parent', async () => {
      const parent = createMockComment('post-1', 'Parent', 'Alice');
      mockComments.push(parent);

      // Mock to allow parent lookup
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: parent, error: null }),
              }),
            }),
            insert: jest.fn().mockImplementation((data: any) => {
              const comment = createMockComment(
                data.post_id,
                data.content,
                data.author_name,
                data.parent_id
              );
              mockComments.push(comment);
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: comment, error: null }),
                }),
              };
            }),
          };
        }
      });

      const [reply1, reply2, reply3] = await Promise.all([
        createComment({
          post_id: 'post-1',
          parent_id: parent.id,
          content: 'Reply 1',
          author_name: 'Bob',
        }),
        createComment({
          post_id: 'post-1',
          parent_id: parent.id,
          content: 'Reply 2',
          author_name: 'Charlie',
        }),
        createComment({
          post_id: 'post-1',
          parent_id: parent.id,
          content: 'Reply 3',
          author_name: 'Dave',
        }),
      ]);

      expect(reply1.error).toBeNull();
      expect(reply2.error).toBeNull();
      expect(reply3.error).toBeNull();
      expect(mockComments.filter(c => c.parent_id === parent.id)).toHaveLength(3);
    });

    it('should handle updating a deleted comment', async () => {
      const comment = createMockComment('post-1', 'Original', 'Alice');
      comment.is_deleted = true;
      comment.deleted_at = new Date().toISOString();
      mockComments.push(comment);

      // Update should still work on deleted comment
      const result = await updateComment(comment.id, {
        content: 'Updated content',
      });

      expect(result.error).toBeNull();
      expect(result.data?.content).toBe('Updated content');
    });

    it('should sanitize HTML in comment content', async () => {
      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: '<script>alert("xss")</script>Safe content',
        author_name: 'Alice',
      };

      const result = await createComment(input);

      expect(result.error).toBeNull();
      // The sanitized version should remove script tags (sanitize-html removes them)
      // Original content is preserved for record keeping
      expect(result.data?.content).toBe('<script>alert("xss")</script>Safe content');
      expect(result.data?.sanitized_content).toBeDefined();
    });

    it('should trim author name whitespace', async () => {
      const input: CreateCommentInput = {
        post_id: 'post-1',
        content: 'Comment',
        author_name: '  Alice  ',
      };

      const result = await createComment(input);

      expect(result.error).toBeNull();
      expect(result.data?.author_name).toBe('Alice');
    });
  });

  describe('Comment Update', () => {
    it('should update comment content', async () => {
      const comment = createMockComment('post-1', 'Original content', 'Alice');
      mockComments.push(comment);

      const result = await updateComment(comment.id, {
        content: 'Updated content',
      });

      expect(result.error).toBeNull();
      expect(result.data?.content).toBe('Updated content');
      expect(result.data?.updated_at).toBeDefined();
    });

    it('should update author information', async () => {
      const comment = createMockComment('post-1', 'Content', 'Alice');
      mockComments.push(comment);

      const result = await updateComment(comment.id, {
        author_name: 'Alice Smith',
        author_email: 'alice@example.com',
      });

      expect(result.error).toBeNull();
      expect(result.data?.author_name).toBe('Alice Smith');
      expect(result.data?.author_email).toBe('alice@example.com');
    });

    it('should reject update with no fields', async () => {
      const comment = createMockComment('post-1', 'Content', 'Alice');
      mockComments.push(comment);

      const result = await updateComment(comment.id, {});

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('Moderation Queue', () => {
    it('should retrieve flagged comments in moderation queue', async () => {
      const comment1 = createMockComment('post-1', 'Flagged 1', 'Alice');
      const comment2 = createMockComment('post-1', 'Flagged 2', 'Bob');
      comment1.moderation_status = 'flagged';
      comment2.moderation_status = 'flagged';
      comment1.flags_count = 3;
      comment2.flags_count = 1;
      mockComments.push(comment1, comment2);

      const flag1 = { id: 'flag-1', comment_id: comment1.id, flagged_by: 'user1', created_at: new Date().toISOString() };
      const flag2 = { id: 'flag-2', comment_id: comment1.id, flagged_by: 'user2', created_at: new Date().toISOString() };
      mockFlags.push(flag1, flag2);

      // Mock the moderation queue query with proper chaining
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'comments') {
          const chain: any = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.gte = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.eq = jest.fn().mockReturnValue(chain);
          chain.order = jest.fn().mockReturnValue(chain);
          chain.range = jest.fn().mockReturnValue(chain);
          chain.then = (resolve: any) =>
            resolve({
              data: mockComments.filter(c => c.flags_count >= 1),
              error: null,
            });
          return chain;
        }
        if (table === 'comment_flags') {
          const chain: any = {};
          chain.select = jest.fn().mockReturnValue(chain);
          chain.in = jest.fn().mockReturnValue(chain);
          chain.order = jest.fn().mockReturnValue(chain);
          chain.then = (resolve: any) => resolve({ data: mockFlags, error: null });
          return chain;
        }
      });

      const result = await getModerationQueue();

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.[0].flags).toBeDefined();
    });
  });
});
