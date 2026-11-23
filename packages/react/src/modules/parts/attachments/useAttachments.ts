// The files of the question being written: added from a drop, a paste or the attach button, checked against
// the site's policy, read in the page, and taken out of the list when the visitor removes them or the
// question is sent. A file the policy refuses leaves a note saying why, in the module's language.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  checkAttachment, DEFAULT_MAX_ATTACHMENT_BYTES, DEFAULT_MAX_ATTACHMENTS, fitsQuestion, prepareAttachment,
  UnreadableFileError,
} from '@tensorpass/aiconnect/attachments';
import type { AttachmentPolicy, AttachmentRefusal } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import type { ModuleMessages } from '../../../messages.ts';
import { attachmentList, heldBytes, readyAttachments, stillReading } from './attachmentList.ts';
import type { AttachmentItem } from './attachmentList.ts';
import { fileSize } from './fileSize.ts';

function refusalText(refusal: AttachmentRefusal, policy: AttachmentPolicy, copy: ModuleMessages, locale: string) {
  switch (refusal) {
    case 'type':
      return copy.attachRefusedType;
    case 'count':
      return copy.attachRefusedCount.replaceAll('{count}', String(policy.maxFiles ?? DEFAULT_MAX_ATTACHMENTS));
    case 'size': {
      const cap = fileSize(policy.maxBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES, locale);
      return copy.attachRefusedSize.replaceAll('{size}', cap);
    }
  }
}

export function useAttachments(policy: AttachmentPolicy | undefined) {
  const { moduleMessages, locale } = useAiConnect();
  const [items, dispatch] = useReducer(attachmentList, []);
  // The list as last rendered, for a file read after other files changed it.
  const latest = useRef<AttachmentItem[]>(items);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  const [note, setNote] = useState<string | null>(null);

  const read = useCallback(async (file: File, item: AttachmentItem, mediaType: string, rules: AttachmentPolicy) => {
    try {
      const prepared = await prepareAttachment(file, item.kind, mediaType);
      if (!fitsQuestion(prepared.bytes, heldBytes(latest.current, item.id), rules)) {
        dispatch({ type: 'remove', id: item.id });
        setNote(refusalText('size', rules, moduleMessages, locale));
        return;
      }
      dispatch({ type: 'ready', id: item.id, prepared });
    } catch (error) {
      dispatch({ type: 'remove', id: item.id });
      setNote(error instanceof UnreadableFileError
        ? moduleMessages.attachUnreadable.replaceAll('{name}', file.name)
        : moduleMessages.attachRefusedType);
    }
  }, [moduleMessages, locale]);

  const add = useCallback((files: File[]) => {
    if (!policy) {
      return;
    }
    setNote(null);
    let count = latest.current.length;
    for (const file of files) {
      const check = checkAttachment(file, policy, count);
      if (!check.ok) {
        setNote(refusalText(check.refusal, policy, moduleMessages, locale));
        continue;
      }
      count += 1;
      const item = { id: crypto.randomUUID(), name: file.name, size: file.size, kind: check.kind, prepared: null };
      dispatch({ type: 'add', item });
      void read(file, item, check.mediaType, policy);
    }
  }, [policy, moduleMessages, locale, read]);

  const remove = useCallback((id: string) => {
    setNote(null);
    dispatch({ type: 'remove', id });
  }, []);

  const clear = useCallback(() => {
    setNote(null);
    dispatch({ type: 'clear' });
  }, []);

  return {
    policy, items, note, add, remove, clear, ready: readyAttachments(items), reading: stillReading(items),
  };
}

export type Attachments = ReturnType<typeof useAttachments>;
