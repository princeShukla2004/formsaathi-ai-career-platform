import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error && parsed.operationType) {
          friendly = `Database access error (${parsed.operationType} on ${parsed.path || 'record'}): ${parsed.error}`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1320] px-6 py-12">
          <div className="max-w-lg w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#DC2626] mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-semibold text-[#172033] dark:text-slate-100">
                Something went wrong
              </h1>
            </div>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed mb-6 break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#14243A] hover:bg-[#1D3557] rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
