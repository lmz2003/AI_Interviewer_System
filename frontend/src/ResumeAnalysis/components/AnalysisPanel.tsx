import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 16px 0;
`;

const ScoreContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const ScoreCard = styled.div`
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
`;

const ScoreValue = styled.div<{ $score?: number }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    const score = props.$score || 0;
    if (score >= 75) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  }};
  margin-bottom: 4px;
`;

const ScoreLabel = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
`;

const Content = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  overflow-x: auto;
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: ${props => (props.$active ? '#4f46e5' : '#64748b')};
  font-size: 0.95rem;
  font-weight: ${props => (props.$active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  ${props => props.$active && `
    border-bottom-color: #4f46e5;
  `}
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListItem = styled.li`
  padding: 10px 12px;
  background: #f8fafc;
  border-left: 3px solid #4f46e5;
  margin-bottom: 8px;
  border-radius: 4px;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }
`;

const KeywordContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const KeywordTag = styled.span`
  background: #ede9fe;
  color: #4f46e5;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const SuggestionBox = styled.div`
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 12px;
  border-radius: 4px;
  color: #78350f;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-word;

  &:last-child {
    margin-bottom: 0;
  }
`;

const TextContent = styled.div`
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const MatchScoreTag = styled.span<{ $score?: number }>`
  display: inline-block;
  background: ${props => {
    const score = props.$score || 0;
    if (score >= 80) return '#dcfce7';
    if (score >= 60) return '#fef3c7';
    return '#fee2e2';
  }};
  color: ${props => {
    const score = props.$score || 0;
    if (score >= 80) return '#166534';
    if (score >= 60) return '#92400e';
    return '#991b1b';
  }};
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.85rem;
  margin: 0 4px;
`;

interface Analysis {
  id: string;
  overallScore: number;
  completenessScore: number;
  keywordScore: number;
  experienceScore: number;
  skillsScore: number;
  keywordAnalysis: string;
  contentAnalysis: string;
  jobMatchAnalysis: string;
  competencyAnalysis: string;
  detailedReport: string;
  createdAt: string;
}

interface AnalysisPanelProps {
  analysis: Analysis | any;
  parsedData?: any;
}

