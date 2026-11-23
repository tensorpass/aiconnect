// The rows of chips a chat shows: the files of the question being written, above the field, each with its
// remove button and, on a model that does not read it, a note; and the files of a question sent, beside it,
// whose images open in the lightbox.

import { useState } from 'react';
import { readsAttachment } from '@tensorpass/aiconnect/attachments';
import type { PreparedAttachment } from '@tensorpass/aiconnect/attachments';
import type { ReadableParts } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { AttachmentChip } from './AttachmentChip.tsx';
import { Lightbox } from './Lightbox.tsx';
import type { Attachments } from './useAttachments.ts';

export interface ComposerAttachmentsProps {
  attachments: Attachments;
  reads: ReadableParts;
}

export function ComposerAttachments({ attachments, reads }: ComposerAttachmentsProps) {
  const { moduleMessages, state } = useAiConnect();
  if (attachments.items.length === 0) {
    return null;
  }
  const account = state.status === 'connected' ? state.providerName : '';
  const unread = moduleMessages.imageUnread.replaceAll('{account}', account);
  const unreadNote = (kind: (typeof attachments.items)[number]['kind']) => (
    account && !readsAttachment(kind, reads) ? unread : undefined
  );
  return (
    <>
      <ul className="aic-chips" aria-label={moduleMessages.attach}>
        {attachments.items.map((item) => (
          <AttachmentChip key={item.id} name={item.name} size={item.size} kind={item.kind}
            preview={item.kind === 'image' ? item.prepared?.part.url : undefined} reading={!item.prepared}
            note={unreadNote(item.kind)} onRemove={() => attachments.remove(item.id)} />
        ))}
      </ul>
      {attachments.items.some((item) => unreadNote(item.kind)) ? (
        <p className="aic-chips-note" aria-hidden="true">{unread}</p>
      ) : null}
    </>
  );
}

export function QuestionAttachments({ attachments }: { attachments: PreparedAttachment[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const images = attachments.filter((item) => item.kind === 'image')
    .map((item) => ({ url: item.part.url, name: item.name }));
  return (
    <>
      <ul className="aic-chips aic-question-chips">
        {attachments.map((item, index) => {
          const image = images.findIndex((entry) => entry.url === item.part.url);
          return (
            <AttachmentChip key={`${item.name}-${index}`} name={item.name} size={item.size} kind={item.kind}
              preview={item.kind === 'image' ? item.part.url : undefined}
              onOpen={item.kind === 'image' ? () => setOpen(image) : undefined} />
          );
        })}
      </ul>
      {open === null ? null : <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
