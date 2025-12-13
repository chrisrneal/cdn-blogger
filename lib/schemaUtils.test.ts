/**
 * Tests for schema utility functions
 */

import {
  buildCommentTree,
  getCommentDepth,
  isVisibleComment,
  isValidCommentPath,
  formatDeletedComment,
  flattenCommentTree,
  generateTagSlug,
  isValidTag,
  isValidLocation,
  formatLocation,
  calculateDistance,
  isValidModerationStatus,
  getModerationStatusLabel,
  shouldAutoFlag,
  isValidPostStatus,
  isPublished,
  filterPostsByTag,
  type Comment,
  type CommentWithDepth,
  type Tag,
  type PostLocation,
  type Post,
  type PostTag,
} from './schemaUtils';

describe('schemaUtils', () => {
  describe('Comment Utilities', () => {
    describe('buildCommentTree', () => {
      it('should build a nested tree from flat comments', () => {
        const comments: Comment[] = [
          {
            id: 'c1',
            post_id: 'p1',
            parent_id: null,
            path: ['c1'],
            content: 'Top level',
            author_name: 'User 1',
            moderation_status: 'approved',
            flags_count: 0,
            is_deleted: false,
            reply_count: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'c2',
            post_id: 'p1',
            parent_id: 'c1',
            path: ['c1', 'c2'],
            content: 'Reply',
            author_name: 'User 2',
            moderation_status: 'approved',
            flags_count: 0,
            is_deleted: false,
            reply_count: 0,
            created_at: '2024-01-01T01:00:00Z',
            updated_at: '2024-01-01T01:00:00Z',
          },
        ];

        const tree = buildCommentTree(comments);

        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('c1');
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children![0].id).toBe('c2');
        expect(tree[0].depth).toBe(1);
        expect(tree[0].children![0].depth).toBe(2);
      });
    });

    describe('getCommentDepth', () => {
      it('should calculate depth from path', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['a', 'b', 'c'],
          content: 'Test',
          author_name: 'User',
          moderation_status: 'approved',
          flags_count: 0,
          is_deleted: false,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(getCommentDepth(comment)).toBe(3);
      });
    });

    describe('isVisibleComment', () => {
      it('should return true for approved, non-deleted comments', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['c1'],
          content: 'Test',
          author_name: 'User',
          moderation_status: 'approved',
          flags_count: 0,
          is_deleted: false,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isVisibleComment(comment)).toBe(true);
      });

      it('should return false for deleted comments', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['c1'],
          content: 'Test',
          author_name: 'User',
          moderation_status: 'approved',
          flags_count: 0,
          is_deleted: true,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isVisibleComment(comment)).toBe(false);
      });

      it('should return false for pending comments', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['c1'],
          content: 'Test',
          author_name: 'User',
          moderation_status: 'pending',
          flags_count: 0,
          is_deleted: false,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isVisibleComment(comment)).toBe(false);
      });
    });

    describe('isValidCommentPath', () => {
      it('should validate top-level comment paths', () => {
        expect(isValidCommentPath(['c1'], 'c1')).toBe(true);
        expect(isValidCommentPath(['c1', 'c2'], 'c1')).toBe(false);
      });

      it('should validate nested comment paths', () => {
        const parentPath = ['c1'];
        expect(isValidCommentPath(['c1', 'c2'], 'c2', parentPath)).toBe(true);
        expect(isValidCommentPath(['c1'], 'c2', parentPath)).toBe(false);
      });
    });

    describe('formatDeletedComment', () => {
      it('should format deleted comments', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['c1'],
          content: 'Original content',
          author_name: 'John Doe',
          author_email: 'john@example.com',
          moderation_status: 'approved',
          flags_count: 0,
          is_deleted: true,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const formatted = formatDeletedComment(comment);

        expect(formatted.content).toBe('[deleted]');
        expect(formatted.author_name).toBe('[deleted]');
        expect(formatted.author_email).toBeUndefined();
      });

      it('should not modify non-deleted comments', () => {
        const comment: Comment = {
          id: 'c1',
          post_id: 'p1',
          parent_id: null,
          path: ['c1'],
          content: 'Original content',
          author_name: 'John Doe',
          moderation_status: 'approved',
          flags_count: 0,
          is_deleted: false,
          reply_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const formatted = formatDeletedComment(comment);

        expect(formatted.content).toBe('Original content');
        expect(formatted.author_name).toBe('John Doe');
      });
    });

    describe('flattenCommentTree', () => {
      it('should flatten a comment tree', () => {
        const tree: CommentWithDepth[] = [
          {
            id: 'c1',
            post_id: 'p1',
            parent_id: null,
            path: ['c1'],
            content: 'Top',
            author_name: 'User 1',
            moderation_status: 'approved',
            flags_count: 0,
            is_deleted: false,
            reply_count: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            depth: 1,
            children: [
              {
                id: 'c2',
                post_id: 'p1',
                parent_id: 'c1',
                path: ['c1', 'c2'],
                content: 'Reply',
                author_name: 'User 2',
                moderation_status: 'approved',
                flags_count: 0,
                is_deleted: false,
                reply_count: 0,
                created_at: '2024-01-01T01:00:00Z',
                updated_at: '2024-01-01T01:00:00Z',
                depth: 2,
              },
            ],
          },
        ];

        const flattened = flattenCommentTree(tree);

        expect(flattened).toHaveLength(2);
        expect(flattened[0].id).toBe('c1');
        expect(flattened[1].id).toBe('c2');
      });
    });
  });

  describe('Tag Utilities', () => {
    describe('generateTagSlug', () => {
      it('should generate URL-friendly slugs', () => {
        expect(generateTagSlug('Technology')).toBe('technology');
        expect(generateTagSlug('Web Development')).toBe('web-development');
        expect(generateTagSlug('C++ Programming')).toBe('c-programming');
      });

      it('should handle special characters', () => {
        expect(generateTagSlug('AI & ML')).toBe('ai-ml');
        expect(generateTagSlug('Node.js')).toBe('nodejs');
      });
    });

    describe('isValidTag', () => {
      it('should validate correct tags', () => {
        const tag: Tag = {
          id: 't1',
          name: 'Technology',
          slug: 'technology',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isValidTag(tag)).toBe(true);
      });

      it('should reject invalid tags', () => {
        expect(isValidTag({ name: 'Test' })).toBe(false);
        expect(isValidTag({ id: 't1', slug: 'test' })).toBe(false);
      });
    });
  });

  describe('Location Utilities', () => {
    describe('isValidLocation', () => {
      it('should validate correct locations', () => {
        const loc: PostLocation = { lat: 40.7128, lon: -74.0060 };
        expect(isValidLocation(loc)).toBe(true);
      });

      it('should reject invalid latitudes', () => {
        expect(isValidLocation({ lat: 91, lon: 0 })).toBe(false);
        expect(isValidLocation({ lat: -91, lon: 0 })).toBe(false);
      });

      it('should reject invalid longitudes', () => {
        expect(isValidLocation({ lat: 0, lon: 181 })).toBe(false);
        expect(isValidLocation({ lat: 0, lon: -181 })).toBe(false);
      });
    });

    describe('formatLocation', () => {
      it('should format location with formatted_address', () => {
        const loc: PostLocation = {
          lat: 40.7128,
          lon: -74.0060,
          formatted_address: 'New York, NY, USA',
        };

        expect(formatLocation(loc)).toBe('New York, NY, USA');
      });

      it('should format location with place and country', () => {
        const loc: PostLocation = {
          lat: 40.7128,
          lon: -74.0060,
          place: 'New York City',
          country: 'USA',
        };

        expect(formatLocation(loc)).toBe('New York City, USA');
      });

      it('should format location with coordinates only', () => {
        const loc: PostLocation = {
          lat: 40.7128,
          lon: -74.0060,
        };

        expect(formatLocation(loc)).toBe('40.7128, -74.0060');
      });
    });

    describe('calculateDistance', () => {
      it('should calculate distance between locations', () => {
        const nyc: PostLocation = { lat: 40.7128, lon: -74.0060 };
        const la: PostLocation = { lat: 34.0522, lon: -118.2437 };

        const distance = calculateDistance(nyc, la);

        // Distance between NYC and LA is approximately 3935 km
        expect(distance).toBeGreaterThan(3900);
        expect(distance).toBeLessThan(4000);
      });

      it('should return 0 for same location', () => {
        const loc: PostLocation = { lat: 40.7128, lon: -74.0060 };
        const distance = calculateDistance(loc, loc);

        expect(distance).toBeCloseTo(0, 2);
      });
    });
  });

  describe('Moderation Utilities', () => {
    describe('isValidModerationStatus', () => {
      it('should validate correct statuses', () => {
        expect(isValidModerationStatus('pending')).toBe(true);
        expect(isValidModerationStatus('approved')).toBe(true);
        expect(isValidModerationStatus('flagged')).toBe(true);
        expect(isValidModerationStatus('rejected')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidModerationStatus('invalid')).toBe(false);
        expect(isValidModerationStatus('spam')).toBe(false);
      });
    });

    describe('getModerationStatusLabel', () => {
      it('should return human-readable labels', () => {
        expect(getModerationStatusLabel('pending')).toBe('Pending Review');
        expect(getModerationStatusLabel('approved')).toBe('Approved');
        expect(getModerationStatusLabel('flagged')).toBe('Flagged for Review');
        expect(getModerationStatusLabel('rejected')).toBe('Rejected');
      });
    });

    describe('shouldAutoFlag', () => {
      it('should recommend auto-flagging above threshold', () => {
        expect(shouldAutoFlag(5)).toBe(true);
        expect(shouldAutoFlag(10)).toBe(true);
      });

      it('should not recommend auto-flagging below threshold', () => {
        expect(shouldAutoFlag(4)).toBe(false);
        expect(shouldAutoFlag(0)).toBe(false);
      });

      it('should accept custom threshold', () => {
        expect(shouldAutoFlag(3, 3)).toBe(true);
        expect(shouldAutoFlag(2, 3)).toBe(false);
      });
    });
  });

  describe('Post Utilities', () => {
    describe('isValidPostStatus', () => {
      it('should validate correct statuses', () => {
        expect(isValidPostStatus('draft')).toBe(true);
        expect(isValidPostStatus('published')).toBe(true);
      });

      it('should reject invalid statuses', () => {
        expect(isValidPostStatus('pending')).toBe(false);
        expect(isValidPostStatus('archived')).toBe(false);
      });
    });

    describe('isPublished', () => {
      it('should identify published posts', () => {
        const post: Post = {
          id: 'p1',
          slug: 'test',
          title: 'Test',
          content: 'Content',
          date: '2024-01-01',
          status: 'published',
          created_by: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isPublished(post)).toBe(true);
      });

      it('should identify draft posts', () => {
        const post: Post = {
          id: 'p1',
          slug: 'test',
          title: 'Test',
          content: 'Content',
          date: '2024-01-01',
          status: 'draft',
          created_by: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(isPublished(post)).toBe(false);
      });
    });

    describe('filterPostsByTag', () => {
      it('should filter posts by tag', () => {
        const posts: Post[] = [
          {
            id: 'p1',
            slug: 'post1',
            title: 'Post 1',
            content: 'Content 1',
            date: '2024-01-01',
            status: 'published',
            created_by: 'user1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'p2',
            slug: 'post2',
            title: 'Post 2',
            content: 'Content 2',
            date: '2024-01-02',
            status: 'published',
            created_by: 'user1',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ];

        const postTags: PostTag[] = [
          { post_id: 'p1', tag_id: 't1', created_at: '2024-01-01T00:00:00Z' },
        ];

        const filtered = filterPostsByTag(posts, postTags, 't1');

        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('p1');
      });
    });
  });
});
