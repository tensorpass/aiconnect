// The name a site gives a module's actions for its click analytics (`analytics` on the module): each
// action button of the module carries `data-analytics` with that name and the action, such as `try-send`.

import { createContext, useContext } from 'react';

export type ModuleAction = 'install' | 'connect' | 'send' | 'suggestion' | 'attach' | 'voice';

export const ModuleAnalytics = createContext<string | undefined>(undefined);

export function useActionAttribute(action: ModuleAction): { 'data-analytics'?: string } {
  const name = useContext(ModuleAnalytics);
  return name ? { 'data-analytics': `${name}-${action}` } : {};
}
