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
