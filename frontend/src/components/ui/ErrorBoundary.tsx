import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: (error: Error) => ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error);
      return (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-5 text-sm">
          <p className="font-semibold text-red-400 mb-2">Something went wrong rendering this section.</p>
          <p className="text-xs text-red-300/70 font-mono break-all">{this.state.error.message}</p>
          <p className="text-[11px] text-zinc-500 mt-3">Open the browser console for the full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
