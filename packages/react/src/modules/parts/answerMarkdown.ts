// The answer's text as the blocks a module draws: paragraphs, headings, and bulleted or numbered
// lists, each made of inline runs (plain, bold, italic, code, link). Models write light Markdown
// even when asked for plain text, so the module shows it as formatting. A mark the stream has not
// closed yet stays plain text until its closing half arrives. An image is never drawn, since it would
// load by itself: its description stays as text. A link the conversation's guards do not allow stays
// as its words.

import { leadsToSitePage } from '@tensorpass/aiconnect';

export type InlineRun =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

export type AnswerBlock =
  | { kind: 'paragraph'; runs: InlineRun[] }
  | { kind: 'heading'; runs: InlineRun[] }
  | { kind: 'list'; ordered: boolean; items: InlineRun[][] };

const INLINE = /\*\*([^*\n]+)\*\*|`([^`\n]+)`|!\[([^\]\n]*)\]\([^)\s]+\)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*([^*\s][^*\n]*?)\*/g;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const WEB_OR_MAIL = /^(https?:\/\/|mailto:)/i;

// Whether `href` stays on the page's own site, read as the conversation's guards read it.
export function onSite(href: string): boolean {
  return leadsToSitePage(href, globalThis.location?.origin);
}

// Links open only to the web, to mail, or to a page of the site itself.
function opensSafely(href: string): boolean {
  return WEB_OR_MAIL.test(href) || onSite(href);
}

function markRun(match: RegExpExecArray): InlineRun {
  const [whole, strong, code, imageText, linkText, href, em] = match;
  if (strong !== undefined) {
    return { kind: 'strong', text: strong };
  }
  if (code !== undefined) {
    return { kind: 'code', text: code };
  }
  if (imageText !== undefined) {
    return { kind: 'text', text: imageText };
  }
  if (linkText !== undefined) {
    return opensSafely(href) ? { kind: 'link', text: linkText, href } : { kind: 'text', text: whole };
  }
  return { kind: 'em', text: em };
}

export function inlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > cursor) {
      runs.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }
    runs.push(markRun(match));
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    runs.push({ kind: 'text', text: text.slice(cursor) });
  }
  return runs;
}

interface ListItemLine {
  ordered: boolean;
  text: string;
}

function listItem(line: string): ListItemLine | null {
  const bullet = BULLET.exec(line);
  if (bullet) {
    return { ordered: false, text: bullet[1] };
  }
  const numbered = NUMBERED.exec(line);
  return numbered ? { ordered: true, text: numbered[1] } : null;
}

// Adds a line to the blocks read so far: a list item joins the list above it, a heading stands
// alone, and other lines join the paragraph above them until a blank line ends it.
function addLine(blocks: AnswerBlock[], line: string, afterBlank: boolean): void {
  const last = blocks.at(-1);
  const item = listItem(line);
  if (item) {
    if (last?.kind === 'list' && last.ordered === item.ordered) {
      last.items.push(inlineRuns(item.text));
    } else {
      blocks.push({ kind: 'list', ordered: item.ordered, items: [inlineRuns(item.text)] });
    }
    return;
  }
  const heading = HEADING.exec(line);
  if (heading) {
    blocks.push({ kind: 'heading', runs: inlineRuns(heading[1]) });
    return;
  }
  if (last?.kind === 'paragraph' && !afterBlank) {
    last.runs.push({ kind: 'text', text: '\n' }, ...inlineRuns(line));
    return;
  }
  blocks.push({ kind: 'paragraph', runs: inlineRuns(line) });
}

// The blocks with every link the guards do not allow turned back into its words.
export function keepAllowedLinks(blocks: AnswerBlock[], allowed: (href: string) => boolean): AnswerBlock[] {
  const runs = (items: InlineRun[]) => items.map((run): InlineRun => (
    run.kind === 'link' && !allowed(run.href) ? { kind: 'text', text: run.text } : run
  ));
  return blocks.map((block) => (block.kind === 'list'
    ? { ...block, items: block.items.map(runs) }
    : { ...block, runs: runs(block.runs) }));
}

export function answerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let afterBlank = true;
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      afterBlank = true;
      continue;
    }
    addLine(blocks, line, afterBlank);
    afterBlank = false;
  }
  return blocks;
}
