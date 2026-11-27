// The answer of a turn as the visitor reads it: the text the model writes before a tool call and the text
// it writes after the result are two paragraphs, where streaming them end to end ran a sentence into the
// next one ("how it works.You start").

const ENDS_IN_SPACE = /\s$/;

// Adds a streamed piece to the answer. The first piece of a step that follows a tool call opens a new
// paragraph, unless the answer is still empty or already ends in white space.
export function appendAnswer(answer: string, delta: string, newStep: boolean): string {
  if (!newStep || !answer || ENDS_IN_SPACE.test(answer)) {
    return answer + delta;
  }
  return `${answer}\n\n${delta}`;
}
