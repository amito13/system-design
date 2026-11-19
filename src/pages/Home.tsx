import { ArrowRight, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../app/shell/navItems';
import { Chip, Panel } from '../components/Panel';
import { HeroScene } from '../components/HeroScene';
import { SECTION_MILESTONE } from '../config';

const SECTION_COLOR = {
  learn: 'var(--cat-compute)',
  practice: 'var(--cat-network)',
  lab: 'var(--cat-data)',
  cheatsheets: 'var(--cat-messaging)',
} as const;

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-pop-in">
          <Chip tone="accent">{t('home.eyebrow')}</Chip>
          <h1 className="mt-4 text-[2.25rem] font-bold sm:text-5xl">{t('home.title')}</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">{t('home.pitch')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#/learn/request-journey/1"
              className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-accent px-5 font-semibold text-accent-ink shadow-panel transition-transform hover:-translate-y-0.5"
            >
              {t('home.start')}{' '}
              <ArrowRight size={18} aria-hidden="true" className="rtl:rotate-180" />
            </a>
            <a
              href="#/lab"
              className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-line bg-surface px-5 font-semibold text-ink transition-colors hover:border-accent"
            >
              <FlaskConical size={18} aria-hidden="true" /> {t('nav.lab')}
            </a>
          </div>
        </div>

        <Panel
          className="glass animate-pop-in overflow-hidden p-3 sm:p-5"
          aria-label={t('home.eyebrow')}
        >
          <HeroScene />
        </Panel>
      </div>

      <Panel className="mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('home.continueTitle')}</h2>
          <p className="mt-1 text-ink-muted">{t('home.continueEmpty')}</p>
        </div>
        <a
          href="#/learn/request-journey/1"
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-[10px] border border-line bg-surface-2 px-4 text-sm font-semibold text-ink transition-colors hover:border-accent sm:self-auto"
        >
          {t('home.start')} <ArrowRight size={16} aria-hidden="true" className="rtl:rotate-180" />
        </a>
      </Panel>

      <h2 className="mt-12 text-2xl font-semibold">{t('home.sectionsTitle')}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NAV_ITEMS.map(({ section, labelKey, href, icon: Icon }) => (
          <li key={section}>
            <a
              href={href}
              className="panel group flex h-full flex-col p-5 transition-transform hover:-translate-y-1"
            >
              <span
                className="grid size-11 place-items-center rounded-[12px] border border-line text-ink"
                style={{ background: SECTION_COLOR[section] }}
              >
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="mt-4 font-display text-lg font-semibold">{t(labelKey)}</span>
              <span className="mt-1 flex-1 text-sm text-ink-muted">{t(`home.${section}Body`)}</span>
              <span className="mt-4">
                <Chip>{t('home.milestone', { m: SECTION_MILESTONE[section] })}</Chip>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
