// The copy of the connect window and of the interface modules, with what reads it: the step after a
// connection that did not go through and the words of an answer that failed. The copy of each
// language lives in pickerMessages.ts and moduleMessages.ts.

import type { WalletRefusal } from '@tensorpass/aiconnect';
import type { ModuleMessages } from './moduleMessages.ts';
import type { PickerMessages, RefusalStep } from './pickerMessages.ts';

export { builtInModuleMessages } from './moduleMessages.ts';
export type { ModuleMessages } from './moduleMessages.ts';
export { builtInMessages } from './pickerMessages.ts';
export type { Locale, PickerMessages, RefusalStep } from './pickerMessages.ts';

// The step a connection in error shows: the words for the reason the wallet gave, or the wallet's
// own message under the general title.
export function refusalStep(state: { message: string; reason?: WalletRefusal }, messages: PickerMessages): RefusalStep {
  return state.reason ? messages.refusals[state.reason] : { ...messages.refusals.failed, text: state.message };
}

// The words of an answer that failed, in the page's language: the account's usage limit for a 429 and the
// provider out of service for a 5xx, which only the provider sends. Any other failure keeps the wallet's own
// message, since the wallet answers 401, 403 and 499 itself. The error comes from the wallet's own copy of
// `WalletRequestError`, so its status is read as a field.
export function failedAnswerText(reason: unknown, account: string, messages: ModuleMessages): string {
  const status = (reason as { status?: unknown } | null)?.status;
  if (status === 429) {
    return messages.limitReached.replaceAll('{account}', account);
  }
  if (typeof status === 'number' && status >= 500) {
    return messages.providerDown.replaceAll('{account}', account);
  }
  return reason instanceof Error ? reason.message : String(reason);
}
