// A file the visitor attached, read in the page once it is added: an image drawn again at the size models
// read, a PDF kept whole, a text file as its text. When the question is sent, its attachments become the
// parts the answering model reads: a PDF whole for a model that reads PDFs and as its text and scanned pages
// for the others, and an image only for a model that reads images.

import { encodeBase64Text } from '../chatContent.ts';
import type { ContentPart, FilePart, ImagePart, ReadableParts } from '../types.ts';
import type { AttachmentKind } from './attachmentPolicy.ts';
import { blobDataUrl, preparedImage } from './imagePrep.ts';
import { readPdf } from './pdfPrep.ts';

export interface PreparedAttachment {
  name: string;
  // The size of the file as the visitor gave it, in bytes.
  size: number;
  kind: AttachmentKind;
  part: ImagePart | FilePart;
  // The size the part takes on the way to the model, in bytes.
  bytes: number;
  // The PDF itself, read again by pdf.js for a model that does not read PDFs.
  source?: Blob;
}

// What a model reads when its account does not say: images, which every account of the wallet passes on,
// and PDFs as their text.
export const UNKNOWN_READS: ReadableParts = { image: true, pdf: false };

export async function prepareAttachment(
  file: File, kind: AttachmentKind, mediaType: string,
): Promise<PreparedAttachment> {
  const facts = { name: file.name, size: file.size, kind };
  if (kind === 'image') {
    const part = await preparedImage(file);
    return { ...facts, part, bytes: partBytes(part) };
  }
  if (kind === 'pdf') {
    const part: FilePart = { type: 'file', name: file.name, url: await blobDataUrl(file) };
    return { ...facts, part, bytes: file.size, source: file };
  }
  const text = encodeBase64Text(await file.text());
  const part: FilePart = { type: 'file', name: file.name, url: `data:${mediaType};base64,${text}` };
  return { ...facts, part, bytes: partBytes(part) };
}

// The bytes a base64 `data:` URL holds.
function partBytes(part: ImagePart | FilePart): number {
  const comma = part.url.indexOf(',');
  return Math.floor(((part.url.length - comma - 1) * 3) / 4);
}

// Whether the model reads the attachment as the page prepared it, for the interface to say so on its chip.
export function readsAttachment(kind: AttachmentKind, reads: ReadableParts): boolean {
  return kind !== 'image' || reads.image;
}

export interface ModelParts {
  parts: ContentPart[];
  // Images and pages the model will not see.
  unread: number;
}

export async function partsForModel(attachments: PreparedAttachment[], reads: ReadableParts): Promise<ModelParts> {
  const parts: ContentPart[] = [];
  let unread = 0;
  for (const attachment of attachments) {
    if (attachment.kind === 'image' && !reads.image) {
      unread += 1;
    } else if (attachment.kind === 'pdf' && !reads.pdf && attachment.source) {
      const pdf = await readPdf(attachment.source, attachment.name, reads.image);
      parts.push(...pdf.parts);
      unread += pdf.unread;
    } else {
      parts.push(attachment.part);
    }
  }
  return { parts, unread };
}
