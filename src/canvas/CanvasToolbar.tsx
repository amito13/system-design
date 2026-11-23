import * as Dialog from '@radix-ui/react-dialog';
import {
  Crosshair,
  FileText,
  Lock,
  LockOpen,
  Magnet,
  Map as MapIcon,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="sc-tool"
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export interface ToolbarProps {
  zoom: number;
  follow: boolean;
  locked: boolean;
  snap: boolean;
  minimap: boolean;
  showText: boolean;
  canUndo: boolean;
  canRedo: boolean;
  paused: boolean;
  speed: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
  onFollow: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onLock: () => void;
  onSnap: () => void;
  onMinimap: () => void;
  onText: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSpeed: (s: number) => void;
  resetOpen: boolean;
  setResetOpen: (open: boolean) => void;
}

export function CanvasToolbar(p: ToolbarProps) {
  const { t } = useTranslation();
  const [speedOpen, setSpeedOpen] = useState(false);

  return (
    <>
      <div className="sc-toolbar no-print" role="toolbar" aria-label={t('canvas.toolbar')}>
        <div className="sc-tool-group">
          <ToolButton icon={Minus} label={t('canvas.zoomOut')} shortcut="-" onClick={p.onZoomOut} />
          <ToolButton
            label={`${Math.round(p.zoom * 100)}% · ${t('canvas.zoomReset')}`}
            shortcut="0"
            onClick={p.onZoomReset}
          >
            <span className="tabular sc-zoom">{Math.round(p.zoom * 100)}%</span>
          </ToolButton>
          <ToolButton icon={Plus} label={t('canvas.zoomIn')} shortcut="+" onClick={p.onZoomIn} />
          <ToolButton icon={Maximize} label={t('canvas.fit')} shortcut="1" onClick={p.onFit} />
          <ToolButton
            icon={Crosshair}
            label={t('canvas.follow')}
            pressed={p.follow}
            onClick={p.onFollow}
          />
        </div>
        <div className="sc-tool-group">
          <ToolButton
            icon={Undo2}
            label={t('canvas.undo')}
            shortcut="Control+Z"
            disabled={!p.canUndo}
            onClick={p.onUndo}
          />
          <ToolButton
            icon={Redo2}
            label={t('canvas.redo')}
            shortcut="Control+Shift+Z"
            disabled={!p.canRedo}
            onClick={p.onRedo}
          />
          <ToolButton
            icon={RotateCcw}
            label={t('canvas.resetLayout')}
            shortcut="Shift+R"
            onClick={() => p.setResetOpen(true)}
          />
          <ToolButton
            icon={p.locked ? Lock : LockOpen}
            label={t('canvas.lock')}
            shortcut="L"
            pressed={p.locked}
            onClick={p.onLock}
          />
          <ToolButton icon={Magnet} label={t('canvas.snap')} pressed={p.snap} onClick={p.onSnap} />
          <ToolButton
            icon={MapIcon}
            label={t('canvas.minimap')}
            shortcut="M"
            pressed={p.minimap}
            onClick={p.onMinimap}
          />
          <ToolButton
            icon={FileText}
            label={t('canvas.asText')}
            shortcut="T"
            pressed={p.showText}
            onClick={p.onText}
          />
        </div>
        <div className="sc-tool-group">
          <ToolButton
            icon={p.paused ? Play : Pause}
            label={p.paused ? t('canvas.play') : t('canvas.pause')}
            shortcut="Space"
            pressed={p.paused}
            onClick={p.onPause}
          />
          <ToolButton
            icon={RotateCcw}
            label={t('canvas.replay')}
            shortcut="R"
            onClick={p.onReplay}
          />
          <div className="sc-speed">
            <ToolButton
              label={`${t('canvas.speed')}: ${p.speed}×`}
              pressed={speedOpen}
              onClick={() => setSpeedOpen((v) => !v)}
            >
              <span className="tabular">{p.speed}×</span>
            </ToolButton>
            {speedOpen && (
              <div className="sc-speed-menu" role="radiogroup" aria-label={t('canvas.speed')}>
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={p.speed === s}
                    className="sc-tool"
                    onClick={() => {
                      p.onSpeed(s);
                      setSpeedOpen(false);
                    }}
                  >
                    <span className="tabular">{s}×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog.Root open={p.resetOpen} onOpenChange={p.setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="animate-pop-in panel fixed start-1/2 top-1/3 z-50 w-[min(92vw,380px)] -translate-x-1/2 p-5 rtl:translate-x-1/2">
            <Dialog.Title className="font-display text-lg font-semibold">
              {t('canvas.resetTitle')}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-ink-muted">
              {t('canvas.resetBody')}
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className="h-9 rounded-[10px] border border-line bg-surface-2 px-4 text-sm font-semibold text-ink">
                {t('settings.cancel')}
              </Dialog.Close>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  p.onReset();
                  p.setResetOpen(false);
                }}
                className="h-9 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-ink"
              >
                {t('canvas.resetConfirm')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
