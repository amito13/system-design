import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  CornerDownLeft,
  House,
  Languages,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { LANGUAGES } from '../../lib/languages';
import { usePrefs } from '../../store/prefs';
import { navigate } from '../router';
import type { ThemeMode } from '../theme/resolve';
import { NAV_ITEMS } from './navItems';
import { THEME_ICONS } from './ThemeToggle';

export const useCommandMenu = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
  (set) => ({
    open: false,
    setOpen: (open) => set({ open }),
  }),
);

interface Command {
  id: string;
  group: string;
  label: string;
  keywords: string;
  icon: LucideIcon;
  active?: boolean;
  run: () => void;
}

/**
 * Minimal command menu for M0 (navigation, theme, language). M4 replaces the matching with the
 * MiniSearch full-text index and adds lessons, steps, cheatsheets and lab results (PRD §11.1).
 */
export function CommandDialog() {
  const { t } = useTranslation();
  const open = useCommandMenu((s) => s.open);
  const setOpen = useCommandMenu((s) => s.setOpen);
  const themeMode = usePrefs((s) => s.theme.mode);
  const lang = usePrefs((s) => s.lang);
  const setTheme = usePrefs((s) => s.setTheme);
  const setLang = usePrefs((s) => s.setLang);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();

  // Global shortcut: Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useCommandMenu.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to);
    const nav = t('command.navigate');
    const list: Command[] = [
      {
        id: 'go-home',
        group: nav,
        label: t('nav.home'),
        keywords: 'home start',
        icon: House,
        run: go('#/'),
      },
      ...NAV_ITEMS.map((n) => ({
        id: `go-${n.section}`,
        group: nav,
        label: t(n.labelKey),
        keywords: n.section,
        icon: n.icon,
        run: go(n.href),
      })),
      {
        id: 'go-settings',
        group: nav,
        label: t('nav.settings'),
        keywords: 'settings preferences',
        icon: Settings,
        run: go('#/settings'),
      },
    ];
    for (const mode of ['light', 'dark', 'system', 'scheduled'] as ThemeMode[]) {
      list.push({
        id: `theme-${mode}`,
        group: t('command.theme'),
        label: `${t('command.theme')}: ${t(`theme.${mode}`)}`,
        keywords: `theme ${mode} night day appearance`,
        icon: THEME_ICONS[mode],
        active: themeMode === mode,
        run: () => setTheme({ mode }),
      });
    }
    for (const l of LANGUAGES) {
      list.push({
        id: `lang-${l.id}`,
        group: t('command.language'),
        label: `${l.native} (${l.english})`,
        keywords: `language ${l.id} ${l.english}`,
        icon: Languages,
        active: lang === l.id,
        run: () => setLang(l.id),
      });
    }
    return list;
  }, [t, themeMode, lang, setTheme, setLang]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);

  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  const runCommand = (cmd: Command | undefined) => {
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((safeActive + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((safeActive - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(results[safeActive]);
    }
  };

  let lastGroup = '';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="animate-pop-in fixed start-1/2 top-[12vh] z-50 w-[min(92vw,580px)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-pop rtl:translate-x-1/2"
        >
          <Dialog.Title className="sr-only">{t('command.title')}</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t('command.placeholder')}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                results[safeActive] ? `${listId}-${results[safeActive].id}` : undefined
              }
              aria-label={t('command.placeholder')}
              className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
            />
            <kbd>esc</kbd>
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={t('command.title')}
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">{t('command.empty')}</p>
            )}
            {results.map((cmd, i) => {
              const header = cmd.group !== lastGroup ? cmd.group : null;
              lastGroup = cmd.group;
              const Icon = cmd.icon;
              return (
                <div key={cmd.id}>
                  {header && (
                    <div
                      role="presentation"
                      className="px-3 pb-1 pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted"
                    >
                      {header}
                    </div>
                  )}
                  <div
                    id={`${listId}-${cmd.id}`}
                    role="option"
                    aria-selected={i === safeActive}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runCommand(cmd)}
                    className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm ${
                      i === safeActive ? 'bg-accent-soft text-ink' : 'text-ink'
                    }`}
                  >
                    <Icon size={16} className="text-ink-muted" aria-hidden="true" />
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.active && <Check size={16} className="text-accent" aria-hidden="true" />}
                    {i === safeActive && (
                      <CornerDownLeft size={14} className="text-ink-muted" aria-hidden="true" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-4 py-2.5 text-xs text-ink-muted">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> {t('command.move')}
            </span>
            <span>
              <kbd>↵</kbd> {t('command.open')}
            </span>
            <span className="ms-auto">{t('command.footer')}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