// 安全的 JSON 解析函数（支持递归解析）
const safeJsonParse = (jsonStr: string | null | undefined, fallback: any = {}): any => {
  if (!jsonStr) {
    return fallback;
  }
  
  try {
    let result = JSON.parse(jsonStr);
    
    // 递归处理：如果解析结果仍然是字符串，继续解析
    // 这处理了双重序列化的情况（即 JSON.stringify 被调用了两次）
    while (typeof result === 'string') {
      result = JSON.parse(result);
    }
    
    return result;
  } catch (e) {
    return fallback;
  }
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, parsedData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'content' | 'jobMatch' | 'competency' | 'report'>('overview');

  // 解析 JSON 字段
  const keywordData = useMemo(() => safeJsonParse(analysis.keywordAnalysis, { keywords: [] }), [analysis.keywordAnalysis]);
  const contentData = useMemo(() => safeJsonParse(analysis.contentAnalysis, { totalWords: 0, sections: {} }), [analysis.contentAnalysis]);
  const jobMatchData = useMemo(() => safeJsonParse(analysis.jobMatchAnalysis, { matchScore: 0, matchingSkills: [], missingSkills: [], jobSpecificSuggestions: [] }), [analysis.jobMatchAnalysis]);
  const competencyData = useMemo(() => safeJsonParse(analysis.competencyAnalysis, { coreCompetencies: [], technicalSkillsLevel: '', projectExperienceValue: '', careerPotential: '' }), [analysis.competencyAnalysis]);
  const reportData = useMemo(() => safeJsonParse(analysis.detailedReport, { overallEvaluation: '', strengths: [], improvements: [], suggestions: [] }), [analysis.detailedReport]);
  const renderOverview = () => (
    <>
      <Section>
        <SectionTitle>📊 各维度评分</SectionTitle>
        <List>
          <ListItem>完整性评分: {Math.round(analysis.completenessScore)}/100</ListItem>
          <ListItem>关键词覆盖: {Math.round(analysis.keywordScore)}/100</ListItem>
          <ListItem>工作经验: {Math.round(analysis.experienceScore)}/100</ListItem>
          <ListItem>技能评分: {Math.round(analysis.skillsScore)}/100</ListItem>
        </List>
      </Section>

      {reportData.overallEvaluation && (
        <Section>
          <SectionTitle>🎯 总体评价</SectionTitle>
          <TextContent>{reportData.overallEvaluation}</TextContent>
        </Section>
      )}

      {reportData.strengths && reportData.strengths.length > 0 && (
        <Section>
          <SectionTitle>💪 主要优势</SectionTitle>
          <List>
            {reportData.strengths.map((strength: string, idx: number) => (
              <ListItem key={idx}>{strength}</ListItem>
            ))}
          </List>
        </Section>
      )}

      {reportData.improvements && reportData.improvements.length > 0 && (
        <Section>
          <SectionTitle>📈 改进空间</SectionTitle>
          <List>
            {reportData.improvements.map((improvement: string, idx: number) => (
              <ListItem key={idx}>{improvement}</ListItem>
            ))}
          </List>
        </Section>
      )}
    </>
  );

  const renderKeywords = () => (
    <>
      <Section>
        <SectionTitle>🔑 识别到的关键词</SectionTitle>
        {keywordData.keywords && keywordData.keywords.length > 0 ? (
          <KeywordContainer>
            {keywordData.keywords.map((keyword: string, idx: number) => (
              <KeywordTag key={idx}>{keyword}</KeywordTag>
            ))}
          </KeywordContainer>
        ) : (
          <TextContent style={{ color: '#64748b' }}>未识别到关键词</TextContent>
        )}
      </Section>

      {keywordData.categoryScores && (
        <Section>
          <SectionTitle>📊 关键词分类评分</SectionTitle>
          <List>
            {Object.entries(keywordData.categoryScores).map(([category, score]: [string, any]) => (
              <ListItem key={category}>
                {category}: {score as string | number}
              </ListItem>
            ))}
          </List>
        </Section>
      )}
    </>
  );

  const renderContent = () => (
    <>
      <Section>
        <SectionTitle>📋 内容分析</SectionTitle>
        <TextContent>
          总字数: <strong>{contentData.totalWords || 0}</strong>
        </TextContent>
      </Section>

      {contentData.sections && Object.keys(contentData.sections).length > 0 && (
        <Section>
          <SectionTitle>📑 各部分内容</SectionTitle>
          <List>
            {Object.entries(contentData.sections).map(([section, count]: [string, any]) => (
              <ListItem key={section}>
                {section}: {count as string | number}
              </ListItem>
            ))}
          </List>
        </Section>
      )}

      {parsedData && (
        <Section>
          <SectionTitle>🔍 解析数据</SectionTitle>
          <TextContent>
            {JSON.stringify(parsedData, null, 2).substring(0, 500)}...
          </TextContent>
        </Section>
      )}
    </>
  );

  const renderJobMatch = () => (
    <>
      <Section>
        <SectionTitle>🎯 岗位匹配度</SectionTitle>
        <TextContent>
          匹配评分: <MatchScoreTag $score={jobMatchData.matchScore}>{jobMatchData.matchScore}/10</MatchScoreTag>
        </TextContent>
      </Section>

      {jobMatchData.matchingSkills && jobMatchData.matchingSkills.length > 0 && (
        <Section>
          <SectionTitle>✅ 匹配的技能与经验</SectionTitle>
          <List>
            {jobMatchData.matchingSkills.map((skill: string, idx: number) => (
              <ListItem key={idx}>{skill}</ListItem>
            ))}
          </List>
        </Section>
      )}

      {jobMatchData.missingSkills && jobMatchData.missingSkills.length > 0 && (
        <Section>
          <SectionTitle>❌ 缺失的技能</SectionTitle>
          <List>
            {jobMatchData.missingSkills.map((skill: string, idx: number) => (
              <ListItem key={idx}>{skill}</ListItem>
            ))}
          </List>
        </Section>
      )}

      {jobMatchData.jobSpecificSuggestions && jobMatchData.jobSpecificSuggestions.length > 0 && (
        <Section>
          <SectionTitle>💡 针对岗位的建议</SectionTitle>
          {jobMatchData.jobSpecificSuggestions.map((suggestion: string, idx: number) => (
            <SuggestionBox key={idx}>{suggestion}</SuggestionBox>
          ))}
        </Section>
      )}
    </>
  );

  const renderCompetency = () => (
    <>
      {competencyData.coreCompetencies && competencyData.coreCompetencies.length > 0 && (
        <Section>
          <SectionTitle>⭐ 核心竞争力</SectionTitle>
          <List>
            {competencyData.coreCompetencies.map((competency: string, idx: number) => (
              <ListItem key={idx}>{competency}</ListItem>
            ))}
          </List>
        </Section>
      )}

      {competencyData.technicalSkillsLevel && (
        <Section>
          <SectionTitle>🔧 技能水平评估</SectionTitle>
          <TextContent>{competencyData.technicalSkillsLevel}</TextContent>
        </Section>
      )}

      {competencyData.projectExperienceValue && (
        <Section>
          <SectionTitle>💼 项目经验价值</SectionTitle>
          <TextContent>{competencyData.projectExperienceValue}</TextContent>
        </Section>
      )}

      {competencyData.careerPotential && (
        <Section>
          <SectionTitle>🚀 职业发展潜力</SectionTitle>
          <TextContent>{competencyData.careerPotential}</TextContent>
        </Section>
      )}
    </>
  );

  const renderReport = () => (
    <>
      {reportData.suggestions && reportData.suggestions.length > 0 && (
        <Section>
          <SectionTitle>📝 详细建议</SectionTitle>
          {reportData.suggestions.map((suggestion: string, idx: number) => (
            <SuggestionBox key={idx}>{suggestion}</SuggestionBox>
          ))}
        </Section>
      )}
    </>
  );

  return (
    <Container>
      <Header>
        <Title>简历分析报告</Title>
        <ScoreContainer>
          <ScoreCard>
            <ScoreValue $score={analysis.overallScore}>
              {Math.round(analysis.overallScore)}
            </ScoreValue>
            <ScoreLabel>总体评分</ScoreLabel>
          </ScoreCard>
          <ScoreCard>
            <ScoreValue $score={analysis.completenessScore}>
              {Math.round(analysis.completenessScore)}
            </ScoreValue>
            <ScoreLabel>完整性</ScoreLabel>
          </ScoreCard>
          <ScoreCard>
            <ScoreValue $score={analysis.keywordScore}>
              {Math.round(analysis.keywordScore)}
            </ScoreValue>
            <ScoreLabel>关键词覆盖</ScoreLabel>
          </ScoreCard>
          <ScoreCard>
            <ScoreValue $score={analysis.experienceScore}>
              {Math.round(analysis.experienceScore)}
            </ScoreValue>
            <ScoreLabel>工作经验</ScoreLabel>
          </ScoreCard>
          <ScoreCard>
            <ScoreValue $score={analysis.skillsScore}>
              {Math.round(analysis.skillsScore)}
            </ScoreValue>
            <ScoreLabel>技能评分</ScoreLabel>
          </ScoreCard>
        </ScoreContainer>
      </Header>

      <Content>
        <TabContainer>
          <Tab $active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            📊 概览
          </Tab>
          <Tab $active={activeTab === 'keywords'} onClick={() => setActiveTab('keywords')}>
            🔑 关键词
          </Tab>
          <Tab $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
            📋 内容
          </Tab>
          <Tab $active={activeTab === 'jobMatch'} onClick={() => setActiveTab('jobMatch')}>
            🎯 岗位匹配
          </Tab>
          <Tab $active={activeTab === 'competency'} onClick={() => setActiveTab('competency')}>
            ⭐ 核心竞能
          </Tab>
          <Tab $active={activeTab === 'report'} onClick={() => setActiveTab('report')}>
            📝 建议
          </Tab>
        </TabContainer>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'keywords' && renderKeywords()}
        {activeTab === 'content' && renderContent()}
        {activeTab === 'jobMatch' && renderJobMatch()}
        {activeTab === 'competency' && renderCompetency()}
        {activeTab === 'report' && renderReport()}
      </Content>
    </Container>
  );
};

export default AnalysisPanel;
