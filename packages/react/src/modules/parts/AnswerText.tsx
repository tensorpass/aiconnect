// The answer as it streams: its light Markdown drawn as paragraphs, headings and lists, with the
// cyan caret at the end of the text while more is coming. Only the links the conversation's guards
// allow are drawn, and those to other sites open in a new tab. A safe answer that replaced what a guard
// stopped is marked, for the site's styles.

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { answerBlocks, keepAllowedLinks, onSite } from './answerMarkdown.ts';
import type { AnswerBlock, InlineRun } from './answerMarkdown.ts';

function Run({ run }: { run: InlineRun }) {
  switch (run.kind) {
    case 'strong':
      return <strong><Runs runs={run.runs} caret={null} /></strong>;
    case 'em':
      return <em><Runs runs={run.runs} caret={null} /></em>;
    case 'code':
      return <code>{run.text}</code>;
    case 'link': {
      const external = !onSite(run.href);
      return (
        <a href={run.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
          {run.text}
        </a>
      );
    }
    default:
      return <>{run.text}</>;
  }
}

function Runs({ runs, caret }: { runs: InlineRun[]; caret: ReactNode }) {
  return <>{runs.map((run, index) => <Run key={index} run={run} />)}{caret}</>;
}

function Block({ block, caret }: { block: AnswerBlock; caret: ReactNode }) {
  if (block.kind === 'list') {
    const items = block.items.map((runs, index) => (
      <li key={index}><Runs runs={runs} caret={index === block.items.length - 1 ? caret : null} /></li>
    ));
    return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
  }
  const className = block.kind === 'heading' ? 'aic-answer-heading' : undefined;
  return <p className={className}><Runs runs={block.runs} caret={caret} /></p>;
}

interface AnswerTextProps {
  text: string;
  streaming: boolean;
  linkAllowed: (href: string) => boolean;
  blocked?: boolean;
}

export function AnswerText({ text, streaming, linkAllowed, blocked }: AnswerTextProps) {
  const blocks = useMemo(() => keepAllowedLinks(answerBlocks(text), linkAllowed), [text, linkAllowed]);
  if (blocks.length === 0) {
    return null;
  }
  const caret = streaming ? <span className="aic-caret" aria-hidden="true" /> : null;
  return (
    <div className="aic-answer" data-blocked={blocked || undefined}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} caret={index === blocks.length - 1 ? caret : null} />
      ))}
    </div>
  );
}
