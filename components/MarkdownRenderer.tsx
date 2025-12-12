import React from 'react';
import ReactMarkdown from 'react-markdown';
import { restoreNewlines } from '@/lib/stringUtils';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processedContent = restoreNewlines(content);

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none prose-p:font-sans prose-headings:font-sans font-sans">
      <ReactMarkdown>{processedContent}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
