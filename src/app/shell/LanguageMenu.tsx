import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLanguage, LANGUAGES } from '../../lib/languages';
import { usePrefs } from '../../store/prefs';

export function LanguageMenu() {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.lang);
  const setLang = usePrefs((s) => s.setLang);
  const current = getLanguage(lang);

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-2.5 text-sm font-medium text-ink transition-colors hover:border-accent data-[state=open]:border-accent">
        <Languages size={16} aria-hidden="true" />
        {/* Name = "Language: EN (English)" so it contains the visible "EN" (WCAG 2.5.3). */}
        <span className="sr-only">{t('header.languageLabel')} </span>
        <span className="font-mono text-xs">{current.code}</span>
        <span className="sr-only"> ({current.native})</span>
        <ChevronDown size={14} aria-hidden="true" className="text-ink-muted" />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={8}
          className="animate-pop-in z-50 min-w-52 rounded-[var(--radius-md)] border border-line bg-surface p-1.5 shadow-pop"
        >
          <Dropdown.RadioGroup value={lang} onValueChange={setLang}>
            {LANGUAGES.map((l) => (
              <Dropdown.RadioItem
                key={l.id}
                value={l.id}
                lang={l.id}
                className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-accent-soft"
              >
                <span className="w-7 font-mono text-xs text-ink-muted">{l.code}</span>
                <span className="flex-1">
                  <span className="block font-medium">{l.native}</span>
                  <span className="block text-xs text-ink-muted" lang="en">
                    {l.english}
                  </span>
                </span>
                <Dropdown.ItemIndicator>
                  <Check size={16} className="text-accent" aria-hidden="true" />
                </Dropdown.ItemIndicator>
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
