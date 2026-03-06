import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './routes/index.tsx'
import { ToastModalProvider } from './components/ui/toast-modal'
import { ThemeProvider } from './context/ThemeContext'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="light">
    <ToastModalProvider>
      <RouterProvider router={router} />
    </ToastModalProvider>
  </ThemeProvider>
)
