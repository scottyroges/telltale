export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "done"; shouldComplete: boolean };
