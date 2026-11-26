// The site's own line at the foot of a module, such as a credit or a privacy note. A module draws
// nothing there unless the site gives the line.

import type { ReactNode } from 'react';

export function ModuleFoot({ children }: { children?: ReactNode }) {
  if (children === undefined || children === null || children === false) {
    return null;
  }
  return <div className="aic-module-foot">{children}</div>;
}
