/**
 * Streaming HTML injection: buffer until `</head>` for head injects,
 * hold back before `</body>` for body scripts. Reuses `injectHtml` rules.
 */

import { injectMultiple, type InjectOptions } from "./html-inject.ts";

/** Same shape as `injectMultiple` entries. */
export type StreamInjection = {
  content: string;
  options?: InjectOptions;
};

const HEAD_CLOSE = "</head>";
const BODY_CLOSE = "</body>";

/**
 * TransformStream that applies head/body injections while forwarding chunks.
 *
 * @param injections - Head (`inHead: true`) and body inject entries
 */
export function createHtmlInjectTransform(
  injections: StreamInjection[],
): TransformStream<Uint8Array, Uint8Array> {
  const headInjections = injections.filter((i) => i.options?.inHead);
  const bodyInjections = injections.filter((i) => !i.options?.inHead);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let phase: "head" | "body" | "done" = "head";
  const holdback = BODY_CLOSE.length;

  function enqueueText(
    controller: TransformStreamDefaultController<Uint8Array>,
    text: string,
  ): void {
    if (text.length > 0) {
      controller.enqueue(encoder.encode(text));
    }
  }

  function processBuffer(
    controller: TransformStreamDefaultController<Uint8Array>,
  ): void {
    if (phase === "head") {
      const idx = buffer.indexOf(HEAD_CLOSE);
      if (idx === -1) return;
      const headEnd = idx + HEAD_CLOSE.length;
      const headPart = buffer.slice(0, headEnd);
      buffer = buffer.slice(headEnd);
      enqueueText(controller, injectMultiple(headPart, headInjections));
      phase = "body";
    }

    if (phase === "body") {
      const idx = buffer.indexOf(BODY_CLOSE);
      if (idx !== -1) {
        const beforeAndClose = buffer.slice(0, idx + BODY_CLOSE.length);
        const after = buffer.slice(idx + BODY_CLOSE.length);
        enqueueText(
          controller,
          injectMultiple(beforeAndClose, bodyInjections) + after,
        );
        buffer = "";
        phase = "done";
        return;
      }
      if (buffer.length > holdback) {
        const emitLen = buffer.length - holdback;
        enqueueText(controller, buffer.slice(0, emitLen));
        buffer = buffer.slice(emitLen);
      }
      return;
    }

    if (phase === "done" && buffer.length > 0) {
      enqueueText(controller, buffer);
      buffer = "";
    }
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      processBuffer(controller);
    },
    flush(controller) {
      buffer += decoder.decode();
      if (phase === "head") {
        enqueueText(
          controller,
          injectMultiple(buffer, [...headInjections, ...bodyInjections]),
        );
        buffer = "";
        phase = "done";
        return;
      }
      if (phase === "body") {
        const idx = buffer.indexOf(BODY_CLOSE);
        if (idx !== -1) {
          const beforeAndClose = buffer.slice(0, idx + BODY_CLOSE.length);
          const after = buffer.slice(idx + BODY_CLOSE.length);
          enqueueText(
            controller,
            injectMultiple(beforeAndClose, bodyInjections) + after,
          );
        } else {
          enqueueText(controller, injectMultiple(buffer, bodyInjections));
        }
        buffer = "";
        phase = "done";
        return;
      }
      if (buffer.length > 0) {
        enqueueText(controller, buffer);
        buffer = "";
      }
    },
  });
}
