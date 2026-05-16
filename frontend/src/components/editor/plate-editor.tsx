'use client';

import * as React from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';

interface PlateEditorProps {
  /**
   * 初始内容，格式为 Plate 编辑器的 JSON 序列化字符串
   * 新笔记时传递空字符串，编辑已有笔记时传递数据库中的 content
   */
  initialValue?: string;
  /**
   * 内容变化回调，返回 Plate 编辑器格式的 JSON 序列化字符串
   * 可直接存储到数据库
   */
  onContentChange?: (content: string) => void;
}

export function PlateEditor({ initialValue, onContentChange }: PlateEditorProps) {
  // 将字符串解析为编辑器格式
  const getInitialValue = () => {
    if (!initialValue) {
      return normalizeNodeId([]);
    }
    
    try {
      return normalizeNodeId(JSON.parse(initialValue));
    } catch {
      // 如果解析失败，返回 空内容
      return normalizeNodeId([]);
    }
  };

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: getInitialValue(),
  });

  // 监听编辑器内容变化
  React.useEffect(() => {
    if (!onContentChange || !editor) return;

    const interval = setInterval(() => {
      try {
        const editorContent = editor.children as Record<string, unknown>[];
        if (editorContent && Array.isArray(editorContent)) {
          // 将编辑器内容序列化为 JSON 字符串
          const contentStr = JSON.stringify(editorContent);
          onContentChange(contentStr);
        }
      } catch (err) {
        console.error('获取编辑器内容失败:', err);
      }
    }, 500); // 每500ms检查一次内容变化

    return () => clearInterval(interval);
  }, [editor, onContentChange]);

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="demo" />
      </EditorContainer>
    </Plate>
  );
}
