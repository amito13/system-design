import * as Dialog from '@radix-ui/react-dialog';
import { Menu, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../../config';
import type { Section } from '../router';
import { BrandMark } from './BrandMark';
import { NAV_ITEMS } from './navItems';

/** Below 768 px the nav collapses into a drawer (PRD §5). */
export function MobileNav({ section }: { section: Section }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Close the drawer on any navigation (including links to the section already open).
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[15px] font-medium transition-colors ${
      active ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
    }`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t('header.openMenu')}
        className="grid size-9 place-items-center rounded-[10px] border border-line bg-surface text-ink md:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className="animate-drawer-in fixed inset-y-0 start-0 z-50 flex w-[min(84vw,300px)] flex-col gap-1 border-e border-line bg-surface p-3 shadow-pop"
          aria-describedby={undefined}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold">
              <BrandMark size={26} /> {APP_NAME}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('header.closeMenu')}
              className="grid size-9 place-items-center rounded-[10px] text-ink-muted hover:bg-surface-2"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ section: s, labelKey, href, icon: Icon }) => (
              <a
                key={s}
                href={href}
                className={linkClass(section === s)}
                aria-current={section === s ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" /> {t(labelKey)}
              </a>
            ))}
            <hr className="my-2 border-line" />
            <a
              href="#/settings"
              className={linkClass(section === 'settings')}
              aria-current={section === 'settings' ? 'page' : undefined}
            >
              <Settings size={18} aria-hidden="true" /> {t('nav.settings')}
            </a>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
