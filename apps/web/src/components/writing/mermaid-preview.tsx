"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, text: string) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
    };
  }
}

let mermaidScriptPromise: Promise<void> | null = null;

function ensureMermaidScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.mermaid) {
    return Promise.resolve();
  }

  if (!mermaidScriptPromise) {
    mermaidScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-mermaid-runtime="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Mermaid runtime failed to load.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
      script.async = true;
      script.dataset.mermaidRuntime = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Mermaid runtime failed to load."));
      document.head.appendChild(script);
    });
  }

  return mermaidScriptPromise;
}

export function MermaidPreview({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError("");
      setSvg("");

      try {
        await ensureMermaidScript();
        if (!window.mermaid) {
          throw new Error("Mermaid runtime unavailable.");
        }

        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
            primaryColor: "#f5f3ef",
            primaryTextColor: "#1b1c1a",
            primaryBorderColor: "#625d2a",
            lineColor: "#625d2a",
            secondaryColor: "#ffffff",
            tertiaryColor: "#eae8e4",
            fontFamily: "Manrope"
          }
        });

        const result = await window.mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) {
          setSvg(result.svg);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : "Mermaid render failed.");
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="rounded-[1.25rem] bg-surface-container-low/60 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-rose-600">Mermaid Preview Unavailable</p>
        <pre className="mt-3 overflow-x-auto text-sm leading-7 text-foreground/70">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-2">
      <div
        className="min-h-[120px] [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg || "" }}
      />
      {!svg ? (
        <div className="text-sm text-foreground/45">Rendering diagram...</div>
      ) : null}
      <div id={id} className="hidden" />
    </div>
  );
}
