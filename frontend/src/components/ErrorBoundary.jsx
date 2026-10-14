import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary, #efe6d8)',
          textAlign: 'center',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--accent-primary, #e0a03a)' }}>
            畫面暫時無法顯示
          </h2>
          <p style={{ color: 'var(--text-muted, #a89f91)', maxWidth: '480px', marginBottom: '24px', lineHeight: '1.6' }}>
            系統在取得資料時遇到異常或後端連線中斷。請嘗試重新整理頁面。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-primary, #e0a03a)',
              color: 'var(--bg-primary, #15110e)',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            重新整理
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
