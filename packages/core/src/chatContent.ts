// Reads a message's content the same way in every translation: as parts, as plain text, and an
// image's `data:` URL as its media type and base64 data.

import type { ContentPart } from './types.ts';

export interface InlineData {
  mediaType: string;
  data: string;
}

const DATA_URL = /^data:([^;,]+);base64,(.*)$/s;

export function contentParts(content: string | ContentPart[]): ContentPart[] {
  if (typeof content !== 'string') {
    return content;
  }
  return content ? [{ type: 'text', text: content }] : [];
}

export function textOf(content: string | ContentPart[]): string {
  return contentParts(content)
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

// The media type and data of a base64 `data:` URL, or null for any other URL.
export function inlineData(url: string): InlineData | null {
  const match = DATA_URL.exec(url);
  return match ? { mediaType: match[1], data: match[2] } : null;
}

export function dataUrl({ mediaType, data }: InlineData): string {
  return `data:${mediaType};base64,${data}`;
}
