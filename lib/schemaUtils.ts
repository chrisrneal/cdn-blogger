/**
 * Database Schema Utilities
 * 
 * Helper functions for working with the comments, tags, and location schema.
 * These utilities can be used on the client or server side.
 */

// ============================================================================
// Types
// ============================================================================

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  date: string;
  status: 'draft' | 'published';
  location?: PostLocation;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PostLocation {
  lat: number;
  lon: number;
  place?: string;
  country?: string;
  formatted_address?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PostTag {
  post_id: string;
  tag_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  path: string[];
  content: string;
  sanitized_content?: string;
  sanitizer_version?: string;
  author_name: string;
  author_email?: string;
  created_by?: string;
  moderation_status: ModerationStatus;
  flags_count: number;
  moderation_notes?: string;
  is_deleted: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export interface CommentWithDepth extends Comment {
  depth: number;
  children?: CommentWithDepth[];
}

// ============================================================================
// Comment Utilities
// ============================================================================

/**
 * Builds a nested tree structure from a flat array of comments.
 * Comments should be sorted by path for best results.
 */
export function buildCommentTree(flatComments: Comment[]): CommentWithDepth[] {
  const commentMap = new Map<string, CommentWithDepth>();
  const rootComments: CommentWithDepth[] = [];

  // First pass: create map and initialize children arrays
  flatComments.forEach(comment => {
    const depth = comment.path.length;
    commentMap.set(comment.id, { ...comment, depth, children: [] });
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

/**
 * Calculates the nesting depth of a comment from its path.
 */
export function getCommentDepth(comment: Comment): number {
  return comment.path.length;
}

/**
 * Checks if a comment is visible to the public.
 */
export function isVisibleComment(comment: Comment): boolean {
  return comment.moderation_status === 'approved' && !comment.is_deleted;
}

/**
 * Validates that a comment's path is correctly formed.
 */
export function isValidCommentPath(
  path: string[], 
  commentId: string, 
  parentPath?: string[]
): boolean {
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

/**
 * Formats a deleted comment for display.
 */
export function formatDeletedComment(comment: Comment): Comment {
  if (!comment.is_deleted) {
    return comment;
  }

  return {
    ...comment,
    content: '[deleted]',
    sanitized_content: '[deleted]',
    author_name: '[deleted]',
    author_email: undefined
  };
}

/**
 * Flattens a comment tree back into a sorted array.
 */
export function flattenCommentTree(comments: CommentWithDepth[]): CommentWithDepth[] {
  const result: CommentWithDepth[] = [];
  
  function traverse(comment: CommentWithDepth) {
    result.push(comment);
    if (comment.children && comment.children.length > 0) {
      comment.children.forEach(traverse);
    }
  }
  
  comments.forEach(traverse);
  return result;
}

// ============================================================================
// Tag Utilities
// ============================================================================

/**
 * Generates a URL-friendly slug from a tag name.
 */
export function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validates a tag object.
 */
export function isValidTag(tag: Partial<Tag>): tag is Tag {
  return (
    typeof tag.id === 'string' &&
    typeof tag.name === 'string' &&
    tag.name.length > 0 &&
    typeof tag.slug === 'string' &&
    tag.slug.length > 0 &&
    typeof tag.created_at === 'string' &&
    typeof tag.updated_at === 'string'
  );
}

// ============================================================================
// Location Utilities
// ============================================================================

/**
 * Validates a location object.
 */
export function isValidLocation(location: unknown): location is PostLocation {
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

/**
 * Formats a location for display.
 */
export function formatLocation(location: PostLocation): string {
  if (location.formatted_address) {
    return location.formatted_address;
  }

  const parts = [];
  if (location.place) parts.push(location.place);
  if (location.country) parts.push(location.country);
  
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
}

/**
 * Calculates the distance between two locations in kilometers.
 * Uses the Haversine formula.
 */
export function calculateDistance(
  loc1: PostLocation, 
  loc2: PostLocation
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lon - loc1.lon);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================================================
// Moderation Utilities
// ============================================================================

/**
 * Validates a moderation status value.
 */
export function isValidModerationStatus(status: string): status is ModerationStatus {
  return ['pending', 'approved', 'flagged', 'rejected'].includes(status);
}

/**
 * Gets a human-readable label for a moderation status.
 */
export function getModerationStatusLabel(status: ModerationStatus): string {
  const labels: Record<ModerationStatus, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    flagged: 'Flagged for Review',
    rejected: 'Rejected'
  };
  return labels[status];
}

/**
 * Determines if a comment should be auto-flagged based on flags count.
 */
export function shouldAutoFlag(flagsCount: number, threshold: number = 5): boolean {
  return flagsCount >= threshold;
}

// ============================================================================
// Post Utilities
// ============================================================================

/**
 * Checks if a post has a valid status.
 */
export function isValidPostStatus(status: string): status is Post['status'] {
  return status === 'draft' || status === 'published';
}

/**
 * Checks if a post is published.
 */
export function isPublished(post: Post): boolean {
  return post.status === 'published';
}

/**
 * Gets posts with a specific tag.
 */
export function filterPostsByTag(
  posts: Post[], 
  postTags: PostTag[], 
  tagId: string
): Post[] {
  const postIds = new Set(
    postTags.filter(pt => pt.tag_id === tagId).map(pt => pt.post_id)
  );
  return posts.filter(post => postIds.has(post.id));
}
