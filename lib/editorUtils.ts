export type MarkdownFormat =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet-list'
  | 'numbered-list'
  | 'blockquote'
  | 'code'
  | 'link'
  | 'image';

export interface ApplyMarkdownResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applyMarkdown(
  text: string,
  format: MarkdownFormat,
  selectionStart: number,
  selectionEnd: number
): ApplyMarkdownResult {
  const before = text.substring(0, selectionStart);
  const selected = text.substring(selectionStart, selectionEnd);
  const after = text.substring(selectionEnd);

  let newText = text;
  let newSelectionStart = selectionStart;
  let newSelectionEnd = selectionEnd;

  switch (format) {
    case 'bold':
      newText = `${before}**${selected}**${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionEnd + 2;
      break;
    case 'italic':
      newText = `${before}*${selected}*${after}`;
      newSelectionStart = selectionStart + 1;
      newSelectionEnd = selectionEnd + 1;
      break;
    case 'strikethrough':
      newText = `${before}~~${selected}~~${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionEnd + 2;
      break;
    case 'code':
      newText = `${before}\`${selected}\`${after}`;
      newSelectionStart = selectionStart + 1;
      newSelectionEnd = selectionEnd + 1;
      break;
    case 'h1':
      newText = `${before}# ${selected}${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionEnd + 2;
      break;
    case 'h2':
      newText = `${before}## ${selected}${after}`;
      newSelectionStart = selectionStart + 3;
      newSelectionEnd = selectionEnd + 3;
      break;
    case 'h3':
      newText = `${before}### ${selected}${after}`;
      newSelectionStart = selectionStart + 4;
      newSelectionEnd = selectionEnd + 4;
      break;
    case 'bullet-list':
      newText = `${before}- ${selected}${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionEnd + 2;
      break;
    case 'numbered-list':
      newText = `${before}1. ${selected}${after}`;
      newSelectionStart = selectionStart + 3;
      newSelectionEnd = selectionEnd + 3;
      break;
    case 'blockquote':
      newText = `${before}> ${selected}${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionEnd + 2;
      break;
    case 'link':
      newText = `${before}[${selected}](url)${after}`;
      newSelectionStart = selectionStart + 1;
      newSelectionEnd = selectionStart + 1 + selected.length;
      // If no text selected, cursor ends up inside brackets?
      // Actually standard behavior: [|](url). If selected: [selected|](url)
      // Let's refine:
      // If selected: [selected](url) -> cursor after selected? Or maybe select 'url' so they can type it?
      // Let's just place cursor after the closed bracket for now, or inside parens if we want to be fancy.
      // Simpler: [selected](url)
      // Selection covering "url" might be nice but let's stick to simple insertion.
      break;
    case 'image':
      newText = `${before}![${selected}](url)${after}`;
      newSelectionStart = selectionStart + 2;
      newSelectionEnd = selectionStart + 2 + selected.length;
      break;
  }

  return {
    text: newText,
    selectionStart: newSelectionStart,
    selectionEnd: newSelectionEnd,
  };
}
