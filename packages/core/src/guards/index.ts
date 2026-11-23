// The guards of a chat on the visitor's own AI: the conversation's guard the loop runs, and the pure
// checks a site's server and its pen test run on their own.

export { checkToolResult, leadsToSitePage, linkAllowed, validateAnswer } from './answerGuard.ts';
export type { AnswerContext } from './answerGuard.ts';
export { createChatGuard, GuardStop } from './chatGuard.ts';
export type { ChatGuard } from './chatGuard.ts';
export { attachmentEnvelope, newSalt, systemPrompt, toolResultEnvelope } from './envelopes.ts';
export { DEFAULT_MAX_ATTACHMENT_TEXT, DEFAULT_MAX_INPUT_LENGTH } from './policy.ts';
export type { AnswerStop, AnswerVerdict, GuardPolicy, QuestionStop, QuestionVerdict } from './policy.ts';
export { INJECTION_PATTERNS, normalizeForMatching, validateContent, validateQuestion } from './questionGuard.ts';
