import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../lib/i18n';

interface State {
  error: Error | null;
}

/** Keeps the shell alive when a page crashes, and offers a way back. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ScaleCanvas] page crashed', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-10">
        <section className="panel w-full max-w-md p-8 text-center" role="alert">
          <h1 className="text-2xl font-bold">{t('error.title')}</h1>
          <p className="mt-2 text-ink-muted">{t('error.body')}</p>
          <code
            className="mt-4 block break-all rounded-[8px] bg-surface-2 px-2 py-1 text-xs"
            dir="ltr"
          >
            {this.state.error.message}
          </code>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-ink"
            >
              {t('error.reload')}
            </button>
            <a
              href="#/"
              className="inline-flex h-10 items-center rounded-[10px] border border-line bg-surface-2 px-4 text-sm font-semibold text-ink"
            >
              {t('placeholder.back')}
            </a>
          </div>
        </section>
      </div>
    );
  }
}
