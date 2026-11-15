// A streamed HTTP answer read as server sent events, each event's data parsed as JSON, until the OpenAI
// style `[DONE]`. A line and a whole stream each have a longest length, and the provider's stream is
// stopped as soon as the reading ends, whether it finished, failed or was left by its reader.

// The longest line, in characters. An event of a chat is a few kilobytes at most.
const MAX_LINE_LENGTH = 1_048_576;
// The most a whole stream carries, in characters.
const MAX_STREAM_LENGTH = 67_108_864;

function* eventsOf(lines: string[]): Generator<Record<string, unknown> | 'done'> {
  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }
    const data = line.slice('data:'.length).trim();
    if (data === '[DONE]') {
      yield 'done';
      return;
    }
    if (data) {
      yield JSON.parse(data) as Record<string, unknown>;
    }
  }
}

// The finished lines of what was read, and the line still being written.
function linesOf(text: string): { lines: string[]; rest: string } {
  const lines = text.split('\n');
  if (lines.some((line) => line.length > MAX_LINE_LENGTH)) {
    throw new Error('The provider sent a line longer than a stream may carry');
  }
  return { lines, rest: lines.pop() ?? '' };
}

export async function* serverSentEvents(response: Response): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) {
    return;
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let read = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      }
      read += value.length;
      if (read > MAX_STREAM_LENGTH) {
        throw new Error('The provider sent more than a stream may carry');
      }
      const { lines, rest } = linesOf(buffer + value);
      buffer = rest;
      for (const event of eventsOf(lines)) {
        if (event === 'done') {
          return;
        }
        yield event;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
