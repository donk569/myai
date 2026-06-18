import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.7 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: '#e91e63', textDecoration: 'underline' }}>
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code style={{
                background: 'rgba(248,187,208,0.2)',
                padding: '1px 5px',
                borderRadius: 4,
                fontSize: '0.9em',
                color: '#c2185b',
              }} {...props}>{children}</code>
            ) : (
              <pre style={{
                background: '#fce4ec',
                padding: '10px 14px',
                borderRadius: 10,
                overflow: 'auto',
                fontSize: 12,
              }}>
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '3px solid #f48fb1',
              paddingLeft: 12,
              margin: '8px 0',
              color: '#8d6e63',
            }}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
