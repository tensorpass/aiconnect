// The handle a module gives the site through its `ref`: a question from the site's own field or button
// goes to the module as if the visitor had typed it there, and a module that floats opens first.

import { useImperativeHandle } from 'react';
import type { Ref } from 'react';
import type { AiModuleHandle } from '../types.ts';

export function useModuleHandle(ref: Ref<AiModuleHandle> | undefined, ask: (question: string) => void,
  show?: () => void) {
  useImperativeHandle(ref, () => ({
    ask: (question: string) => {
      show?.();
      ask(question);
    },
  }), [ask, show]);
}
