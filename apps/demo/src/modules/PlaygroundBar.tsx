// The playground's own bar above the shop: which form, language and theme the page shows, and a
// link to the same modules as Web Components on a plain HTML page.

import { SegmentedControl } from '../SegmentedControl.tsx';
import { FORMS, LANGUAGES, THEMES } from './playgroundSettings.ts';
import type { PlaygroundSettings } from './playgroundSettings.ts';

export interface PlaygroundBarProps {
  settings: PlaygroundSettings;
  onChange: (next: Partial<PlaygroundSettings>) => void;
}

export function PlaygroundBar({ settings, onChange }: PlaygroundBarProps) {
  return (
    <div className="playground-bar">
      <SegmentedControl label="Form" options={FORMS} value={settings.form} onChange={(form) => onChange({ form })} />
      <SegmentedControl label="Language" options={LANGUAGES} value={settings.lang}
        onChange={(lang) => onChange({ lang })} />
      <SegmentedControl label="Theme" options={THEMES} value={settings.theme}
        onChange={(theme) => onChange({ theme })} />
      <a className="playground-link" href="/elements.html">Web Components page</a>
    </div>
  );
}
