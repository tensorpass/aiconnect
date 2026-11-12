// The site's side of AI Connect: the connection to the visitor's AI through the AI Wallet, the
// conversation loop that runs the site's tools under the chat's guards, the site's tools read from its
// MCP server, and the `fetch` that lets the AI SDK a site already uses answer through the wallet.

export { contentParts, dataUrl, inlineData, textOf } from './chatContent.ts';
export type { InlineData } from './chatContent.ts';
export { AiConnect } from './client.ts';
export type { ConnectionState, SdkOptions } from './client.ts';
export * from './guards/index.ts';
export { McpToolSource } from './mcpToolSource.ts';
export { finalAnswer, runConversation } from './toolLoop.ts';
export type { ConversationHooks, ConversationOptions } from './toolLoop.ts';
export type * from './types.ts';
export { WalletRequestError } from './walletProvider.ts';
export type { ChatEvent, WalletChatParams, WalletProvider, WalletRefusal } from './walletProvider.ts';
export type { WalletFetch } from './wireProtocols/walletFetch.ts';
