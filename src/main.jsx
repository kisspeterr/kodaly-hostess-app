import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p style={{ maxWidth: '600px', margin: '1rem 0', color: '#94a3b8' }}>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { isSupabaseConfigured } from './lib/supabase';

const MissingConfigError = () => (
  <div style={{ padding: '2rem', color: 'white', background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <h1 style={{ color: '#ef4444' }}>Configuration Error</h1>
    <p style={{ maxWidth: '600px', margin: '1rem 0', color: '#94a3b8' }}>
      Missing Supabase Environment Variables. Please check your .env file or Vercel settings.
    </p>
    <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
      Reload Page
    </button>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {!isSupabaseConfigured ? (
      <MissingConfigError />
    ) : (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )}
  </StrictMode>,
)
