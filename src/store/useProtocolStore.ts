import { create } from "zustand";
import type {
  HeaderKV,
  Http1State,
  Http2State,
  Http3State,
  Protocol,
} from "@/types/protocol";

let idCounter = 0;
const uid = (prefix = "h") => `${prefix}-${++idCounter}`;

const defaultHeaders = (): HeaderKV[] => [
  { id: uid(), name: "User-Agent", value: "HTTPVisualizer/0.1" },
  { id: uid(), name: "Accept", value: "text/html,application/json" },
];

const defaultHttp1 = (): Http1State => ({
  method: "GET",
  path: "/index.html",
  host: "example.com",
  version: "HTTP/1.1",
  headers: [
    { id: uid(), name: "Host", value: "example.com" },
    ...defaultHeaders(),
  ],
  body: "",
});

const defaultHttp2 = (): Http2State => ({
  streamId: 1,
  pseudo: {
    method: "GET",
    scheme: "https",
    authority: "example.com",
    path: "/index.html",
  },
  headers: defaultHeaders(),
  body: "",
  endHeaders: true,
  endStream: true,
});

const defaultHttp3 = (): Http3State => ({
  pseudo: {
    method: "GET",
    scheme: "https",
    authority: "example.com",
    path: "/index.html",
  },
  headers: defaultHeaders(),
  body: "",
});

interface ProtocolStore {
  protocol: Protocol;
  http1: Http1State;
  http2: Http2State;
  http3: Http3State;

  hoveredElementId: string | null;

  setProtocol: (p: Protocol) => void;
  setHover: (id: string | null) => void;

  // HTTP/1.1
  h1Set: <K extends keyof Http1State>(key: K, value: Http1State[K]) => void;
  h1AddHeader: () => void;
  h1UpdateHeader: (id: string, patch: Partial<HeaderKV>) => void;
  h1RemoveHeader: (id: string) => void;

  // HTTP/2
  h2SetStreamId: (n: number) => void;
  h2SetPseudo: <K extends keyof Http2State["pseudo"]>(
    key: K,
    value: Http2State["pseudo"][K],
  ) => void;
  h2SetBody: (v: string) => void;
  h2SetFlags: (patch: Partial<Pick<Http2State, "endHeaders" | "endStream">>) => void;
  h2AddHeader: () => void;
  h2UpdateHeader: (id: string, patch: Partial<HeaderKV>) => void;
  h2RemoveHeader: (id: string) => void;

  // HTTP/3
  h3SetPseudo: <K extends keyof Http3State["pseudo"]>(
    key: K,
    value: Http3State["pseudo"][K],
  ) => void;
  h3SetBody: (v: string) => void;
  h3AddHeader: () => void;
  h3UpdateHeader: (id: string, patch: Partial<HeaderKV>) => void;
  h3RemoveHeader: (id: string) => void;
}

export const useProtocolStore = create<ProtocolStore>((set) => ({
  protocol: "HTTP/1.1",
  http1: defaultHttp1(),
  http2: defaultHttp2(),
  http3: defaultHttp3(),
  hoveredElementId: null,

  setProtocol: (protocol) => set({ protocol }),
  setHover: (id) => set({ hoveredElementId: id }),

  // HTTP/1.1
  h1Set: (key, value) =>
    set((s) => ({ http1: { ...s.http1, [key]: value } })),
  h1AddHeader: () =>
    set((s) => ({
      http1: {
        ...s.http1,
        headers: [...s.http1.headers, { id: uid(), name: "", value: "" }],
      },
    })),
  h1UpdateHeader: (id, patch) =>
    set((s) => ({
      http1: {
        ...s.http1,
        headers: s.http1.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      },
    })),
  h1RemoveHeader: (id) =>
    set((s) => ({
      http1: { ...s.http1, headers: s.http1.headers.filter((h) => h.id !== id) },
    })),

  // HTTP/2
  h2SetStreamId: (streamId) =>
    set((s) => ({ http2: { ...s.http2, streamId } })),
  h2SetPseudo: (key, value) =>
    set((s) => ({
      http2: { ...s.http2, pseudo: { ...s.http2.pseudo, [key]: value } },
    })),
  h2SetBody: (body) => set((s) => ({ http2: { ...s.http2, body } })),
  h2SetFlags: (patch) => set((s) => ({ http2: { ...s.http2, ...patch } })),
  h2AddHeader: () =>
    set((s) => ({
      http2: {
        ...s.http2,
        headers: [...s.http2.headers, { id: uid(), name: "", value: "" }],
      },
    })),
  h2UpdateHeader: (id, patch) =>
    set((s) => ({
      http2: {
        ...s.http2,
        headers: s.http2.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      },
    })),
  h2RemoveHeader: (id) =>
    set((s) => ({
      http2: { ...s.http2, headers: s.http2.headers.filter((h) => h.id !== id) },
    })),

  // HTTP/3
  h3SetPseudo: (key, value) =>
    set((s) => ({
      http3: { ...s.http3, pseudo: { ...s.http3.pseudo, [key]: value } },
    })),
  h3SetBody: (body) => set((s) => ({ http3: { ...s.http3, body } })),
  h3AddHeader: () =>
    set((s) => ({
      http3: {
        ...s.http3,
        headers: [...s.http3.headers, { id: uid(), name: "", value: "" }],
      },
    })),
  h3UpdateHeader: (id, patch) =>
    set((s) => ({
      http3: {
        ...s.http3,
        headers: s.http3.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      },
    })),
  h3RemoveHeader: (id) =>
    set((s) => ({
      http3: { ...s.http3, headers: s.http3.headers.filter((h) => h.id !== id) },
    })),
}));
