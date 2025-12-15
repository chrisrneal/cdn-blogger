/**
 * Tests for Comment Content Sanitization
 */

import {
  sanitizeCommentContent,
  validateCommentContent,
  processCommentContent,
  CONTENT_POLICY,
  SANITIZER_VERSION,
} from './sanitize';

describe('sanitizeCommentContent', () => {
  it('should return original content if already safe', () => {
    const content = 'This is a safe comment';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).toBe(content);
    expect(result.original).toBe(content);
    expect(result.version).toBe(SANITIZER_VERSION);
    expect(result.isModified).toBe(false);
  });

  it('should remove script tags', () => {
    const content = 'Safe text <script>alert("XSS")</script> more text';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('<script>');
    expect(result.sanitized).not.toContain('alert');
    expect(result.isModified).toBe(true);
  });

  it('should remove onerror handlers', () => {
    const content = '<img src="x" onerror="alert(\'XSS\')">';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('onerror');
    expect(result.sanitized).not.toContain('alert');
    expect(result.isModified).toBe(true);
  });

  it('should remove onclick handlers', () => {
    const content = '<div onclick="maliciousCode()">Click me</div>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('onclick');
    expect(result.sanitized).not.toContain('maliciousCode');
    expect(result.isModified).toBe(true);
  });

  it('should remove javascript: protocol in links', () => {
    const content = '<a href="javascript:alert(\'XSS\')">Click</a>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('javascript:');
    expect(result.isModified).toBe(true);
  });

  it('should allow safe HTML tags', () => {
    const content = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).toContain('<p>');
    expect(result.sanitized).toContain('<strong>');
    expect(result.sanitized).toContain('<em>');
  });

  it('should allow safe links with https', () => {
    const content = '<a href="https://example.com">Link</a>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).toContain('href="https://example.com"');
    expect(result.sanitized).toContain('target="_blank"');
    expect(result.sanitized).toContain('rel="noopener noreferrer"');
  });

  it('should remove disallowed tags', () => {
    const content = '<iframe src="evil.com"></iframe><object></object>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('<iframe');
    expect(result.sanitized).not.toContain('<object');
    expect(result.isModified).toBe(true);
  });

  it('should remove disallowed attributes', () => {
    const content = '<p style="color: red" id="test" data-custom="value">Text</p>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('style=');
    expect(result.sanitized).not.toContain('id=');
    expect(result.sanitized).not.toContain('data-custom=');
    expect(result.isModified).toBe(true);
  });

  it('should trim whitespace', () => {
    const content = '  \n  Trimmed content  \n  ';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).toBe('Trimmed content');
    expect(result.isModified).toBe(true);
  });

  it('should truncate content exceeding max length', () => {
    const content = 'a'.repeat(CONTENT_POLICY.MAX_LENGTH + 100);
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized.length).toBe(CONTENT_POLICY.MAX_LENGTH);
    expect(result.isModified).toBe(true);
  });

  it('should handle multiple XSS attack vectors', () => {
    const content = `
      <script>alert('xss')</script>
      <img src=x onerror=alert('xss')>
      <svg onload=alert('xss')>
      <iframe src="javascript:alert('xss')"></iframe>
      <a href="javascript:alert('xss')">link</a>
      <div onclick="alert('xss')">click</div>
    `;
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('script');
    expect(result.sanitized).not.toContain('onerror');
    expect(result.sanitized).not.toContain('onload');
    expect(result.sanitized).not.toContain('onclick');
    expect(result.sanitized).not.toContain('javascript:');
    expect(result.sanitized).not.toContain('alert');
    expect(result.isModified).toBe(true);
  });

  it('should preserve allowed HTML formatting', () => {
    const content = `
      <h1>Heading</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <code>code block</code>
    `;
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).toContain('<h1>');
    expect(result.sanitized).toContain('<p>');
    expect(result.sanitized).toContain('<strong>');
    expect(result.sanitized).toContain('<em>');
    expect(result.sanitized).toContain('<ul>');
    expect(result.sanitized).toContain('<li>');
    expect(result.sanitized).toContain('<code>');
  });

  it('should handle SVG-based XSS attacks', () => {
    const content = '<svg><script>alert("XSS")</script></svg>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('script');
    expect(result.sanitized).not.toContain('alert');
    expect(result.isModified).toBe(true);
  });

  it('should remove data attributes', () => {
    const content = '<div data-evil="payload">Content</div>';
    const result = sanitizeCommentContent(content);
    
    expect(result.sanitized).not.toContain('data-evil');
    expect(result.isModified).toBe(true);
  });
});

