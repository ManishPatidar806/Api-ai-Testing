import { Component } from 'react';
import Button from './Button';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep the error in console for local debugging.
    console.error('Route rendering error:', error);
  }

  onRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="surface-card mx-auto mt-6 max-w-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900">This page failed to render</h3>
          <p className="mt-2 text-sm text-slate-600">
            Please refresh this view. If the issue continues, open API Workspace and try again.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={this.onRetry}>
              Retry
            </Button>
            <Button onClick={() => window.location.assign('/workspace')}>Go to Request Builder</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;