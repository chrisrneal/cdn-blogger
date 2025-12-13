import { getPreview } from '../lib/stringUtils';

describe('Home page preview functionality', () => {
  it('should extract first 6 lines for preview', () => {
    const samplePost = `# Welcome to My Blog

This is the first paragraph of my blog post.
It continues here with more content.

This is the second paragraph.
With even more text.

And here's more content that shouldn't appear in the preview.
This is line 8.
This is line 9.`;

    const preview = getPreview(samplePost, 6);
    const lines = preview.split('\n');
    
    expect(lines.length).toBe(6);
    expect(preview).toContain('# Welcome to My Blog');
    expect(preview).toContain('This is the second paragraph.');
    expect(preview).not.toContain("This is line 8");
    expect(preview).not.toContain("This is line 9");
  });

  it('should handle posts with markdown formatting in preview', () => {
    const markdownPost = `## Introduction

Here's some **bold text** and *italic text*.

- List item 1
- List item 2
- List item 3

This line should not appear in preview.`;

    const preview = getPreview(markdownPost, 6);
    
    expect(preview).toContain('**bold text**');
    expect(preview).toContain('- List item 1');
    expect(preview).not.toContain('This line should not appear');
  });

  it('should handle escaped newlines in database content', () => {
    const escapedContent = 'Line 1\\nLine 2\\nLine 3\\nLine 4\\nLine 5\\nLine 6\\nLine 7\\nLine 8';
    const preview = getPreview(escapedContent, 6);
    const lines = preview.split('\n');
    
    expect(lines.length).toBe(6);
    expect(lines[0]).toBe('Line 1');
    expect(lines[5]).toBe('Line 6');
  });
});
