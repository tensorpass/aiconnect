// SDK mode: the same bookshop chat, run by an AI SDK the site could already use, answered through
// the wallet by passing `aiconnect.fetch` to the SDK.

import { useState } from 'react';
import { ChatView } from '../ChatView.tsx';
import { SegmentedControl } from '../SegmentedControl.tsx';
import { SDK_CHOICES } from './sdkRunners.ts';
import { useSdkChat } from './useSdkChat.ts';

export function SdkMode({ system }: { system: string }) {
  const [sdkId, setSdkId] = useState(SDK_CHOICES[0].id);
  const choice = SDK_CHOICES.find((candidate) => candidate.id === sdkId) ?? SDK_CHOICES[0];
  const chat = useSdkChat(choice.run, system);
  return (
    <>
      <SegmentedControl label="SDK" options={SDK_CHOICES} value={choice.id} onChange={setSdkId} />
      <ChatView {...chat} />
    </>
  );
}
