// The help screen: what connecting an AI account to this site means for the visitor.

import { useAiConnect } from './AiConnectProvider.tsx';

export function AboutView() {
  const { messages } = useAiConnect();
  return (
    <div className="aic-about">
      <p className="aic-about-title">{messages.aboutTitle}</p>
      <ul className="aic-about-points">
        {messages.aboutPoints.map((point) => <li key={point}>{point}</li>)}
      </ul>
    </div>
  );
}
