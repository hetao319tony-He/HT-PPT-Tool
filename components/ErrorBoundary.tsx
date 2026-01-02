
import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshIcon } from "./Icons";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Fix: Explicitly import Component and extend it to ensure instance properties like 'props' and 'state' are correctly typed and recognized by TypeScript.
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Destructuring state and props from 'this'. 
    // These properties are guaranteed to exist on the instance by extending Component.
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong.</h2>
                <p className="text-zinc-400 mb-6 text-sm">
                    {error?.message || "An unexpected error occurred while rendering the presentation."}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-all"
                >
                    <RefreshIcon className="w-4 h-4" />
                    Reload Application
                </button>
            </div>
        </div>
      );
    }

    return children;
  }
}
