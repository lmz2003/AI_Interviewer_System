import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useToastModal } from '../components/ui/toast-modal';
import PDFViewer from './components/PDFViewer';
import AnalysisPanel from './components/AnalysisPanel';
import LoadingModal from './components/LoadingModal';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: #f8fafc;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: 1.3rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
`;

const BackButton = styled.button`
  padding: 8px 12px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #475569;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: #e2e8f0;
  min-height: 0;
`;

const LeftPanel = styled.div`
  flex: 1;
  overflow: auto;
  background: white;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const RightPanel = styled.div`
  flex: 1;
  overflow: auto;
  background: white;
  min-height: 0;
`;

const PDFContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  min-height: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #64748b;
`;


interface Resume {
  id: string;
  title: string;
  content: string;
  fileType: string;
  parsedData?: any;
  createdAt: string;
}


const ResumeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useToastModal();

  const [resume, setResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

      // 并行获取简历和分析
      const [resumeRes, analysisRes] = await Promise.all([
        fetch(`${apiBaseUrl}/resume-analysis/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiBaseUrl}/resume-analysis/${id}/analysis`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => ({ ok: false }) as any),
      ]);

      if (!resumeRes.ok) throw new Error('Failed to fetch resume');

      const resumeData = await resumeRes.json();
      setResume(resumeData.data);

      // 如果分析不存在，等待后重试
      if (analysisRes.ok && 'json' in analysisRes) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData.data);
        // 保存分析阶段信息
        if (analysisData.data?.analysisStage !== undefined) {
          setAnalysisStage(analysisData.data.analysisStage);
        }
      } else {
        // 分析可能还在处理，10秒后重试（无限重试）
        setTimeout(() => setRetryCount(prev => prev + 1), 10000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      error(errorMsg, '加载失败');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 重新获取分析结果
  useEffect(() => {
    if (retryCount > 0 && !analysis) {
      const timer = setTimeout(() => {
        fetchAnalysisOnly();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  const fetchAnalysisOnly = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiBaseUrl}/resume-analysis/${id}/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const analysisData = await response.json();
        setAnalysis(analysisData.data);
        // 更新分析阶段信息
        if (analysisData.data?.analysisStage !== undefined) {
          setAnalysisStage(analysisData.data.analysisStage);
        }
      } else {
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  };

  /**
   * 根据分析阶段返回对应的文案和标题
   */
  const getAnalysisStageInfo = (stage: number) => {
    const stageMap: Record<number, { title: string; description: string }> = {
      0: {
        title: '📋 准备分析',
        description: '正在初始化分析流程，即将开始...',
      },
      1: {
        title: '📄 文本提取',
        description: '正在提取简历中的文本内容...',
      },
      2: {
        title: '🔍 结构解析',
        description: '正在解析简历的结构和信息...',
      },
      3: {
        title: '⭐ 评分分析',
        description: '正在分析并评估各项指标...',
      },
      4: {
        title: '📊 报告生成',
        description: '正在生成详细的分析报告...',
      },
      5: {
        title: '✅ 分析完成',
        description: '分析已完成，正在加载结果...',
      },
    };

    return stageMap[stage] || stageMap[0];
  };

  if (loading) {
    return (
      <LoadingModal
        isOpen={loading}
        title="📄 加载简历"
        description="正在获取简历信息..."
      />
    );
  }

  if (!resume) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate('/dashboard/resume')}>← 返回</BackButton>
          <Title>简历分析</Title>
          <div />
        </Header>
        <Content>
          <LoadingContainer>
            <p>简历不存在</p>
          </LoadingContainer>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/dashboard/resume')}>← 返回</BackButton>
        <Title>{resume.title}</Title>
        <div />
      </Header>

      <Content>
        <LeftPanel>
          <PDFContainer>
            {resume.fileType === 'pdf' ? (
              <PDFViewer resumeId={resume.id} />
            ) : (
              <div style={{ padding: '20px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflow: 'auto' }}>
                {resume.content}
              </div>
            )}
          </PDFContainer>
        </LeftPanel>

        <RightPanel>
          {!analysis ? (
            <LoadingContainer>
              <p>等待分析完成...</p>
            </LoadingContainer>
          ) : (
            <AnalysisPanel analysis={analysis} parsedData={resume.parsedData} />
          )}
        </RightPanel>

        {/* 分析加载弹窗 */}
        {!analysis && (
          <LoadingModal
            isOpen={true}
            title={getAnalysisStageInfo(analysisStage).title}
            description={getAnalysisStageInfo(analysisStage).description}
            showProgress={true}
            progress={analysisStage}
            maxProgress={5}
          />
        )}
      </Content>
    </Container>
  );
};

export default ResumeDetail;
