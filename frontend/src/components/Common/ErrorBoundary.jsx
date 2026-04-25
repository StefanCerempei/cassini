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
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>⚠️ Ceva nu a funcționat corect</h2>
                    <p>Ne pare rău, a apărut o eroare. Te rugăm să reîncarci pagina.</p>
                    <button onClick={() => window.location.reload()}>Reîncarcă</button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;