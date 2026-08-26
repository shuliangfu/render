/**
 * renderSSRStream tests (view-only true streaming).
 */

import "./dom-setup-happy-dom.ts";
import { assertRejects, describe, expect, it } from "@dreamer/test";
import { jsx } from "@dreamer/view/jsx-runtime";
import { renderSSR, renderSSRStream } from "../src/ssr.ts";

async function readStreamText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return out;
}

function FullPage(props: { title?: string; body?: string }) {
  const title = props.title ?? "Stream Page";
  const body = props.body ?? "Hello Stream";
  return jsx(
    "html",
    {
      children: [
        jsx(
          "head",
          {
            children: [
              jsx("meta", { charset: "utf-8" }, undefined),
              jsx("title", { children: title }, undefined),
            ],
          },
          undefined,
        ),
        jsx(
          "body",
          {
            children: jsx("div", { id: "app", children: body }, undefined),
          },
          undefined,
        ),
      ],
    },
    undefined,
  );
}

describe(
  "renderSSRStream",
  () => {
    it("parity: stream decode matches renderSSR for view document content", async () => {
      (FullPage as { metadata?: { title: string; description: string } })
        .metadata = {
          title: "Parity Meta",
          description: "parity desc",
        };

      const options = {
        engine: "view" as const,
        component: FullPage,
        props: { title: "Parity", body: "Parity Body" },
        loadContext: { url: "/parity", params: {} },
        clientScripts: ["/client.js"],
      };

      const stringResult = await renderSSR(options);
      const streamResult = await renderSSRStream(options);
      const streamed = await readStreamText(streamResult.body);

      // Shared markers (stream scopes head/body separately so body scripts
      // land before </body>; string inject may attach after head data-script)
      expect(streamed).toContain("Parity Body");
      expect(streamed).toContain("window.__DATA__");
      expect(streamed).toContain("Parity Meta");
      expect(streamed).toContain("parity desc");
      expect(stringResult.html).toContain("Parity Body");
      expect(stringResult.html).toContain("window.__DATA__");
      expect(stringResult.html).toContain('<script src="/client.js"></script>');
      expect(streamed).toContain('<script src="/client.js"></script>');
      expect(streamed.indexOf('<script src="/client.js"></script>'))
        .toBeLessThan(
          streamed.indexOf("</body>"),
        );

      expect(streamResult.renderInfo.engine).toBe("view");
      expect(streamResult.renderInfo.stream).toBe(true);
      expect(streamResult.renderInfo.mode).toBe("pipe");
      expect(streamResult.metadata?.title).toBe(stringResult.metadata?.title);
    });

    it("parity without body scripts: exact html match", async () => {
      const Page = () =>
        jsx(
          "html",
          {
            children: [
              jsx(
                "head",
                { children: jsx("title", { children: "Exact" }, undefined) },
                undefined,
              ),
              jsx(
                "body",
                {
                  children: jsx("div", { children: "Exact Body" }, undefined),
                },
                undefined,
              ),
            ],
          },
          undefined,
        );

      const options = {
        engine: "view" as const,
        component: Page,
        skipDataInjection: true,
      };

      const stringResult = await renderSSR(options);
      const streamed = await readStreamText(
        (await renderSSRStream(options)).body,
      );
      expect(streamed).toBe(stringResult.html);
    });

    it("injects client scripts before </body>", async () => {
      const result = await renderSSRStream({
        engine: "view",
        component: FullPage,
        props: { body: "Scripts" },
        clientScripts: ["/app.js"],
      });
      const html = await readStreamText(result.body);
      const scriptIdx = html.indexOf('<script src="/app.js"></script>');
      const bodyCloseIdx = html.indexOf("</body>");
      expect(scriptIdx).toBeGreaterThan(-1);
      expect(bodyCloseIdx).toBeGreaterThan(-1);
      expect(scriptIdx).toBeLessThan(bodyCloseIdx);
    });

    it("rejects react engine", async () => {
      await assertRejects(
        () =>
          renderSSRStream({
            engine: "react",
            component: () => null,
          }),
        Error,
        /renderSSRStream|view only|仅支持|Use renderSSR/i,
      );
    });

    it("rejects preact engine", async () => {
      await assertRejects(
        () =>
          renderSSRStream({
            engine: "preact",
            component: () => null,
          }),
        Error,
        /renderSSRStream|view only|仅支持|Use renderSSR/i,
      );
    });

    it("buffered stream:true still returns html string (regression)", async () => {
      const result = await renderSSR({
        engine: "view",
        component: FullPage,
        props: { body: "Buffered" },
        stream: true,
      });
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("Buffered");
      expect(result.renderInfo?.stream).toBe(true);
      expect((result as { body?: unknown }).body).toBeUndefined();
    });

    it("supports template with ssr-outlet", async () => {
      const Page = () => jsx("div", { children: "Outlet Content" }, undefined);
      const template =
        "<html><head><title>T</title></head><body><!--ssr-outlet--></body></html>";

      const streamResult = await renderSSRStream({
        engine: "view",
        component: Page,
        template,
        clientScripts: ["/x.js"],
      });
      const html = await readStreamText(streamResult.body);
      expect(html).toContain("Outlet Content");
      expect(html).toContain('<script src="/x.js"></script>');
      expect(html.indexOf('<script src="/x.js"></script>')).toBeLessThan(
        html.indexOf("</body>"),
      );
    });
  },
  { sanitizeOps: false, sanitizeResources: false },
);
