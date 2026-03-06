import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: background 200ms ease-in-out;

  .dark & {
    background: linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 100%);
  }
`;

const Content = styled.div`
  text-align: center;
  color: white;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top: 5px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;

  .dark & {
    border-color: rgba(129, 140, 248, 0.3);
    border-top-color: #818CF8;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Message = styled.p`
  font-size: 18px;
  margin: 20px 0;
  color: white;

  .dark & {
    color: #E8E6FF;
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 107, 107, 0.2);
  border-radius: 8px;
  max-width: 400px;
  transition: background-color 200ms ease-in-out, color 200ms ease-in-out;

  .dark & {
    color: #FF8080;
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.3);
  }
`;

const LoginCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          setError('登录失败：没有收到授权码');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        const savedState = localStorage.getItem('github_oauth_state');
        if (savedState && state && savedState !== state) {
          setError('登录失败：状态验证失败');
          localStorage.removeItem('github_oauth_state');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const githubRedirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/login/callback`;

        const response = await fetch(`${apiBaseUrl}/auth/github`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code, 
            redirectUri: githubRedirectUri 
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'GitHub 登录失败');
        }

        localStorage.setItem('token', data.token);
        localStorage.removeItem('github_oauth_state');

        // Clean URL and redirect to dashboard
        window.history.replaceState({}, document.title, '/dashboard');
        navigate('/dashboard');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'GitHub 登录失败，请稍后再试';
        setError(message);
        console.error('GitHub login error:', err);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    exchangeCodeForToken();
  }, [navigate]);

  return (
    <Container>
      <Content>
        <Spinner />
        <Message>正在处理登录...</Message>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Content>
    </Container>
  );
};

export default LoginCallback;
