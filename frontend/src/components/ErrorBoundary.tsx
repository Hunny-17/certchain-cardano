import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
          <div className="border-2 border-black bg-white max-w-lg w-full">
            <div className="h-1" style={{ background: "#C53030" }} />
            <div className="p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
                ✕ Unexpected error
              </div>
              <h1
                className="text-3xl md:text-4xl leading-tight mb-4"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Something went wrong.
              </h1>
              <p className="text-sm text-black/60 mb-8 leading-relaxed">
                An unexpected error occurred. You can try again or return to the
                home page.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <pre className="font-mono text-xs bg-black text-white p-4 mb-6 overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.reset}
                  className="border-2 border-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
                >
                  Try again
                </button>
                <a
                  href="/"
                  className="px-5 py-3 text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-90"
                  style={{ background: "#0033AD", color: "#FAFAF7" }}
                >
                  Go home
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
