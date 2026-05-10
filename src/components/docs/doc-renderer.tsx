"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface DocRendererProps {
  content: string;
}

export function DocRenderer({ content }: DocRendererProps) {
  return (
    <div className="doc-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>

      {/* Scoped styles for rendered markdown */}
      <style jsx global>{`
        .doc-prose {
          color: hsl(var(--foreground));
          line-height: 1.75;
          font-size: 0.925rem;
        }

        /* Headings */
        .doc-prose h1 {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-top: 0;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid hsl(var(--border));
        }
        .doc-prose h2 {
          font-size: 1.35rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: hsl(var(--foreground));
        }
        .doc-prose h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .doc-prose h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }

        /* Paragraphs and text */
        .doc-prose p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .doc-prose strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .doc-prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .doc-prose a:hover {
          opacity: 0.8;
        }

        /* Lists */
        .doc-prose ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .doc-prose ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .doc-prose li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .doc-prose li > ul,
        .doc-prose li > ol {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        /* Code — inline */
        .doc-prose code:not(pre code) {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 0.3rem;
          padding: 0.15rem 0.35rem;
          font-size: 0.84em;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        }

        /* Code — blocks */
        .doc-prose pre {
          background: hsl(222 35% 4%);
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          overflow-x: auto;
          margin-top: 1rem;
          margin-bottom: 1rem;
          font-size: 0.82rem;
          line-height: 1.6;
        }
        .doc-prose pre code {
          background: none;
          border: none;
          padding: 0;
          font-size: inherit;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
          color: hsl(210 40% 90%);
        }

        /* Tables */
        .doc-prose table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          margin-bottom: 1rem;
          font-size: 0.85rem;
        }
        .doc-prose thead th {
          text-align: left;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-bottom: 2px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.5);
          color: hsl(var(--foreground));
          white-space: nowrap;
        }
        .doc-prose tbody td {
          padding: 0.45rem 0.75rem;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          vertical-align: top;
        }
        .doc-prose tbody tr:hover {
          background: hsl(var(--muted) / 0.3);
        }

        /* Blockquotes */
        .doc-prose blockquote {
          border-left: 3px solid hsl(var(--primary) / 0.5);
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        /* Horizontal rules */
        .doc-prose hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
        }

        /* Rehype-highlight token colours (dark-friendly) */
        .doc-prose .hljs-keyword { color: #c678dd; }
        .doc-prose .hljs-string { color: #98c379; }
        .doc-prose .hljs-number { color: #d19a66; }
        .doc-prose .hljs-comment { color: #5c6370; font-style: italic; }
        .doc-prose .hljs-function { color: #61afef; }
        .doc-prose .hljs-title { color: #61afef; }
        .doc-prose .hljs-built_in { color: #e6c07b; }
        .doc-prose .hljs-type { color: #e6c07b; }
        .doc-prose .hljs-attr { color: #d19a66; }
        .doc-prose .hljs-variable { color: #e06c75; }
        .doc-prose .hljs-params { color: #abb2bf; }
        .doc-prose .hljs-meta { color: #61afef; }
        .doc-prose .hljs-selector-tag { color: #e06c75; }
        .doc-prose .hljs-selector-class { color: #d19a66; }
        .doc-prose .hljs-selector-id { color: #61afef; }
      `}</style>
    </div>
  );
}
