import { restoreNewlines, getPreview } from '../lib/stringUtils';

describe('restoreNewlines', () => {
  it('replaces literal \\n with actual newlines', () => {
    const input = 'Line 1\\nLine 2';
    const expected = 'Line 1\nLine 2';
    expect(restoreNewlines(input)).toBe(expected);
  });

  it('handles multiple literal \\n sequences', () => {
    const input = 'Header\\n\\nParagraph\\nLine';
    const expected = 'Header\n\nParagraph\nLine';
    expect(restoreNewlines(input)).toBe(expected);
  });

  it('returns the string unchanged if no literal \\n are present', () => {
    const input = 'Just a normal string';
    expect(restoreNewlines(input)).toBe(input);
  });

  it('handles empty strings', () => {
    expect(restoreNewlines('')).toBe('');
  });

  it('handles strings that already contain real newlines (mixed case)', () => {
    const input = 'Real newline:\nLiteral newline:\\nEnd';
    const expected = 'Real newline:\nLiteral newline:\nEnd';
    expect(restoreNewlines(input)).toBe(expected);
  });
});

describe('getPreview', () => {
  it('returns first 6 lines by default', () => {
    const input = 'Line 1\\nLine 2\\nLine 3\\nLine 4\\nLine 5\\nLine 6\\nLine 7\\nLine 8';
    const expected = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
    expect(getPreview(input)).toBe(expected);
  });

  it('returns all lines if content has fewer than requested lines', () => {
    const input = 'Line 1\\nLine 2\\nLine 3';
    const expected = 'Line 1\nLine 2\nLine 3';
    expect(getPreview(input)).toBe(expected);
  });

  it('accepts custom line count', () => {
    const input = 'Line 1\\nLine 2\\nLine 3\\nLine 4\\nLine 5';
    const expected = 'Line 1\nLine 2\nLine 3';
    expect(getPreview(input, 3)).toBe(expected);
  });

  it('handles empty strings', () => {
    expect(getPreview('')).toBe('');
  });

  it('handles content without newlines', () => {
    const input = 'Just one line';
    expect(getPreview(input)).toBe('Just one line');
  });

  it('handles real newlines (not escaped)', () => {
    const input = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7';
    const expected = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
    expect(getPreview(input)).toBe(expected);
  });
});
