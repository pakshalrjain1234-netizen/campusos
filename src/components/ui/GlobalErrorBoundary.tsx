import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-Level Application Error Boundary (Phase 2.9)
 * Intercepts uncaught React rendering crashes and lifecycle errors,
 * provides a resilient, secure recovery UI, and prevents white-screen outages.
 */
export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production, send to privacy-compliant telemetry endpoint if configured
    console.error('[CampusOps GlobalErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F6F0E5] flex items-center justify-center p-6 select-none font-jakarta">
          <div className="max-w-md w-full bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-lg p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FDF0F6] text-[#BA3D6E] flex items-center justify-center mx-auto mb-5 border border-[#F8DCE8]">
              <AlertOctagon size={32} strokeWidth={2} />
            </div>

            <h1 className="font-space font-bold text-2xl text-[#24283B] mb-2 tracking-tight">
              Application Error Intercepted
            </h1>

            <p className="font-jakarta text-[13px] text-[#74788C] leading-relaxed mb-6">
              A runtime anomaly was caught by the CampusOps reliability layer. Your local data and active session have been preserved.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-left overflow-x-auto text-[11px] font-mono text-[#74788C] max-h-28">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-xs hover:bg-[#1A1E2E] transition-all shadow-sm"
              >
                <RotateCcw size={14} /> Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E6E9FF] text-[#4A5AA0] font-jakarta font-semibold text-xs hover:bg-[#D4DAFF] transition-all"
              >
                <Home size={14} /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
