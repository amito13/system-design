import * as Popover from '@radix-ui/react-popover';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { parseInline, parseRich, type Inline } from '../content/richtext';
import { glossary } from './data';

function Term({ id, text }: { id: string; text: string }) {
  const { t } = useTranslation();
  const entry = glossary[id];
  if (!entry) return <>{text}</>;
  return (
    <Popover.Root>
      <Popover.Trigger
        className="sc-term"
        aria-label={`${text} — ${t('learn.glossary', { term: entry.term })}`}
      >
        {text}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={entry.term}
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="animate-pop-in z-50 w-72 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm shadow-pop"
        >
          <p className="font-semibold text-ink">{entry.term}</p>
          <p className="mt-1 text-ink-muted">{entry.short}</p>
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.t === 'text' && p.v}
          {p.t === 'bold' && <strong className="font-semibold text-ink">{p.v}</strong>}
          {p.t === 'code' && (
            <code className="rounded-[5px] bg-surface-2 px-1 py-px text-[0.85em]">{p.v}</code>
          )}
          {p.t === 'term' && <Term id={p.id} text={p.v} />}
        </Fragment>
      ))}
    </>
  );
}

/** Step body markup → React (no HTML injection, ever). */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parseRich(text).map((para, i) => (
        <p key={i} className={i ? 'mt-2.5' : undefined}>
          <Inlines parts={para} />
        </p>
      ))}
    </div>
  );
}

/** Single-line variant (callouts, takeaways). */
export function RichInline({ text }: { text: string }) {
  return <Inlines parts={parseInline(text)} />;
}
