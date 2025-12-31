
import React, { Component, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#1a1a1a' }}>Si è verificato un errore imprevisto.</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>L'applicazione Kristal ha riscontrato un problema tecnico.</p>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '15px', borderRadius: '10px', color: '#991b1b', maxWidth: '80%', overflow: 'auto', textAlign: 'left', fontSize: '12px' }}>
            {this.state.error?.toString()}
          </div>
          <button onClick={() => window.location.reload()} style={{ marginTop: '30px', padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ricarica Pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
