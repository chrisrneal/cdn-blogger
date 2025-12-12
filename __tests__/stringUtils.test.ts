import { restoreNewlines } from '../lib/stringUtils';

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
