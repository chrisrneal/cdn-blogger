/**
 * Replaces literal backslash-n sequences ('\n') with actual newline characters.
 * This is useful when content stored in the database has escaped newlines.
 *
 * @param content - The string to process.
 * @returns The string with literal '\n' replaced by real newlines.
 */
export function restoreNewlines(content: string): string {
  if (!content) return content;
  return content.replace(/\\n/g, '\n');
}

/**
 * Extracts a preview from the content by taking the first N lines.
 *
 * @param content - The full content string.
 * @param lineCount - Number of lines to include in the preview (default: 6).
 * @returns The preview text.
 */
export function getPreview(content: string, lineCount: number = 6): string {
  if (!content) return '';
  
  // First restore newlines to handle escaped content
  const processedContent = restoreNewlines(content);
  
  // Split by newlines and take the first N lines
  const lines = processedContent.split('\n');
  const previewLines = lines.slice(0, lineCount);
  
  return previewLines.join('\n');
}
