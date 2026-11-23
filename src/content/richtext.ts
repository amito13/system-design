/**
 * Step text markup (PRD §7.1): paragraphs separated by a blank line, with
 * **bold**, `code`, and [[term]] / [[term|shown text]] glossary links. No HTML, ever.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'code'; v: string }
  | { t: 'term'; id: string; v: string };

const TOKEN = /\*\*([^*]+)\*\*|`([^`]+)`|\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: 'text', v: text.slice(last, i) });
    if (m[1] !== undefined) out.push({ t: 'bold', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'code', v: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'term', id: m[3], v: m[4] ?? m[3] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

export function parseRich(text: string): Inline[][] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map(parseInline);
}

/** Plain-text version (screen-reader announcements, search). */
export function plainText(text: string): string {
  return parseRich(text)
    .map((p) => p.map((x) => x.v).join(''))
    .join(' ');
}

/** Every glossary id a text references. */
export function termsIn(text: string): string[] {
  return parseRich(text)
    .flat()
    .filter((x): x is Extract<Inline, { t: 'term' }> => x.t === 'term')
    .map((x) => x.id);
}
