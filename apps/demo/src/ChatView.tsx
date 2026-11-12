// The demo's chat: the turns with their tool calls and streamed answer, the error, and the form.
// The chat hook and SDK mode both render it.

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ChatTurn } from '@tensorpass/aiconnect-react';

export interface ChatViewProps {
  turns: ChatTurn[];
  busy: boolean;
  error: string | null;
  send: (question: string) => void;
  stop: () => void;
}

export function ChatView({ turns, busy, error, send, stop }: ChatViewProps) {
  const [question, setQuestion] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(question);
    setQuestion('');
  };

  return (
    <section>
      {turns.map((turn, index) => (
        <article key={index} className="turn">
          <p className="question">{turn.question}</p>
          {turn.tools.map(({ call, result }) => (
            <pre key={call.id} className="tool">{call.name}({JSON.stringify(call.arguments)}) → {result ?? '…'}</pre>
          ))}
          <p className="answer">{turn.answer}</p>
        </article>
      ))}
      {error ? <p className="error">{error}</p> : null}
      <form onSubmit={submit}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="A calm book for tonight"
        />
        <button type="submit" disabled={busy}>Ask</button>
        {busy ? <button type="button" onClick={stop}>Stop</button> : null}
      </form>
    </section>
  );
}
