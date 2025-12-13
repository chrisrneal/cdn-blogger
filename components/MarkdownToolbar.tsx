'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Image as ImageIcon,
} from 'lucide-react';
import { MarkdownFormat } from '@/lib/editorUtils';

interface MarkdownToolbarProps {
  onFormat: (format: MarkdownFormat) => void;
}

export default function MarkdownToolbar({ onFormat }: MarkdownToolbarProps) {
  const tools: { icon: React.ReactNode; format: MarkdownFormat; label: string }[] = [
    { icon: <Bold className="w-4 h-4" />, format: 'bold', label: 'Bold' },
    { icon: <Italic className="w-4 h-4" />, format: 'italic', label: 'Italic' },
    { icon: <Strikethrough className="w-4 h-4" />, format: 'strikethrough', label: 'Strikethrough' },
    { icon: <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />, format: 'bold', label: 'separator' }, // Hacky separator
    { icon: <Heading1 className="w-4 h-4" />, format: 'h1', label: 'Heading 1' },
    { icon: <Heading2 className="w-4 h-4" />, format: 'h2', label: 'Heading 2' },
    { icon: <Heading3 className="w-4 h-4" />, format: 'h3', label: 'Heading 3' },
    { icon: <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />, format: 'bold', label: 'separator' },
    { icon: <List className="w-4 h-4" />, format: 'bullet-list', label: 'Bullet List' },
    { icon: <ListOrdered className="w-4 h-4" />, format: 'numbered-list', label: 'Numbered List' },
    { icon: <Quote className="w-4 h-4" />, format: 'blockquote', label: 'Quote' },
    { icon: <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />, format: 'bold', label: 'separator' },
    { icon: <LinkIcon className="w-4 h-4" />, format: 'link', label: 'Link' },
    { icon: <Code className="w-4 h-4" />, format: 'code', label: 'Code' },
    { icon: <ImageIcon className="w-4 h-4" />, format: 'image', label: 'Image' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-md">
      {tools.map((tool, index) => {
        if (tool.label === 'separator') {
          return <div key={index} className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />;
        }
        return (
          <button
            key={index}
            type="button"
            onClick={() => onFormat(tool.format)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title={tool.label}
          >
            {tool.icon}
          </button>
        );
      })}
    </div>
  );
}
