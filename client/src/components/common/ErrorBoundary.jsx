import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (typeof this.props.onReset === 'function') {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-(--bg-base) p-6">
                    <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                            <AlertTriangle size={30} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Something went wrong</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            The application hit an unexpected error. You can refresh the page or try again.
                        </p>
                        {this.state.error?.message && (
                            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-left text-xs text-slate-500">
                                {this.state.error.message}
                            </p>
                        )}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Button variant="primary" size="lg" className="flex-1" onClick={() => window.location.reload()}>
                                Refresh Page
                            </Button>
                            <Button variant="secondary" size="lg" className="flex-1" onClick={this.handleReset}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;