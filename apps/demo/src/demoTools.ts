// The bookshop's catalog served from memory, standing in for a real site's MCP server.

import type { ToolSource } from '@tensorpass/aiconnect';
import { BOOK_TOOLS, SEARCH_BOOKS, searchBooks } from './bookCatalog.ts';

export const demoTools: ToolSource = {
  listTools: async () => BOOK_TOOLS,
  async callTool(name, args) {
    if (name !== SEARCH_BOOKS) {
      throw new Error(`Unknown tool ${name}`);
    }
    return JSON.stringify(searchBooks(args));
  },
};
