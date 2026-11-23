// A file's size as the visitor reads it, in kilobytes or megabytes, in the module's language.

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

export function fileSize(bytes: number, locale: string): string {
  const megabytes = bytes >= MEGABYTE;
  const value = megabytes ? bytes / MEGABYTE : Math.max(1, Math.round(bytes / KILOBYTE));
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: megabytes ? 'megabyte' : 'kilobyte',
    unitDisplay: 'short',
    maximumFractionDigits: megabytes ? 1 : 0,
  }).format(value);
}
