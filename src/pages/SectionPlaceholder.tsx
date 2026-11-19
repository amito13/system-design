import { ArrowLeft, Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../app/shell/navItems';
import { Chip, Panel } from '../components/Panel';
import { SECTION_MILESTONE } from '../config';

type PlaceholderSection = keyof typeof SECTION_MILESTONE;

interface Props {
  section: PlaceholderSection;
  /** Parsed route parameters, shown so deep links can be checked before the screen exists. */
  details: [string, string][];
}

/** Honest "being built" screen: real route, real layout, real theme — content arrives later. */
export function SectionPlaceholder({ section, details }: Props) {
  const { t } = useTranslation();
  const item = NAV_ITEMS.find((n) => n.section === section)!;
  const Icon = item.icon;
  const milestone = SECTION_MILESTONE[section];

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-10">
      <Panel className="glass animate-pop-in w-full max-w-lg p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[12px] border border-line bg-surface-2 text-accent">
            <Icon size={20} aria-hidden="true" />
          </span>
          <Chip tone="warn">
            <Construction size={12} aria-hidden="true" /> {t('placeholder.building')} · {milestone}
          </Chip>
        </div>
        <h1 className="mt-5 text-3xl font-bold">{t(item.labelKey)}</h1>
        <p className="mt-2 text-ink-muted">{t('placeholder.body', { m: milestone })}</p>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 text-sm">
          <dt className="text-ink-muted">{t('placeholder.route')}</dt>
          <dd className="break-all font-mono" dir="ltr">
            {window.location.hash || '#/'}
          </dd>
          {details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="break-all font-mono" dir="ltr">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <a
          href="#/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" className="rtl:rotate-180" />{' '}
          {t('placeholder.back')}
        </a>
      </Panel>
    </div>
  );
}
