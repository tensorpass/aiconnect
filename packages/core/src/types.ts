// The vocabulary a site and the AI Wallet share: one chat format for every provider, the tools a
// site offers, and what a site sees of the wallet. The wallet's connectors translate the chat
// format to each provider's wire protocol and back; `AiConnect.fetch` translates the protocols the
// AI SDKs speak into it.

export type JsonSchema = Record<string, unknown>;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TextPart {
  type: 'text';
  text: string;
}

// An image as a `data:` URL, or an https URL for the providers that fetch images themselves.
export interface ImagePart {
  type: 'image';
  url: string;
}

// A file the visitor attached, as a base64 `data:` URL with its name: a PDF, which an account that
// reads PDFs receives whole, or a text file (plain text, Markdown, CSV, JSON), which the model reads
// as text.
export interface FilePart {
  type: 'file';
  url: string;
  name: string;
}

export type ContentPart = TextPart | ImagePart | FilePart;

export interface SystemMessage {
  role: 'system';
  content: string;
}

export interface UserMessage {
  role: 'user';
  content: string | ContentPart[];
}

export interface AssistantMessage {
  role: 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolMessage {
  role: 'tool';
  toolCallId: string;
  name: string;
  content: string;
}

export type ChatMessage = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

// Whether the model may answer in text, must call a tool, or must call the named one.
export type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

// An answer in JSON, held to the schema when one is given. `strict` asks the providers that offer
// it to refuse any schema they cannot enforce exactly.
export interface ResponseFormat {
  type: 'json';
  schema?: JsonSchema;
  name?: string;
  strict?: boolean;
}

// The settings an account may refuse: its connector leaves them out of the call.
export type GenerationHint = 'maxTokens' | 'temperature' | 'topP' | 'stop';

// What the site asks of the answer. The hints above are left out where the account refuses them;
// a tool choice and a response format always reach the provider.
export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  toolChoice?: ToolChoice;
  responseFormat?: ResponseFormat;
}

// Who answers a chat: the display name of the account, such as `Claude`, and the model the wallet
// asks it for. A site on Auto learns it here, since the wallet picks the account for each answer.
export interface ChatStart {
  providerName: string;
  model: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  options?: GenerationOptions;
  signal?: AbortSignal;
  // On a site, the wallet's session calls it once, before the first text or the result.
  onStart?: (start: ChatStart) => void;
  onText?: (delta: string) => void;
}

// Why the answer ended: it was complete, it reached the token limit, it calls tools, or the
// provider's filter stopped it.
export type FinishReason = 'stop' | 'length' | 'toolCalls' | 'contentFilter';

// The tokens the provider counted for the call. `inputTokens` includes `cachedInputTokens`.
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface ChatResponse {
  message: AssistantMessage;
  finishReason: FinishReason;
  // The model that answered, as the provider named it.
  model: string;
  // Absent when the provider reports no token counts.
  usage?: Usage;
}

// A chat session, ready to answer: on a site, the wallet answering with the user's account; in the
// wallet, a connector calling the provider with the account's credential.
export interface ProviderSession {
  providerId: string;
  model: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

// What the model of an account reads besides text.
export interface ReadableParts {
  image: boolean;
  pdf: boolean;
}

// How the account transcribes the visitor's voice: `live` writes the words while they are spoken,
// `file` transcribes the recording once it ends, and `none` leaves dictation to the browser.
export type DictationMode = 'live' | 'file' | 'none';

// What a site sees of the wallet: whether it may use the visitor's AI, and then which account
// answers it, on which model, what that model reads and how the account transcribes a voice. A
// wallet older than attachments leaves `reads` and `dictation` out.
export type WalletLink =
  | { connected: false }
  | { connected: true; providerName: string; model?: string; reads?: ReadableParts; dictation?: DictationMode };

export interface ToolSource {
  listTools(): Promise<ToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<string>;
}
