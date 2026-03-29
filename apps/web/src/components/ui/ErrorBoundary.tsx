import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#1a1a26] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f87171]/10">
              <span className="text-xl text-[#f87171]">!</span>
            </div>
            <h2 className="mb-2 text-lg font-bold text-[#f0f0f5]">
              Algo deu errado
            </h2>
            <p className="mb-6 text-sm text-[#f0f0f5]/50">
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
            </p>
            {this.state.error && (
              <pre className="mb-6 overflow-auto rounded-lg bg-[#12121a] p-3 text-left text-xs text-[#f87171]/70">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleRetry}>Tentar novamente</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
