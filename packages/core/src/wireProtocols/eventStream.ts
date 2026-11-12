// Server sent events written to a byte stream as the wallet answers. A reader that cancels the
// stream stops the answer; writes after that are dropped.

export interface EventWriter {
  // Writes one event; a string goes as is, anything else as JSON.
  send(data: unknown, event?: string): void;
}

export function eventStream(
  run: (writer: EventWriter) => Promise<void>, onCancel: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let open = true;
  return new ReadableStream({
    start(controller) {
      const writer: EventWriter = {
        send(data, event) {
          if (!open) {
            return;
          }
          const name = event ? `event: ${event}\n` : '';
          const payload = typeof data === 'string' ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`${name}data: ${payload}\n\n`));
        },
      };
      const finish = (end: () => void) => {
        if (open) {
          open = false;
          end();
        }
      };
      run(writer).then(
        () => finish(() => controller.close()),
        (error: unknown) => finish(() => controller.error(error)),
      );
    },
    cancel() {
      open = false;
      onCancel();
    },
  });
}
