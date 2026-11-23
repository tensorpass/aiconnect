// The conversation as the wallet takes it in one request: 8 million characters at most, its attachments
// included (the wallet's SITE_LIMITS). Every question resends the conversation, so once it would pass that
// size, the attachments of the oldest questions give way to a note naming them, and the model reads that
// the visitor had attached them.

import type { ChatMessage, ContentPart, UserMessage } from '@tensorpass/aiconnect';

export const REQUEST_BUDGET = 7_500_000;

function requestSize(messages: ChatMessage[]): number {
  return JSON.stringify(messages).length;
}

function note(part: ContentPart): ContentPart {
  switch (part.type) {
    case 'image':
      return { type: 'text', text: '[An image the visitor attached earlier]' };
    case 'file':
      return { type: 'text', text: `[${part.name}, a file the visitor attached earlier]` };
    default:
      return part;
  }
}

function withoutAttachments(message: UserMessage): UserMessage {
  return typeof message.content === 'string' ? message : { ...message, content: message.content.map(note) };
}

// The messages with the attachments of the oldest questions replaced by notes until the request fits. The
// last message, the question being asked, keeps its own.
export function withinRequestBudget(messages: ChatMessage[], budget = REQUEST_BUDGET): ChatMessage[] {
  let fitted = messages;
  for (let index = 0; index < fitted.length - 1 && requestSize(fitted) > budget; index += 1) {
    const message = fitted[index];
    if (message.role === 'user' && typeof message.content !== 'string') {
      fitted = fitted.with(index, withoutAttachments(message));
    }
  }
  return fitted;
}
