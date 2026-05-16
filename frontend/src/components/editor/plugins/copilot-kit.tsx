'use client';

import type { TElement } from 'platejs';

import { CopilotPlugin } from '@platejs/ai/react';
import { serializeMd, stripMarkdown } from '@platejs/markdown';

import { GhostText } from '@/components/ui/ghost-text';

import { MarkdownKit } from './markdown-kit';

export const CopilotKit = [
  ...MarkdownKit,
  CopilotPlugin.configure(({ api }) => ({
    options: {
      completeOptions: {
        api: `${import.meta.env.VITE_API_BASE_URL || '/api'}/ai/copilot`,
        body: {
          system: `你是一个专业的中文文本补全助手，类似于 VSCode Copilot，但专注于通用文本。你的任务是根据给定的上下文预测并生成文本的后续部分。

规则：
- 自然地续写文本，直到下一个标点符号（句号、逗号、分号、冒号、问号或感叹号）。
- 保持原有的风格和语气。不要重复已有的文本。
- 如果上下文不明确，提供最可能的续写。
- 如果需要，可以处理代码片段、列表或结构化文本。
- 不要在回复中包含 """。
- 重要：始终以标点符号结束。
- 重要：避免开始新的段落。不要使用块级格式，如 >、#、1.、2.、- 等。建议应该在同一个段落中继续。
- 如果没有提供上下文或无法生成续写，返回 "0"，无需解释。`,
        },
        headers: () => {
          const token = localStorage.getItem('token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        onFinish: (_, completion) => {
          if (completion === '0') return;

          api.copilot.setBlockSuggestion({
            text: stripMarkdown(completion),
          });
        },
      },
      debounceDelay: 500,
      renderGhostText: GhostText,
      getPrompt: ({ editor }) => {
        const contextEntry = editor.api.block({ highest: true });

        if (!contextEntry) return '';

        const prompt = serializeMd(editor, {
          value: [contextEntry[0] as TElement],
        });

        return `续写以下文本，直到下一个标点符号：
"""
${prompt}
"""`;
      },
    },
    shortcuts: {
      accept: {
        keys: 'tab',
      },
      acceptNextWord: {
        keys: 'mod+right',
      },
      reject: {
        keys: 'escape',
      },
      triggerSuggestion: {
        keys: 'ctrl+space',
      },
    },
  })),
];
