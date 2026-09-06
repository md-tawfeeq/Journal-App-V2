import React from 'react';
import Markdown from 'react-markdown';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-slate max-w-none text-slate-200 leading-relaxed text-sm md:text-base space-y-3 selection:bg-indigo-500/30">
      <Markdown>{content}</Markdown>
    </div>
  );
};
