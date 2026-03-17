import { useState, useEffect, useRef } from 'react';
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
  const pdfUrlRef = useRef<string>('');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    
    const fetchPdfFromDatabase = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('未登录，请先登录');
        }

        const response = await fetch(`${apiBaseUrl}/resume-analysis/${resumeId}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (isCancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('PDF 文件不存在或已被删除');
          } else if (response.status === 401) {
            throw new Error('登录已过期，请重新登录');
          } else if (response.status === 403) {
            throw new Error('无权访问此文件');
          }
          
          const errorData = await response.json().catch(() => ({ message: '未知错误' }));
          throw new Error(errorData.message || `请求失败 (${response.status})`);
        }

        const contentType = response.headers.get('content-type');
        // 仅当服务器明确返回文本/HTML 时才视为错误；其他 binary 类型（如 application/download 等）均允许
        if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
          throw new Error('服务器返回的不是 PDF 文件');
        }

        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('PDF 文件为空');
        }
        
        const blobUrl = URL.createObjectURL(blob);
        pdfUrlRef.current = blobUrl;
        setPdfUrl(blobUrl);
      } catch (err) {
        if (isCancelled) return;
        const errorMsg = err instanceof Error ? err.message : '加载 PDF 失败';
        setError(errorMsg);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPdfFromDatabase();

    return () => {
      isCancelled = true;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = '';
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
