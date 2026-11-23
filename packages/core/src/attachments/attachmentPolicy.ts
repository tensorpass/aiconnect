// What a site lets its visitors attach to a question, and the checks a file meets: before the page reads it,
// its kind (an image, a PDF or a text file), the types the site accepts, the count of the question's files
// and the size the page agrees to read; once read, the size the question's files take on the way to the
// model, where an image counts as the page drew it again, often a tenth of the photo it came from.

import { isTextFile, PDF_TYPE } from '../chatContent.ts';

export interface AttachmentPolicy {
  // Images, on by default.
  images?: boolean;
  // PDFs and text files (plain text, Markdown, CSV, JSON), on by default.
  files?: boolean;
  // Dictation into the question field, on by default.
  voice?: boolean;
  // The media types the site accepts, narrower than the kinds above, such as `['image/png', 'image/jpeg']`.
  // A type ending in `/*` accepts its whole family.
  accept?: string[];
  // The size the files of one question take together on the way to the model, in bytes.
  maxBytes?: number;
  maxFiles?: number;
}

// Five megabytes leave room for the conversation under the 8 million characters the wallet takes in one
// request, base64 writing 4 characters for 3 bytes.
export const DEFAULT_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const DEFAULT_MAX_ATTACHMENTS = 10;

// The largest file the page reads, such as a photo before it is drawn again.
export const MAX_READ_BYTES = 50 * 1024 * 1024;

export type AttachmentKind = 'image' | 'pdf' | 'text';

// Why a file was not attached: a type the site or the chat does not take, a question over the size cap or
// over the count.
export type AttachmentRefusal = 'type' | 'size' | 'count';

export type AttachmentCheck =
  | { ok: true; kind: AttachmentKind; mediaType: string }
  | { ok: false; refusal: AttachmentRefusal };

// What the page knows of a file before reading it, as a `File` gives it.
export interface FileFacts {
  name: string;
  type: string;
  size: number;
}

// The text types browsers leave untyped or type in their own way, read from the file's extension.
const TEXT_EXTENSIONS: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
};

// The media type the chat format carries for a file: its own, or the text type its extension names.
export function mediaTypeOf({ name, type }: Pick<FileFacts, 'name' | 'type'>): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXTENSIONS[extension] ?? type;
}

function kindOf(mediaType: string): AttachmentKind | null {
  if (mediaType.startsWith('image/')) {
    return 'image';
  }
  if (mediaType === PDF_TYPE) {
    return 'pdf';
  }
  return isTextFile(mediaType) ? 'text' : null;
}

function allowedKind(kind: AttachmentKind, policy: AttachmentPolicy): boolean {
  return kind === 'image' ? policy.images !== false : policy.files !== false;
}

function acceptedType(mediaType: string, accept: string[] | undefined): boolean {
  if (!accept?.length) {
    return true;
  }
  return accept.some((type) => (type.endsWith('/*') ? mediaType.startsWith(type.slice(0, -1)) : type === mediaType));
}

// Whether the policy takes any attachment at all, for the interface to show its attach button.
export function attachmentsOn(policy: AttachmentPolicy | undefined): boolean {
  return Boolean(policy) && (policy?.images !== false || policy?.files !== false);
}

// Whether a file of this media type may be attached, read before the drop from the dragged item's type.
export function acceptsType(mediaType: string, policy: AttachmentPolicy): boolean {
  const kind = kindOf(mediaType);
  return kind !== null && allowedKind(kind, policy) && acceptedType(mediaType, policy.accept);
}

// The check of a file, before the page reads it, against the policy and the count of files the question
// already holds.
export function checkAttachment(file: FileFacts, policy: AttachmentPolicy, heldCount: number): AttachmentCheck {
  const mediaType = mediaTypeOf(file);
  const kind = kindOf(mediaType);
  if (kind === null || !allowedKind(kind, policy) || !acceptedType(mediaType, policy.accept)) {
    return { ok: false, refusal: 'type' };
  }
  if (heldCount >= (policy.maxFiles ?? DEFAULT_MAX_ATTACHMENTS)) {
    return { ok: false, refusal: 'count' };
  }
  if (file.size > MAX_READ_BYTES) {
    return { ok: false, refusal: 'size' };
  }
  return { ok: true, kind, mediaType };
}

// Whether a file the page read fits beside the files the question holds.
export function fitsQuestion(bytes: number, heldBytes: number, policy: AttachmentPolicy): boolean {
  return heldBytes + bytes <= (policy.maxBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES);
}
