// Reads a message's content the same way in every translation: as parts, as plain text, a `data:`
// URL as its media type and base64 data, and an attached text file as its text.

import type { ContentPart, FilePart } from './types.ts';

export interface InlineData {
  mediaType: string;
  data: string;
}

const DATA_URL = /^data:([^;,]+);base64,(.*)$/s;

// The files a model reads as text. A PDF is the one other file type the chat format carries.
const TEXT_FILE_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json']);

export const PDF_TYPE = 'application/pdf';

export function contentParts(content: string | ContentPart[]): ContentPart[] {
  if (typeof content !== 'string') {
    return content;
  }
  return content ? [{ type: 'text', text: content }] : [];
}

// The text the visitor typed, without the attached files.
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

export function isTextFile(mediaType: string): boolean {
  return TEXT_FILE_TYPES.has(mediaType);
}

export function decodeBase64Text(data: string): string {
  const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBase64Text(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

// The text of an attached text file, or null for a PDF.
export function fileText(part: FilePart): string | null {
  const inline = inlineData(part.url);
  return inline && isTextFile(inline.mediaType) ? decodeBase64Text(inline.data) : null;
}

// The text of each text file attached to the content.
export function attachedText(content: string | ContentPart[]): string[] {
  return contentParts(content).flatMap((part) => {
    const text = part.type === 'file' ? fileText(part) : null;
    return text === null ? [] : [text];
  });
}
