import { Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_NAME, APP_NAME_PARTS } from '../../config';
import type { Section } from '../router';
import { BrandMark } from './BrandMark';
import { useCommandMenu } from './CommandDialog';
import { LanguageMenu } from './LanguageMenu';
import { MobileNav } from './MobileNav';
import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from './ThemeToggle';

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);

export function TopBar({ section }: { section: Section }) {
  const { t } = useTranslation();
  const openSearch = useCommandMenu((s) => s.setOpen);

  return (
    <header className="glass no-print fixed inset-x-0 top-0 z-40 h-14 border-b border-line">
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">
        <MobileNav section={section} />

        <a
          href="#/"
          aria-label={t('header.home', { name: APP_NAME })}
          className="flex shrink-0 items-center gap-2 rounded-[10px] px-1 py-1"
        >
          <BrandMark />
          <span className="hidden font-display text-[1.15rem] font-bold tracking-tight text-ink min-[400px]:inline">
            {APP_NAME_PARTS[0]}
            <span className="text-accent">{APP_NAME_PARTS[1]}</span>
          </span>
        </a>

        <nav aria-label={t('nav.main')} className="ms-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ section: s, labelKey, href, icon: Icon }) => {
            const active = section === s;
            return (
              <a
                key={s}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 items-center gap-2 rounded-[10px] px-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {t(labelKey)}
              </a>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openSearch(true)}
            aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
            className="flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink lg:w-60"
          >
            <Search size={16} aria-hidden="true" />
            {/* Visible text is the accessible name (screen-reader-only below lg). */}
            <span className="sr-only flex-1 text-start lg:not-sr-only">
              {t('header.searchHint')}
            </span>
            <kbd className="hidden lg:inline-flex">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <LanguageMenu />
          <ThemeToggle />
          <a
            href="#/settings"
            aria-label={t('nav.settings')}
            aria-current={section === 'settings' ? 'page' : undefined}
            className={`hidden size-9 place-items-center rounded-[10px] border transition-colors sm:grid ${
              section === 'settings'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface text-ink hover:border-accent hover:text-accent'
            }`}
          >
            <Settings size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
