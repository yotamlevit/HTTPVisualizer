import React, { useMemo } from "react";
import { Boxes, Database, Layers } from "lucide-react";
import { FrameCard } from "@/components/FrameCard";
import { HeadersEditor } from "@/components/HeadersEditor";
import { LinkedField } from "@/components/LinkedField";
import { renderHttp3 } from "@/lib/http3";
import { useProtocolStore } from "@/store/useProtocolStore";

export const Http3Mode: React.FC = () => {
  const state = useProtocolStore((s) => s.http3);
  const setPseudo = useProtocolStore((s) => s.h3SetPseudo);
  const setBody = useProtocolStore((s) => s.h3SetBody);
  const addHeader = useProtocolStore((s) => s.h3AddHeader);
  const updateHeader = useProtocolStore((s) => s.h3UpdateHeader);
  const removeHeader = useProtocolStore((s) => s.h3RemoveHeader);

  const output = useMemo(() => renderHttp3(state), [state]);
  const [pseudoCard, headersCard, dataCard] = output.dumps;

  return (
    <div className="space-y-6">
      <div className="card px-4 py-3 text-[11px] text-stone-600 dark:text-zinc-400">
        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">HTTP/3</span> runs over
        QUIC streams — frame headers are{" "}
        <span className="text-yellow-700 dark:text-yellow-300">variable-length integers</span>, not the
        fixed 9-byte HTTP/2 form. Header compression uses{" "}
        <span className="text-purple-700 dark:text-purple-300">QPACK</span> in place of HPACK.
      </div>

      <FrameCard
        title={pseudoCard.title}
        subtitle={pseudoCard.subtitle}
        icon={<Layers className="w-4 h-4" />}
        dump={pseudoCard.dump}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <LinkedField elementId="h3.pseudo.method" concept="pseudo-header" label=":method">
            <input
              id="h3.pseudo.method"
              name="h3.pseudo.method"
              className="input"
              value={state.pseudo.method}
              onChange={(e) => setPseudo("method", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h3.pseudo.scheme" concept="pseudo-header" label=":scheme">
            <input
              id="h3.pseudo.scheme"
              name="h3.pseudo.scheme"
              className="input"
              value={state.pseudo.scheme}
              onChange={(e) => setPseudo("scheme", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h3.pseudo.authority" concept="pseudo-header" label=":authority">
            <input
              id="h3.pseudo.authority"
              name="h3.pseudo.authority"
              className="input"
              value={state.pseudo.authority}
              onChange={(e) => setPseudo("authority", e.target.value)}
            />
          </LinkedField>
          <LinkedField elementId="h3.pseudo.path" concept="pseudo-header" label=":path">
            <input
              id="h3.pseudo.path"
              name="h3.pseudo.path"
              className="input"
              value={state.pseudo.path}
              onChange={(e) => setPseudo("path", e.target.value)}
            />
          </LinkedField>
        </div>
      </FrameCard>

      <FrameCard
        title={headersCard.title}
        subtitle={headersCard.subtitle}
        icon={<Boxes className="w-4 h-4" />}
        dump={headersCard.dump}
      >
        <HeadersEditor
          headers={state.headers}
          idPrefix="h3.header"
          onAdd={addHeader}
          onUpdate={updateHeader}
          onRemove={removeHeader}
        />
      </FrameCard>

      <FrameCard
        title={dataCard.title}
        subtitle={dataCard.subtitle}
        icon={<Database className="w-4 h-4" />}
        dump={dataCard.dump}
      >
        <LinkedField elementId="h3.data.body" concept="data" label="DATA payload">
          <textarea
            id="h3.data.body"
            name="h3.data.body"
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
