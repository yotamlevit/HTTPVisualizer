import React, { useMemo } from "react";
import { ScrollText } from "lucide-react";
import { FrameCard } from "@/components/FrameCard";
import { HeadersEditor } from "@/components/HeadersEditor";
import { LinkedField } from "@/components/LinkedField";
import { conceptStyle } from "@/lib/concept";
import { renderHttp1 } from "@/lib/http1";
import { useProtocolStore } from "@/store/useProtocolStore";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

export const Http1Mode: React.FC = () => {
  const state = useProtocolStore((s) => s.http1);
  const h1Set = useProtocolStore((s) => s.h1Set);
  const h1AddHeader = useProtocolStore((s) => s.h1AddHeader);
  const h1UpdateHeader = useProtocolStore((s) => s.h1UpdateHeader);
  const h1RemoveHeader = useProtocolStore((s) => s.h1RemoveHeader);

  const dump = useMemo(() => renderHttp1(state), [state]);

  return (
    <div className="space-y-6">
      <FrameCard
        title="HTTP/1.1 Request"
        subtitle="Text protocol — ASCII bytes, CRLF-delimited, empty line separates headers from body"
        icon={<ScrollText className="w-4 h-4" />}
        dump={dump}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <LinkedField
            elementId="h1.method"
            concept="method"
            label="Method"
            hint="verb"
            className="md:col-span-3"
          >
            <select
              id="h1.method"
              name="h1.method"
              className="input"
              value={state.method}
              onChange={(e) => h1Set("method", e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </LinkedField>

          <LinkedField
            elementId="h1.path"
            concept="path"
            label="Request-Target"
            hint="origin-form"
            className="md:col-span-6"
          >
            <input
              id="h1.path"
              name="h1.path"
              className="input"
              value={state.path}
              onChange={(e) => h1Set("path", e.target.value)}
              placeholder="/"
            />
          </LinkedField>

          <LinkedField
            elementId="h1.version"
            concept="version"
            label="Version"
            className="md:col-span-3"
          >
            <input
              id="h1.version"
              name="h1.version"
              className="input"
              value={state.version}
              readOnly
            />
          </LinkedField>
        </div>

        <TextPreview state={state} />

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 mb-1.5">
            Headers
          </h4>
          <HeadersEditor
            headers={state.headers}
            idPrefix="h1.header"
            onAdd={h1AddHeader}
            onUpdate={h1UpdateHeader}
            onRemove={h1RemoveHeader}
          />
        </div>

        <LinkedField elementId="h1.body" concept="body" label="Body" hint="message-body">
          <textarea
            id="h1.body"
            name="h1.body"
            className="input min-h-[88px]"
            value={state.body}
            onChange={(e) => h1Set("body", e.target.value)}
            placeholder="(optional request body — e.g. JSON)"
          />
        </LinkedField>
      </FrameCard>
    </div>
  );
};

/**
 * Plaintext preview with explicit [CRLF] badges so the user can see the
 * delimiters that are otherwise invisible in a normal text editor.
 */
const TextPreview: React.FC<{
  state: ReturnType<typeof useProtocolStore.getState>["http1"];
}> = ({ state }) => {
  const crlfColor = conceptStyle("crlf").color;

  return (
    <div className="rounded-md border border-stone-200 bg-stone-100/70 p-3 font-mono text-xs leading-6 text-stone-800 dark:border-zinc-800/80 dark:bg-black/40 dark:text-zinc-300">
      <Line>
        <span style={{ color: conceptStyle("method").color }}>{state.method}</span>{" "}
        <span style={{ color: conceptStyle("path").color }}>{state.path || "/"}</span>{" "}
        <span style={{ color: conceptStyle("version").color }}>{state.version}</span>
        <CrlfBadge color={crlfColor} />
      </Line>

      {state.headers
        .filter((h) => h.name)
        .map((h) => (
          <Line key={h.id}>
            <span style={{ color: conceptStyle("header-name").color }}>{h.name}</span>
            <span className="text-stone-500 dark:text-zinc-500">: </span>
            <span style={{ color: conceptStyle("header-value").color }}>{h.value}</span>
            <CrlfBadge color={crlfColor} />
          </Line>
        ))}

      <Line>
        <span className="text-stone-500 italic dark:text-zinc-500">(empty line)</span>
        <CrlfBadge color={crlfColor} />
      </Line>

      {state.body ? (
        <Line>
          <span style={{ color: conceptStyle("body").color }}>{state.body}</span>
        </Line>
      ) : null}
    </div>
  );
};

const Line: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="whitespace-pre-wrap break-all">{children}</div>
);

const CrlfBadge: React.FC<{ color: string }> = ({ color }) => (
  <span
    className="ml-1 inline-flex items-center rounded-sm border px-1 py-[1px] text-[10px] font-mono tracking-wider"
    style={{ borderColor: `${color}66`, color, background: `${color}11` }}
  >
    CRLF
  </span>
);
