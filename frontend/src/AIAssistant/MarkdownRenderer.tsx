import { useEffect, useRef, useState, useMemo } from 'react';
import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import './MarkdownRenderer.scss';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

class CustomRenderer extends Renderer {
  override code(token: Tokens.Code): string {
    const lang = token.lang || '';
    const text = token.text || '';
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const escapedLang = language.replace(/"/g, '&quot;');
    return `<div class="md-code-wrapper" data-language="${escapedLang}"><pre class="md-pre"><code class="hljs language-${escapedLang}">${highlighted}</code></pre></div>`;
  }

  override codespan(token: Tokens.Codespan): string {
    return `<code class="md-inline-code">${token.text}</code>`;
  }

  override heading(token: Tokens.Heading): string {
    const text = this.parser.parseInline(token.tokens);
    return `<h${token.depth} class="md-h${token.depth}">${text}</h${token.depth}>`;
  }

  override paragraph(token: Tokens.Paragraph): string {
    const text = this.parser.parseInline(token.tokens);
    return `<p class="md-p">${text}</p>`;
  }

  override list(token: Tokens.List): string {
    const body = this.parser.parse(token.items);
    const tag = token.ordered ? 'ol' : 'ul';
    return `<${tag} class="md-${tag}">${body}</${tag}>`;
  }

  override listitem(token: Tokens.ListItem): string {
    let itemBody = '';
    if (token.tokens) {
      itemBody = this.parser.parse(token.tokens);
    }
    return `<li class="md-li">${itemBody}</li>`;
  }

  override blockquote(token: Tokens.Blockquote): string {
    const body = this.parser.parse(token.tokens);
    return `<blockquote class="md-blockquote">${body}</blockquote>`;
  }

  override strong(token: Tokens.Strong): string {
    const text = this.parser.parseInline(token.tokens);
    return `<strong class="md-strong">${text}</strong>`;
  }

  override em(token: Tokens.Em): string {
    const text = this.parser.parseInline(token.tokens);
    return `<em class="md-em">${text}</em>`;
  }

  override hr(_token: Tokens.Hr): string {
    return `<hr class="md-hr" />`;
  }

  override table(token: Tokens.Table): string {
    let header = '<tr class="md-tr">';
    for (const cell of token.header) {
      const cellText = this.parser.parseInline(cell.tokens);
      const align = cell.align ? ` style="text-align:${cell.align}"` : '';
      header += `<th class="md-td"${align}>${cellText}</th>`;
    }
    header += '</tr>';

    let body = '';
    for (const row of token.rows) {
      body += '<tr class="md-tr">';
      for (const cell of row) {
        const cellText = this.parser.parseInline(cell.tokens);
        const align = cell.align ? ` style="text-align:${cell.align}"` : '';
        body += `<td class="md-td"${align}>${cellText}</td>`;
      }
      body += '</tr>';
    }

    return `<div class="md-table-wrapper"><table class="md-table"><thead class="md-thead">${header}</thead><tbody class="md-tbody">${body}</tbody></table></div>`;
  }

  override link(token: Tokens.Link): string {
    const text = this.parser.parseInline(token.tokens);
    const title = token.title ? ` title="${token.title}"` : '';
    return `<a href="${token.href}"${title} class="md-link">${text}</a>`;
  }

  override image(token: Tokens.Image): string {
    const title = token.title ? ` title="${token.title}"` : '';
    return `<img src="${token.href}" alt="${token.text}"${title} class="md-image" />`;
  }

  override text(token: Tokens.Text | Tokens.Escape | Tokens.Tag): string {
    return 'tokens' in token && token.tokens
      ? this.parser.parseInline(token.tokens)
      : ('text' in token ? token.text : '');
  }
}

marked.use({ renderer: new CustomRenderer(), breaks: true, gfm: true });

const MarkdownRenderer = ({ content, isStreaming = false }: MarkdownRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll('.md-code-header').forEach(el => el.remove());

    const wrappers = container.querySelectorAll<HTMLElement>('.md-code-wrapper');
    wrappers.forEach((wrapper, idx) => {
      const lang = wrapper.dataset.language || 'plaintext';

      const header = document.createElement('div');
      header.className = 'md-code-header';

      const langEl = document.createElement('span');
      langEl.className = 'md-code-lang';
      langEl.textContent = lang.toLowerCase();
      header.appendChild(langEl);

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

      wrapper.insertBefore(header, wrapper.firstChild);
    });

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
