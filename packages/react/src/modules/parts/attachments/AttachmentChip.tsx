// A file of a question as a chip: a thumbnail for an image, an icon with the name and the size for a
// document, a ring while the page reads it, and a note when the account that answers does not read it. In
// the question box the chip has a remove button; in the conversation an image's chip opens the lightbox.

import type { AttachmentKind } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { CloseIcon, FileIcon } from '../icons.tsx';
import { fileSize } from './fileSize.ts';

export interface AttachmentChipProps {
  name: string;
  size: number;
  kind: AttachmentKind;
  // The image as the model receives it, for the thumbnail; absent while the page reads it.
  preview?: string;
  reading?: boolean;
  // Why the account that answers will not read the file.
  note?: string;
  onRemove?: () => void;
  onOpen?: () => void;
}

function ChipFace({ name, size, kind, preview }: Pick<AttachmentChipProps, 'name' | 'size' | 'kind' | 'preview'>) {
  const { locale } = useAiConnect();
  if (kind === 'image') {
    return preview ? <img className="aic-chip-thumb" src={preview} alt="" /> : <span className="aic-chip-thumb" />;
  }
  return (
    <>
      <span className="aic-chip-icon"><FileIcon /></span>
      <span className="aic-chip-text">
        <span className="aic-chip-name" dir="auto">{name}</span>
        <span className="aic-chip-size">{fileSize(size, locale)}</span>
      </span>
    </>
  );
}

export function AttachmentChip({ reading, note, onRemove, onOpen, ...face }: AttachmentChipProps) {
  const { moduleMessages } = useAiConnect();
  const label = face.kind === 'image' ? `${moduleMessages.openImage}: ${face.name}` : face.name;
  return (
    <li className="aic-chip" data-kind={face.kind} data-reading={reading || undefined}
      data-unread={note ? true : undefined} title={note ?? face.name}>
      {onOpen ? (
        <button type="button" className="aic-chip-open" aria-label={label} onClick={onOpen}>
          <ChipFace {...face} />
        </button>
      ) : <ChipFace {...face} />}
      {reading ? <span className="aic-chip-ring" role="status" aria-label={moduleMessages.attachmentReading} /> : null}
      {note ? <span className="aic-visually-hidden">{note}</span> : null}
      {onRemove ? (
        <button type="button" className="aic-chip-remove" onClick={onRemove}
          aria-label={moduleMessages.attachmentRemove.replaceAll('{name}', face.name)}>
          <CloseIcon />
        </button>
      ) : null}
    </li>
  );
}
