import React from 'react';
import './Interview.scss';

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.91 19.79 19.79 0 0 1 1.2 1.28 2 2 0 0 1 3.22.0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.2 7.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

interface InterviewPausedProps {
  interviewTitle: string;
  elapsedTime: number;
  onResume: () => void;
  onEnd: () => void;
}

const InterviewPaused: React.FC<InterviewPausedProps> = ({
  interviewTitle,
  elapsedTime,
  onResume,
  onEnd,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="interview-paused-page">
      <div className="paused-content">
        <div className="paused-icon">
          <PauseIcon />
        </div>
        <h2 className="paused-title">面试已暂停</h2>
        <div className="paused-info">
          <div className="info-item">
            <span className="info-label">面试场景</span>
            <span className="info-value">{interviewTitle}</span>
          </div>
          <div className="info-item">
            <span className="info-label">已进行时间</span>
            <span className="info-value">{formatDuration(elapsedTime)}</span>
          </div>
        </div>
        <div className="paused-actions">
          <button className="resume-btn" onClick={onResume}>
            <PlayIcon />
            <span>继续面试</span>
          </button>
          <button className="end-btn" onClick={onEnd}>
            <PhoneOffIcon />
            <span>结束面试</span>
          </button>
        </div>
        <p className="paused-hint">点击"继续面试"返回面试，或点击"结束面试"完成本次面试</p>
      </div>
    </div>
  );
};

export default InterviewPaused;