describe('validateCommentContent', () => {
  it('should accept valid content', () => {
    const result = validateCommentContent('Valid comment content');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty content', () => {
    const result = validateCommentContent('');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject whitespace-only content', () => {
    const result = validateCommentContent('   \n  \t  ');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject content exceeding max length', () => {
    const content = 'a'.repeat(CONTENT_POLICY.MAX_LENGTH + 1);
    const result = validateCommentContent(content);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximum length');
  });

  it('should reject non-string content', () => {
    const result = validateCommentContent(null as any);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty string');
  });

  it('should accept content at max length', () => {
    const content = 'a'.repeat(CONTENT_POLICY.MAX_LENGTH);
    const result = validateCommentContent(content);
    
    expect(result.valid).toBe(true);
  });
});

describe('processCommentContent', () => {
  it('should return sanitized content for valid input', () => {
    const content = 'Valid <strong>content</strong>';
    const { result, error } = processCommentContent(content);
    
    expect(error).toBeUndefined();
    expect(result).toBeDefined();
    expect(result?.sanitized).toContain('<strong>');
  });

  it('should return error for invalid input', () => {
    const { result, error } = processCommentContent('');
    
    expect(result).toBeNull();
    expect(error).toBeDefined();
    expect(error).toContain('empty');
  });

  it('should sanitize and validate in one step', () => {
    const content = '<script>alert("XSS")</script>Safe content';
    const { result, error } = processCommentContent(content);
    
    expect(error).toBeUndefined();
    expect(result).toBeDefined();
    expect(result?.sanitized).not.toContain('<script>');
    expect(result?.isModified).toBe(true);
  });

  it('should reject oversized content', () => {
    const content = 'a'.repeat(CONTENT_POLICY.MAX_LENGTH + 1);
    const { result, error } = processCommentContent(content);
    
    expect(result).toBeNull();
    expect(error).toBeDefined();
    expect(error).toContain('maximum length');
  });
});

describe('CONTENT_POLICY', () => {
  it('should have expected configuration', () => {
    expect(CONTENT_POLICY.MAX_LENGTH).toBe(10000);
    expect(CONTENT_POLICY.ALLOWED_TAGS).toContain('p');
    expect(CONTENT_POLICY.ALLOWED_TAGS).toContain('strong');
    expect(CONTENT_POLICY.ALLOWED_TAGS).toContain('a');
    expect(CONTENT_POLICY.ALLOWED_TAGS).not.toContain('script');
    expect(CONTENT_POLICY.ALLOWED_TAGS).not.toContain('iframe');
  });

  it('should define allowed attributes for links', () => {
    expect(CONTENT_POLICY.ALLOWED_ATTR['a']).toContain('href');
    expect(CONTENT_POLICY.ALLOWED_ATTR['a']).toContain('title');
  });

  it('should allow safe URI protocols', () => {
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('https://example.com')).toBe(true);
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('http://example.com')).toBe(true);
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('mailto:test@example.com')).toBe(true);
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('ftp://files.example.com')).toBe(true);
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('javascript:alert(1)')).toBe(false);
    expect(CONTENT_POLICY.ALLOWED_URI_REGEXP.test('data:text/html,<script>alert(1)</script>')).toBe(false);
  });
});
