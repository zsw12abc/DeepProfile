import React from 'react';

// Mock for MarkdownRenderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  return <div data-testid="markdown-renderer">{content}</div>;
};

export default MarkdownRenderer;