// The class list of a module's outer element: the shared module class, the form's own, and the
// class the site adds.

export function moduleClass(form: string, className?: string): string {
  return ['aic-module', `aic-${form}`, className].filter(Boolean).join(' ');
}
