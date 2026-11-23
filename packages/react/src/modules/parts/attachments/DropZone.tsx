// Files dragged over a chat module: the module shows a drop zone as soon as files enter it, saying whether
// it takes them before the visitor lets go, read from the types the drag carries. Text or links dragged
// from the page leave the module as it is.

import { useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { acceptsType, mediaTypeOf } from '@tensorpass/aiconnect/attachments';
import type { AttachmentPolicy } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { PaperclipIcon } from '../icons.tsx';

type DragState = 'none' | 'accepted' | 'refused';

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files');
}

// Whether every dragged file is one the policy takes. A browser that hides the types during the drag gives
// empty types, which the drop then checks file by file.
function dragState(event: DragEvent, policy: AttachmentPolicy): DragState {
  const types = [...event.dataTransfer.items].filter((item) => item.kind === 'file').map((item) => item.type);
  const known = types.filter(Boolean);
  const accepted = known.every((type) => acceptsType(mediaTypeOf({ name: '', type }), policy));
  return accepted ? 'accepted' : 'refused';
}

export interface DropZoneProps {
  // Without a policy the module takes no files, and a drop goes to the page as before.
  policy?: AttachmentPolicy;
  onFiles: (files: File[]) => void;
  children: ReactNode;
}

// The drag over the module: its state, and the depth of the elements it entered, since entering a child
// fires the child's enter before the parent's leave.
interface Drag {
  state: DragState;
  depth: number;
}

const NO_DRAG: Drag = { state: 'none', depth: 0 };

// The drag's state over the module and the handlers that follow it, when the module takes files.
function useFileDrag(policy: AttachmentPolicy | undefined, onFiles: (files: File[]) => void) {
  const [drag, setDrag] = useState<Drag>(NO_DRAG);
  const handlers = policy && {
    onDragEnter: (event: DragEvent) => {
      if (carriesFiles(event)) {
        const state = dragState(event, policy);
        setDrag((current) => ({ state, depth: current.depth + 1 }));
      }
    },
    onDragOver: (event: DragEvent) => {
      if (carriesFiles(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = drag.state === 'refused' ? 'none' : 'copy';
      }
    },
    onDragLeave: (event: DragEvent) => {
      if (carriesFiles(event)) {
        setDrag((current) => (current.depth <= 1 ? NO_DRAG : { ...current, depth: current.depth - 1 }));
      }
    },
    onDrop: (event: DragEvent) => {
      if (carriesFiles(event)) {
        event.preventDefault();
        setDrag(NO_DRAG);
        onFiles([...event.dataTransfer.files]);
      }
    },
  };
  return { state: drag.state, handlers: handlers || {} };
}

export function DropZone({ policy, onFiles, children }: DropZoneProps) {
  const { moduleMessages } = useAiConnect();
  const { state, handlers } = useFileDrag(policy, onFiles);
  return (
    <div className="aic-drop-area" {...handlers}>
      {children}
      {state === 'none' ? null : (
        <div className="aic-drop" data-state={state} aria-hidden="true">
          <span className="aic-drop-icon"><PaperclipIcon /></span>
          <span>{state === 'accepted' ? moduleMessages.attachDrop : moduleMessages.attachRefusedType}</span>
        </div>
      )}
    </div>
  );
}
