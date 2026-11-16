// The site's side of AI Connect: the connection to the visitor's AI through the AI Wallet or, without it,
// through an account the visitor signs in to on the page, the conversation loop that runs the site's tools
// under the chat's guards, the site's tools read from its MCP server, and the `fetch` that lets the AI SDK a
// site already uses answer through the same connection.

export { contentParts, dataUrl, inlineData, textOf } from './chatContent.ts';
export type { InlineData } from './chatContent.ts';
export { AiConnect } from './client.ts';
export type { AiConnectOptions, ConnectionState, SdkOptions, WebSignInFailure } from './client.ts';
export * from './guards/index.ts';
export { McpToolSource } from './mcpToolSource.ts';
export { BROWSER_NAMES, browserOf, visitorBrowser, walletInstallUrl } from './visitorBrowser.ts';
export type { BrowserSignals, VisitorBrowser } from './visitorBrowser.ts';
export { finalAnswer, runConversation } from './toolLoop.ts';
export type { ConversationHooks, ConversationOptions } from './toolLoop.ts';
export type * from './types.ts';
export { WalletRequestError } from './walletProvider.ts';
export type { ChatEvent, WalletChatParams, WalletProvider, WalletRefusal } from './walletProvider.ts';
export type { WalletFetch } from './wireProtocols/walletFetch.ts';
export { finishSignIn } from './webAccounts/finishSignIn.ts';
export type { SignInReturn } from './webAccounts/finishSignIn.ts';
export { isSignInReturn } from './webAccounts/signInWindow.ts';
export { PLAN_GATEWAY } from './webAccounts/tensorPassAccount.ts';
export type { PlanAccess, PlanOffer, PlanPrice, PlanSubscription } from './webAccounts/tensorPassPlan.ts';
export type { PlanLevel } from './webAccounts/tensorPassAccount.ts';
export { WEB_ACCOUNT_NAMES } from './webAccounts/webAccount.ts';
export type { WebAccountId } from './webAccounts/webAccountStore.ts';
