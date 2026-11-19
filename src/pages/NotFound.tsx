import { ArrowLeft, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Panel } from '../components/Panel';

export function NotFound({ path }: { path: string }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-10">
      <Panel className="glass animate-pop-in w-full max-w-md p-8 text-center">
        <Compass size={36} className="mx-auto text-ink-muted" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('notFound.body')}</p>
        <code
          className="mt-4 inline-block break-all rounded-[8px] bg-surface-2 px-2 py-1 text-sm"
          dir="ltr"
        >
          {path}
        </code>
        <div>
          <a
            href="#/"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" className="rtl:rotate-180" />{' '}
            {t('placeholder.back')}
          </a>
        </div>
      </Panel>
    </div>
  );
}
