// The props every interface module shares: what the visitor's AI is told, the site's tools, the copy
// the site sets for its own voice, the guards it tunes, the files and voice it takes, how the site draws
// its tool results, the site's own line under the question box, and the handle its own controls ask
// through. The modules that float over the page add how they open.

import type { ReactNode, Ref } from 'react';
import type { GuardPolicy, ToolSource } from '@tensorpass/aiconnect';
import type { AttachmentPolicy, PreparedAttachment } from '@tensorpass/aiconnect/attachments';
import type { ChatTurn } from '../useAiChat.ts';

// What the conversation holds when a turn's results are drawn.
export interface ToolResultsContext {
  // Every file the visitor added up to this turn, oldest first, as prepared for the model: a card that
  // sends a request with the visitor's photos reads them here, whichever question carried them.
  attachments: PreparedAttachment[];
}

// What a site's own controls can do with a module through its `ref`.
export interface AiModuleHandle {
  // Sends the question as if the visitor had typed it in the module. A module that floats opens first.
  ask: (question: string) => void;
}

export interface AiModuleProps {
  // What the visitor's AI is told about the site and its tools before the first question.
  system: string;
  // The site's tools. Give `mcp` instead to read them from the site's MCP server.
  tools?: ToolSource;
  // The address of the site's MCP server, such as `/api/mcp`. The module connects to it when the
  // first question is sent.
  mcp?: string;
  // The heading of the module. The built in copy says "Ask AI" (or "AI mode" for the full page).
  title?: string;
  // The heading of an empty conversation.
  intro?: string;
  placeholder?: string;
  // Questions the visitor can send with one click before asking their own.
  suggestions?: string[];
  // A plain name for each tool, shown while it runs in place of the tool's own name.
  toolLabels?: Record<string, string>;
  // The site's own values for the guards the conversation runs under: its internal names, the hosts
  // and addresses its answers may give, the tools it shows, its safe answer. The guards run with their
  // defaults without it.
  guards?: GuardPolicy;
  // The files and the voice the visitor may add to a question: images, PDFs and text files dropped, pasted
  // or attached, and dictation into the question field. Leave it out to keep the question box text only;
  // `{}` turns on every kind with the default caps.
  attachments?: AttachmentPolicy;
  // Draws a turn's tool results the site's way, such as its own result cards, under the answer.
  // The turn holds the answer and every tool call with its raw result.
  renderToolResults?: (turn: ChatTurn, context: ToolResultsContext) => ReactNode;
  // The site's own line under the question box, such as a credit or a privacy note. Nothing is drawn
  // without it.
  footer?: ReactNode;
  // A name for the module's actions in the site's click analytics: the install and connect buttons, the
  // send button and the suggestions carry `data-analytics` with it, such as `chat-install` or `chat-send`.
  analytics?: string;
  // Receives the module's handle, for a field or a button of the site's own that sends the module a
  // question, such as an ask bar in the page's opening that opens the side panel.
  ref?: Ref<AiModuleHandle>;
  className?: string;
}

export interface AiOverlayProps {
  // Whether the module is open, when the site controls it. Leave it out to let the module keep it.
  open?: boolean;
  // Whether the module starts open, when the module keeps the state itself.
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Hides the module's own button, for a site that opens the module from a button of its own.
  hideLauncher?: boolean;
  // The text of the module's own button.
  launcherLabel?: string;
}
