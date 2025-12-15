/**
 * Comment Content Sanitization Utility
 * 
 * Provides server-side sanitization for user-generated comment content
 * to prevent XSS attacks and enforce content policy.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Content Policy Configuration
 * Defines allowed HTML tags and attributes for comment content
 */
export const CONTENT_POLICY = {
  // Maximum content length in characters
  MAX_LENGTH: 10000,
  
  // Allowed HTML tags
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'a', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  
  // Allowed attributes per tag
  ALLOWED_ATTR: {
    'a': ['href', 'title', 'target', 'rel'],
    '*': ['class'] // Allow class on all tags for styling
  },
} as const;

/**
 * Current sanitizer version for tracking
 * Increment when sanitization logic changes
 */
export const SANITIZER_VERSION = '1.0.0';

/**
 * Sanitization result containing both sanitized content and metadata
 */
export interface SanitizationResult {
  sanitized: string;
  original: string;
  version: string;
  isModified: boolean;
}

/**
 * Sanitizes comment content to prevent XSS and enforce content policy
 * 
 * @param content - Raw user input content
 * @returns Sanitized content and metadata
 */
export function sanitizeCommentContent(content: string): SanitizationResult {
  const original = content;
  
  // Trim and enforce length limit
  let sanitized = content.trim();
  if (sanitized.length > CONTENT_POLICY.MAX_LENGTH) {
    sanitized = sanitized.substring(0, CONTENT_POLICY.MAX_LENGTH);
  }
  
  // Configure sanitize-html
  const config: sanitizeHtml.IOptions = {
    allowedTags: [...CONTENT_POLICY.ALLOWED_TAGS],
    allowedAttributes: {
      'a': [...CONTENT_POLICY.ALLOWED_ATTR['a']],
      '*': [...CONTENT_POLICY.ALLOWED_ATTR['*']],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'ftp'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'ftp'],
    },
    allowProtocolRelative: false,
    // Automatically add target="_blank" and rel="noopener noreferrer" to links
    transformTags: {
      'a': (tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  };
  
  // Sanitize the content
  sanitized = sanitizeHtml(sanitized, config);
  
  
  return {
    sanitized,
    original,
    version: SANITIZER_VERSION,
    isModified: sanitized !== original,
  };
}

/**
 * Validates comment content against policy rules
 * 
 * @param content - Content to validate
 * @returns Validation result with error message if invalid
 */
export function validateCommentContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || typeof content !== 'string') {
    return {
      valid: false,
      error: 'Content must be a non-empty string',
    };
  }
  
  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Content cannot be empty',
    };
  }
  
  if (trimmed.length > CONTENT_POLICY.MAX_LENGTH) {
    return {
      valid: false,
      error: `Content exceeds maximum length of ${CONTENT_POLICY.MAX_LENGTH} characters`,
    };
  }
  
  return { valid: true };
}

/**
 * Sanitizes and validates comment content in one step
 * 
 * @param content - Raw user input
 * @returns Sanitization result or null if validation fails
 */
export function processCommentContent(content: string): {
  result: SanitizationResult | null;
  error?: string;
} {
  const validation = validateCommentContent(content);
  
  if (!validation.valid) {
    return {
      result: null,
      error: validation.error,
    };
  }
  
  const result = sanitizeCommentContent(content);
  
  return { result };
}
