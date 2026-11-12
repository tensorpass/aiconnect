// The guards of one conversation, created when it starts: its salt, what the visitor typed and what the
// site's tools returned so far, and the site's policy. The conversation loop asks it to check each
// question and each answer, and to put the instructions and the tool results in their envelopes on the
// way to the model. The interface asks it which links of an answer it may draw and which tools it shows.

import { textOf } from '../chatContent.ts';
import type { ChatMessage } from '../types.ts';
import { linkAllowed, validateAnswer } from './answerGuard.ts';
import type { AnswerContext } from './answerGuard.ts';
import { newSalt, systemPrompt, toolResultEnvelope } from './envelopes.ts';
import { compilePatterns } from './policy.ts';
import type { AnswerStop, AnswerVerdict, GuardPolicy, QuestionStop, QuestionVerdict } from './policy.ts';
import { validateQuestion } from './questionGuard.ts';

export interface ChatGuard {
  readonly salt: string;
  readonly policy: GuardPolicy;
  // The messages as the model reads them: the instructions and each tool result in their envelopes.
  forModel(messages: ChatMessage[]): ChatMessage[];
  // Notes what the visitor typed and what the tools returned in these messages, which the answers may
  // repeat.
  remember(messages: ChatMessage[]): void;
  checkQuestion(question: string): QuestionVerdict;
  // `partial` while the answer still streams.
  checkAnswer(answer: string, partial?: boolean): AnswerVerdict;
  linkAllowed(href: string): boolean;
  toolVisible(name: string): boolean;
}

// A question or an answer the guards stopped. The interface shows the site's safe answer in its place.
export class GuardStop extends Error {
  readonly stage: 'question' | 'answer';
  readonly reason: QuestionStop | AnswerStop;

  constructor(stage: 'question' | 'answer', reason: QuestionStop | AnswerStop) {
    super(`The ${stage} was stopped by a guard (${reason})`);
    this.name = 'GuardStop';
    this.stage = stage;
    this.reason = reason;
  }
}

export function createChatGuard(policy: GuardPolicy = {}): ChatGuard {
  // Read once here, so a pattern that is not a valid regular expression fails when the chat starts.
  compilePatterns([...policy.denyPatterns ?? [], ...policy.withholdPatterns ?? []]);
  const salt = newSalt();
  const typed: string[] = [];
  const returned: string[] = [];
  const seen = new WeakSet<ChatMessage>();
  const context = (partial = false): AnswerContext => ({
    salt,
    policy,
    visitorText: typed.join('\n'),
    toolResults: returned,
    origin: globalThis.location?.origin,
    partial,
  });
  return {
    salt,
    policy,
    forModel: (messages) => messages.map((message) => {
      if (message.role === 'system') {
        return { role: 'system', content: systemPrompt({ salt, instructions: message.content, policy }) };
      }
      return message.role === 'tool' ? { ...message, content: toolResultEnvelope(salt, message.content) } : message;
    }),
    remember: (messages) => {
      for (const message of messages.filter((item) => !seen.has(item))) {
        seen.add(message);
        if (message.role === 'user') {
          typed.push(textOf(message.content));
        } else if (message.role === 'tool') {
          returned.push(message.content);
        }
      }
    },
    checkQuestion: (question) => validateQuestion(question, policy),
    checkAnswer: (answer, partial) => validateAnswer(answer, context(partial)),
    linkAllowed: (href) => linkAllowed(href, context()),
    toolVisible: (name) => !policy.visibleTools || policy.visibleTools.includes(name),
  };
}
