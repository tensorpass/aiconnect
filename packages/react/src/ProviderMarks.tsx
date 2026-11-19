// The marks of the AI plans most visitors already pay for, side by side on the button that adds AI Wallet,
// so a visitor with ChatGPT, Claude, Gemini, Grok or Muse sees at a glance that this button is for them.
// Each mark sits on a chip of its own, in its provider's colours, in a light and a dark theme alike.

import {
  CHATGPT_ICON,
  CLAUDE_ICON,
  GEMINI_ICON,
  GROK_ICON,
  MUSE_ICON,
} from '@tensorpass/aiconnect-design/provider-marks';

const PLAN_MARKS = [CHATGPT_ICON, CLAUDE_ICON, GEMINI_ICON, GROK_ICON, MUSE_ICON];

export function ProviderMarks() {
  return (
    <span className="aic-provider-marks" aria-hidden="true">
      {PLAN_MARKS.map((icon) => (
        <span key={icon} className="aic-provider-mark">
          <img src={icon} alt="" />
        </span>
      ))}
    </span>
  );
}
