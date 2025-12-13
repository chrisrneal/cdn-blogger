/**
 * Database Schema Tests
 * 
 * Tests for the new comments, tags, and post location schema.
 * These tests verify the structure and logic but do not connect to a real database.
 * They test utility functions and data structures that will work with the schema.
 */

describe('Database Schema Utilities', () => {
  describe('Comment Tree Builder', () => {
    interface Comment {
      id: string;
      post_id: string;
      parent_id: string | null;
      path: string[];
      content: string;
      author_name: string;
      created_at: string;
      reply_count: number;
      children?: Comment[];
    }

    function buildCommentTree(flatComments: Comment[]): Comment[] {
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create map and initialize children arrays
      flatComments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, children: [] });
      });

      // Second pass: build tree
      flatComments.forEach(comment => {
        const commentWithChildren = commentMap.get(comment.id)!;
        
        if (comment.parent_id === null) {
          rootComments.push(commentWithChildren);
        } else {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.children!.push(commentWithChildren);
          }
        }
      });

      return rootComments;
    }

    it('should build a flat list into a comment tree', () => {
      const flatComments: Comment[] = [
        {
          id: 'comment-1',
          post_id: 'post-1',
          parent_id: null,
          path: ['comment-1'],
          content: 'Top level comment',
          author_name: 'User 1',
          created_at: '2024-01-01T00:00:00Z',
          reply_count: 2
        },
        {
          id: 'comment-2',
          post_id: 'post-1',
          parent_id: 'comment-1',
          path: ['comment-1', 'comment-2'],
          content: 'Reply to comment 1',
          author_name: 'User 2',
          created_at: '2024-01-01T01:00:00Z',
          reply_count: 1
        },
        {
          id: 'comment-3',
          post_id: 'post-1',
          parent_id: 'comment-2',
          path: ['comment-1', 'comment-2', 'comment-3'],
          content: 'Nested reply',
          author_name: 'User 3',
          created_at: '2024-01-01T02:00:00Z',
          reply_count: 0
        },
        {
          id: 'comment-4',
          post_id: 'post-1',
          parent_id: 'comment-1',
          path: ['comment-1', 'comment-4'],
          content: 'Another reply to comment 1',
          author_name: 'User 4',
          created_at: '2024-01-01T03:00:00Z',
          reply_count: 0
        }
      ];

      const tree = buildCommentTree(flatComments);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('comment-1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children![0].id).toBe('comment-2');
      expect(tree[0].children![0].children).toHaveLength(1);
      expect(tree[0].children![0].children![0].id).toBe('comment-3');
      expect(tree[0].children![1].id).toBe('comment-4');
    });

    it('should handle multiple top-level comments', () => {
      const flatComments: Comment[] = [
        {
          id: 'comment-1',
          post_id: 'post-1',
          parent_id: null,
          path: ['comment-1'],
          content: 'First top level',
          author_name: 'User 1',
          created_at: '2024-01-01T00:00:00Z',
          reply_count: 0
        },
        {
          id: 'comment-2',
          post_id: 'post-1',
          parent_id: null,
          path: ['comment-2'],
          content: 'Second top level',
          author_name: 'User 2',
          created_at: '2024-01-01T01:00:00Z',
          reply_count: 0
        }
      ];

      const tree = buildCommentTree(flatComments);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('comment-1');
      expect(tree[1].id).toBe('comment-2');
    });

    it('should handle empty comment list', () => {
      const tree = buildCommentTree([]);
      expect(tree).toHaveLength(0);
    });
  });

  describe('Comment Depth Calculator', () => {
    interface Comment {
      id: string;
      path: string[];
    }

    function getCommentDepth(comment: Comment): number {
      return comment.path.length;
    }

    it('should calculate depth from path array', () => {
      expect(getCommentDepth({ id: '1', path: ['a'] })).toBe(1);
      expect(getCommentDepth({ id: '2', path: ['a', 'b'] })).toBe(2);
      expect(getCommentDepth({ id: '3', path: ['a', 'b', 'c'] })).toBe(3);
    });

    it('should handle empty path', () => {
      expect(getCommentDepth({ id: '1', path: [] })).toBe(0);
    });
  });

  describe('Tag Slug Generator', () => {
    function generateTagSlug(name: string): string {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    it('should convert tag name to slug', () => {
      expect(generateTagSlug('Technology')).toBe('technology');
      expect(generateTagSlug('Web Development')).toBe('web-development');
      expect(generateTagSlug('C++ Programming')).toBe('c-programming');
      expect(generateTagSlug('React.js')).toBe('reactjs');
    });

    it('should handle special characters', () => {
      expect(generateTagSlug('AI & Machine Learning')).toBe('ai-machine-learning');
      expect(generateTagSlug('Node.js/Express')).toBe('nodejsexpress');
    });

    it('should handle multiple spaces', () => {
      expect(generateTagSlug('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(generateTagSlug('- Leading hyphen')).toBe('leading-hyphen');
      expect(generateTagSlug('Trailing hyphen -')).toBe('trailing-hyphen');
    });
  });

  describe('Comment Path Validator', () => {
    function isValidCommentPath(path: string[], commentId: string, parentPath?: string[]): boolean {
      // Path should end with comment's own ID
      if (path.length === 0 || path[path.length - 1] !== commentId) {
        return false;
      }

      // If no parent, path should only contain comment ID
      if (!parentPath) {
        return path.length === 1;
      }

      // If parent exists, path should be parent path + comment ID
      if (path.length !== parentPath.length + 1) {
        return false;
      }

      // Check that parent path is a prefix
      for (let i = 0; i < parentPath.length; i++) {
        if (path[i] !== parentPath[i]) {
          return false;
        }
      }

      return true;
    }

    it('should validate top-level comment paths', () => {
      expect(isValidCommentPath(['comment-1'], 'comment-1')).toBe(true);
      expect(isValidCommentPath(['comment-1', 'comment-2'], 'comment-1')).toBe(false);
      expect(isValidCommentPath([], 'comment-1')).toBe(false);
    });

    it('should validate nested comment paths', () => {
      const parentPath = ['comment-1'];
      expect(isValidCommentPath(['comment-1', 'comment-2'], 'comment-2', parentPath)).toBe(true);
      expect(isValidCommentPath(['comment-1'], 'comment-2', parentPath)).toBe(false);
      expect(isValidCommentPath(['comment-2'], 'comment-2', parentPath)).toBe(false);
    });

    it('should validate deeply nested paths', () => {
      const parentPath = ['comment-1', 'comment-2', 'comment-3'];
      expect(
        isValidCommentPath(['comment-1', 'comment-2', 'comment-3', 'comment-4'], 'comment-4', parentPath)
      ).toBe(true);
    });
  });

  describe('Location Validator', () => {
    interface PostLocation {
      lat: number;
      lon: number;
      place?: string;
      country?: string;
      formatted_address?: string;
    }

    function isValidLocation(location: unknown): location is PostLocation {
      if (!location || typeof location !== 'object' || Array.isArray(location)) {
        return false;
      }

      const { lat, lon } = location as { lat?: unknown; lon?: unknown };

      // Validate latitude
      if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
        return false;
      }

      // Validate longitude
      if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
        return false;
      }

      return true;
    }

    it('should validate correct location objects', () => {
      expect(isValidLocation({ lat: 40.7128, lon: -74.0060 })).toBe(true);
      expect(isValidLocation({ 
        lat: 51.5074, 
        lon: -0.1278, 
        place: 'London',
        country: 'UK' 
      })).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(isValidLocation({ lat: 91, lon: 0 })).toBe(false);
      expect(isValidLocation({ lat: -91, lon: 0 })).toBe(false);
      expect(isValidLocation({ lat: 'invalid', lon: 0 })).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(isValidLocation({ lat: 0, lon: 181 })).toBe(false);
      expect(isValidLocation({ lat: 0, lon: -181 })).toBe(false);
      expect(isValidLocation({ lat: 0, lon: 'invalid' })).toBe(false);
    });

    it('should reject missing coordinates', () => {
      expect(isValidLocation({ lat: 40 })).toBe(false);
      expect(isValidLocation({ lon: -74 })).toBe(false);
      expect(isValidLocation({})).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isValidLocation(null)).toBe(false);
      expect(isValidLocation(undefined)).toBe(false);
      expect(isValidLocation('location')).toBe(false);
      expect(isValidLocation(123)).toBe(false);
    });

    it('should reject arrays', () => {
      expect(isValidLocation([40.7128, -74.0060])).toBe(false);
      expect(isValidLocation([])).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(isValidLocation({ lat: NaN, lon: 0 })).toBe(false);
      expect(isValidLocation({ lat: 0, lon: NaN })).toBe(false);
    });
  });

  describe('Moderation Status Validator', () => {
    type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

    function isValidModerationStatus(status: string): status is ModerationStatus {
      return ['pending', 'approved', 'flagged', 'rejected'].includes(status);
    }

    it('should validate correct moderation statuses', () => {
      expect(isValidModerationStatus('pending')).toBe(true);
      expect(isValidModerationStatus('approved')).toBe(true);
      expect(isValidModerationStatus('flagged')).toBe(true);
      expect(isValidModerationStatus('rejected')).toBe(true);
    });

    it('should reject invalid moderation statuses', () => {
      expect(isValidModerationStatus('invalid')).toBe(false);
      expect(isValidModerationStatus('spam')).toBe(false);
      expect(isValidModerationStatus('')).toBe(false);
    });
  });

  describe('Comment Filtering', () => {
    interface Comment {
      id: string;
      moderation_status: string;
      is_deleted: boolean;
    }

    function isVisibleComment(comment: Comment): boolean {
      return comment.moderation_status === 'approved' && !comment.is_deleted;
    }

    it('should identify visible comments', () => {
      expect(isVisibleComment({
        id: '1',
        moderation_status: 'approved',
        is_deleted: false
      })).toBe(true);
    });

    it('should filter pending comments', () => {
      expect(isVisibleComment({
        id: '1',
        moderation_status: 'pending',
        is_deleted: false
      })).toBe(false);
    });

    it('should filter deleted comments', () => {
      expect(isVisibleComment({
        id: '1',
        moderation_status: 'approved',
        is_deleted: true
      })).toBe(false);
    });

    it('should filter flagged comments', () => {
      expect(isVisibleComment({
        id: '1',
        moderation_status: 'flagged',
        is_deleted: false
      })).toBe(false);
    });

    it('should filter rejected comments', () => {
      expect(isVisibleComment({
        id: '1',
        moderation_status: 'rejected',
        is_deleted: false
      })).toBe(false);
    });
  });
});
