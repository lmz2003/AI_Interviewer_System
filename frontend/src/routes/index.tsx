import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '../LoginPage/HomePage';
import MainPageLayout from '../MainPage/MainPage';
import LoginCallback from '../LoginPage/LoginCallback';
import NoteDetailPage from '../Note/NoteDetailPage';
import ResumeDetail from '../ResumeAnalysis/ResumeDetail';
import ResumeUpload from '../ResumeAnalysis/ResumeUpload';
import InterviewPage from '../Interview/InterviewPage';
import { ProtectedRoute, LoginRedirect } from './RouteComponents';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginRedirect element={<HomePage />} />,
  },
  {
    path: '/login/callback',
    element: <LoginCallback />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute element={<MainPageLayout />} />,
  },
  {
    path: '/dashboard/notes/:id',
    element: <ProtectedRoute element={<NoteDetailPage />} />,
  },
  {
    path: '/dashboard/resume/upload',
    element: <ProtectedRoute element={<ResumeUpload />} />,
  },
  {
    path: '/dashboard/resume/:id',
    element: <ProtectedRoute element={<ResumeDetail />} />,
  },
  {
    path: '/interview/:interviewId/:mode',
    element: <ProtectedRoute element={<InterviewPage />} />,
  },
  {
    path: '/dashboard/:module/:subPage/:id',
    element: <ProtectedRoute element={<MainPageLayout />} />,
  },
  {
    path: '/dashboard/:module/:subPage',
    element: <ProtectedRoute element={<MainPageLayout />} />,
  },
  {
    path: '/dashboard/:module',
    element: <ProtectedRoute element={<MainPageLayout />} />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
