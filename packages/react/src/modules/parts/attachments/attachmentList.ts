// The files of the question being written, as a list the composer keeps: each file is added while the page
// reads it, then holds what the page prepared for the model, or leaves the list when it is removed or
// refused once read.

import type { AttachmentKind, PreparedAttachment } from '@tensorpass/aiconnect/attachments';

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  // Null while the page reads the file.
  prepared: PreparedAttachment | null;
}

export type AttachmentAction =
  | { type: 'add'; item: AttachmentItem }
  | { type: 'ready'; id: string; prepared: PreparedAttachment }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

export function attachmentList(items: AttachmentItem[], action: AttachmentAction): AttachmentItem[] {
  switch (action.type) {
    case 'add':
      return [...items, action.item];
    case 'ready':
      return items.map((item) => (item.id === action.id ? { ...item, prepared: action.prepared } : item));
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'clear':
      return [];
  }
}

// The bytes the files read so far take on the way to the model, the file being checked left out.
export function heldBytes(items: AttachmentItem[], except?: string): number {
  return items.reduce((total, item) => total + (item.id === except ? 0 : item.prepared?.bytes ?? 0), 0);
}

export function readyAttachments(items: AttachmentItem[]): PreparedAttachment[] {
  return items.flatMap((item) => (item.prepared ? [item.prepared] : []));
}

export function stillReading(items: AttachmentItem[]): boolean {
  return items.some((item) => item.prepared === null);
}
