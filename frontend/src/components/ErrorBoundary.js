import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Filter out ResizeObserver errors
    if (error.message?.includes('ResizeObserver')) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log other errors but ignore ResizeObserver
    if (!error.message?.includes('ResizeObserver')) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;