import { Download, RotateCcw, Upload } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { THEME_ICONS } from '../app/shell/ThemeToggle';
import type { ThemeMode } from '../app/theme/resolve';
import { useResolvedTheme } from '../app/theme/useThemeController';
import { Panel } from '../components/Panel';
import { LANGUAGES } from '../lib/languages';
import { storage } from '../lib/storage';
import { usePrefs, type MotionPref } from '../store/prefs';
import { useProgress } from '../store/progress';

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system', 'scheduled'];
const MOTIONS: MotionPref[] = ['full', 'reduced', 'off'];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <Panel className="p-5 sm:p-6" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

/** Radio "cards" built on native inputs, so keyboard and screen readers work out of the box. */
function RadioCards<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode; lang?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {options.map((o) => (
          <label
            key={o.value}
            lang={o.lang}
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Settings() {
  const { t } = useTranslation();
  const prefs = usePrefs();
  const resolved = useResolvedTheme((s) => s.resolved);
  const [status, setStatus] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const fromId = useId();
  const toId = useId();
  const resetId = useId();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(storage.exportAll(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scalecanvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const count = storage.importAll(JSON.parse(await file.text()), importMode);
      prefs.reload();
      useProgress.getState().reload();
      setStatus(t('settings.imported', { count }));
    } catch {
      setStatus(t('settings.importError'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const resetAll = () => {
    storage.clearAll();
    prefs.reload();
    useProgress.getState().reload();
    setResetOpen(false);
    setResetText('');
    setStatus(t('settings.resetDone'));
  };

  const timeInput =
    'h-10 rounded-[10px] border border-line bg-surface-2 px-3 font-mono text-sm text-ink disabled:opacity-50';
  const button =
    'inline-flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-4 text-sm font-semibold text-ink transition-colors hover:border-accent';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('settings.title')}</h1>

      <Section title={t('settings.appearance')}>
        <h3 className="mb-2 font-ui text-sm font-semibold text-ink-muted">
          {t('settings.themeMode')}
        </h3>
        <RadioCards
          legend={t('settings.themeMode')}
          name="theme-mode"
          value={prefs.theme.mode}
          onChange={(mode) => prefs.setTheme({ mode })}
          options={THEME_MODES.map((m) => {
            const Icon = THEME_ICONS[m];
            return {
              value: m,
              label: t(`theme.${m}`),
              icon: <Icon size={16} aria-hidden="true" />,
            };
          })}
        />
        <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
          {t('theme.showing', { theme: t(`theme.${resolved}`) })}
          {prefs.theme.mode === 'system' && ` · ${t('settings.systemHint')}`}
        </p>

        <h3 className="mb-2 mt-6 font-ui text-sm font-semibold text-ink-muted">
          {t('settings.schedule')}
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={fromId} className="text-sm">
              {t('settings.from')}
            </label>
            <input
              id={fromId}
              type="time"
              value={prefs.theme.darkFrom}
              disabled={prefs.theme.mode !== 'scheduled'}
              onChange={(e) => e.target.value && prefs.setTheme({ darkFrom: e.target.value })}
              className={timeInput}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={toId} className="text-sm">
              {t('settings.to')}
            </label>
            <input
              id={toId}
              type="time"
              value={prefs.theme.darkTo}
              disabled={prefs.theme.mode !== 'scheduled'}
              onChange={(e) => e.target.value && prefs.setTheme({ darkTo: e.target.value })}
              className={timeInput}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-ink-muted">{t('settings.scheduleHint')}</p>
      </Section>

      <Section title={t('settings.motion')} hint={t('settings.motionHint')}>
        <RadioCards
          legend={t('settings.motion')}
          name="motion"
          value={prefs.motion}
          onChange={prefs.setMotion}
          options={MOTIONS.map((m) => ({
            value: m,
            label: t(`settings.motion${m[0]!.toUpperCase()}${m.slice(1)}`),
          }))}
        />
      </Section>

      <Section title={t('settings.language')}>
        <RadioCards
          legend={t('settings.language')}
          name="language"
          value={prefs.lang}
          onChange={prefs.setLang}
          options={LANGUAGES.map((l) => ({
            value: l.id,
            label: `${l.native} · ${l.english}`,
            lang: l.id,
          }))}
        />
      </Section>

      <Section title={t('settings.data')} hint={t('settings.dataHint')}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportData} className={button}>
            <Download size={16} aria-hidden="true" /> {t('settings.export')}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={button}>
            <Upload size={16} aria-hidden="true" /> {t('settings.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void importData(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => setResetOpen((v) => !v)}
            aria-expanded={resetOpen}
            aria-controls={resetId}
            className={`${button} text-bad hover:border-bad`}
          >
            <RotateCcw size={16} aria-hidden="true" /> {t('settings.reset')}
          </button>
        </div>

        <div className="mt-4">
          <RadioCards
            legend={t('settings.importMode')}
            name="import-mode"
            value={importMode}
            onChange={setImportMode}
            options={[
              { value: 'merge', label: t('settings.merge') },
              { value: 'replace', label: t('settings.replace') },
            ]}
          />
        </div>

        {resetOpen && (
          <div id={resetId} className="mt-4 rounded-[var(--radius-md)] border border-bad p-4">
            <label htmlFor={`${resetId}-input`} className="text-sm">
              {t('settings.resetPrompt')}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id={`${resetId}-input`}
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                autoComplete="off"
                className="h-10 rounded-[10px] border border-line bg-surface-2 px-3 font-mono text-sm text-ink"
              />
              <button
                type="button"
                disabled={resetText !== 'RESET'}
                onClick={resetAll}
                className="inline-flex h-10 items-center rounded-[10px] bg-bad px-4 text-sm font-semibold text-accent-ink disabled:opacity-40"
              >
                {t('settings.resetConfirm')}
              </button>
              <button type="button" onClick={() => setResetOpen(false)} className={button}>
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        )}

        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-ink-muted">
          {status}
        </p>
      </Section>
    </div>
  );
}
