import React from "react";
import { ControlBar } from "@/components/ControlBar";
import { Http1Mode } from "@/modes/Http1Mode";
import { Http2Mode } from "@/modes/Http2Mode";
import { Http3Mode } from "@/modes/Http3Mode";
import { useProtocolStore } from "@/store/useProtocolStore";

const App: React.FC = () => {
  const protocol = useProtocolStore((s) => s.protocol);

  return (
    <div className="min-h-full">
      <ControlBar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {protocol === "HTTP/1.1" ? (
          <Http1Mode />
        ) : protocol === "HTTP/2" ? (
          <Http2Mode />
        ) : (
          <Http3Mode />
        )}
      </main>
      <footer className="max-w-6xl mx-auto px-4 pb-10 pt-2 text-[11px] text-stone-500 dark:text-zinc-600">
        Byte counts are live. Hover any input — or any byte — to see its linked partner light up.
      </footer>
    </div>
  );
};

export default App;
