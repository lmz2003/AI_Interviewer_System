import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  transition: background-color 200ms ease-in-out;

  .dark & {
    background: #0F0F1A;
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  text-align: center;
  padding: 20px;
  max-width: 400px;
  transition: color 200ms ease-in-out;

  .dark & {
    color: #FF6B6B;
  }
`;

const LoadingMessage = styled.div`
  color: #64748b;
  text-align: center;
  transition: color 200ms ease-in-out;

  .dark & {
    color: #A8A5C7;
  }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
  transition: border-color 200ms ease-in-out;

  .dark & {
    border-color: #2D2D52;
    border-top-color: #818CF8;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const FallbackContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
`;

const FallbackText = styled.p`
  color: #64748b;
  text-align: center;
  margin: 0;
  max-width: 300px;
  transition: color 200ms ease-in-out;

  .dark & {
    color: #A8A5C7;
  }
`;

const DownloadLink = styled.a`
  padding: 10px 16px;
  background: #4f46e5;
  color: white;
  border-radius: 6px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #4338ca;
  }

  .dark & {
    background: #818CF8;
    color: white;

    &:hover {
      background: #6366F1;
    }
  }
`;

interface PDFViewerProps {
  resumeId: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ resumeId }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // 从数据库获取 PDF 二进制数据
    const fetchPdfFromDatabase = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('token');

        const response = await fetch(`${apiBaseUrl}/resume-analysis/${resumeId}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch PDF from database');
        }

        // 获取二进制数据
        const blob = await response.blob();
        
        // 创建本地 Blob URL
        const blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPdfFromDatabase();

    // 清理 Blob URL
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [resumeId]);

  if (error) {
    return (
      <Container>
        <ErrorMessage>
          <p>📄 PDF 文件预览不可用</p>
          <p style={{ fontSize: '0.9rem', color: isDarkMode ? '#6B7FAA' : '#94a3b8' }}>
            {error}
          </p>
        </ErrorMessage>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Spinner />
        <LoadingMessage>加载 PDF 中...</LoadingMessage>
      </Container>
    );
  }

  // 尝试使用 embed 标签（推荐）
  return (
    <Container>
      <PDFEmbed
        src={pdfUrl}
        type="application/pdf"
        onError={() => setError('无法加载 PDF 文件')}
      />
      {error && (
        <FallbackContainer>
          <FallbackText>PDF 预览不可用</FallbackText>
          <DownloadLink href={pdfUrl} download target="_blank">
            📥 下载文件
          </DownloadLink>
        </FallbackContainer>
      )}
    </Container>
  );
};

export default PDFViewer;
