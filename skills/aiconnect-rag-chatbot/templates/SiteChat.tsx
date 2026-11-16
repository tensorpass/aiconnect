'use client';

// The site's chat: AI Connect's popup answering on the visitor's own AI, with the site's search tools
// read from its MCP server. The popup runs AI Connect's guards on every conversation, tuned by the site's
// policy: salted envelopes around the instructions and every search result, and the question and answer
// guards.

import { AiChatPopup } from '@tensorpass/aiconnect-react';
import { chatPolicy } from '@/lib/ai/chatPolicy.mjs';

export function SiteChat() {
  return (
    <AiChatPopup
      system={chatPolicy.instructions}
      mcp="/api/mcp"
      guards={chatPolicy}
      suggestions={chatPolicy.sampleQuestions}
      toolLabels={{ search_site: 'Searching the site', read_page: 'Reading a page' }}
    />
  );
}
