import React from "react";

interface MarkdownRendererProps {
  content: string;
}

// 简单的 Markdown 解析器，将 Markdown 转换为 React 元素
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 简单的 Markdown 转换为 HTML
  const renderMarkdown = (text: string): { __html: string } => {
    // 检查输入是否有效
    if (!text || typeof text !== 'string') {
      return { __html: '' };
    }
    
    let processedContent = text
      // 标题
      .replace(/^### (.*$)/gm, '<h3 style="margin: 12px 0 8px 0; font-size: 16px; font-weight: 600; color: #2d3748;">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="margin: 18px 0 10px 0; font-size: 18px; font-weight: 600; color: #1a202c; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="margin: 20px 0 12px 0; font-size: 22px; font-weight: 700; color: #1a202c;">$1</h1>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
      // 代码块
      .replace(/`(.*?)`/g, '<code style="background-color: #edf2f7; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</code>')
      // 无序列表
      .replace(/^\*\s(.+)$/gm, '<li style="margin: 6px 0; line-height: 1.5;">$1</li>')
      .replace(/(<li style="margin: 6px 0; line-height: 1.5;">.*?<\/li>)/gs, '<ul style="padding-left: 24px;">$1</ul>')
      // 换行
      .replace(/\n\n/g, '</p><p style="margin: 10px 0; line-height: 1.6;">')
      .replace(/\n/g, '<br />');

    // 包装在段落标签中
    processedContent = `<div style="font-size: 14px; color: #4a5568; line-height: 1.6;">${processedContent}</div>`;
    
    return { __html: processedContent };
  };

  return (
    <div 
      style={{ fontSize: "14px", color: "#4a5568" }} 
      dangerouslySetInnerHTML={renderMarkdown(content)} 
    />
  );
};

export default MarkdownRenderer;