import React, { useEffect, useRef, useState, useMemo } from 'react';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import './MarkdownRenderer.scss';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// ---- 创建配置好的 marked 实例（模块级，避免重复创建）----
function createMarkedRenderer() {
  const renderer = new Renderer();

  // 代码块：使用 highlight.js 做语法高亮
  renderer.code = (token) => {
    const lang = (token as any).lang || '';
    const text = (token as any).text || (typeof token === 'string' ? token : '');
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const escapedLang = language.replace(/"/g, '&quot;');
    // 用 data-language 传递语言，由 JS 在 DOM 操作时读取
    return `<div class="md-code-wrapper" data-language="${escapedLang}"><pre class="md-pre"><code class="hljs language-${escapedLang}">${highlighted}</code></pre></div>`;
  };

  // 内联代码
  renderer.codespan = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<code class="md-inline-code">${text}</code>`;
  };

  // 标题
  renderer.heading = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    const depth = typeof token === 'string' ? 1 : (token as any).depth || 1;
    return `<h${depth} class="md-h${depth}">${text}</h${depth}>`;
  };

  // 段落
  renderer.paragraph = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<p class="md-p">${text}</p>`;
  };

  // 无序列表
  renderer.list = (token) => {
    const body = typeof token === 'string' ? token : (token as any).body || '';
    const ordered = typeof token === 'string' ? false : (token as any).ordered || false;
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} class="md-${tag}">${body}</${tag}>`;
  };

  // 列表项
  renderer.listitem = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<li class="md-li">${text}</li>`;
  };

  // 引用
  renderer.blockquote = (token) => {
    const text = typeof token === 'string' ? token : (token as any).body || '';
    return `<blockquote class="md-blockquote">${text}</blockquote>`;
  };

  // 强调
  renderer.strong = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<strong class="md-strong">${text}</strong>`;
  };

  // 斜体
  renderer.em = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<em class="md-em">${text}</em>`;
  };

  // 分割线
  renderer.hr = () => `<hr class="md-hr" />`;

  // 表格
  renderer.table = (token) => {
    const header = typeof token === 'string' ? '' : (token as any).header || '';
    const rows = typeof token === 'string' ? '' : (token as any).rows || '';
    return `<div class="md-table-wrapper"><table class="md-table"><thead class="md-thead">${header}</thead><tbody class="md-tbody">${rows}</tbody></table></div>`;
  };

  renderer.tablerow = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    return `<tr class="md-tr">${text}</tr>`;
  };

  renderer.tablecell = (token) => {
    const text = typeof token === 'string' ? token : (token as any).text || '';
    const flags = typeof token === 'string' ? {} : (token as any).flags || {};
    const tag = flags.header ? 'th' : 'td';
    const align = flags.align ? ` style="text-align:${flags.align}"` : '';
    return `<${tag} class="md-td"${align}>${text}</${tag}>`;
  };

  return renderer;
}

// 模块级 renderer（单例）
const markedRenderer = createMarkedRenderer();
marked.use({ renderer: markedRenderer, breaks: true, gfm: true });

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 将 markdown 转换为安全 HTML
  const rawHtml = useMemo(() => {
    if (!content) return '';
    try {
      const html = marked.parse(content) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr', 'div', 'span',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id', 'style', 'data-language'],
        ALLOW_DATA_ATTR: true,
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
      });
    } catch (e) {
      console.error('Markdown parse error:', e);
      return `<p class="md-p">${DOMPurify.sanitize(content)}</p>`;
    }
  }, [content]);

  // 为代码块注入 header（语言 + 复制按钮）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 移除旧的 header（避免重复注入）
    container.querySelectorAll('.md-code-header').forEach(el => el.remove());

    const wrappers = container.querySelectorAll<HTMLElement>('.md-code-wrapper');
    wrappers.forEach((wrapper, idx) => {
      const lang = wrapper.dataset.language || 'plaintext';

      // 创建 header
      const header = document.createElement('div');
      header.className = 'md-code-header';

      // 语言标签
      const langEl = document.createElement('span');
      langEl.className = 'md-code-lang';
      langEl.textContent = lang.toLowerCase();
      header.appendChild(langEl);

      // 复制按钮
      const copyBtn = document.createElement('button');
      copyBtn.className = `md-copy-btn${copiedIndex === idx ? ' copied' : ''}`;
      copyBtn.type = 'button';
      copyBtn.innerHTML = copiedIndex === idx
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>已复制</span>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>复制</span>`;
      copyBtn.addEventListener('click', async () => {
        const code = wrapper.querySelector('code');
        const text = code?.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          setCopiedIndex(idx);
          setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
          console.error('复制失败:', err);
        }
      });
      header.appendChild(copyBtn);

      // 在 wrapper 最前插入 header
      wrapper.insertBefore(header, wrapper.firstChild);
    });

    // 设置链接在新标签打开
    container.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }, [rawHtml, copiedIndex]);

  return (
    <div
      ref={containerRef}
      className={`markdown-renderer${isStreaming ? ' streaming' : ''}`}
      dangerouslySetInnerHTML={{ __html: rawHtml }}
    />
  );
};

export default MarkdownRenderer;
