// The site's tools, read from its own MCP server. The same server is the connector users add in
// Claude or ChatGPT, so one tool catalog serves the in page AI mode and the provider apps. The client
// asks the server which protocol revision it serves: a server of the 2026-07-28 revision, such as a
// Mastra `MCPServer`, answers in it, and a server of the 2025 revisions gets the 2025 handshake.

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { ToolDefinition, ToolSource } from './types.ts';

interface TextContent {
  type: string;
  text?: string;
}

export class McpToolSource implements ToolSource {
  private readonly url: URL;
  private readonly clientName: string;
  private client: Promise<Client> | null = null;
  private definitions: Promise<ToolDefinition[]> | null = null;

  constructor(url: string | URL, clientName = 'aiconnect') {
    this.url = new URL(url, globalThis.location?.href);
    this.clientName = clientName;
  }

  // The connection and the catalog are kept once read. A failed attempt is forgotten, so the next
  // call asks the server again.
  private connected(): Promise<Client> {
    this.client ??= this.connect().catch((error: unknown) => {
      this.client = null;
      throw error;
    });
    return this.client;
  }

  private async connect(): Promise<Client> {
    const client = new Client({ name: this.clientName, version: '0.1.0' }, { versionNegotiation: { mode: 'auto' } });
    await client.connect(new StreamableHTTPClientTransport(this.url));
    return client;
  }

  listTools(): Promise<ToolDefinition[]> {
    this.definitions ??= this.readTools().catch((error: unknown) => {
      this.definitions = null;
      throw error;
    });
    return this.definitions;
  }

  private async readTools(): Promise<ToolDefinition[]> {
    const { tools } = await (await this.connected()).listTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const client = await this.connected();
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content as TextContent[])
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    return result.isError ? `Tool error: ${text}` : text;
  }
}
