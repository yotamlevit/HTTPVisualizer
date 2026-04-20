import React, { useMemo } from "react";
import { Boxes, Hash, Layers, Database } from "lucide-react";
import { FrameCard } from "@/components/FrameCard";
import { HeadersEditor } from "@/components/HeadersEditor";
import { LinkedField } from "@/components/LinkedField";
import { renderHttp2 } from "@/lib/http2";
import { useProtocolStore } from "@/store/useProtocolStore";

export const Http2Mode: React.FC = () => {
  const state = useProtocolStore((s) => s.http2);
  const setPseudo = useProtocolStore((s) => s.h2SetPseudo);
  const setBody = useProtocolStore((s) => s.h2SetBody);
  const setFlags = useProtocolStore((s) => s.h2SetFlags);
  const setStreamId = useProtocolStore((s) => s.h2SetStreamId);
  const addHeader = useProtocolStore((s) => s.h2AddHeader);
  const updateHeader = useProtocolStore((s) => s.h2UpdateHeader);
  const removeHeader = useProtocolStore((s) => s.h2RemoveHeader);

  const output = useMemo(() => renderHttp2(state), [state]);
  const [pseudoCard, headersCard, dataCard] = output.dumps;

  return (
    <div className="space-y-6">
      <div className="card px-4 py-3 flex items-center gap-4">
        <Hash className="w-4 h-4 text-yellow-600 dark:text-yellow-300" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-stone-900 dark:text-zinc-200">Stream</div>
          <div className="text-[11px] text-stone-500 dark:text-zinc-500">
            All three frames target the same stream; client-initiated streams use odd IDs.
          </div>
        </div>
        <label
          htmlFor="h2.stream"
          className="ml-auto flex items-center gap-2 text-xs text-stone-600 dark:text-zinc-400"
        >
          Stream ID
          <input
            id="h2.stream"
            name="h2.stream"
            type="number"
            min={1}
            step={2}
            className="input !w-24 !py-1"
            value={state.streamId}
            onChange={(e) => setStreamId(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>

      {/* Card 1 — HEADERS Frame, pseudo-headers */}
      <FrameCard
        title={pseudoCard.title}
        subtitle={pseudoCard.subtitle}
        icon={<Layers className="w-4 h-4" />}
        dump={pseudoCard.dump}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <LinkedField elementId="h2.pseudo.method" concept="pseudo-header" label=":method">
            <input
              id="h2.pseudo.method"
              name="h2.pseudo.method"
              className="input"
              value={state.pseudo.method}
              onChange={(e) => setPseudo("method", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h2.pseudo.scheme" concept="pseudo-header" label=":scheme">
            <input
              id="h2.pseudo.scheme"
              name="h2.pseudo.scheme"
              className="input"
              value={state.pseudo.scheme}
              onChange={(e) => setPseudo("scheme", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h2.pseudo.authority" concept="pseudo-header" label=":authority">
            <input
              id="h2.pseudo.authority"
              name="h2.pseudo.authority"
              className="input"
              value={state.pseudo.authority}
              onChange={(e) => setPseudo("authority", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h2.pseudo.path" concept="pseudo-header" label=":path">
            <input
              id="h2.pseudo.path"
              name="h2.pseudo.path"
              className="input"
              value={state.pseudo.path}
              onChange={(e) => setPseudo("path", e.target.value)}
            />
          </LinkedField>
        </div>
      </FrameCard>

      {/* Card 2 — HEADERS Frame, standard headers */}
      <FrameCard
        title={headersCard.title}
        subtitle={headersCard.subtitle}
        icon={<Boxes className="w-4 h-4" />}
        dump={headersCard.dump}
        badge={
          <label className="pill cursor-pointer">
            <input
              name="h2.endHeaders"
              type="checkbox"
              checked={state.endHeaders}
              onChange={(e) => setFlags({ endHeaders: e.target.checked })}
              className="accent-emerald-500"
            />
            END_HEADERS (0x4)
          </label>
        }
      >
        <HeadersEditor
          headers={state.headers}
          idPrefix="h2.header"
          onAdd={addHeader}
          onUpdate={updateHeader}
          onRemove={removeHeader}
        />
      </FrameCard>

      {/* Card 3 — DATA Frame */}
      <FrameCard
        title={dataCard.title}
        subtitle={dataCard.subtitle}
        icon={<Database className="w-4 h-4" />}
        dump={dataCard.dump}
        badge={
          <label className="pill cursor-pointer">
            <input
              name="h2.endStream"
              type="checkbox"
              checked={state.endStream}
              onChange={(e) => setFlags({ endStream: e.target.checked })}
              className="accent-emerald-500"
            />
            END_STREAM (0x1)
          </label>
        }
      >
        <LinkedField elementId="h2.data.body" concept="data" label="DATA payload">
          <textarea
            id="h2.data.body"
            name="h2.data.body"
            className="input min-h-[88px]"
            value={state.body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="(optional body bytes)"
          />
        </LinkedField>
      </FrameCard>
    </div>
  );
};
