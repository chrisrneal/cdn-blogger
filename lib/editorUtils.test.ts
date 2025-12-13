import { applyMarkdown } from './editorUtils';

describe('applyMarkdown', () => {
  it('wraps text in bold', () => {
    const result = applyMarkdown('Hello World', 'bold', 6, 11);
    expect(result.text).toBe('Hello **World**');
    expect(result.selectionStart).toBe(8); // 6 + 2
    expect(result.selectionEnd).toBe(13); // 11 + 2
  });

  it('inserts bold markers if no text selected', () => {
    const result = applyMarkdown('Hello', 'bold', 5, 5);
    expect(result.text).toBe('Hello****');
    expect(result.selectionStart).toBe(7); // 5 + 2
    expect(result.selectionEnd).toBe(7);
  });

  it('wraps text in italic', () => {
    const result = applyMarkdown('Hello', 'italic', 0, 5);
    expect(result.text).toBe('*Hello*');
  });

  it('adds h1 prefix', () => {
    const result = applyMarkdown('Title', 'h1', 0, 0); // At start
    expect(result.text).toBe('# Title');
  });

  it('adds bullet list prefix', () => {
      const result = applyMarkdown('Item', 'bullet-list', 0, 0);
      expect(result.text).toBe('- Item');
  });

  it('adds link syntax', () => {
    const result = applyMarkdown('Click here', 'link', 6, 10);
    expect(result.text).toBe('Click [here](url)');
  });

  it('adds image syntax', () => {
      const result = applyMarkdown('', 'image', 0, 0);
      expect(result.text).toBe('![](url)');
  });
});
