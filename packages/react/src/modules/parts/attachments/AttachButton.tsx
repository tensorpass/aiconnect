// The module's attach button: its own round button over a file input kept out of sight and out of the tab
// order, so the system's file picker opens from a control in the module's style. The input takes the types
// the site's policy accepts, several at once.

import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { AttachmentPolicy } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { PaperclipIcon } from '../icons.tsx';
import { useActionAttribute } from '../moduleAnalytics.ts';

const IMAGE_TYPES = ['image/*'];
const FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json',
  '.md', '.markdown', '.csv', '.txt', '.json'];

// The picker's `accept`: the site's own types, or the kinds its policy leaves on.
function acceptOf(policy: AttachmentPolicy): string {
  if (policy.accept?.length) {
    return policy.accept.join(',');
  }
  return [...(policy.images !== false ? IMAGE_TYPES : []), ...(policy.files !== false ? FILE_TYPES : [])].join(',');
}

export function AttachButton({ policy, onFiles }: { policy: AttachmentPolicy; onFiles: (files: File[]) => void }) {
  const { moduleMessages } = useAiConnect();
  const input = useRef<HTMLInputElement>(null);
  const tracking = useActionAttribute('attach');
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles([...event.target.files ?? []]);
    event.target.value = '';
  };
  return (
    <>
      <button type="button" className="aic-tool-button aic-attach" aria-label={moduleMessages.attach}
        title={moduleMessages.attach}
        onClick={() => input.current?.click()} {...tracking}>
        <PaperclipIcon />
      </button>
      <input ref={input} className="aic-visually-hidden" type="file" multiple accept={acceptOf(policy)}
        tabIndex={-1} aria-hidden="true" onChange={onChange} />
    </>
  );
}
