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
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-3xl font-bold mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-2xl font-semibold mb-2" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
