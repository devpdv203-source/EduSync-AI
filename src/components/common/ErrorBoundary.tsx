import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  key?: React.Key;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-lg space-y-4">
          <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {this.props.fallbackTitle || "Component Rendering Error"}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                An unexpected exception occurred while rendering this module.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
            <p className="font-bold text-rose-600 dark:text-rose-400">
              {this.state.error?.toString()}
            </p>
            {this.state.errorInfo?.componentStack && (
              <pre className="mt-2 text-[10px] text-slate-500 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
