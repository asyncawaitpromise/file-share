import { Component, type ReactNode } from 'react'
import type { ErrorInfo } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useThemeStore } from './store/themeStore.ts'
import Navbar from './components/Navbar.tsx'
import Home from './routes/Home.tsx'
import UploadPage from './routes/UploadPage.tsx'
import DownloadPage from './routes/DownloadPage.tsx'
import HistoryPage from './routes/HistoryPage.tsx'
import AdminPage from './routes/AdminPage.tsx'

// Catches render errors anywhere in the tree and shows a fallback UI.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="opacity-60 mb-4 max-w-sm">{(this.state.error as Error).message}</p>
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const ThemedApp = () => {
  const theme = useThemeStore((s) => s.theme)

  return (
    <div data-theme={theme} className="min-h-screen">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload/:token" element={<UploadPage />} />
          <Route path="/d/:fileId" element={<DownloadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center text-center p-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="opacity-60">Page not found</p>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemedApp />
    </ErrorBoundary>
  )
}
