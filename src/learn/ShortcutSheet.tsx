import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ROWS: [string[], string][] = [
  [['←', '→'], 'steps'],
  [['Space'], 'pause'],
  [['R'], 'replay'],
  [['F'], 'focus'],
  [['[', ']'], 'panels'],
  [['M'], 'minimap'],
  [['T'], 'text'],
  [['L'], 'lock'],
  [['Shift', 'R'], 'reset'],
  [['Ctrl/⌘', 'Z'], 'undo'],
  [['Ctrl/⌘', 'K'], 'search'],
  [['?'], 'help'],
];

/** "?" — every shortcut on the lesson page (PRD §7.5). */
export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="animate-pop-in panel fixed start-1/2 top-[12vh] z-50 max-h-[76vh] w-[min(92vw,420px)] -translate-x-1/2 overflow-y-auto p-5 rtl:translate-x-1/2"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{t('learn.shortcuts')}</Dialog.Title>
            <Dialog.Close className="sc-icon-btn" aria-label={t('canvas.close')}>
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <dl className="mt-3 divide-y divide-line">
            {ROWS.map(([keys, id]) => (
              <div key={id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <dt className="text-ink-muted">{t(`learn.keys.${id}`)}</dt>
                <dd className="flex gap-1">
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
